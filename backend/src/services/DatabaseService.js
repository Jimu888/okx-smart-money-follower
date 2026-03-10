const path = require('path');
const fs = require('fs');
const { Low } = require('lowdb');
const { JSONFile } = require('lowdb/node');

class DatabaseService {
  constructor() {
    this.isConnected = false;
    this.dbPath = process.env.DB_PATH || path.join(process.cwd(), 'data', 'db.json');
    this.db = null;
  }

  async initialize() {
    const dir = path.dirname(this.dbPath);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

    const adapter = new JSONFile(this.dbPath);
    this.db = new Low(adapter, {
      watchList: [],
      trades: [],
      positions: [],
      settings: {},
      notifications: [],
      portfolio: {
        paper: {
          initialUsd: 10000,
          cashUsd: 10000,
          realizedPnlUsd: 0,
          updatedAt: Date.now()
        }
      }
    });

    await this.db.read();
    this.db.data ||= {
      watchList: [],
      trades: [],
      positions: [],
      settings: {},
      notifications: [],
      portfolio: {
        paper: {
          initialUsd: 10000,
          cashUsd: 10000,
          realizedPnlUsd: 0,
          updatedAt: Date.now()
        }
      }
    };
    await this.db.write();

    this.isConnected = true;
    return true;
  }

  async close() {
    this.isConnected = false;
  }

  async getWatchList() {
    await this.db.read();
    return this.db.data.watchList || [];
  }

  async saveWatchList(list) {
    await this.db.read();
    this.db.data.watchList = list;
    await this.db.write();
    return true;
  }

  async saveTrade(trade) {
    await this.db.read();
    this.db.data.trades.unshift(trade);
    // cap
    if (this.db.data.trades.length > 2000) this.db.data.trades = this.db.data.trades.slice(0, 2000);
    await this.db.write();
    return trade;
  }

  async updateTrade(tradeId, patch) {
    await this.db.read();
    const idx = (this.db.data.trades || []).findIndex(t => t.id === tradeId);
    if (idx === -1) return null;
    this.db.data.trades[idx] = { ...this.db.data.trades[idx], ...patch };
    await this.db.write();
    return this.db.data.trades[idx];
  }

  async getTradeHistory(limit = 50) {
    await this.db.read();
    return (this.db.data.trades || []).slice(0, limit);
  }

  async getSettings() {
    await this.db.read();
    return this.db.data.settings || {};
  }

  async saveSettings(settings) {
    await this.db.read();
    this.db.data.settings = settings;
    await this.db.write();
    return settings;
  }

  // -------- Portfolio (paper trading) --------
  async getPortfolio() {
    await this.db.read();
    return this.db.data.portfolio || null;
  }

  async savePortfolio(portfolio) {
    await this.db.read();
    this.db.data.portfolio = portfolio;
    await this.db.write();
    return portfolio;
  }

  // -------- Positions --------
  async createPosition(position) {
    await this.db.read();
    this.db.data.positions.unshift(position);
    if (this.db.data.positions.length > 2000) this.db.data.positions = this.db.data.positions.slice(0, 2000);
    await this.db.write();
    return position;
  }

  async updatePosition(positionId, patch) {
    await this.db.read();
    const idx = (this.db.data.positions || []).findIndex((p) => p.id === positionId);
    if (idx === -1) return null;
    this.db.data.positions[idx] = { ...this.db.data.positions[idx], ...patch };
    await this.db.write();
    return this.db.data.positions[idx];
  }

  async getPositions({ status } = {}) {
    await this.db.read();
    const list = this.db.data.positions || [];
    if (!status) return list;
    return list.filter((p) => p.status === status);
  }
}


module.exports = DatabaseService;