#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const readline = require('readline');
const { exec } = require('child_process');
const { promisify } = require('util');

const execAsync = promisify(exec);

// 颜色输出
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

const log = {
  info: (msg) => console.log(`${colors.blue}ℹ${colors.reset} ${msg}`),
  success: (msg) => console.log(`${colors.green}✅${colors.reset} ${msg}`),
  warning: (msg) => console.log(`${colors.yellow}⚠️${colors.reset} ${msg}`),
  error: (msg) => console.log(`${colors.red}❌${colors.reset} ${msg}`),
  title: (msg) => console.log(`\n${colors.cyan}${colors.bright}${msg}${colors.reset}\n`)
};

// 创建readline接口
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

const question = (query) => new Promise(resolve => rl.question(query, resolve));

class SmartMoneySetup {
  constructor() {
    this.projectRoot = path.resolve(__dirname, '..');
    this.envPath = path.join(this.projectRoot, '.env');
    this.envExamplePath = path.join(this.projectRoot, '.env.example');
  }

  async run() {
    try {
      log.title('🎯 Smart Money Follower 安装向导');
      
      console.log('欢迎使用Smart Money Follower！');
      console.log('这个向导将帮助您完成初始设置。\n');

      // 检查系统环境
      await this.checkSystemRequirements();

      // 安装依赖
      await this.installDependencies();

      // 检查OKX CLI
      await this.setupOKXCLI();

      // 配置环境变量
      await this.setupEnvironment();

      // 创建数据目录
      await this.createDirectories();

      // 最终检查
      await this.finalCheck();

      log.success('🎉 设置完成！');
      console.log('\n下一步:');
      console.log('1. 启动后端: npm run start:backend');
      console.log('2. 启动前端: npm run start:frontend');
      console.log('3. 访问: http://localhost:3000\n');

    } catch (error) {
      log.error(`设置失败: ${error.message}`);
      process.exit(1);
    } finally {
      rl.close();
    }
  }

  async checkSystemRequirements() {
    log.title('🔍 检查系统环境');

    // 检查Node.js版本
    try {
      const { stdout } = await execAsync('node --version');
      const nodeVersion = stdout.trim();
      log.info(`Node.js 版本: ${nodeVersion}`);
      
      const majorVersion = parseInt(nodeVersion.slice(1).split('.')[0]);
      if (majorVersion < 18) {
        throw new Error(`需要Node.js 18.0+，当前版本: ${nodeVersion}`);
      }
      log.success('Node.js 版本符合要求');
    } catch (error) {
      throw new Error('Node.js 未安装或版本过低');
    }

    // 检查npm
    try {
      const { stdout } = await execAsync('npm --version');
      log.info(`npm 版本: ${stdout.trim()}`);
      log.success('npm 可用');
    } catch (error) {
      throw new Error('npm 未安装');
    }

    // 检查git (可选)
    try {
      await execAsync('git --version');
      log.success('Git 可用');
    } catch (error) {
      log.warning('Git 未安装 (可选)');
    }
  }

  async installDependencies() {
    log.title('📦 安装依赖');

    log.info('正在安装后端依赖...');
    try {
      await execAsync('npm install', { 
        cwd: this.projectRoot,
        stdio: 'pipe'
      });
      log.success('后端依赖安装完成');
    } catch (error) {
      throw new Error(`后端依赖安装失败: ${error.message}`);
    }

    log.info('正在安装前端依赖...');
    try {
      await execAsync('npm install', { 
        cwd: path.join(this.projectRoot, 'frontend'),
        stdio: 'pipe'
      });
      log.success('前端依赖安装完成');
    } catch (error) {
      throw new Error(`前端依赖安装失败: ${error.message}`);
    }
  }

  async setupOKXCLI() {
    log.title('🛠️ 设置 OKX OnchainOS CLI');

    // 检查是否已安装
    try {
      const { stdout } = await execAsync('which onchainos');
      if (stdout.trim()) {
        log.success('OKX CLI 已安装');
        return;
      }
    } catch (error) {
      // CLI 未安装，继续安装流程
    }

    log.info('OKX CLI 未安装，正在自动安装...');
    try {
      await execAsync('curl -sSL https://raw.githubusercontent.com/okx/onchainos-skills/main/install.sh | sh');
      log.success('OKX CLI 安装完成');
    } catch (error) {
      log.error('OKX CLI 自动安装失败');
      console.log('\n请手动安装OKX CLI:');
      console.log('curl -sSL https://raw.githubusercontent.com/okx/onchainos-skills/main/install.sh | sh\n');
      
      const proceed = await question('是否继续设置? (y/n): ');
      if (proceed.toLowerCase() !== 'y') {
        throw new Error('用户取消安装');
      }
    }
  }

