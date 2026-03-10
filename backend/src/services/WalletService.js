class WalletService {
  constructor() {
    this.walletAddress = process.env.WALLET_ADDRESS;
  }

  async initialize() {
    // placeholder for future: balance checks, chain-specific wallets
    return true;
  }

  getAddress() {
    return this.walletAddress;
  }
}

module.exports = WalletService;