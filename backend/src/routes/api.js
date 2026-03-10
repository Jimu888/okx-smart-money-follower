const express = require('express');

module.exports = (services) => {
  const router = express.Router();

  router.get('/stats', async (req, res, next) => {
    try {
      const base = services.smartMoney.getStats();
      const paper = await services.trading.computePaperEquity().catch(() => null);
      res.json({ ...base, ...(paper || {}) });
    } catch (e) {
      next(e);
    }
  });

  router.get('/portfolio', async (req, res, next) => {
    try {
      const snapshot = await services.trading.computePaperEquity();
      res.json(snapshot);
    } catch (e) {
      next(e);
    }
  });

  router.get('/settings', async (req, res, next) => {
    try {
      const persisted = await services.database.getSettings();
      // merge env-derived defaults
      const defaults = services.smartMoney.settings;
      res.json({ ...defaults, ...persisted });
    } catch (e) {
      next(e);
    }
  });

  router.put('/settings', async (req, res, next) => {
    try {
      const patch = req.body || {};
      await services.database.saveSettings(patch);
      await services.smartMoney.updateSettings(patch);
      res.json({ ok: true, settings: services.smartMoney.settings });
    } catch (e) {
      next(e);
    }
  });

  router.post('/monitoring/start', async (req, res, next) => {
    try {
      if (!services.smartMoney.isRunning) await services.smartMoney.start();
      res.json({ ok: true });
    } catch (e) {
      next(e);
    }
  });

  router.post('/monitoring/stop', async (req, res, next) => {
    try {
      if (services.smartMoney.isRunning) await services.smartMoney.stop();
      res.json({ ok: true });
    } catch (e) {
      next(e);
    }
  });

  router.get('/monitoring/status', (req, res) => {
    res.json({ isRunning: services.smartMoney.isRunning, stats: services.smartMoney.getStats() });
  });

  // 推荐钱包导入 (阶段1测试)
  router.get('/wallets/recommendations', async (req, res, next) => {
    try {
      const chain = req.query.chain || 'solana'; // 默认SOL链
      const recommendations = await services.onchainosMcp.getRecommendedWallets(chain);
      res.json({ 
        chain,
        recommendations: recommendations || [],
        timestamp: new Date().toISOString()
      });
    } catch (e) {
      next(e);
    }
  });

  // 添加监控钱包
  router.post('/wallets/add', async (req, res, next) => {
    try {
      console.log('📥 收到添加钱包请求:', {
        body: req.body,
        headers: req.headers,
        contentType: req.get('content-type')
      });
      
      const { address, nickname, chain } = req.body;
      console.log('🔍 解析参数:', { address, nickname, chain });
      
      if (!address) {
        return res.status(400).json({ error: 'address required' });
      }
      
      const result = await services.smartMoney.addWallet({ address, nickname, chain });
      res.json({ ok: true, wallet: result });
    } catch (e) {
      next(e);
    }
  });

  // 获取监控钱包列表
  router.get('/wallets', (req, res) => {
    res.json({ wallets: services.smartMoney.watchList || [] });
  });

  return router;
};