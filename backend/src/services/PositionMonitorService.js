const winston = require('winston');
const { exec } = require('child_process');
const { promisify } = require('util');

const execAsync = promisify(exec);

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.simple(),
  transports: [new winston.transports.Console(), new winston.transports.File({ filename: 'logs/positions.log' })]
});

/**
 * 监控已开仓 positions 的止盈止损。
 * - 以买入均价为基准
 * - 止盈：多档百分比卖出（每档只触发一次）
 * - 止损：触发一次全卖
 */
class PositionMonitorService {
  constructor({ databaseService, tradingService, settingsProvider }) {
    this.db = databaseService;
    this.trading = tradingService;
    this.settingsProvider = settingsProvider; // () => settings
    this.timer = null;
    this.isRunning = false;
  }

  start() {
    if (this.isRunning) return;
    this.isRunning = true;

    const interval = Number(process.env.POSITION_CHECK_INTERVAL || 30000);
    logger.info(`[positions] monitor started, interval=${interval}ms`);

    this.timer = setInterval(() => this.tick().catch((e) => logger.error(e)), interval);
    // do one immediately
    this.tick().catch((e) => logger.error(e));
  }

  stop() {
    this.isRunning = false;
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
    logger.info('[positions] monitor stopped');
  }

  async tick() {
    const settings = this.settingsProvider?.() || {};
    const tpRules = Array.isArray(settings.takeProfitRules) ? settings.takeProfitRules : [];
    const slPct = Number(settings.stopLossPercent ?? settings.stopLossPct ?? 0);

    const openPositions = await this.db.getPositions({ status: 'OPEN' });
    if (!openPositions.length) return;

    for (const p of openPositions) {
      try {
        const price = await this.getCurrentPriceUsd(p);
        if (!price) continue;

        const entry = Number(p.entryPriceUsd);
        if (!entry || entry <= 0) continue;

        const changePct = ((price - entry) / entry) * 100;
        const high = Math.max(Number(p.highWaterMarkUsd || 0), price);

        // update high watermark + last price
        await this.db.updatePosition(p.id, {
          lastPriceUsd: price,
          pnlPercent: changePct,
          highWaterMarkUsd: high,
          lastCheckedAt: Date.now()
        });

        // Stop loss: full exit
        if (slPct > 0 && changePct <= -Math.abs(slPct)) {
          logger.warn(`[positions] SL hit ${p.symbol || ''} ${changePct.toFixed(2)}% <= -${slPct}%`);
          await this.executeSell(p, 100, 'STOP_LOSS');
          continue;
        }

        // Take profit tiers
        if (tpRules.length) {
          const executed = new Set(p.executedTakeProfits || []); // store keys like "100"

          // sort ascending by profitPct
          const sorted = [...tpRules]
            .map((r) => ({ profitPct: Number(r.profitPct), sellPct: Number(r.sellPct) }))
            .filter((r) => Number.isFinite(r.profitPct) && Number.isFinite(r.sellPct) && r.profitPct > 0 && r.sellPct > 0)
            .sort((a, b) => a.profitPct - b.profitPct);

          for (const rule of sorted) {
            const key = String(rule.profitPct);
            if (executed.has(key)) continue;
            if (changePct >= rule.profitPct) {
              logger.info(`[positions] TP hit ${p.symbol || ''} +${changePct.toFixed(2)}% >= +${rule.profitPct}% sell ${rule.sellPct}%`);
              await this.executeSell(p, rule.sellPct, 'TAKE_PROFIT', key);
              break; // one action per tick
            }
          }
        }
      } catch (e) {
        logger.error(`[positions] tick error for ${p.id}: ${e.message}`);
      }
    }
  }

  async getCurrentPriceUsd(position) {
    const chain = position.chain;
    const address = position.tokenAddress;

    // Prefer MCP (works on Render/Cloud)
    try {
      if (this.trading?.onchainosMcp?.isConfigured?.()) {
        const px = await this.trading.onchainosMcp.marketPrice({ chain, tokenAddress: address });
        if (Number.isFinite(px) && px > 0) return px;
      }
    } catch {
      // ignore and fallback
    }

    // Fallback: local CLI
    const cmd = `onchainos market price ${address} --chain ${chain}`;
    try {
      const { stdout } = await execAsync(cmd, { timeout: 20000, env: process.env });
      const obj = JSON.parse(stdout.trim());
      const px = Number(obj.price);
      return Number.isFinite(px) ? px : null;
    } catch {
      return null;
    }
  }

  async executeSell(position, sellPct, reason, tpKey) {
    const pct = Math.min(100, Math.max(1, Number(sellPct)));

    // If already closed, skip
    const fresh = (await this.db.getPositions()).find((x) => x.id === position.id);
    if (!fresh || fresh.status !== 'OPEN') return;

    const sellResult = await this.trading.executeSellPosition({
      position: fresh,
      sellPct: pct,
      reason
    });

    const patch = {
      lastActionAt: Date.now(),
      lastAction: { type: 'SELL', pct, reason, success: sellResult.success, txHash: sellResult.txHash, error: sellResult.error }
    };

    // update soldPercent if success
    if (sellResult.success) {
      const prev = Number(fresh.soldPercent || 0);
      patch.soldPercent = Math.min(100, prev + (sellResult.soldPct || pct));
    }

    // mark executed tp tier
    if (reason === 'TAKE_PROFIT' && tpKey) {
      const executed = Array.isArray(fresh.executedTakeProfits) ? fresh.executedTakeProfits : [];
      patch.executedTakeProfits = Array.from(new Set([...executed, tpKey]));
    }

    // if full exit or stop loss, close
    if (pct >= 100 || reason === 'STOP_LOSS') {
      patch.status = 'CLOSED';
      patch.closedReason = reason;
      patch.closedAt = Date.now();
    }

    await this.db.updatePosition(position.id, patch);
  }
}

module.exports = PositionMonitorService;