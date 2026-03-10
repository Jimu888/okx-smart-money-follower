const { exec } = require('child_process');
const { promisify } = require('util');
const winston = require('winston');
const cron = require('node-cron');

const execAsync = promisify(exec);

// 配置日志
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.printf(({ timestamp, level, message, ...meta }) => {
      return `${timestamp} [${level.toUpperCase()}] [SmartMoney]: ${message} ${Object.keys(meta).length ? JSON.stringify(meta) : ''}`;
    })
  ),
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({ filename: 'logs/smart-money.log' })
  ]
});

class SmartMoneyService {
  constructor(tradingService, databaseService, notificationService, onchainosMcp) {
    this.onchainosMcp = onchainosMcp;
    this.tradingService = tradingService;
    this.databaseService = databaseService;
    this.notificationService = notificationService;
    
    this.isRunning = false;
    this.watchList = [];
    this.settings = {
      followAmount: parseInt(process.env.FOLLOW_AMOUNT) || 100,
      minTriggerCount: parseInt(process.env.MIN_TRIGGER_COUNT) || 3,
      maxSlippage: parseFloat(process.env.MAX_SLIPPAGE) || 5,
      checkInterval: parseInt(process.env.CHECK_INTERVAL) || 30000,
      supportedChains: (process.env.SUPPORTED_CHAINS || 'solana,base,ethereum').split(','),
      minLiquidity: parseInt(process.env.MIN_LIQUIDITY) || 10000,
      minHolders: parseInt(process.env.MIN_HOLDERS) || 100,
      maxDailyTrades: parseInt(process.env.MAX_DAILY_TRADES) || (process.env.TEST_MODE === 'true' ? 200 : 20),
      cooldownPeriod: parseInt(process.env.COOLDOWN_PERIOD) || 300000,

      // ---- Signal freshness ----
      // Only follow signals within this window (ms). Default 10 minutes.
      signalMaxAgeMs: parseInt(process.env.SIGNAL_MAX_AGE_MS) || 10 * 60 * 1000,

      // ---- Follow Asset Mode ----
      // 默认B：AUTO（按链自动选择支付资产，优先 USDC/USDT，否则原生币）
      followAssetMode: 'AUTO',
      // 高级：按链覆盖，例如 { solana: { asset: 'USDC', amount: 100 }, bsc: { asset: 'USDT', amount: 200 } }
      perChainFollow: {},

      // ---- Exit Strategy ----
      // 止盈：多档（每档只触发一次） e.g. [{ profitPct: 100, sellPct: 30 }]
      takeProfitRules: [],
      // 止损：全卖（百分比），例如 20 表示 -20% 触发
      stopLossPercent: 0
    };
    
    this.stats = {
      signalsChecked: 0,
      tradesExecuted: 0,
      successfulTrades: 0,
      failedTrades: 0,
      lastCheck: null,
      dailyTrades: 0,
      lastResetDate: new Date().toDateString()
    };

    this.recentTrades = new Map(); // 用于冷却期检查
    this.cronJob = null;

    logger.info('🎯 SmartMoneyService 初始化完成', { settings: this.settings });
  }

  // 启动监控服务
  async start() {
    if (this.isRunning) {
      logger.warn('⚠️ 监控服务已在运行中');
      return;
    }

    logger.info('🚀 启动 Smart Money 监控服务...');

    try {
      // 验证OKX CLI是否可用
      const okxReady = await this.verifyOKXCLI();

      // 加载监控钱包列表
      await this.loadWatchList();

      // 启动定时检查（只有 okxReady 才跑）
      if (okxReady) {
        this.startPeriodicCheck();
      } else {
        logger.warn('⚠️ 跳过启动定时检查：未安装 onchainos');
      }

      // 启动每日重置任务
      this.startDailyReset();

      this.isRunning = true;
      logger.info('✅ Smart Money 监控服务启动成功');

      // 发送启动通知
      await this.notificationService.send({
        type: 'system',
        title: '🚀 Smart Money 监控启动',
        message: `监控 ${this.watchList.length} 个钱包，支持 ${this.settings.supportedChains.length} 条链`,
        data: { watchList: this.watchList.length, chains: this.settings.supportedChains }
      });

    } catch (error) {
      logger.error('❌ Smart Money 监控服务启动失败:', error);
      throw error;
    }
  }

