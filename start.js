#!/usr/bin/env node

const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

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
  title: (msg) => console.log(`\n${colors.cyan}${colors.bright}${msg}${colors.reset}`)
};

class SmartMoneyStarter {
  constructor() {
    this.projectRoot = path.resolve(__dirname);
    this.processes = [];
    this.isShuttingDown = false;
  }

  async start() {
    try {
      log.title('🚀 启动 Smart Money Follower');

      // 检查环境
      await this.checkEnvironment();

      // 启动服务
      await this.startServices();

      // 设置信号处理
      this.setupSignalHandlers();

      log.success('🎉 系统启动成功!');
      console.log('\n📊 访问地址:');
      console.log(`   前端界面: ${colors.cyan}http://localhost:3000${colors.reset}`);
      console.log(`   后端API: ${colors.cyan}http://localhost:3001${colors.reset}`);
      console.log(`   健康检查: ${colors.cyan}http://localhost:3001/health${colors.reset}`);
      
      console.log('\n⌨️  快捷键:');
      console.log('   Ctrl+C: 停止所有服务');
      console.log('   查看日志: tail -f logs/combined.log\n');

      // 保持进程运行
      await this.keepAlive();

    } catch (error) {
      log.error(`启动失败: ${error.message}`);
      await this.cleanup();
      process.exit(1);
    }
  }

