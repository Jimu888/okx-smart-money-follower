const express = require('express');

// Aggregate triggerWalletAddress from OKX signal-list into a ranked wallet list.
module.exports = (services) => {
  const router = express.Router();

  router.get('/recommend', async (req, res, next) => {
    try {
      const chain = (req.query.chain || 'solana').toString();
      const walletType = (req.query.walletType || '1,2').toString();
      const minAmountUsd = Number(req.query.minAmountUsd || 1000);
      const limit = Number(req.query.limit || 30);

      const result = await services.smartMoney.getRecommendedWallets({ chain, walletType, minAmountUsd, limit });
      res.json(result);
    } catch (e) {
      next(e);
    }
  });

  return router;
};