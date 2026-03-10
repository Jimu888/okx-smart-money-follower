class OnchainOSMcpClient {
  constructor({ baseUrl, apiKey, timeoutMs = 20000 }) {
    this.baseUrl = baseUrl || process.env.OKX_MCP_URL;
    this.apiKey = apiKey || process.env.OKX_API_KEY;
    this.timeoutMs = timeoutMs;
  }

  isConfigured() {
    return Boolean(this.baseUrl && this.apiKey);
  }

  headers() {
    return {
      'Content-Type': 'application/json',
      // As per OKX docs screenshot: OK-ACCESS-KEY
      'OK-ACCESS-KEY': this.apiKey,
    };
  }

  /**
   * NOTE: OKX MCP request schema may evolve. This implements the common MCP-over-HTTP JSON-RPC shape.
   * If your MCP server expects a different payload, adjust here.
   */
  async rpc(method, params) {
    if (!this.isConfigured()) {
      throw new Error('MCP not configured: OKX_MCP_URL / OKX_API_KEY missing');
    }

    const controller = new AbortController();
    const t = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      const res = await fetch(this.baseUrl, {
        method: 'POST',
        headers: this.headers(),
        body: JSON.stringify({ jsonrpc: '2.0', id: Date.now(), method, params }),
        signal: controller.signal,
      });

      const text = await res.text();
      let data;
      try {
        data = JSON.parse(text);
      } catch {
        throw new Error(`MCP non-JSON response: ${text.slice(0, 200)}`);
      }

      if (!res.ok) {
        throw new Error(`MCP HTTP ${res.status}: ${JSON.stringify(data).slice(0, 300)}`);
      }

      if (data.error) {
        throw new Error(`MCP error: ${JSON.stringify(data.error).slice(0, 300)}`);
      }

      return data.result;
    } finally {
      clearTimeout(t);
    }
  }

  // ---- helpers ----
  chainToIndex(chain) {
    if (!chain) return undefined;
    const c = String(chain).toLowerCase();
    const map = {
      ethereum: '1',
      eth: '1',
      bsc: '56',
      xlayer: '196',
      solana: '501',
      sol: '501',
      base: '8453',
      arbitrum: '42161',
      polygon: '137',
    };
    return map[c] || chain; // if already a number-like string, pass through
  }

  // High-level wrappers (MCP tools)
  async marketSignalList({ chain, chainIndex, walletType = '1,2,3', minAmountUsd = 1000, maxAmountUsd, minAddressCount, maxAddressCount, tokenAddress, minMarketCapUsd, maxMarketCapUsd, minLiquidityUsd, maxLiquidityUsd }) {
    const ci = chainIndex || this.chainToIndex(chain);
    // OKX MCP tool name from tools/list
    const result = await this.rpc('tools/call', {
      name: 'dex-okx-market-signal-list',
      arguments: {
        chainIndex: String(ci),
        walletType: String(walletType),
        minAmountUsd: String(minAmountUsd),
        ...(maxAmountUsd != null ? { maxAmountUsd: String(maxAmountUsd) } : {}),
        ...(minAddressCount != null ? { minAddressCount: String(minAddressCount) } : {}),
        ...(maxAddressCount != null ? { maxAddressCount: String(maxAddressCount) } : {}),
        ...(tokenAddress ? { tokenAddress: String(tokenAddress) } : {}),
        ...(minMarketCapUsd != null ? { minMarketCapUsd: String(minMarketCapUsd) } : {}),
        ...(maxMarketCapUsd != null ? { maxMarketCapUsd: String(maxMarketCapUsd) } : {}),
        ...(minLiquidityUsd != null ? { minLiquidityUsd: String(minLiquidityUsd) } : {}),
        ...(maxLiquidityUsd != null ? { maxLiquidityUsd: String(maxLiquidityUsd) } : {}),
      },
    });

    // OKX MCP tools/call returns: { content: [{ text: "{\"code\":...,\"data\":[...]}" }] }
    try {
      const text = result?.content?.[0]?.text;
      if (typeof text === 'string' && text.trim().startsWith('{')) {
        const parsed = JSON.parse(text);
        return parsed?.data || [];
      }
    } catch {
      // fall through
    }

    return result;
  }

  async marketPrice({ chain, chainIndex, tokenAddress }) {
    const ci = chainIndex || this.chainToIndex(chain);
    const addr = tokenAddress;

    const candidates = [
      'dex-okx-market-price',
      'dex-okx-market-token-price',
      'dex-okx-market-price-token',
    ];

    let lastErr;
    for (const name of candidates) {
      try {
        const result = await this.rpc('tools/call', {
          name,
          arguments: {
            chainIndex: String(ci),
            tokenAddress: String(addr),
          },
        });

        const text = result?.content?.[0]?.text;
        if (typeof text === 'string' && text.trim().startsWith('{')) {
          const parsed = JSON.parse(text);
          const px = Number(parsed?.data?.price ?? parsed?.data?.[0]?.price ?? parsed?.price);
          return Number.isFinite(px) ? px : null;
        }

        // If tool returns a direct object
        const px2 = Number(result?.price ?? result?.data?.price);
        if (Number.isFinite(px2)) return px2;
      } catch (e) {
        lastErr = e;
      }
    }

    if (lastErr) throw lastErr;
    return null;
  }

  // 获取推荐Smart Money钱包 (阶段1测试)
  // OKX MCP 当前没有直接的“smart money wallet list”工具，所以先用 mock；后续可由 signal-list 聚合生成。
  async getRecommendedWallets(chain = 'solana') {
    return this.getMockRecommendedWallets(chain);
  }

  // 模拟推荐钱包数据 (测试用)
  getMockRecommendedWallets(chain) {
    const mockWallets = {
      solana: [
        {
          address: '6VYF5jXq6MFTnqhpbAR5E5QK7fB8qK8GJKr5C7A8qC5D',
          nickname: 'Solana DeFi Alpha #1',
          performance: '+156%',
          winRate: '73%',
          totalTrades: 142,
          description: '专注Solana meme币早期发现'
        },
        {
          address: '8Hq5qY7Z3P9wW4K3V6f8qDrB2M5qN8jFG4Y6qJ5K7B9C',
          nickname: 'SOL Smart Whale',
          performance: '+234%',
          winRate: '68%',
          totalTrades: 89,
          description: '大额SOL交易，风险控制佳'
        }
      ],
      base: [
        {
          address: '0x742d35cc6434c0532925a3b8b11285b0ad3b5c32',
          nickname: 'Base DeFi Expert',
          performance: '+189%',
          winRate: '71%',
          totalTrades: 98,
          description: 'Base生态早期布局者'
        }
      ],
      ethereum: [
        {
          address: '0x8ba1f109551bd432803012645hac136c49426c43',
          nickname: 'ETH Alpha Hunter',
          performance: '+167%',
          winRate: '69%',
          totalTrades: 156,
          description: '以太坊DeFi协议专家'
        }
      ]
    };

    return mockWallets[chain] || [];
  }
}

module.exports = OnchainOSMcpClient;
