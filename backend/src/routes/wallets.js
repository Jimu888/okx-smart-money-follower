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