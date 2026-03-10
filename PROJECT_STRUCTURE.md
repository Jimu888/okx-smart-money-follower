# 📁 项目结构

Smart Money Follower 项目的完整目录结构和文件说明。

## 🗂️ 根目录结构

```
smart-money-follower/
├── 📄 README.md                 # 主要文档和使用说明
├── 📄 QUICKSTART.md            # 快速启动指南
├── 📄 CHANGELOG.md             # 版本更新日志
├── 📄 LICENSE                  # MIT开源许可证
├── 📄 PROJECT_STRUCTURE.md     # 项目结构说明 (本文件)
├── 📄 package.json             # Node.js项目配置
├── 📄 .env.example             # 环境变量模板
├── 📄 .gitignore              # Git忽略规则
├── 📄 start.js                # 一键启动脚本
├── 📂 backend/                 # 后端服务 (Node.js + Express)
├── 📂 frontend/                # 前端界面 (React)
├── 📂 scripts/                 # 工具脚本
├── 📂 docs/                    # 详细文档
├── 📂 data/                    # 数据存储目录 (运行时创建)
├── 📂 logs/                    # 日志文件 (运行时创建)
└── 📂 backup/                  # 备份目录 (运行时创建)
```

## 🖥️ 后端结构 (backend/)

```
backend/
├── 📂 src/                     # 源代码目录
│   ├── 📄 index.js            # 应用程序入口点
│   ├── 📂 services/           # 业务逻辑服务
│   │   ├── 📄 SmartMoneyService.js    # Smart Money监控服务
│   │   ├── 📄 TradingService.js       # 交易执行服务
│   │   ├── 📄 WalletService.js        # 钱包管理服务
│   │   ├── 📄 DatabaseService.js      # 数据库服务
│   │   └── 📄 NotificationService.js  # 通知服务
│   ├── 📂 controllers/        # API控制器
│   │   ├── 📄 apiController.js        # 通用API控制器
│   │   ├── 📄 walletController.js     # 钱包API控制器
│   │   └── 📄 tradingController.js    # 交易API控制器
│   ├── 📂 routes/             # 路由定义
│   │   ├── 📄 api.js          # 主API路由
│   │   ├── 📄 wallets.js      # 钱包路由
│   │   └── 📄 trading.js      # 交易路由
│   ├── 📂 middleware/         # Express中间件
│   │   ├── 📄 auth.js         # 认证中间件
│   │   ├── 📄 validation.js   # 数据验证中间件
│   │   └── 📄 errorHandler.js # 错误处理中间件
│   ├── 📂 utils/              # 工具函数
│   │   ├── 📄 logger.js       # 日志工具
│   │   ├── 📄 crypto.js       # 加密工具
│   │   └── 📄 helpers.js      # 辅助函数
│   └── 📂 config/             # 配置文件
│       ├── 📄 database.js     # 数据库配置
│       └── 📄 constants.js    # 常量定义
└── 📂 tests/                  # 测试文件
    ├── 📄 setup.js           # 测试环境设置
    ├── 📂 unit/              # 单元测试
    └── 📂 integration/       # 集成测试
```

## 🎨 前端结构 (frontend/)

```
frontend/
├── 📄 package.json            # 前端项目配置
├── 📂 public/                 # 静态资源
│   ├── 📄 index.html         # HTML模板
│   ├── 📄 manifest.json      # PWA配置
│   └── 📂 assets/            # 图片、图标等
├── 📂 src/                    # React源代码
│   ├── 📄 index.js           # React应用入口
│   ├── 📄 App.js             # 主应用组件
│   ├── 📂 components/         # React组件
│   │   ├── 📄 Dashboard.js           # 仪表板组件
│   │   ├── 📄 WalletManager.js       # 钱包管理组件
│   │   ├── 📄 TradingView.js         # 交易视图组件
│   │   ├── 📄 Settings.js            # 设置组件
│   │   ├── 📄 Navbar.js              # 导航栏组件
│   │   ├── 📄 StatsCard.js           # 统计卡片组件
│   │   ├── 📄 MonitoringStatus.js    # 监控状态组件
│   │   ├── 📄 RecentTrades.js        # 最近交易组件
│   │   ├── 📄 WalletPerformance.js   # 钱包性能组件
│   │   └── 📄 LoadingSpinner.js      # 加载指示器组件
│   ├── 📂 services/           # API服务
│   │   ├── 📄 api.js          # API服务类
│   │   ├── 📄 websocket.js    # WebSocket服务
│   │   └── 📄 storage.js      # 本地存储服务
│   ├── 📂 hooks/              # React Hooks
│   │   ├── 📄 useApi.js       # API调用Hook
│   │   ├── 📄 useWebSocket.js # WebSocket Hook
│   │   └── 📄 useLocalStorage.js # 本地存储Hook
│   ├── 📂 store/              # 状态管理
│   │   ├── 📄 appStore.js     # 应用状态存储
│   │   ├── 📄 walletStore.js  # 钱包状态存储
│   │   └── 📄 tradingStore.js # 交易状态存储
│   ├── 📂 utils/              # 工具函数
│   │   ├── 📄 helpers.js      # 辅助函数
│   │   ├── 📄 formatters.js   # 格式化工具
│   │   └── 📄 constants.js    # 前端常量
│   └── 📂 styles/             # 样式文件
│       ├── 📄 globals.css     # 全局样式
│       ├── 📄 components.css  # 组件样式
│       └── 📄 tailwind.css    # Tailwind配置
└── 📂 build/                  # 构建输出 (运行时生成)
```