  // 停止监控服务
  async stop() {
    if (!this.isRunning) {
      logger.warn('⚠️ 监控服务未在运行');
      return;
    }

    logger.info('🛑 停止 Smart Money 监控服务...');

    this.isRunning = false;

    // 停止定时任务
    if (this.cronJob) {
      // node-cron task supports stop(); some versions may have destroy()
      if (typeof this.cronJob.stop === 'function') this.cronJob.stop();
      if (typeof this.cronJob.destroy === 'function') this.cronJob.destroy();
      this.cronJob = null;
    }

    // 清理定时器
    if (this.checkTimer) {
      clearInterval(this.checkTimer);
      this.checkTimer = null;
    }

    logger.info('✅ Smart Money 监控服务已停止');

    // 发送停止通知
    await this.notificationService.send({
      type: 'system',
      title: '🛑 Smart Money 监控停止',
      message: `总计检查 ${this.stats.signalsChecked} 个信号，执行 ${this.stats.tradesExecuted} 笔交易`,
      data: this.stats
    });
  }

  // 验证OKX数据源是否可用（MCP-only）
  async verifyOKXCLI() {
    // 为兼容旧命名：这里改为 MCP-only 检查
    if (this.onchainosMcp?.isConfigured?.()) {
      logger.info('✅ OKX MCP 已配置，将使用 MCP（MCP-only 模式，不依赖本地 onchainos CLI）');
      return true;
    }

    logger.warn('⚠️ MCP 未配置：Smart Money 监控将无法运行。');
    logger.warn('请在 .env 配置 OKX_MCP_URL + OKX_API_KEY');
    return false;
  }

  // 加载监控钱包列表
  async loadWatchList() {
    try {
      const wallets = await this.databaseService.getWatchList();
      this.watchList = wallets || [];
      logger.info(`📋 加载了 ${this.watchList.length} 个监控钱包`);
    } catch (error) {
      logger.error('❌ 加载监控钱包列表失败:', error);
      this.watchList = [];
    }
  }

  // 启动定时检查
  startPeriodicCheck() {
    const intervalMs = this.settings.checkInterval;
    logger.info(`⏰ 启动定时检查，间隔: ${intervalMs}ms`);

    this.checkTimer = setInterval(async () => {
      if (this.isRunning) {
        await this.checkSignals();
      }
    }, intervalMs);
  }

  // 启动每日重置任务
  startDailyReset() {
    // 每天0点重置交易计数
    this.cronJob = cron.schedule('0 0 * * *', () => {
      this.resetDailyStats();
    });
  }

  // 重置每日统计
  resetDailyStats() {
    this.stats.dailyTrades = 0;
    this.stats.lastResetDate = new Date().toDateString();
    logger.info('🔄 每日交易统计已重置');
  }

  // 检查Smart Money信号
  async checkSignals() {
    if (this.watchList.length === 0) {
      logger.debug('📋 监控钱包列表为空，跳过检查');
      return;
    }

    const startTime = Date.now();
    logger.info('🔍 开始检查 Smart Money 信号...');

    try {
      for (const chain of this.settings.supportedChains) {
        await this.checkChainSignals(chain);
      }

      this.stats.signalsChecked++;
      this.stats.lastCheck = new Date().toISOString();

      const duration = Date.now() - startTime;
      logger.info(`✅ 信号检查完成，用时: ${duration}ms`);

    } catch (error) {
      logger.error('❌ 信号检查失败:', error);
    }
  }

  // 检查特定链的信号
  async checkChainSignals(chain) {
    try {
      logger.debug(`🔍 检查 ${chain} 链的信号...`);

      // 获取Smart Money信号
      const signals = await this.getSmartMoneySignals(chain);
      if (!signals || signals.length === 0) {
        logger.debug(`${chain} 暂无新信号`);
        return;
      }

      logger.debug(`📊 ${chain} 发现 ${signals.length} 个信号`);

      // 处理每个信号
      for (const signal of signals) {
        await this.processSignal(signal, chain);
      }

    } catch (error) {
      logger.error(`❌ 检查 ${chain} 信号失败:`, error);
    }
  }

