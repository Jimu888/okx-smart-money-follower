const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const dotenv = require('dotenv');
const winston = require('winston');
const path = require('path');
const fs = require('fs');

// 加载环境变量
dotenv.config();

// 确保运行时目录存在
['logs', 'data', 'backup'].forEach((d) => {
  const p = path.join(process.cwd(), d);
  if (!fs.existsSync(p)) fs.mkdirSync(p, { recursive: true });
});

// 导入服务模块
const SmartMoneyService = require('./services/SmartMoneyService');
const WalletService = require('./services/WalletService');
const TradingService = require('./services/TradingService');
const NotificationService = require('./services/NotificationService');
const DatabaseService = require('./services/DatabaseService');
const PositionMonitorService = require('./services/PositionMonitorService');
const OnchainOSMcpClient = require('./services/OnchainOSMcpClient');

// 导入路由
const apiRoutes = require('./routes/api');
const walletRoutes = require('./routes/wallets');
const tradingRoutes = require('./routes/trading');
const positionsRoutes = require('./routes/positions');
const smartWalletsRoutes = require('./routes/smart-wallets');

// 配置日志
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: { service: 'smart-money-follower' },
  transports: [
    new winston.transports.File({ filename: 'logs/error.log', level: 'error' }),
    new winston.transports.File({ filename: 'logs/combined.log' }),
    new winston.transports.Console({
      format: winston.format.simple()
    })
  ]
});

class SmartMoneyFollowerApp {
  constructor() {
    this.app = express();
    this.port = process.env.PORT || 3001;
    this.services = {};
    this.isRunning = false;
  }

  // 初始化应用
  async initialize() {
    try {
      logger.info('🚀 正在启动 Smart Money Follower...');

      // 验证环境变量
      this.validateEnvironment();

      // 初始化服务
      await this.initializeServices();

      // 配置Express应用
      this.configureApp();

      // 设置路由
      this.setupRoutes();

      // 错误处理
      this.setupErrorHandling();

      logger.info('✅ 应用初始化完成');
      return true;
    } catch (error) {
      logger.error('❌ 应用初始化失败:', error);
      return false;
    }
  }

  // 验证必需的环境变量
  validateEnvironment() {
    const required = [
      // For MCP we at least need OKX_API_KEY + OKX_MCP_URL; for CLI we need full triplet.
      'OKX_API_KEY',
      'WALLET_ADDRESS'
    ];

    const missing = required.filter(key => !process.env[key]);
    
    if (missing.length > 0) {
      throw new Error(`缺少必需的环境变量: ${missing.join(', ')}`);
    }

    logger.info('✅ 环境变量验证通过');
  }

  // 初始化服务
  async initializeServices() {
    logger.info('📊 正在初始化服务...');

    // 数据库服务
    this.services.database = new DatabaseService();
    await this.services.database.initialize();

    // 钱包服务
    this.services.wallet = new WalletService();
    await this.services.wallet.initialize();

    // 通知服务
    this.services.notification = new NotificationService();

    // OKX OnchainOS MCP client (preferred on Windows)
    this.services.onchainosMcp = new OnchainOSMcpClient({
      baseUrl: process.env.OKX_MCP_URL,
      apiKey: process.env.OKX_API_KEY,
      timeoutMs: Number(process.env.OKX_MCP_TIMEOUT_MS || 20000),
    });

    // 交易服务
    this.services.trading = new TradingService(
      this.services.wallet,
      this.services.database,
      this.services.notification,
      this.services.onchainosMcp
    );

    // Smart Money监控服务
    this.services.smartMoney = new SmartMoneyService(
      this.services.trading,
      this.services.database,
      this.services.notification,
      this.services.onchainosMcp
    );

    // Position 止盈止损监控（只监控已开仓）
    this.services.positionsMonitor = new PositionMonitorService({
      databaseService: this.services.database,
      tradingService: this.services.trading,
      settingsProvider: () => this.services.smartMoney.settings
    });

    logger.info('✅ 所有服务初始化完成');
  }

