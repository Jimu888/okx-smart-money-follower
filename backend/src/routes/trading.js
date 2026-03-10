const express = require('express');

module.exports = (services) => {
  const router = express.Router();

  router.get('/history', async (req, res, next) => {
    try {
      const limit = Number(req.query.limit || 50);
      res.json(await services.database.getTradeHistory(limit));
    } catch (e) {
      next(e);
    }
  });

  router.get('/stats', (req, res) => {
    res.json(services.trading.getTradeStats());
  });

  router.post('/simulate', async (req, res, next) => {
    try {
      // Placeholder: in MVP return ok
      res.json({ ok: true });
    } catch (e) {
      next(e);
    }
  });

  return router;
};