  // 获取Smart Money信号（MCP-only）
  async getSmartMoneySignals(chain) {
    try {
      if (!this.onchainosMcp?.isConfigured?.()) {
        logger.warn(`⚠️ MCP 未配置，无法获取 ${chain} 信号`);
        return [];
      }

      const minAmountUsd = 1000;
      const walletType = '1,2,3';

      const raw = await this.onchainosMcp.marketSignalList({
        chain,
        walletType,
        minAmountUsd,
      });

      // normalize result to array
      if (!raw) return [];
      if (Array.isArray(raw)) return raw;
      if (typeof raw === 'string') return JSON.parse(raw || '[]');

      // common wrappers
      if (Array.isArray(raw.data)) return raw.data;
      if (Array.isArray(raw.result)) return raw.result;
      if (Array.isArray(raw.items)) return raw.items;

      return [];
    } catch (error) {
      logger.error(`获取 ${chain} 信号失败(MCP):`, error);
      return [];
    }
  }

  // 处理单个信号
  async processSignal(signal, chain) {
    try {
      const { token, triggerWalletAddress, triggerWalletCount, amountUsd, price } = signal;

      // ---- paper trading mark-to-market ----
      // OKX signal-list includes a "price" field (USD). Use it to update open positions so PnL moves.
      try {
        const px = Number(price);
        const addr = token?.tokenAddress;
        if (addr && Number.isFinite(px) && px > 0) {
          const open = await this.databaseService.getPositions({ status: 'OPEN' });
          const targets = open.filter((p) => String(p.tokenAddress) === String(addr) && String(p.chain) === String(chain));
          for (const p of targets) {
            await this.databaseService.updatePosition(p.id, {
              lastPriceUsd: px,
              pnlPercent: p.entryPriceUsd ? ((px - Number(p.entryPriceUsd)) / Number(p.entryPriceUsd)) * 100 : null,
              highWaterMarkUsd: Math.max(Number(p.highWaterMarkUsd || 0), px),
              lastCheckedAt: Date.now(),
            });
          }
        }
      } catch {}
      
      // ---- Freshness filter ----
      const sigTs = Number(signal.timestamp);
      const maxAge = Number(this.settings.signalMaxAgeMs || 0);
      if (Number.isFinite(sigTs) && maxAge > 0) {
        const age = Date.now() - sigTs;
        if (age > maxAge) {
          // too old: ignore for following
          return;
        }
      }

      // 检查触发钱包
      const matchedWallets = this.checkTriggerWallets(triggerWalletAddress);
      if (matchedWallets.length < this.settings.minTriggerCount) {
        return; // 未达到触发条件
      }

      logger.info(`🎯 发现匹配信号: ${token.symbol}`, {
        chain,
        matchedWallets: matchedWallets.length,
        amountUsd,
        triggerCount: triggerWalletCount
      });

      // 检查交易限制
      if (!this.canExecuteTrade(token.tokenAddress)) {
        return;
      }

      // 执行跟单交易
      await this.executeFollowTrade(signal, chain, matchedWallets);

    } catch (error) {
      logger.error('处理信号失败:', error);
    }
  }

  // 检查触发钱包
  checkTriggerWallets(triggerWalletAddress) {
    if (!triggerWalletAddress) return [];

    const triggerAddresses = triggerWalletAddress.split(',').map(addr => addr.trim().toLowerCase());
    const watchAddresses = this.watchList.map(wallet => wallet.address.toLowerCase());

    return triggerAddresses.filter(addr => watchAddresses.includes(addr));
  }

  // 检查是否可以执行交易
  canExecuteTrade(tokenAddress) {
    // 检查每日交易限制
    if (this.stats.dailyTrades >= this.settings.maxDailyTrades) {
      logger.warn(`⚠️ 达到每日交易限制 (${this.settings.maxDailyTrades})`);
      return false;
    }

    // 检查冷却期
    const lastTrade = this.recentTrades.get(tokenAddress);
    if (lastTrade && Date.now() - lastTrade < this.settings.cooldownPeriod) {
      logger.warn(`⏰ 代币 ${tokenAddress} 在冷却期内`);
      return false;
    }

    return true;
  }

