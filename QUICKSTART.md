# 🚀 快速启动指南

只需5分钟即可启动Smart Money Follower！

## ⚡ 一键启动

```bash
# 1. 克隆项目
git clone https://github.com/jimu888/smart-money-follower.git
cd smart-money-follower

# 2. 运行一键启动脚本
node start.js
```

启动脚本会自动：
- 检查环境依赖
- 安装必要包
- 引导API配置
- 启动所有服务

## 🔧 手动设置 (可选)

如果遇到问题，可以手动执行以下步骤：

### 1. 环境准备

```bash
# 检查Node.js版本 (需要18.0+)
node --version

# 安装依赖
npm install
cd frontend && npm install && cd ..
```

### 2. 配置API

```bash
# 复制配置模板
cp .env.example .env

# 编辑配置文件
nano .env  # 或使用你喜欢的编辑器
```

**必需配置**：
```env
# OKX API (从 https://web3.okx.com/build/docs/getting-started 获取)
OKX_API_KEY=your_api_key
OKX_SECRET_KEY=your_secret_key
OKX_PASSPHRASE=your_passphrase

# 钱包地址
WALLET_ADDRESS=your_wallet_address

# 跟单设置
FOLLOW_AMOUNT=100        # 每次跟单金额(USDC)
MIN_TRIGGER_COUNT=3      # 最少触发钱包数
MAX_SLIPPAGE=5          # 最大滑点(%)
```

### 3. 启动服务

```bash
# 启动后端
npm run start:backend

# 新终端启动前端
npm run start:frontend
```

## 📱 使用界面

访问 http://localhost:3000

### 首次设置
1. **添加监控钱包** - 输入要跟踪的Smart Money钱包地址
2. **配置参数** - 设置跟单金额和触发条件
3. **启动监控** - 点击开始按钮
4. **查看实时数据** - 监控面板会显示所有活动

### 核心功能
- 📊 **实时监控** - 30秒检查间隔
- 🎯 **智能跟单** - 多钱包触发机制
- 🛡️ **安全检查** - 自动过滤风险代币
- 📈 **性能追踪** - 详细交易记录

## ⚙️ 重要设置

### 安全建议
- ✅ 使用专门的交易钱包
- ✅ 从小额开始测试 ($10-50)
- ✅ 启用测试模式 (`TEST_MODE=true`)
- ✅ 设置合理的每日交易限制

### 推荐配置
```env
# 新手配置
FOLLOW_AMOUNT=50
MIN_TRIGGER_COUNT=2
MAX_SLIPPAGE=3
MAX_DAILY_TRADES=10

# 进阶配置  
FOLLOW_AMOUNT=200
MIN_TRIGGER_COUNT=3
MAX_SLIPPAGE=5
MAX_DAILY_TRADES=20
```

## 🎯 添加监控钱包

### 如何找到Smart Money钱包？

**方法1: 使用已知地址**
```
示例地址 (仅供参考):
- 0x1234567890abcdef... (DeFi专家)
- 0xabcdef1234567890... (Meme猎人)
- ABC123XYZ789... (Solana巨鲸)
```

**方法2: 研究工具**
- [Nansen.ai](https://nansen.ai) - Smart Money标签
- [Arkham.intelligence](https://arkham.com) - 钱包分析
- [Debank.com](https://debank.com) - 投资组合追踪

**方法3: 社区分享**
- Twitter KOL公开地址
- Discord/Telegram群组推荐
- 技术分析师公开钱包

### 添加钱包步骤
1. 进入"钱包管理"页面
2. 点击"添加钱包"
3. 输入地址和昵称
4. 验证地址格式
5. 保存到监控列表

## 🔍 监控逻辑

系统会：
1. **每30秒** 检查OKX Smart Money信号
2. **匹配** 你监控的钱包地址
3. **验证** 触发条件 (如：3个钱包同时买入)
4. **分析** 代币安全性 (流动性、持有者、税费)
5. **执行** 自动跟单交易
6. **记录** 交易结果和性能

## ❓ 常见问题

### Q: 为什么没有自动跟单？
A: 检查以下几点：
- ✅ 监控是否启动
- ✅ 是否达到触发条件
- ✅ 代币是否通过安全检查
- ✅ 是否超过每日交易限制

### Q: 如何提高成功率？
A: 
- 选择质量高的Smart Money钱包
- 调整触发条件 (2-4个钱包)
- 关注特定链 (如Solana meme币活跃)
- 定期更新监控列表

### Q: 测试模式是什么？
A: `TEST_MODE=true` 时：
- 不执行真实交易
- 模拟交易结果
- 用于测试配置和逻辑
- 建议新用户开启

### Q: 支持哪些区块链？
A: 目前支持：
- 🟣 Solana (Meme币活跃)
- 🔵 Ethereum (DeFi中心)
- 🟠 Base (Layer2高性能)
- 🟡 BSC (低手续费)
- ⚪ XLayer (超低Gas)
- 🔴 Arbitrum (扩容方案)

## 🆘 获取帮助

- **GitHub Issues**: [问题反馈](https://github.com/jimu888/smart-money-follower/issues)
- **Telegram群**: [技术讨论](https://t.me/smartmoneyfollower)
- **Discord服务器**: [社区支持](https://discord.gg/smartmoney)

## 🎉 开始使用

现在运行：
```bash
node start.js
```

系统启动后访问 http://localhost:3000 开始您的Smart Money跟单之旅！

---

**⚠️ 风险提醒**: 请仅使用闲余资金，加密货币交易存在重大风险。