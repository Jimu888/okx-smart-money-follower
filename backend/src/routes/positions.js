const express = require('express');

module.exports = (services) => {
  const router = express.Router();

  router.get('/', async (req, res, next) => {
    try {
      const status = req.query.status;
      const positions = await services.database.getPositions({ status });
      res.json(positions);
    } catch (e) {
      next(e);
    }
  });

  router.post('/:id/sell', async (req, res, next) => {
    try {
      const id = req.params.id;
      const { sellPct = 100 } = req.body || {};
      const all = await services.database.getPositions();
      const position = all.find((p) => p.id === id);
      if (!position) return res.status(404).json({ message: 'position not found' });

      const result = await services.trading.executeSellPosition({ position, sellPct: Number(sellPct), reason: 'MANUAL' });
      res.json(result);
    } catch (e) {
      next(e);
    }
  });

  return router;
};