  // 执行跟单交易
  async executeFollowTrade(signal, chain, matchedWallets) {
    const tradeId = this.generateTradeId();
    
    try {
      logger.info(`🚀 执行跟单交易: ${signal.token.symbol}`, {
        tradeId,
        chain,
        matchedWallets: matchedWallets.length
      });

      // 记录交易开始
      const trade = {
        id: tradeId,
        token: signal.token,
        chain,
        matchedWallets,
        amount: this.settings.followAmount,
        timestamp: Date.now(),
        status: 'processing'
      };

      await this.databaseService.saveTrade(trade);

      // 执行交易
      const result = await this.tradingService.executeSwap({
        tokenAddress: signal.token.tokenAddress,
        chain,
        amount: this.settings.followAmount,
        slippage: this.settings.maxSlippage,
        minLiquidity: this.settings.minLiquidity,
        minHolders: this.settings.minHolders
      });

      // 更新交易记录
      trade.status = result.success ? 'completed' : 'failed';
      trade.txHash = result.txHash;
      trade.error = result.error;
      trade.completedAt = Date.now();

      await this.databaseService.updateTrade(tradeId, trade);

      // 更新统计
      this.stats.tradesExecuted++;
      this.stats.dailyTrades++;
      
      if (result.success) {
        this.stats.successfulTrades++;
        this.recentTrades.set(signal.token.tokenAddress, Date.now());
        
        logger.info(`✅ 跟单交易成功: ${signal.token.symbol}`, {
          tradeId,
          txHash: result.txHash
        });

        // 发送成功通知
        await this.notificationService.send({
          type: 'trade_success',
          title: `🎉 跟单成功: ${signal.token.symbol}`,
          message: `已跟单 ${this.settings.followAmount} USDC`,
          data: { trade, result }
        });

      } else {
        this.stats.failedTrades++;
        
        logger.error(`❌ 跟单交易失败: ${signal.token.symbol}`, {
          tradeId,
          error: result.error
        });

        // 发送失败通知
        await this.notificationService.send({
          type: 'trade_failed',
          title: `❌ 跟单失败: ${signal.token.symbol}`,
          message: result.error,
          data: { trade, result }
        });
      }

    } catch (error) {
      logger.error(`💥 跟单交易异常: ${signal.token.symbol}`, {
        tradeId,
        error: error.message
      });

      // 更新交易状态为错误
      await this.databaseService.updateTrade(tradeId, {
        status: 'error',
        error: error.message,
        completedAt: Date.now()
      });

      this.stats.failedTrades++;
    }
  }

  // 执行OKX命令
  async executeOKXCommand(command) {
    try {
      const fullCommand = `onchainos ${command}`;
      logger.debug(`执行命令: ${fullCommand}`);

      const { stdout, stderr } = await execAsync(fullCommand, {
        timeout: 30000,
        env: {
          ...process.env,
          OKX_API_KEY: process.env.OKX_API_KEY,
          OKX_SECRET_KEY: process.env.OKX_SECRET_KEY,
          OKX_PASSPHRASE: process.env.OKX_PASSPHRASE
        }
      });

      if (stderr) {
        logger.warn('命令警告:', stderr);
      }

      return stdout.trim();
    } catch (error) {
      logger.error('执行OKX命令失败:', { command, error: error.message });
      throw error;
    }
  }

