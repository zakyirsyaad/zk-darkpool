# DARX — ZK Dark Pool

Private trading powered by zero-knowledge proofs. Trade at midpoint prices with **relayer privacy**: order details (side, size, price, value, filled) are encrypted in the database; only you and the trusted relayer (backend) can see them.

---

## Overview

- **Off-chain:** Order matching via backend API and Supabase. Sensitive fields are AES-256-GCM encrypted (relayer privacy).
- **On-chain:** Settlement on Arbitrum Sepolia. A Groth16 ZK proof proves the trade is within midpoint tolerance; the contract verifies the proof and executes token transfers.
- **Frontend:** Next.js + Wagmi + RainbowKit. Connect wallet, choose BUY/SELL, enter amount (token or USDC), submit; matched orders settle automatically with a ZK proof.

---

## Project Structure

```
zk-darkpool/
├── backend/                 # Node.js API, matching, ZK proof generation
│   ├── index.js             # Express server, order & match-and-settle endpoints
│   ├── lib/
│   │   ├── crypto.js        # AES-256-GCM encryption for order data
│   │   └── supabase.js      # Supabase client
│   └── database/            # SQL schema & migrations (orders, encryption)
├── build/                   # Circom build output (wasm, zkey, witness) — generate via circuits
├── circuits/                # Circom ZK circuit (trade_check)
├── contracts/               # Solidity (DarkPool, Verifier, MockERC20)
├── interface/frontend/      # Next.js app (trade UI, orders table, wallet connect)
├── lib/openzeppelin-contracts/
└── deploy.txt              # Deploy commands & addresses (Arbitrum Sepolia)
```

---

## Tech Stack

| Layer        | Tech |
|-------------|------|
| Frontend    | Next.js 16, React 19, Wagmi, RainbowKit, Tailwind, Shadcn UI, TanStack Query & Table |
| Backend     | Node.js, Express, Supabase, snarkjs |
| Contracts   | Solidity 0.8, Foundry, OpenZeppelin |
| ZK          | Circom, Groth16 (snarkjs), Verifier.sol |
| Chain       | Arbitrum Sepolia (config in frontend + deploy.txt) |

---

## Prerequisites

- **Node.js** 18+
- **pnpm** (or npm)
- **Foundry** (forge, cast) for contracts
- **Circom** & **snarkjs** for the ZK circuit (see Circuit build below)
- **Supabase** project for the orders table
- **Arbitrum Sepolia** RPC and wallet with testnet ETH

---

## Quick Start

### 1. Backend

```bash
cd backend
cp .env.example .env   # or create .env
# Set: PORT, SUPABASE_URL, SUPABASE_ANON_KEY, RELAYER_SECRET (for encryption)
pnpm install
pnpm dev
```

Default API: `http://localhost:3001`. Ensure the `orders` table exists (see `backend/database/orders.sql`). For encrypted columns, run `backend/database/migrate_encrypted.sql` if you already had a plaintext table.

### 2. Frontend

```bash
cd interface/frontend
pnpm install
pnpm dev
```

Set `NEXT_PUBLIC_API_URL` to your backend URL (e.g. `http://localhost:3001`). Open the app and connect a wallet (Arbitrum Sepolia).

### 3. Contracts (Arbitrum Sepolia)

Addresses and RPC are in `deploy.txt`. Example flow:

1. Deploy **Verifier** (Groth16), then **MockERC20** base + quote, then **DarkPool** with verifier + base + quote addresses.
2. Update frontend config (e.g. `interface/frontend/contracts/Darkpool.ts` and token constants) with deployed addresses.
3. Optionally verify on Arbiscan (see `deploy.txt`).

### 4. ZK Circuit (trade_check)

Backend expects a pre-built circuit in `build/` (run from repo root):

- Compile Circom → `build/trade_check_js/` (wasm, generate_witness.js) and `circuit_final.zkey`, `circuit_final.ptau` (or your naming).
- Backend runs: witness generation from `input.json`, then `snarkjs groth16 prove` to produce `proof.json` and `public.json`.

If you don’t have a circuit yet, add a `circuits/trade_check.circom` and a small script to compile it and run the trusted setup; then point backend’s proof generation at the resulting artifacts.

---

## Environment

### Backend (`.env`)

| Variable          | Description |
|------------------|-------------|
| `PORT`           | Server port (e.g. 3001) |
| `SUPABASE_URL`   | Supabase project URL |
| `SUPABASE_ANON_KEY` | Supabase anon key |
| `RELAYER_SECRET` | Secret for encrypting/decrypting order fields (relayer privacy) |
| `ALLOW_INSECURE_TLS` | Optional; set `true` only for dev if TLS issues (e.g. captive portal) |

### Frontend

| Variable               | Description |
|------------------------|-------------|
| `NEXT_PUBLIC_API_URL`  | Backend base URL (e.g. `http://localhost:3001`) |

Chain and contract addresses are in the frontend config (e.g. Wagmi + Darkpool contract addresses).

---

## API (Backend)

- `POST /api/orders/submit` — Submit order; backend matches and returns order + optional match.
- `POST /api/match-and-settle` — Internal: generate ZK proof and return proof + public inputs for settlement.
- `GET /api/orders/:id?user_address=0x...` — Get order (decrypted for owner, redacted for others).
- `GET /api/users/:address/orders` — List orders for address (decrypted).
- `PATCH /api/orders/:id` — Update order (e.g. cancel).
- Other endpoints for Binance/price, health, etc.

---

## Flow (High Level)

1. User connects wallet, picks BUY/SELL and amount (token or USDC).
2. Frontend calls `POST /api/orders/submit`. Backend encrypts order data, stores in Supabase, tries to match with an open opposite order.
3. **If matched:** Backend generates a ZK proof (trade within midpoint tolerance), returns proof + public inputs. Frontend has the user approve tokens (exact amounts from proof), then calls `DarkPool.settleTrade(...)`. Backend confirms settlement in DB.
4. **If not matched:** Order stays open; user’s token is approved with buffer. When a counterparty submits a matching order, they trigger the same matched flow; the first user’s UI can poll order status until `filled`.

---

## License

MIT (or as specified in the repo).