  async checkEnvironment() {
    log.info('🔍 检查运行环境...');

    // 检查.env文件
    const envPath = path.join(this.projectRoot, '.env');
    if (!fs.existsSync(envPath)) {
      log.warning('.env 文件不存在');
      log.info('运行设置向导...');
      
      // 运行设置向导
      const setupScript = path.join(this.projectRoot, 'scripts', 'setup.js');
      if (fs.existsSync(setupScript)) {
        const setup = require('./scripts/setup.js');
        await new setup().run();
      } else {
        throw new Error('请先创建.env文件，参考.env.example');
      }
    }

    // 检查node_modules
    const nodeModulesPath = path.join(this.projectRoot, 'node_modules');
    if (!fs.existsSync(nodeModulesPath)) {
      log.info('📦 安装依赖...');
      const npmCmd = process.platform === 'win32' ? 'npm.cmd' : 'npm';
      await this.runCommand(npmCmd, ['install'], this.projectRoot);
    }

    const frontendNodeModulesPath = path.join(this.projectRoot, 'frontend', 'node_modules');
    if (!fs.existsSync(frontendNodeModulesPath)) {
      log.info('📦 安装前端依赖...');
      const npmCmd = process.platform === 'win32' ? 'npm.cmd' : 'npm';
      await this.runCommand(npmCmd, ['install'], path.join(this.projectRoot, 'frontend'));
    }

    // 检查目录
    const dirs = ['data', 'logs', 'backup'];
    dirs.forEach(dir => {
      const dirPath = path.join(this.projectRoot, dir);
      if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath, { recursive: true });
        log.info(`创建目录: ${dir}/`);
      }
    });

    log.success('环境检查完成');
  }

  async startServices() {
    log.info('🛠️ 启动服务...');

    // 启动后端
    log.info('启动后端服务...');
    const backendProcess = spawn('node', ['backend/src/index.js'], {
      cwd: this.projectRoot,
      stdio: ['pipe', 'pipe', 'pipe'],
      env: { ...process.env, NODE_ENV: 'development' }
    });

    this.setupProcessLogging(backendProcess, '后端');
    this.processes.push({ name: '后端', process: backendProcess });

    // 等待后端启动
    await this.waitForBackend();

    // 启动前端
    log.info('启动前端服务...');
    const npmCmd = process.platform === 'win32' ? 'npm.cmd' : 'npm';
    const frontendProcess = spawn(npmCmd, ['start'], {
      cwd: path.join(this.projectRoot, 'frontend'),
      stdio: ['pipe', 'pipe', 'pipe'],
      env: { ...process.env, BROWSER: 'none' }
    });

    this.setupProcessLogging(frontendProcess, '前端');
    this.processes.push({ name: '前端', process: frontendProcess });

    // 等待前端启动
    await this.sleep(3000);
  }

  setupProcessLogging(process, name) {
    const logFile = path.join(this.projectRoot, 'logs', `${name.toLowerCase()}.log`);
    const logStream = fs.createWriteStream(logFile, { flags: 'a' });

    process.stdout.on('data', (data) => {
      const message = data.toString().trim();
      if (message) {
        console.log(`${colors.cyan}[${name}]${colors.reset} ${message}`);
        logStream.write(`[${new Date().toISOString()}] ${message}\n`);
      }
    });

    process.stderr.on('data', (data) => {
      const message = data.toString().trim();
      if (message) {
        console.log(`${colors.red}[${name} ERROR]${colors.reset} ${message}`);
        logStream.write(`[${new Date().toISOString()}] ERROR: ${message}\n`);
      }
    });

    process.on('close', (code) => {
      const message = `${name} 进程退出，代码: ${code}`;
      console.log(`${colors.yellow}[${name}]${colors.reset} ${message}`);
      logStream.write(`[${new Date().toISOString()}] ${message}\n`);
      logStream.end();
    });
  }

  async waitForBackend() {
    log.info('⏳ 等待后端启动...');
    
    let attempts = 0;
    const maxAttempts = 30;

    while (attempts < maxAttempts) {
      try {
        const response = await fetch('http://localhost:3001/health');
        if (response.ok) {
          log.success('后端服务就绪');
          return;
        }
      } catch (error) {
        // 后端尚未启动
      }

      await this.sleep(1000);
      attempts++;
    }

    throw new Error('后端启动超时');
  }

  async runCommand(command, args, cwd) {
    return new Promise((resolve, reject) => {
      const child = spawn(command, args, { cwd, stdio: 'inherit' });
      
      child.on('close', (code) => {
        if (code === 0) {
          resolve();
        } else {
          reject(new Error(`命令失败，退出代码: ${code}`));
        }
      });

      child.on('error', reject);
    });
  }

  setupSignalHandlers() {
    const signals = ['SIGINT', 'SIGTERM'];
    
    signals.forEach(signal => {
      process.on(signal, async () => {
        if (this.isShuttingDown) return;
        
        this.isShuttingDown = true;
        log.info(`\n🛑 收到 ${signal} 信号，正在关闭服务...`);
        
        await this.cleanup();
        process.exit(0);
      });
    });
  }

  async cleanup() {
    if (this.processes.length === 0) return;

    log.info('🧹 清理进程...');

    for (const { name, process } of this.processes) {
      if (!process.killed) {
        log.info(`停止 ${name} 服务...`);
        process.kill('SIGTERM');
        
        // 等待进程退出
        await Promise.race([
          new Promise(resolve => process.on('close', resolve)),
          this.sleep(5000) // 5秒超时
        ]);

        if (!process.killed) {
          log.warning(`强制停止 ${name} 服务`);
          process.kill('SIGKILL');
        }
      }
    }

    this.processes = [];
    log.success('所有服务已停止');
  }

  async keepAlive() {
    return new Promise(resolve => {
      process.stdin.setRawMode(true);
      process.stdin.resume();
      
      process.stdin.on('data', async (data) => {
        const key = data.toString();
        
        // Ctrl+C
        if (key === '\u0003') {
          await this.cleanup();
          resolve();
        }
      });
    });
  }

  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// 主函数
async function main() {
  // 显示启动横幅
  console.clear();
  console.log(colors.cyan + colors.bright);
  console.log('╔══════════════════════════════════════════════════════════════╗');
  console.log('║                                                              ║');
  console.log('║               🎯 Smart Money Follower                        ║');
  console.log('║                                                              ║');
  console.log('║           多智能钱包自动跟单系统                               ║');
  console.log('║                                                              ║');
  console.log('╚══════════════════════════════════════════════════════════════╝');
  console.log(colors.reset);

  const starter = new SmartMoneyStarter();
  await starter.start();
}

// 只在直接运行时启动
if (require.main === module) {
  main().catch(error => {
    console.error('\n启动失败:', error.message);
    process.exit(1);
  });
}

module.exports = SmartMoneyStarter;