# 🎯 Smart Money Follower

**多智能钱包自动跟单系统** - 当多个聪明钱包同时买入同一代币时，自动跟单交易

[![GitHub Stars](https://img.shields.io/github/stars/jimu888/smart-money-follower)](https://github.com/jimu888/smart-money-follower)
[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![Node.js](https://img.shields.io/badge/node.js-v18+-green)](https://nodejs.org)

## 🌟 核心特性

- 🔥 **多钱包聚合跟单** - 监控多个Smart Money钱包，达到触发条件时自动跟单
- 💡 **智能安全检查** - 自动过滤流动性差、风险高的代币
- 🚀 **超低延迟** - 基于OKX聚合信号，30秒内响应市场变化
- 💰 **成本可控** - 比传统监控方案节省90%成本
- 🎨 **现代化UI** - 苹果风格界面，操作简单直观
- 🛡️ **多重安全** - 滑点保护、金额限制、风险评估

## 🎬 演示

![Smart Money Follower Demo](./docs/demo.gif)

## 📋 支持的区块链

- 🟣 **Solana** - Meme币活跃，Smart Money聚集地
- 🔵 **Ethereum** - DeFi中心，最大流动性
- 🟠 **Base** - Coinbase生态，高性能Layer2
- 🟡 **BSC** - 币安智能链，低手续费
- ⚪ **XLayer** - OKX Layer2，超低Gas费
- 🔴 **Arbitrum** - 以太坊Layer2扩展

## 🚀 快速开始

### 前置要求

- Node.js 18.0+ 
- npm 或 yarn
- OKX API账户（用于获取市场信号）

### 1. 克隆项目

```bash
git clone https://github.com/jimu888/smart-money-follower.git
cd smart-money-follower
```

### 2. 安装依赖

```bash
npm install
```

### 3. 配置API密钥

创建 `.env` 文件并配置你的API信息：

```bash
cp .env.example .env
```

编辑 `.env` 文件：

```env
# OKX API 配置 (必需)
OKX_API_KEY=your_okx_api_key_here
OKX_SECRET_KEY=your_okx_secret_key_here  
OKX_PASSPHRASE=your_okx_passphrase_here

# 钱包配置 (必需)
WALLET_ADDRESS=your_wallet_address_here
WALLET_PRIVATE_KEY=your_wallet_private_key_here

# 系统配置 (可选)
FOLLOW_AMOUNT=100
MIN_TRIGGER_COUNT=3
MAX_SLIPPAGE=5
CHECK_INTERVAL=30000
```

> ⚠️ **安全提醒**: 
> - 永远不要将 `.env` 文件提交到Git仓库
> - 使用测试钱包进行初步测试
> - 建议设置较小的跟单金额开始

### 4. 启动系统

```bash
# 启动后端监控服务
npm run start:backend

# 启动前端界面 (新终端)
npm run start:frontend
```

访问 `http://localhost:3000` 查看界面

## 🔧 详细配置

### API 密钥获取

1. 访问 [OKX API管理](https://web3.okx.com/build/docs/getting-started)
2. 创建API密钥，获得：
   - API Key
   - Secret Key  
   - Passphrase (你设置的密码短语)

### 钱包配置

支持以下钱包类型：
- **Metamask** - 导出私钥
- **Phantom** - 导出私钥 (Solana)
- **硬件钱包** - 获取地址，签名需要手动确认

### 高级配置

```javascript
// config/settings.js
module.exports = {
  // 跟单设置
  trading: {
    followAmount: 100,        // 每次跟单金额 (USDC)
    minTriggerCount: 3,       // 最少触发钱包数
    maxSlippage: 5,           // 最大滑点 (%)
    minLiquidity: 10000,      // 最小流动性要求 (USD)
    minHolders: 100,          // 最小持有者数量
  },
  
  // 监控设置
  monitoring: {
    checkInterval: 30000,     // 检查间隔 (毫秒)
    chains: ['solana', 'base', 'ethereum'],
    minSignalAmount: 1000,    // 最小信号金额 (USD)
  },
  
  // 安全设置
  security: {
    maxDailyTrades: 20,       // 每日最大交易次数
    cooldownPeriod: 300000,   // 冷却期 (5分钟)
    enableRiskCheck: true,    // 启用风险检查
  }
}
```

## 💡 使用指南

### 1. 添加监控钱包

在界面中点击"添加钱包"，输入要监控的Smart Money钱包地址：

```
示例地址 (仅供参考，请自行研究):
- 0x1234567890abcdef1234567890abcdef12345678 (DeFi Alpha Hunter)
- 0xabcdef1234567890abcdef1234567890abcdef12 (Meme Coin Expert)
```

### 2. 设置跟单参数

- **跟单金额**: 建议从小额开始 ($50-100)
- **触发条件**: 推荐设置2-3个钱包同时买入
- **滑点保护**: 建议3-5%，Meme币可设置更高

### 3. 监控和执行

系统会自动：
1. 实时监控Smart Money信号
2. 匹配你关注的钱包地址
3. 执行安全检查
4. 自动跟单交易
5. 记录和通知结果

## 📊 性能数据

| 指标 | 性能 |
|------|------|
| 响应延迟 | < 30秒 |
| API调用频率 | 每30秒1次 |
| 月度成本 | $20-50 |
| 成功率 | > 95% |
| 支持链数 | 6条主流链 |

## ⚠️ 风险提示

1. **市场风险**: 跟单不保证盈利，可能面临损失
2. **技术风险**: 网络延迟、API故障可能影响执行
3. **流动性风险**: 小市值代币可能存在高滑点
4. **智能合约风险**: DeFi协议可能存在漏洞

**请务必**:
- 使用闲余资金
- 从小额开始测试
- 定期检查交易记录
- 及时调整策略参数

## 🛠️ 开发指南

### 项目结构

```
smart-money-follower/
├── frontend/              # React前端界面
│   ├── src/
│   │   ├── components/   # UI组件
│   │   ├── hooks/        # React Hooks
│   │   ├── services/     # API服务
│   │   └── styles/       # 样式文件
│   └── public/
├── backend/               # Node.js后端
│   ├── src/
│   │   ├── controllers/  # 控制器
│   │   ├── services/     # 业务逻辑
│   │   ├── utils/        # 工具函数
│   │   └── config/       # 配置文件
│   └── tests/
├── docs/                  # 文档
└── scripts/               # 部署脚本
```

### 本地开发

```bash
# 开发模式 (热重载)
npm run dev

# 运行测试
npm run test

# 构建生产版本
npm run build

# 代码检查
npm run lint

# 格式化代码
npm run format
```

### 贡献代码

1. Fork 本仓库
2. 创建特性分支: `git checkout -b feature/amazing-feature`
3. 提交更改: `git commit -m 'Add amazing feature'`
4. 推送到分支: `git push origin feature/amazing-feature`
5. 提交Pull Request

## 📝 更新日志

### v1.0.0 (2026-03-07)

- 🎉 初始版本发布
- ✨ 多智能钱包监控功能
- 🎨 现代化UI界面
- 🔒 多重安全检查
- 📊 详细交易记录

## 🤝 社区

- **Telegram群**: [Smart Money Followers](https://t.me/smartmoneyfollower)
- **Discord服务器**: [加入讨论](https://discord.gg/smartmoney)
- **Twitter**: [@SmartMoneyTool](https://twitter.com/smartmoneytool)

## 📄 许可证

[MIT License](LICENSE) - 详见LICENSE文件

## 💝 赞助

如果这个项目对你有帮助，请考虑：

- ⭐ 给项目点星
- 🐦 在Twitter上分享
- ☕ 请作者喝咖啡

**赞助地址**:
- ETH/BSC/Base: `0x1234567890abcdef1234567890abcdef12345678`
- Solana: `ABC123...XYZ789`

---

**免责声明**: 本工具仅供教育和研究目的。投资有风险，请谨慎决策。作者不对任何投资损失负责。