const { exec } = require('child_process');
const { promisify } = require('util');
const winston = require('winston');
const { ethers } = require('ethers');

const execAsync = promisify(exec);

// 配置日志
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.printf(({ timestamp, level, message, ...meta }) => {
      return `${timestamp} [${level.toUpperCase()}] [Trading]: ${message} ${Object.keys(meta).length ? JSON.stringify(meta) : ''}`;
    })
  ),
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({ filename: 'logs/trading.log' })
  ]
});

class TradingService {
  constructor(walletService, databaseService, notificationService, onchainosMcp) {
    this.walletService = walletService;
    this.databaseService = databaseService;
    this.notificationService = notificationService;
    this.onchainosMcp = onchainosMcp;
    
    this.isConnected = false;
    this.testMode = process.env.TEST_MODE === 'true';
    
    // 稳定币地址映射
    this.stableTokens = {
      '1': '0xa0b86a33e6cb5f3e0086e65a49b1c18e3aee6b91',     // USDC on Ethereum
      '56': '0x8ac76a51cc950d9822d68b83fe1ad97b32cd580d',    // USDC on BSC
      '8453': '0x833589fcd6edb6e08f4c7c32d4f71b54bda02913',  // USDC on Base
      '42161': '0xaf88d065e77c8cc2239327c5edb3a432268e5831', // USDC on Arbitrum
      '196': '0x74b7f16337b8972027f6196a17a631ac6de26d22',   // USDC on XLayer
      '501': 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v' // USDC on Solana
    };

    // 链ID到名称映射
    this.chainNames = {
      '1': 'ethereum',
      '56': 'bsc',
      '8453': 'base', 
      '42161': 'arbitrum',
      '196': 'xlayer',
      '501': 'solana'
    };

    this.initialize();
  }

  // 初始化服务
  async initialize() {
    try {
      logger.info('🔧 初始化交易服务...');
      
      if (this.testMode) {
        logger.warn('⚠️ 运行在测试模式，不会执行真实交易');
      }

      // 验证钱包连接
      await this.validateWallet();
      
      this.isConnected = true;
      logger.info('✅ 交易服务初始化完成');
    } catch (error) {
      logger.error('❌ 交易服务初始化失败:', error);
      throw error;
    }
  }

  // 验证钱包
  async validateWallet() {
    const walletAddress = process.env.WALLET_ADDRESS;
    if (!walletAddress) {
      throw new Error('未设置钱包地址');
    }

    // 验证地址格式
    if (!this.isValidAddress(walletAddress)) {
      throw new Error('无效的钱包地址格式');
    }

    logger.info(`👛 钱包地址验证成功: ${walletAddress}`);
  }

  // 验证地址格式
  isValidAddress(address) {
    // 以太坊地址
    if (/^0x[a-fA-F0-9]{40}$/.test(address)) {
      return true;
    }
    
    // Solana地址
    if (/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(address)) {
      return true;
    }
    
    return false;
  }

