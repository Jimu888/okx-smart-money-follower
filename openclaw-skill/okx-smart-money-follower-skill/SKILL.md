---
name: okx-smart-money-follower-skill
description: Operate/deploy the OKX Smart Money Follower (paper trading) project via OpenClaw. Use when users ask to install/run the smart-money-follower app, start/stop the local services (frontend 3000 + backend 3001), configure OKX OnchainOS MCP (OKX_MCP_URL/OKX_API_KEY), enable TEST_MODE paper trading, troubleshoot connection/proxy errors, or package the project as an OpenClaw Skill.
---

# OKX Smart Money Follower (OpenClaw Skill)

## Safety first
- **Default is paper trading**: keep `TEST_MODE=true` unless the user explicitly asks for real trading.
- **Never commit secrets**: `.env` must stay local. Only commit `.env.example`.

## Quick run (local)

### 1) Configure env
Create `smart-money-follower/.env` (copy from `.env.example`). Minimum for MCP mode:
- `OKX_MCP_URL=https://web3.okx.com/api/v1/onchainos-mcp`
- `OKX_API_KEY=...`
- `WALLET_ADDRESS=0x...` (placeholder ok in TEST_MODE)
- `TEST_MODE=true`

Optional:
- `MAX_DAILY_TRADES=200`
- `SIGNAL_MAX_AGE_MS=600000` (10 minutes)

### 2) Start backend + frontend
From repo root `smart-money-follower/`:
- Backend: `node backend/src/index.js`
- Frontend: `cd frontend && npm start`

Open:
- `http://localhost:3000`

## Troubleshooting
- UI shows "无法连接到服务器": backend not running on 3001 or CRA proxy broken.
  - Check: `http://127.0.0.1:3001/health`
  - Restart backend.
- Recommended wallets says MCP not configured:
  - Ensure `OKX_MCP_URL` + `OKX_API_KEY` present in backend env.

## Packaging notes
If packaging as distributable `.skill` is needed, use OpenClaw's `scripts/package_skill.py` on this skill folder.

## Attribution
- Author: **@0xjimumu** (https://x.com/0xjimumu)
- Powered by **OKX OnchainOS**