  async setupEnvironment() {
    log.title('⚙️ 配置环境变量');

    // 检查是否已存在.env文件
    if (fs.existsSync(this.envPath)) {
      log.warning('.env 文件已存在');
      const overwrite = await question('是否覆盖现有配置? (y/n): ');
      if (overwrite.toLowerCase() !== 'y') {
        log.info('跳过环境变量配置');
        return;
      }
    }

    console.log('\n请提供以下信息以配置系统:');

    // OKX API配置
    console.log('\n🔑 OKX API 配置 (必需)');
    console.log('请访问 https://web3.okx.com/build/docs/getting-started 获取API密钥\n');

    const okxApiKey = await question('OKX API Key: ');
    if (!okxApiKey.trim()) {
      throw new Error('OKX API Key 是必需的');
    }

    const okxSecretKey = await question('OKX Secret Key: ');
    if (!okxSecretKey.trim()) {
      throw new Error('OKX Secret Key 是必需的');
    }

    const okxPassphrase = await question('OKX Passphrase: ');
    if (!okxPassphrase.trim()) {
      throw new Error('OKX Passphrase 是必需的');
    }

    // 钱包配置
    console.log('\n👛 钱包配置 (必需)');
    console.log('⚠️  安全提醒: 建议使用专门的交易钱包，不要使用主钱包');
    console.log('请确保钱包中有足够的USDC用于跟单交易\n');

    const walletAddress = await question('钱包地址: ');
    if (!walletAddress.trim()) {
      throw new Error('钱包地址是必需的');
    }

    // 私钥 (可选，用于自动签名)
    console.log('\n🔐 私钥配置 (可选)');
    console.log('如果提供私钥，系统可以自动签名交易');
    console.log('如果不提供，需要手动签名每笔交易');
    const wantAutoSign = await question('是否启用自动签名? (y/n): ');
    
    let walletPrivateKey = '';
    if (wantAutoSign.toLowerCase() === 'y') {
      walletPrivateKey = await question('钱包私钥 (0x开头): ');
    }

    // 交易配置
    console.log('\n💰 交易配置');
    const followAmount = await question('每次跟单金额 (USDC, 默认100): ') || '100';
    const minTriggerCount = await question('最少触发钱包数 (默认3): ') || '3';
    const maxSlippage = await question('最大滑点 (%, 默认5): ') || '5';

    // 生成.env文件
    const envContent = `# Smart Money Follower 配置
# 生成时间: ${new Date().toISOString()}

# ===== OKX API 配置 =====
OKX_API_KEY=${okxApiKey}
OKX_SECRET_KEY=${okxSecretKey}
OKX_PASSPHRASE=${okxPassphrase}

# ===== 钱包配置 =====
WALLET_ADDRESS=${walletAddress}
${walletPrivateKey ? `WALLET_PRIVATE_KEY=${walletPrivateKey}` : '# WALLET_PRIVATE_KEY=your_private_key_here'}

# ===== 交易配置 =====
FOLLOW_AMOUNT=${followAmount}
MIN_TRIGGER_COUNT=${minTriggerCount}
MAX_SLIPPAGE=${maxSlippage}
CHECK_INTERVAL=30000

# ===== 安全配置 =====
MAX_DAILY_TRADES=20
COOLDOWN_PERIOD=300000
MIN_LIQUIDITY=10000
MIN_HOLDERS=100

# ===== 系统配置 =====
SUPPORTED_CHAINS=solana,base,ethereum
LOG_LEVEL=info
TEST_MODE=true
DEV_MODE=false
`;

    fs.writeFileSync(this.envPath, envContent);
    log.success('.env 文件创建完成');
    
    if (!walletPrivateKey) {
      log.warning('⚠️  未提供私钥，交易需要手动签名');
    }
  }

  async createDirectories() {
    log.title('📁 创建目录结构');

    const directories = [
      'data',
      'logs',
      'backup'
    ];

    for (const dir of directories) {
      const dirPath = path.join(this.projectRoot, dir);
      if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath, { recursive: true });
        log.success(`创建目录: ${dir}/`);
      }
    }
  }

  async finalCheck() {
    log.title('🔍 最终检查');

    // 检查.env文件
    if (fs.existsSync(this.envPath)) {
      log.success('.env 文件存在');
    } else {
      throw new Error('.env 文件不存在');
    }

    // 检查数据目录
    const dataDir = path.join(this.projectRoot, 'data');
    if (fs.existsSync(dataDir)) {
      log.success('数据目录存在');
    }

    // 测试OKX CLI
    try {
      require('dotenv').config({ path: this.envPath });
      
      // 简单的CLI测试 (不执行实际命令，避免API调用)
      const { stdout } = await execAsync('onchainos --help');
      if (stdout.includes('onchainos')) {
        log.success('OKX CLI 可用');
      }
    } catch (error) {
      log.warning('OKX CLI 测试失败，请手动验证');
    }

    log.info('基本设置检查完成');
  }
}

// 运行安装向导
if (require.main === module) {
  const setup = new SmartMoneySetup();
  setup.run().catch(error => {
    console.error('\n设置失败:', error.message);
    process.exit(1);
  });
}

module.exports = SmartMoneySetup;