  // 执行交换交易
  async executeSwap(params) {
    const {
      tokenAddress,
      chain,
      amount,
      slippage = 5,
      minLiquidity = 10000,
      minHolders = 100
    } = params;

    const tradeId = this.generateTradeId();
    
    try {
      logger.info(`🔄 开始执行swap交易`, {
        tradeId,
        tokenAddress,
        chain,
        amount,
        slippage
      });

      // 1. 安全检查
      const safetyCheck = await this.performSafetyChecks({
        tokenAddress,
        chain,
        minLiquidity,
        minHolders
      });

      if (!safetyCheck.safe) {
        return {
          success: false,
          error: `安全检查失败: ${safetyCheck.reason}`,
          tradeId
        };
      }

      // 2. 获取交易报价
      const quote = await this.getSwapQuote({
        tokenAddress,
        chain,
        amount,
        slippage
      });

      if (!quote.success) {
        return {
          success: false,
          error: `获取报价失败: ${quote.error}`,
          tradeId
        };
      }

      // 3. 检查滑点
      const priceImpact = Number(
        quote.data?.priceImpactPercentage ??
          quote.data?.priceImpactPercent ??
          quote.data?.dexRouterList?.[0]?.priceImpactPercentage ??
          0
      );
      if (Number.isFinite(priceImpact) && priceImpact > slippage) {
        return {
          success: false,
          error: `滑点过高: ${priceImpact}% > ${slippage}%`,
          tradeId
        };
      }

      // 4. 执行交易
      let result;
      if (this.testMode) {
        result = await this.simulateSwap(quote);
      } else {
        result = await this.realSwap(quote, { tokenAddress, chain, amount, slippage });
      }

      logger.info(`${result.success ? '✅' : '❌'} Swap交易${result.success ? '成功' : '失败'}`, {
        tradeId,
        txHash: result.txHash,
        error: result.error
      });

      // 创建 position（用于止盈止损）
      if (result.success) {
        try {
          const entryPriceUsd = Number(quote.data?.toToken?.tokenUnitPrice || quote.data?.routerResult?.toToken?.tokenUnitPrice || quote.data?.toTokenUnitPrice);
          const position = {
            id: `pos_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
            status: 'OPEN',
            chain,
            tokenAddress,
            symbol: quote.data?.toToken?.symbol || null,
            entryPriceUsd: Number.isFinite(entryPriceUsd) ? entryPriceUsd : null,
            buyAmountUsdc: amount,
            receivedTokenAmountMin: quote.data?.toTokenAmount || null, // minimal units
            tokenDecimal: Number(quote.data?.toToken?.decimal || 0) || null,
            createdAt: Date.now(),
            executedTakeProfits: [],
            highWaterMarkUsd: Number.isFinite(entryPriceUsd) ? entryPriceUsd : null,
            lastPriceUsd: Number.isFinite(entryPriceUsd) ? entryPriceUsd : null,
          };
          await this.databaseService.createPosition(position);
        } catch (e) {
          logger.warn('创建 position 失败（不影响交易）:' + e.message);
        }
      }

      return {
        ...result,
        tradeId,
        quote: quote.data
      };

    } catch (error) {
      logger.error(`💥 Swap交易异常:`, {
        tradeId,
        error: error.message,
        stack: error.stack
      });

      return {
        success: false,
        error: `交易异常: ${error.message}`,
        tradeId
      };
    }
  }

  // 卖出仓位（用于止盈止损）
  async executeSellPosition({ position, sellPct = 100, reason = 'AUTO' }) {
    const pct = Math.min(100, Math.max(1, Number(sellPct)));

    if (!position?.receivedTokenAmountMin) {
      return { success: false, error: 'position 缺少 receivedTokenAmountMin（无法计算卖出数量）' };
    }

    const chainName = this.getChainName(position.chain);
    const chainIndex = this.getChainIndex(chainName);
    const stable = this.getStableToken(chainIndex);
    const walletAddress = process.env.WALLET_ADDRESS;

    // 计算卖出 token 数量（minimal units）
    const totalMin = BigInt(position.receivedTokenAmountMin);
    const soldPercent = Number(position.soldPercent || 0);
    const remainingPct = Math.max(0, 100 - soldPercent);
    const effectivePct = Math.min(pct, remainingPct);
    const amountMin = (totalMin * BigInt(Math.floor(effectivePct * 100))) / BigInt(10000); // keep 2 decimals

    if (amountMin <= 0n) {
      return { success: false, error: 'amountMin=0（可能已全部卖出）' };
    }

    // 测试模式直接模拟
    if (this.testMode) {
      await this.sleep(800);
      return { success: true, txHash: this.generateTxHash(), simulated: true, soldPct: effectivePct, reason };
    }

    // 目前 Solana 自动签名未实现
    if (!this.isEVMChain(chainName)) {
      return { success: false, error: 'Solana 自动卖出暂未实现（签名流程待补齐）' };
    }

    try {
      // EVM: approve token first
      const approval = await this.handleApproval({
        tokenAddress: position.tokenAddress,
        amount: amountMin.toString(),
        chain: chainName,
        walletAddress
      });

      if (!approval.success) {
        return { success: false, error: `approve失败: ${approval.error}` };
      }

      const swapCommand = `swap swap --from ${position.tokenAddress} --to ${stable} --amount ${amountMin.toString()} --chain ${chainName} --wallet ${walletAddress} --slippage ${process.env.MAX_SLIPPAGE || 5}`;
      const swapResult = await this.executeOKXCommand(swapCommand);
      const swapData = JSON.parse(swapResult);

      const signedTx = await this.signTransaction(swapData.tx, chainName);
      const broadcast = await this.broadcastTransaction({ signedTx, walletAddress, chain: chainName });
      if (!broadcast.success) return { success: false, error: broadcast.error };

      return { success: true, txHash: broadcast.txHash, orderId: broadcast.orderId, soldPct: effectivePct, reason };
    } catch (e) {
      return { success: false, error: e.message };
    }
  }

  // 安全检查
  async performSafetyChecks(params) {
    try {
      const { tokenAddress, chain, minLiquidity, minHolders } = params;
      
      logger.debug('🛡️ 执行安全检查...', { tokenAddress, chain });

      // 获取代币详细信息
      const tokenInfo = await this.getTokenInfo(tokenAddress, chain);
      if (!tokenInfo.success) {
        return { safe: false, reason: `获取代币信息失败: ${tokenInfo.error}` };
      }

      const { data } = tokenInfo;

      // 检查流动性
      const liquidity = parseFloat(data.liquidity || '0');
      if (liquidity < minLiquidity) {
        return { 
          safe: false, 
          reason: `流动性不足: $${liquidity.toFixed(0)} < $${minLiquidity}` 
        };
      }

      // 检查持有者数量
      const holders = parseInt(data.holders || '0');
      if (holders < minHolders) {
        return { 
          safe: false, 
          reason: `持有者过少: ${holders} < ${minHolders}` 
        };
      }

      // 检查是否为蜜罐代币 (如果swap quote有这个信息)
      const swapQuote = await this.getSwapQuote({
        tokenAddress,
        chain,
        amount: 1, // 小额测试
        slippage: 50
      });

      const toToken = swapQuote.data?.toToken || swapQuote.data?.dexRouterList?.[0]?.toToken || swapQuote.data?.routerResult?.toToken;
      if (swapQuote.success && toToken?.isHoneyPot) {
        return { safe: false, reason: '检测到蜜罐代币' };
      }

      // 检查税费
      const taxRate = parseFloat(toToken?.taxRate || '0');
      if (taxRate > 20) {
        return { safe: false, reason: `税费过高: ${taxRate}%` };
      }

      logger.debug('✅ 安全检查通过', {
        liquidity: `$${liquidity.toFixed(0)}`,
        holders,
        taxRate: `${taxRate}%`
      });

      return { 
        safe: true, 
        data: {
          liquidity,
          holders,
          taxRate
        }
      };

    } catch (error) {
      logger.error('安全检查失败:', error);
      return { safe: false, reason: `安全检查异常: ${error.message}` };
    }
  }

  // MCP tool call helper
  async callMcpTool(name, args) {
    if (!this.onchainosMcp?.isConfigured?.()) {
      throw new Error('MCP not configured');
    }
    const res = await this.onchainosMcp.rpc('tools/call', {
      name,
      arguments: args,
    });
    const text = res?.content?.[0]?.text;
    if (typeof text === 'string' && text.trim().startsWith('{')) {
      return JSON.parse(text);
    }
    return res;
  }

  // 获取代币信息（MCP-only）
  async getTokenInfo(tokenAddress, chain) {
    try {
      const chainName = this.getChainName(chain);
      const chainIndex = this.getChainIndex(chainName);

      const parsed = await this.callMcpTool('dex-okx-market-token-price-info', {
        items: [
          {
            chainIndex: String(chainIndex),
            tokenContractAddress: String(tokenAddress),
          },
        ],
      });

      const data = parsed?.data?.[0] || null;
      if (!data) {
        return { success: false, error: 'empty token price info' };
      }

      return { success: true, data };
    } catch (error) {
      logger.error('获取代币信息失败:', error);
      return { success: false, error: error.message };
    }
  }

  // 获取交换报价（MCP-only）
  async getSwapQuote(params) {
    try {
      const { tokenAddress, chain, amount } = params;

      const chainName = this.getChainName(chain);
      const chainIndex = this.getChainIndex(chainName);
      const stableToken = this.getStableToken(chainIndex);

      // USDC默认6位
      const amountInWei = ethers.parseUnits(amount.toString(), 6);

      const parsed = await this.callMcpTool('dex-okx-dex-quote', {
        chainIndex: String(chainIndex),
        amount: amountInWei.toString(),
        swapMode: 'exactIn',
        fromTokenAddress: String(stableToken),
        toTokenAddress: String(tokenAddress),
      });

      const data = parsed?.data?.[0] || null;
      if (!data) {
        return { success: false, error: 'empty quote' };
      }

      logger.debug('📊 获取报价成功', {
        priceImpact: data.priceImpactPercentage || data.priceImpactPercent,
      });

      return { success: true, data };
    } catch (error) {
      logger.error('获取swap报价失败:', error);
      return { success: false, error: error.message };
    }
  }

  // 模拟交易 (测试模式)
  async simulateSwap(quote) {
    logger.info('🧪 执行模拟交易 (测试模式)');
    
    // 模拟延迟
    await this.sleep(2000);

    // 模拟成功概率 (90%)
    const success = Math.random() > 0.1;
    
    return {
      success,
      txHash: success ? this.generateTxHash() : null,
      error: success ? null : '模拟交易失败',
      estimatedGas: quote.data.estimateGasFee,
      simulation: true
    };
  }

  // 真实交易
  async realSwap(quote, params) {
    try {
      const { tokenAddress, chain, amount, slippage } = params;
      const walletAddress = process.env.WALLET_ADDRESS;
      
      const chainName = this.getChainName(chain);
      const chainIndex = this.getChainIndex(chainName);
      const stableToken = this.getStableToken(chainIndex);
      
      // 将金额转换为最小单位
      const amountInWei = ethers.parseUnits(amount.toString(), 6);

      // 1. 检查是否需要授权 (EVM链)
      if (this.isEVMChain(chainName)) {
        const approvalResult = await this.handleApproval({
          tokenAddress: stableToken,
          amount: amountInWei.toString(),
          chain: chainName,
          walletAddress
        });

        if (!approvalResult.success) {
          return {
            success: false,
            error: `授权失败: ${approvalResult.error}`
          };
        }
      }

      // 2. 执行swap
      const swapCommand = `swap swap --from ${stableToken} --to ${tokenAddress} --amount ${amountInWei.toString()} --chain ${chainName} --wallet ${walletAddress} --slippage ${slippage}`;
      
      const swapResult = await this.executeOKXCommand(swapCommand);
      const swapData = JSON.parse(swapResult);

      // 3. 签名交易
      const signedTx = await this.signTransaction(swapData.tx, chainName);

      // 4. 广播交易
      const broadcastResult = await this.broadcastTransaction({
        signedTx,
        walletAddress,
        chain: chainName
      });

      if (!broadcastResult.success) {
        return {
          success: false,
          error: `广播失败: ${broadcastResult.error}`
        };
      }

      return {
        success: true,
        txHash: broadcastResult.txHash,
        orderId: broadcastResult.orderId,
        estimatedGas: swapData.routerResult.estimateGasFee
      };

    } catch (error) {
      logger.error('真实交易执行失败:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // 处理代币授权
  async handleApproval(params) {
    try {
      const { tokenAddress, amount, chain, walletAddress } = params;
      
      logger.debug('🔐 检查代币授权...', { tokenAddress, chain });

      const approvalCommand = `swap approve --token ${tokenAddress} --amount ${amount} --chain ${chain}`;
      
      const approvalResult = await this.executeOKXCommand(approvalCommand);
      const approvalData = JSON.parse(approvalResult);

      // 签名授权交易
      const signedApprovalTx = await this.signTransaction(approvalData, chain);

      // 广播授权交易
      const broadcastResult = await this.broadcastTransaction({
        signedTx: signedApprovalTx,
        walletAddress,
        chain
      });

      if (!broadcastResult.success) {
        return {
          success: false,
          error: `授权广播失败: ${broadcastResult.error}`
        };
      }

      logger.info('✅ 代币授权成功', { txHash: broadcastResult.txHash });

      // 等待授权确认
      await this.sleep(5000);

      return { success: true };
    } catch (error) {
      logger.error('代币授权失败:', error);
      return { success: false, error: error.message };
    }
  }

  // 签名交易
  async signTransaction(txData, chain) {
    try {
      const privateKey = process.env.WALLET_PRIVATE_KEY;
      if (!privateKey) {
        throw new Error('未设置钱包私钥');
      }

      if (this.isEVMChain(chain)) {
        // EVM链签名
        const wallet = new ethers.Wallet(privateKey);
        
        const transaction = {
          to: txData.to,
          data: txData.data,
          value: txData.value || '0',
          gasLimit: txData.gas,
          gasPrice: txData.gasPrice
        };

        const signedTx = await wallet.signTransaction(transaction);
        return signedTx;
      } else {
        // Solana签名 (需要特殊处理)
        throw new Error('Solana签名功能待实现');
      }
    } catch (error) {
      logger.error('交易签名失败:', error);
      throw error;
    }
  }

  // 广播交易
  async broadcastTransaction(params) {
    try {
      const { signedTx, walletAddress, chain } = params;
      
      const broadcastCommand = `gateway broadcast --signed-tx ${signedTx} --address ${walletAddress} --chain ${chain}`;
      
      const result = await this.executeOKXCommand(broadcastCommand);
      const data = JSON.parse(result);

      return {
        success: true,
        txHash: data.txHash,
        orderId: data.orderId
      };
    } catch (error) {
      logger.error('交易广播失败:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // 执行OKX命令
  async executeOKXCommand(command) {
    try {
      const fullCommand = `onchainos ${command}`;
      logger.debug(`执行命令: ${fullCommand}`);

      const { stdout, stderr } = await execAsync(fullCommand, {
        timeout: 60000, // 交易命令可能需要更长时间
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

  // 辅助方法
  getChainName(chainInput) {
    if (typeof chainInput === 'string' && this.chainNames[chainInput]) {
      return this.chainNames[chainInput];
    }
    return chainInput;
  }

  getChainIndex(chainName) {
    for (const [index, name] of Object.entries(this.chainNames)) {
      if (name === chainName) return index;
    }
    return chainName;
  }

  getStableToken(chainIndex) {
    return this.stableTokens[chainIndex] || this.stableTokens['1'];
  }

  isEVMChain(chain) {
    return !['solana'].includes(chain);
  }

  generateTradeId() {
    return `swap_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  generateTxHash() {
    return '0x' + Array.from({length: 64}, () => Math.floor(Math.random() * 16).toString(16)).join('');
  }

  async sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // 获取交易历史
  async getTradeHistory(limit = 50) {
    try {
      return await this.databaseService.getTradeHistory(limit);
    } catch (error) {
      logger.error('获取交易历史失败:', error);
      throw error;
    }
  }

  // 获取交易统计
  getTradeStats() {
    // 这里可以添加更详细的交易统计逻辑
    return {
      isConnected: this.isConnected,
      testMode: this.testMode,
      supportedChains: Object.keys(this.chainNames),
      stableTokens: this.stableTokens
    };
  }
}

module.exports = TradingService;