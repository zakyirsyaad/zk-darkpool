# ZK Dark Pool — Backend

Backend for **DARX**: relayer/match-and-settle with zero-knowledge proof (Groth16), encrypted order book on Supabase, and price proxy (Binance/CoinGecko).

## Requirements

- **Node.js** (v18+ recommended)
- **Supabase** — project with `orders` table
- **ZK Circuit** — circom build in `../build/` (trade_check.wasm, circuit_final.zkey, generate_witness.js)

## Installation

```bash
npm install
```

## Configuration

Create a `.env` file in the `backend/` root and set the following variables:

| Variable | Description |
|----------|-------------|
| `SUPABASE_URL` | Your Supabase project URL |
| `SUPABASE_SERVICE_KEY` | Service role key (not anon key) |
| `RELAYER_SECRET` | Secret for order encryption (AES-256-GCM). **Required** in production. |
| `ALLOW_INSECURE_TLS` | `true` for dev only (bypass TLS verification, e.g. when ISP blocks) |

## Running

```bash
# Development (nodemon, auto-reload)
npm start

# Or run once
npm run dev
```

Server runs at **http://localhost:3001**.

## Structure

```
backend/
├── index.js          # Express app, routes, match-and-settle, price proxy
├── lib/
│   ├── supabase.js   # Supabase client
│   └── crypto.js     # Order encrypt/decrypt (AES-256-GCM)
├── package.json
├── .env              # Not committed (see .gitignore)
└── README.md
```

## API

### ZK Match & Settle

- **POST** `/match-and-settle`  
  Body: `{ amountBase, amountQuote, ticker }`  
  Fetches midpoint (Binance → CoinGecko → fallback), generates witness + Groth16 proof, returns calldata for the contract (`a`, `b`, `c`, `publicInputs`).

### Price

- **GET** `/api/binance/prices?symbols=...` — Price proxy (30s cache, fallback CoinGecko/static).
- **GET** `/api/binance/bookTicker?symbol=...` — Book ticker (bid/ask) with fallback.
- **GET** `/api/my-tokens` — Wallet token list + prices from DexScreener (ARB, GMX, RDNT, MAGIC).

### Orders (Supabase, sensitive fields encrypted)

- **GET** `/api/orders` — List orders (optional: `user_address`, `status`, `asset`). With `user_address` response is decrypted.
- **GET** `/api/orders/:id?user_address=...` — Single order (decrypted only for owner).
- **POST** `/api/orders` — Create order (legacy; sensitive fields encrypted before save).
- **POST** `/api/orders/submit` — Submit order + find match (FIFO, opposite side). Returns order + match info for settlement.
- **POST** `/api/orders/settle` — Confirm settlement (body: `orderId`, `matchedOrderId`, `txHash`, `filledSize`).
- **PATCH** `/api/orders/:id` — Update order (sensitive fields encrypted).
- **DELETE** `/api/orders/:id` — Cancel order (soft: status → `cancelled`).
- **POST** `/api/orders/cancel-all-open` — Cancel all orders with status `open`.
- **GET** `/api/users/:address/orders` — Orders per user (always decrypted).

### Other

- **GET** `/api/orderbook/:asset` — Order book (Binance depth or fallback).

## ZK Circuit

The `/match-and-settle` endpoint requires:

- `../build/trade_check_js/trade_check.wasm`
- `../build/trade_check_js/generate_witness.js`
- `../build/circuit_final.zkey`

Circuit inputs: `saldoBase`, `saldoQuote`, `amountBase`, `amountQuote`, `midpointPrice`, `toleranceBps`. Public outputs: `valid`, then amountBase, amountQuote, midpointPrice, toleranceBps (for on-chain verification).

## Security

- Do not commit `.env`. Use a strong `RELAYER_SECRET` in production.
- `ALLOW_INSECURE_TLS=true` is for development only; do not use in production.
- Supabase uses the **service key** on the backend; do not expose it to the frontend.

## License

ISC
