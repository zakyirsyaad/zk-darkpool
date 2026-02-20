# DARX — ZK Dark Pool

**Private trading powered by zero-knowledge proofs.**

Trade at midpoint prices with encrypted order data. Orders are matched off-chain and settled on-chain via a Groth16 ZK proof; only you and the relayer see your order details (relayer privacy).

---

## Features

- **Private order book** — Side, size, price, value, and filled amount are AES-256-GCM encrypted in the database.
- **ZK-settled trades** — Matched trades are proven in-circuit (midpoint tolerance) and settled on Arbitrum Sepolia with a single `settleTrade` call.
- **Midpoint pricing** — BBO feeds from Binance (with CoinGecko fallback); trades clear at the midpoint.
- **Modern stack** — Next.js 16, React 19, Wagmi, RainbowKit, Supabase, Circom, snarkjs, Foundry.

---

## How it works

```
┌─────────────┐     submit order      ┌─────────────┐     match / encrypt     ┌──────────────┐
│   Frontend  │ ───────────────────► │   Backend    │ ──────────────────────► │   Supabase   │
│ (Next.js)   │                       │ (Express)    │                          │   (orders)   │
└──────┬──────┘                       └──────┬───────┘                          └──────────────┘
       │                                    │
       │  if matched:                        │  fullProve (snarkjs in-process)
       │  approve + settleTrade()            │  → proof + publicInputs
       ▼                                    ▼
┌─────────────┐                       ┌─────────────┐
│  DarkPool   │ ◄── verify proof ──── │  Groth16    │
│  (Arbitrum  │      + transfer       │  Verifier   │
│   Sepolia)  │                       │  (Solidity) │
└─────────────┘                       └─────────────┘
```

1. User connects wallet, enters amount (token or USDC), submits BUY/SELL.
2. Backend stores the order (encrypted), tries to match with an open opposite order.
3. **Matched:** Backend generates a ZK proof with `snarkjs.groth16.fullProve`; frontend approves tokens and calls `DarkPool.settleTrade(proof, buyer, seller, ...)`; backend marks both orders filled.
4. **Unmatched:** Order stays open; when a counterparty matches later, they run settlement and the first user’s UI can poll until `filled`.

---

## Tech stack

| Layer     | Technologies                                                                         |
| --------- | ------------------------------------------------------------------------------------ |
| Frontend  | Next.js 16, React 19, Wagmi, RainbowKit, Tailwind, Shadcn UI, TanStack Query & Table |
| Backend   | Node.js, Express, Supabase, snarkjs (in-process proof)                               |
| Contracts | Solidity 0.8, Foundry, OpenZeppelin                                                  |
| ZK        | Circom, Groth16 (snarkjs), Verifier.sol                                              |
| Chain     | Arbitrum Sepolia                                                                     |

---

## Project structure

```
zk-darkpool/
├── backend/                    # API, matching, ZK proof generation
│   ├── index.js                # Express app, orders + /match-and-settle
│   ├── api/index.js            # Vercel serverless entry (exports app)
│   ├── build/                  # Circuit artifacts (copy from root build/)
│   │   ├── trade_check_js/     # wasm + generate_witness.js
│   │   └── circuit_final.zkey
│   ├── lib/
│   │   ├── crypto.js           # AES-256-GCM for order encryption
│   │   └── supabase.js
│   └── database/               # SQL schema & migrations (optional, see .gitignore)
├── contracts/                  # Solidity
│   ├── DarkPool.sol
│   ├── Verifier.sol            # Groth16 verifier
│   └── MockERC20.sol
├── interface/frontend/         # Next.js app
│   ├── app/                    # Trade, orders, layout
│   ├── components/
│   ├── hooks/
│   └── constants/
├── circuits/                  # Circom source (compile → root build/, then copy to backend/build/)
├── lib/openzeppelin-contracts/
└── deploy.txt                 # Deploy commands & addresses (Arbitrum Sepolia)
```

---

## Getting started

### Prerequisites

- Node.js 18+
- pnpm (or npm)
- Foundry (for contracts)
- Circom + snarkjs (for circuit build)
- Supabase project
- Wallet on Arbitrum Sepolia

### 1. Backend

```bash
cd backend
cp .env.example .env   # or create .env
# Set: PORT, SUPABASE_URL, SUPABASE_ANON_KEY, RELAYER_SECRET
pnpm install
pnpm dev
```

- Create the `orders` table (see `backend/database/orders.sql`; if migrating to encryption, run `migrate_encrypted.sql`).
- Proof generation uses **`backend/build/`**: copy the contents of the root **`build/`** (after compiling the circuit) into **`backend/build/`** so that `trade_check_js/` and `circuit_final.zkey` are present.

### 2. Frontend

```bash
cd interface/frontend
pnpm install
pnpm dev
```

Set `NEXT_PUBLIC_API_URL` (e.g. `http://localhost:3001`). Configure chain and contract addresses (Wagmi + Darkpool contract) for Arbitrum Sepolia.

### 3. Contracts (Arbitrum Sepolia)

See `deploy.txt` for RPC and commands. Deploy in order: Verifier → MockERC20 (base + quote) → DarkPool(verifier, base, quote). Update frontend config and token constants with the deployed addresses.

### 4. Circuit

Compile the Circom circuit and run the trusted setup to produce `build/trade_check_js/` and `circuit_final.zkey`. Copy the entire **`build/`** output into **`backend/build/`** so the backend can generate proofs (in-process via snarkjs, no CLI).

---

## Environment

| Variable              | Where    | Description                                   |
| --------------------- | -------- | --------------------------------------------- |
| `PORT`                | Backend  | Server port (e.g. 3001)                       |
| `SUPABASE_URL`        | Backend  | Supabase project URL                          |
| `SUPABASE_ANON_KEY`   | Backend  | Supabase anon key                             |
| `RELAYER_SECRET`      | Backend  | Secret for order encryption (relayer privacy) |
| `NEXT_PUBLIC_API_URL` | Frontend | Backend API base URL                          |

---

## API overview

| Method | Path                                             | Description                                       |
| ------ | ------------------------------------------------ | ------------------------------------------------- |
| POST   | `/api/orders/submit`                             | Submit order; returns order + optional match      |
| POST   | `/match-and-settle`                              | Generate ZK proof (used by frontend when matched) |
| GET    | `/api/orders/:id?user_address=0x...`             | Get order (decrypted for owner)                   |
| GET    | `/api/users/:address/orders`                     | List orders for address (decrypted)               |
| PATCH  | `/api/orders/:id`                                | Update order (e.g. cancel)                        |
| GET    | `/api/binance/prices`, `/api/binance/bookTicker` | Price proxy (Binance + fallback)                  |

---

## Deployment

- **Backend:** Deploy the `backend/` folder (e.g. Vercel with `api/index.js`). Ensure **`backend/build/`** is included (circuit wasm + zkey). Proof is generated in-process with `snarkjs.groth16.fullProve` (no `npx`/CLI).
- **Frontend:** Set `NEXT_PUBLIC_API_URL` to the deployed backend URL. Deploy to Vercel or any static/Node host.

See **`backend/README-SETUP.md`** for EACCES, temp dir, and circuit copy details.

---

## License

MIT