## 🛠️ 脚本目录 (scripts/)

```
scripts/
├── 📄 setup.js               # 交互式安装向导
├── 📄 install-okx-cli.sh     # OKX CLI安装脚本
├── 📄 check-env.js           # 环境检查脚本
├── 📄 migrate-db.js          # 数据库迁移脚本
├── 📄 backup-data.js         # 数据备份脚本
├── 📄 restore-data.js        # 数据恢复脚本
├── 📄 test-connection.js     # 连接测试脚本
└── 📄 deploy.sh             # 部署脚本
```

## 📚 文档目录 (docs/)

```
docs/
├── 📄 API.md                 # API文档
├── 📄 CONFIGURATION.md       # 配置说明
├── 📄 DEPLOYMENT.md          # 部署指南
├── 📄 TROUBLESHOOTING.md     # 故障排除
├── 📄 SECURITY.md            # 安全指南
├── 📄 CONTRIBUTING.md        # 贡献指南
├── 📂 images/                # 文档图片
│   ├── 📄 demo.gif          # 演示动图
│   ├── 📄 architecture.png   # 架构图
│   └── 📄 ui-preview.png     # 界面预览
└── 📂 examples/              # 示例配置
    ├── 📄 docker-compose.yml # Docker配置示例
    ├── 📄 nginx.conf         # Nginx配置示例
    └── 📄 systemd.service    # 系统服务配置
```

## 💾 运行时目录

以下目录在程序运行时自动创建：

### 数据目录 (data/)
```
data/
├── 📄 trades.json            # 交易记录数据库
├── 📄 wallets.json           # 钱包配置
├── 📄 settings.json          # 系统设置
├── 📄 stats.json             # 统计数据
└── 📂 cache/                 # 缓存文件
    ├── 📄 signals.json       # 信号缓存
    └── 📄 tokens.json        # 代币信息缓存
```

### 日志目录 (logs/)
```
logs/
├── 📄 combined.log           # 合并日志
├── 📄 error.log              # 错误日志
├── 📄 smart-money.log        # Smart Money服务日志
├── 📄 trading.log            # 交易服务日志
├── 📄 后端.log               # 后端服务日志
├── 📄 前端.log               # 前端服务日志
└── 📂 archive/               # 日志归档
    └── 📄 2026-03-07.tar.gz  # 按日期归档
```

### 备份目录 (backup/)
```
backup/
├── 📄 backup-20260307-120000.json    # 系统备份
├── 📄 trades-export-20260307.json    # 交易数据导出
└── 📂 config/                        # 配置备份
    └── 📄 .env.backup                # 环境变量备份
```

## 🔧 核心文件说明

### 配置文件
- **`.env`** - 环境变量配置 (包含API密钥、钱包信息)
- **`.env.example`** - 配置模板
- **`package.json`** - 项目依赖和脚本定义

### 启动文件
- **`start.js`** - 一键启动脚本 (推荐)
- **`backend/src/index.js`** - 后端服务入口
- **`frontend/src/App.js`** - 前端应用入口

### 核心服务
- **`SmartMoneyService.js`** - 核心监控逻辑
- **`TradingService.js`** - 交易执行引擎
- **`WalletService.js`** - 钱包管理
- **`DatabaseService.js`** - 数据持久化

### UI组件
- **`Dashboard.js`** - 主仪表板
- **`WalletManager.js`** - 钱包管理界面
- **`TradingView.js`** - 交易记录和分析
- **`Settings.js`** - 系统设置界面

## 🚀 快速导航

### 开发相关
- 添加新功能: 从 `backend/src/services/` 开始
- 修改UI: 编辑 `frontend/src/components/`
- 配置路由: 查看 `backend/src/routes/`
- API文档: 参考 `docs/API.md`

### 运维相关
- 日志查看: `logs/` 目录
- 数据备份: `backup/` 目录
- 配置修改: `.env` 文件
- 性能监控: 访问 `/health` 端点

### 故障排除
- 启动问题: 检查 `logs/combined.log`
- API错误: 查看 `logs/error.log`
- 交易失败: 检查 `logs/trading.log`
- 环境问题: 运行 `node scripts/check-env.js`

---

这个结构设计确保了：
- 🧩 **模块化**: 清晰的职责分离
- 🔧 **可维护性**: 易于定位和修改
- 📈 **可扩展性**: 支持功能添加
- 🛡️ **安全性**: 敏感文件隔离
- 🚀 **易用性**: 直观的目录组织