  // 生成交易ID
  generateTradeId() {
    return `trade_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // 添加监控钱包
  async addWallet(wallet) {
    try {
      const raw = (wallet?.address || '').trim();
      if (!raw) throw new Error('钱包地址不能为空');

      // 验证钱包地址格式
      if (!this.isValidWalletAddress(raw)) {
        throw new Error('无效的钱包地址格式');
      }

      // Solana base58 is case-sensitive; EVM can be normalized to lower-case
      const isEvm = /^0x[a-fA-F0-9]{40}$/.test(raw);
      const canonical = isEvm ? raw.toLowerCase() : raw;

      // 检查是否已存在
      const exists = this.watchList.some(w => String(w.address) === canonical);
      if (exists) {
        throw new Error('钱包地址已在监控列表中');
      }

      const newWallet = {
        address: canonical,
        nickname: (wallet?.nickname || '').trim(),
        addedAt: Date.now(),
        performance: 0,
        trades: 0
      };

      this.watchList.push(newWallet);
      await this.databaseService.saveWatchList(this.watchList);

      logger.info(`➕ 添加监控钱包: ${newWallet.nickname || newWallet.address}`);
      return newWallet;
    } catch (error) {
      logger.error('添加监控钱包失败:', error);
      throw error;
    }
  }

  // 移除监控钱包
  async removeWallet(address) {
    try {
      const index = this.watchList.findIndex(w => w.address.toLowerCase() === address.toLowerCase());
      if (index === -1) {
        throw new Error('钱包地址不在监控列表中');
      }

      const removed = this.watchList.splice(index, 1)[0];
      await this.databaseService.saveWatchList(this.watchList);

      logger.info(`➖ 移除监控钱包: ${removed.nickname || removed.address}`);
      return removed;
    } catch (error) {
      logger.error('移除监控钱包失败:', error);
      throw error;
    }
  }

  // 验证钱包地址格式
  isValidWalletAddress(address) {
    console.log('🔍 验证地址:', address, 'type:', typeof address, 'length:', address?.length);
    
    // 以太坊地址格式
    if (/^0x[a-fA-F0-9]{40}$/.test(address)) {
      console.log('✅ 以太坊地址格式匹配');
      return true;
    }
    
    // Solana地址格式 (Base58)
    if (/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(address)) {
      console.log('✅ Solana地址格式匹配');
      return true;
    }

    console.log('❌ 地址格式不匹配');
    return false;
  }

  // OKX推荐聪明钱包：基于 signal-list 聚合（MCP-only）
  async getRecommendedWallets({ chain, walletType = '1,2,3', minAmountUsd = 1000, limit = 30 }) {
    if (!this.onchainosMcp?.isConfigured?.()) {
      return { chain, wallets: [], note: 'MCP 未配置，无法拉取OKX信号推荐列表', source: 'mcp' };
    }

    const raw = await this.onchainosMcp.marketSignalList({ chain, walletType, minAmountUsd });
    let signals = [];
    if (Array.isArray(raw)) signals = raw;
    else if (typeof raw === 'string') signals = JSON.parse(raw || '[]');
    else if (Array.isArray(raw?.data)) signals = raw.data;
    else if (Array.isArray(raw?.result)) signals = raw.result;

    const agg = new Map();
    const canonicalize = (addr) => {
      const raw = String(addr || '').trim();
      if (!raw) return '';
      // EVM lowercase; Solana/base58 keep original (case-sensitive)
      if (/^0x[a-fA-F0-9]{40}$/.test(raw)) return raw.toLowerCase();
      return raw;
    };

    for (const s of signals) {
      const addrs = (s.triggerWalletAddress || '').split(',').map(x => x.trim()).filter(Boolean);
      const amount = Number(s.amountUsd || 0);
      const wt = String(s.walletType || '').trim(); // '1' smart money, '2' kol, '3' whale
      for (const a of addrs) {
        const k = canonicalize(a);
        if (!k) continue;
        const cur = agg.get(k) || {
          address: k,
          count: 0,
          totalAmountUsd: 0,
          smartMoneyCount: 0,
          kolCount: 0,
        };
        cur.count += 1;
        cur.totalAmountUsd += amount;
        if (wt === '1') cur.smartMoneyCount += 1;
        if (wt === '2') cur.kolCount += 1;
        agg.set(k, cur);
      }
    }

    // 给每个地址打一个二选一标签（按出现次数占比）
    const wallets = Array.from(agg.values())
      .map(w => ({
        ...w,
        tag: w.kolCount > w.smartMoneyCount ? 'KOL' : 'SMART_MONEY',
      }))
      // 只保留 Smart Money / KOL（如果某地址只在 whale 信号里出现，smart/kol 都为0，会被过滤掉）
      .filter(w => (w.kolCount + w.smartMoneyCount) > 0)
      .sort((a, b) => (b.count - a.count) || (b.totalAmountUsd - a.totalAmountUsd))
      .slice(0, limit);

    return { chain, wallets, source: 'mcp', note: '标签规则：按地址在 KOL(2) vs SmartMoney(1) 信号中出现次数占比二选一。' };
  }

  // 获取统计信息
  getStats() {
    return {
      ...this.stats,
      watchList: this.watchList.length,
      settings: this.settings,
      isRunning: this.isRunning
    };
  }

  // 更新设置
  async updateSettings(newSettings) {
    try {
      this.settings = { ...this.settings, ...newSettings };
      logger.info('⚙️ 设置已更新', newSettings);
      
      // 重启监控以应用新设置
      if (this.isRunning) {
        await this.stop();
        await this.start();
      }
    } catch (error) {
      logger.error('更新设置失败:', error);
      throw error;
    }
  }
}

module.exports = SmartMoneyService;