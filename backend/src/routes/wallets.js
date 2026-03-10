const express = require('express');

module.exports = (services) => {
  const router = express.Router();

  router.get('/', async (req, res, next) => {
    try {
      res.json(await services.database.getWatchList());
    } catch (e) {
      next(e);
    }
  });

  router.post('/', async (req, res, next) => {
    try {
      const { address, nickname } = req.body || {};
      const wallet = await services.smartMoney.addWallet({ address, nickname });
      res.json(wallet);
    } catch (e) {
      // translate common user errors to proper status codes
      const msg = String(e?.message || '');
      if (msg.includes('已在监控列表') || msg.includes('已在监控') || msg.includes('already')) {
        return res.status(409).json({ message: 'wallet already exists' });
      }
      if (msg.includes('无效') || msg.includes('不能为空') || msg.includes('格式')) {
        return res.status(400).json({ message: msg });
      }
      next(e);
    }
  });

  router.delete('/:address', async (req, res, next) => {
    try {
      const removed = await services.smartMoney.removeWallet(req.params.address);
      res.json(removed);
    } catch (e) {
      next(e);
    }
  });

  router.get('/performance', async (req, res) => {
    // MVP stub
    res.json({ wallets: await services.database.getWatchList() });
  });

  return router;
};