  // 配置Express应用
  configureApp() {
    // 安全中间件
    // Render/Cloudflare 等场景需要信任 1 层代理；不要用 true（express-rate-limit 会报 ERR_ERL_PERMISSIVE_TRUST_PROXY）
    const trustProxy = process.env.TRUST_PROXY != null ? process.env.TRUST_PROXY : 1;
    this.app.set('trust proxy', trustProxy);
    this.app.use(helmet());

    // CORS配置
    this.app.use(cors({
      origin: process.env.FRONTEND_URL || 'http://localhost:3000',
      credentials: true
    }));

    // 压缩响应
    this.app.use(compression());

    // 请求限制
    // 请求限制：本地产品默认放宽，避免前端轮询导致 429
    const limiter = rateLimit({
      windowMs: 15 * 60 * 1000, // 15分钟
      max: Number(process.env.API_RATE_LIMIT_MAX || 2000) // 每个IP最多请求数
    });
    this.app.use('/api', limiter);

    // 解析JSON
    this.app.use(express.json({ limit: '10mb' }));
    this.app.use(express.urlencoded({ extended: true }));

    // 日志中间件
    this.app.use((req, res, next) => {
      logger.info(`${req.method} ${req.path} - ${req.ip}`);
      next();
    });

    logger.info('✅ Express应用配置完成');
  }

  // 设置路由
  setupRoutes() {
    // 健康检查
    this.app.get('/health', (req, res) => {
      res.json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        version: require('../../package.json').version,
        services: {
          smartMoney: this.services.smartMoney.isRunning,
          trading: this.services.trading.isConnected,
          database: this.services.database.isConnected
        }
      });
    });

    // API路由
    this.app.use('/api', apiRoutes(this.services));
    this.app.use('/api/wallets', walletRoutes(this.services));
    this.app.use('/api/trading', tradingRoutes(this.services));
    this.app.use('/api/positions', positionsRoutes(this.services));
    this.app.use('/api/smart-wallets', smartWalletsRoutes(this.services));

    // 静态文件 (生产环境)
    if (process.env.NODE_ENV === 'production') {
      // In production, serve the built frontend
      // __dirname = smart-money-follower/backend/src
      // frontend build is at smart-money-follower/frontend/build
      this.app.use(express.static(path.join(__dirname, '../../frontend/build')));

      this.app.get('*', (req, res) => {
        res.sendFile(path.join(__dirname, '../../frontend/build/index.html'));
      });
    }

    logger.info('✅ 路由设置完成');
  }

  // 错误处理
  setupErrorHandling() {
    // 404处理
    this.app.use((req, res) => {
      res.status(404).json({
        error: 'Not Found',
        message: `Path ${req.path} not found`
      });
    });

    // 全局错误处理
    this.app.use((err, req, res, next) => {
      logger.error('未捕获的错误:', err);
      
      res.status(err.status || 500).json({
        error: 'Internal Server Error',
        message: process.env.NODE_ENV === 'production' 
          ? '服务器内部错误' 
          : err.message,
        ...(process.env.NODE_ENV !== 'production' && { stack: err.stack })
      });
    });

    // 未捕获的Promise拒绝
    process.on('unhandledRejection', (reason, promise) => {
      logger.error('未捕获的Promise拒绝:', reason);
    });

    // 未捕获的异常
    process.on('uncaughtException', (error) => {
      logger.error('未捕获的异常:', error);
      process.exit(1);
    });

    logger.info('✅ 错误处理设置完成');
  }

  // 启动服务器
  async start() {
    try {
      const initialized = await this.initialize();
      if (!initialized) {
        throw new Error('应用初始化失败');
      }

      // 启动HTTP服务器
      this.server = this.app.listen(this.port, () => {
        logger.info(`🌟 服务器运行在端口 ${this.port}`);
        logger.info(`🔗 访问地址: http://localhost:${this.port}`);
      });

      // 启动Smart Money监控
      await this.services.smartMoney.start();
      // 启动持仓止盈止损监控
      this.services.positionsMonitor.start();

      this.isRunning = true;
      logger.info('🎉 Smart Money Follower 启动成功!');

      return true;
    } catch (error) {
      logger.error('❌ 启动失败:', error);
      return false;
    }
  }

  // 优雅关闭
  async shutdown() {
    logger.info('🛑 正在关闭服务...');

    this.isRunning = false;

    // 停止Smart Money监控
    if (this.services.smartMoney) {
      await this.services.smartMoney.stop();
    }
    if (this.services.positionsMonitor) {
      this.services.positionsMonitor.stop();
    }

    // 关闭HTTP服务器
    if (this.server) {
      this.server.close(() => {
        logger.info('✅ HTTP服务器已关闭');
      });
    }

    // 关闭数据库连接
    if (this.services.database) {
      await this.services.database.close();
    }

    logger.info('✅ 服务关闭完成');
    process.exit(0);
  }
}

// 创建应用实例
const app = new SmartMoneyFollowerApp();

// 启动应用
if (require.main === module) {
  app.start().then(success => {
    if (!success) {
      process.exit(1);
    }
  });

  // 优雅关闭处理
  process.on('SIGTERM', () => app.shutdown());
  process.on('SIGINT', () => app.shutdown());
}

module.exports = app;