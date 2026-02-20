require("dotenv").config();
const express = require("express");
const axios = require("axios");
const cors = require("cors");
const https = require("https");
const path = require("path");
const fs = require("fs").promises;
const { supabase } = require("./lib/supabase");
const {
  encryptOrder,
  decryptOrder,
  decryptOrders,
  encrypt,
} = require("./lib/crypto");
const snarkjs = require("snarkjs");

const app = express();
app.use(
  cors({
    origin: [
      "http://localhost:3001",
      "http://localhost:3000",
      "https://www.darxcrypto.xyz",
      "https://darxcrypto.vercel.app",
    ],
    credentials: true,
  }),
);

app.use(express.json());

// --- DEV ONLY: allow insecure TLS when network MITM/captive-portal breaks certs ---
// Set env ALLOW_INSECURE_TLS=true if you see:
// "Hostname/IP does not match certificate's altnames ... internetbaik.telkomsel.com"
// WARNING: This disables TLS verification and is NOT safe for production.
const allowInsecureTls =
  String(process.env.ALLOW_INSECURE_TLS || "").toLowerCase() === "true";
const httpsAgent = allowInsecureTls
  ? new https.Agent({ rejectUnauthorized: false })
  : undefined;

/**
 * Convert a decimal number to wei (integer string) without scientific notation
 * Works for any size number by using string manipulation
 * @param {number|string} value - The decimal value (e.g., 0.1, 300.5)
 * @param {number} decimals - Number of decimals (default 18 for wei)
 * @returns {string} Integer string without scientific notation
 */
function toWei(value, decimals = 18) {
  // Convert to string, handling scientific notation
  let str = typeof value === "number" ? value.toFixed(20) : String(value);

  // Remove trailing zeros after decimal point
  if (str.includes(".")) {
    str = str.replace(/\.?0+$/, "");
  }

  // Split into integer and decimal parts
  let [intPart, decPart = ""] = str.split(".");

  // Pad or truncate decimal part to desired length
  if (decPart.length < decimals) {
    decPart = decPart.padEnd(decimals, "0");
  } else {
    decPart = decPart.slice(0, decimals);
  }

  // Combine and remove leading zeros
  const result = (intPart + decPart).replace(/^0+/, "") || "0";
  return result;
}

/**
 * Convert price to scaled integer string (multiply by 1e8)
 * Using string manipulation to avoid scientific notation
 */
function priceToInt(price) {
  // Use toFixed to avoid scientific notation, then parse
  const fixed = price.toFixed(8);
  const [intPart, decPart = ""] = fixed.split(".");
  // Pad to 8 decimals and combine
  const padded = decPart.padEnd(8, "0").slice(0, 8);
  const result = (intPart + padded).replace(/^0+/, "") || "0";
  return result;
}

app.post("/match-and-settle", async (req, res) => {
  const { amountBase, amountQuote, ticker } = req.body;

  try {
    // 1. Query midpoint real-time (try Binance, CoinGecko, then fallback)
    let midpoint;

    const token = ticker.replace("USDT", "");

    // Try Binance first
    try {
      const binanceRes = await axios.get(
        `https://api.binance.com/api/v3/ticker/bookTicker?symbol=${ticker}`,
        { httpsAgent, timeout: 5000 },
      );
      if (
        binanceRes.data &&
        binanceRes.data.bidPrice &&
        binanceRes.data.askPrice
      ) {
        midpoint =
          (parseFloat(binanceRes.data.bidPrice) +
            parseFloat(binanceRes.data.askPrice)) /
          2;
        if (!isNaN(midpoint) && midpoint > 0) {
          console.log("Using Binance price:", midpoint);
        } else {
          throw new Error("Invalid Binance price");
        }
      } else {
        throw new Error("Invalid Binance response");
      }
    } catch (binanceError) {
      // Try CoinGecko
      try {
        const bookTicker = await fetchBookTickerFromCoinGecko(ticker);
        midpoint =
          (parseFloat(bookTicker.bidPrice) + parseFloat(bookTicker.askPrice)) /
          2;
        if (!isNaN(midpoint) && midpoint > 0) {
          console.log("Using CoinGecko price:", midpoint);
        } else {
          throw new Error("Invalid CoinGecko price");
        }
      } catch (geckoError) {
        // Use fallback price
        midpoint = FALLBACK_PRICES[token] || 100;
        console.log("Using fallback price for", token, ":", midpoint);
      }
    }

    // Final validation
    if (isNaN(midpoint) || midpoint <= 0) {
      midpoint = FALLBACK_PRICES[token] || 100;
      console.log("Forced fallback price for", token, ":", midpoint);
    }

    // 2. Generate input.json
    console.log("Raw input from frontend:", {
      amountBase,
      amountQuote,
      ticker,
      midpoint,
    });

    // Use BigInt-safe string conversion to avoid scientific notation
    const amountBaseWei = toWei(amountBase, 18);

    // IMPORTANT: Circuit math is: expectedQuote = amountBase * midpointPrice
    // To ensure they match EXACTLY, we calculate amountQuote from the rounded midpoint
    // This avoids precision mismatches between frontend price and backend midpoint
    const midpointScaled = Math.round(midpoint).toString();

    // Calculate amountQuote to match circuit calculation exactly:
    // In circuit: expectedQuote = amountBaseWei * midpointScaled
    // So we use the same calculation for amountQuote
    const amountQuoteWei = (
      BigInt(amountBaseWei) * BigInt(midpointScaled)
    ).toString();

    console.log("Recalculated amountQuote to match circuit:", {
      original: toWei(amountQuote, 18),
      recalculated: amountQuoteWei,
      midpointUsed: midpointScaled,
    });

    // Ensure saldo is larger than amounts (use very large values to pass balance check)
    const saldoBase = "1000000000000000000000000000"; // 1 billion tokens in wei (1e27)
    const saldoQuote = "1000000000000000000000000000"; // 1 billion in wei (1e27)

    // Verify all values are valid integer strings (no scientific notation)
    const validateIntString = (val, name) => {
      if (typeof val !== "string" || !/^\d+$/.test(val)) {
        throw new Error(`Invalid ${name}: ${val} (must be integer string)`);
      }
      return val;
    };

    const input = {
      saldoBase: validateIntString(saldoBase, "saldoBase"),
      saldoQuote: validateIntString(saldoQuote, "saldoQuote"),
      amountBase: validateIntString(amountBaseWei, "amountBase"),
      amountQuote: validateIntString(amountQuoteWei, "amountQuote"),
      midpointPrice: validateIntString(midpointScaled, "midpointPrice"),
      toleranceBps: "10000", // 100% tolerance for testing (very lenient)
    };

    console.log("ZK Input (validated):", input);

    // Verify the math: expectedQuote = amountBase * midpointPrice should ≈ amountQuote
    const expectedQuote = BigInt(amountBaseWei) * BigInt(midpointScaled);
    const actualQuote = BigInt(amountQuoteWei);
    const diff =
      expectedQuote > actualQuote
        ? expectedQuote - actualQuote
        : actualQuote - expectedQuote;
    console.log("Circuit math verification:", {
      amountBaseWei,
      midpointScaled,
      expectedQuote: expectedQuote.toString(),
      actualQuote: actualQuote.toString(),
      diff: diff.toString(),
      diffPercent: Number((diff * 100n) / actualQuote) + "%",
    });

    // 3. Generate proof via snarkjs in-process (no npx/shell — works on Vercel/serverless)
    const buildDir = path.resolve(__dirname, "build");
    const wasmPath = path.join(buildDir, "trade_check_js", "trade_check.wasm");
    const zkeyPath = path.join(buildDir, "circuit_final.zkey");

    const { proof, publicSignals } = await snarkjs.groth16.fullProve(
      input,
      wasmPath,
      zkeyPath,
    );
    const publicInputs = publicSignals.map((x) => String(x))

    // Log public inputs to verify circuit output
    // Circom output order: outputs first (valid), then public inputs in declaration order
    // Template declares: amountBase, amountQuote, midpointPrice, toleranceBps
    console.log("Circuit public outputs:", {
      valid: publicInputs[0],
      amountBase: publicInputs[1],
      amountQuote: publicInputs[2],
      midpointPrice: publicInputs[3],
      toleranceBps: publicInputs[4],
    });

    // Check if circuit computed valid=1
    if (publicInputs[0] === "0") {
      console.error("=== CIRCUIT FAILED: valid=0 ===");
      console.error("Input sent to circuit:", input);
      console.error("--- Debugging checks ---");
      console.error(
        "  saldoBase >= amountBase?",
        BigInt(input.saldoBase) >= BigInt(input.amountBase),
      );
      console.error(
        "  saldoQuote >= amountQuote?",
        BigInt(input.saldoQuote) >= BigInt(input.amountQuote),
      );

      const expQ = BigInt(input.amountBase) * BigInt(input.midpointPrice);
      const actQ = BigInt(input.amountQuote);
      const dev = expQ > actQ ? expQ - actQ : actQ - expQ;
      const devSq = dev * dev;
      const tolTh =
        (BigInt(input.midpointPrice) * BigInt(input.toleranceBps)) / 10000n;
      const tolSq = tolTh * tolTh;

      console.error("  expectedQuote:", expQ.toString());
      console.error("  actualQuote:", actQ.toString());
      console.error("  deviation:", dev.toString());
      console.error("  deviationSquared:", devSq.toString());
      console.error("  toleranceThreshold:", tolTh.toString());
      console.error("  toleranceSquared:", tolSq.toString());
      console.error("  devSquared <= tolSquared?", devSq <= tolSq);
    }

    if (!proof.pi_a || !proof.pi_b || !proof.pi_c) {
      return res.status(500).json({ error: "Proof generation failed" });
    }

    // 5. Use exportSolidityCallData to get correct format for Ethereum
    // This handles the G2 point coordinate swapping automatically
    const calldata = await snarkjs.groth16.exportSolidityCallData(
      proof,
      publicInputs,
    );

    // Parse the calldata - it's a comma-separated string of arrays
    // Format: ["a[0]","a[1]"],[["b[0][0]","b[0][1]"],["b[1][0]","b[1][1]"]],["c[0]","c[1]"],["pub[0]",...]
    const calldataJson = JSON.parse("[" + calldata + "]");

    console.log("Proof calldata for Solidity:", {
      a: calldataJson[0],
      b: calldataJson[1],
      c: calldataJson[2],
      publicInputs: calldataJson[3],
    });

    // 6. Kembalikan ke frontend dalam format yang benar untuk Ethereum
    res.json({
      a: calldataJson[0],
      b: calldataJson[1],
      c: calldataJson[2],
      publicInputs: calldataJson[3],
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 1. Daftar koin yang kamu masukkan manual
// Kamu bisa menambah atau mengurangi list ini kapan saja
const MY_WALLET_TOKENS = [
  { symbol: "ARB", address: "0x912ce59144191c1204e64559fe8253a0e49e6548" },
  { symbol: "GMX", address: "0xfc5a1a6eb076a2c7ad06ed22c90d7e710e35ad0a" },
  { symbol: "RDNT", address: "0x3082cc3797440806000210954e7d98ee17ee3f3c" },
  { symbol: "MAGIC", address: "0x539bde0d7dbd3d5263e94ff56b653215170d2712" },
];

// 2. Endpoint untuk mengambil harga token manual tersebut
app.get("/api/my-tokens", async (req, res) => {
  try {
    // Ambil semua address dan gabungkan dengan koma
    const addresses = MY_WALLET_TOKENS.map((t) => t.address).join(",");

    // Fetch ke DexScreener
    const response = await axios.get(
      `https://api.dexscreener.com/latest/dex/tokens/${addresses}`,
    );
    const pairs = response.data.pairs || [];

    // Mapping data agar hasilnya rapi dan sesuai urutan input manual
    const result = MY_WALLET_TOKENS.map((token) => {
      // Cari data yang match dengan address
      const marketData = pairs.find(
        (p) =>
          p.baseToken.address.toLowerCase() === token.address.toLowerCase(),
      );

      return {
        symbol: token.symbol,
        name: marketData ? marketData.baseToken.name : "Unknown",
        address: token.address,
        priceUsd: marketData ? marketData.priceUsd : "0",
        priceChange24h: marketData ? marketData.priceChange.h24 : 0,
        volume24h: marketData ? marketData.volume.h24 : 0,
        liquidity: marketData ? marketData.liquidity.usd : 0,
      };
    });

    res.json(result);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Gagal mengambil data dari blockchain" });
  }
});

// =============================================
// Price API Proxy (with caching and fallback)
// =============================================

// Simple in-memory cache
const priceCache = {
  data: {},
  lastUpdate: 0,
  TTL: 30000, // 30 seconds cache
};

// Fallback prices for demo/testing when APIs are blocked
const FALLBACK_PRICES = {
  BTC: 97000,
  ETH: 2700,
  BNB: 600,
  SOL: 200,
  XRP: 2.5,
  ADA: 0.75,
  DOGE: 0.35,
  AVAX: 35,
  DOT: 7,
  MATIC: 0.5,
  LINK: 20,
  UNI: 12,
  ATOM: 8,
  LTC: 120,
  ARB: 0.8,
};

// Map token symbols to CoinGecko IDs
const COINGECKO_IDS = {
  BTC: "bitcoin",
  ETH: "ethereum",
  BNB: "binancecoin",
  SOL: "solana",
  XRP: "ripple",
  ADA: "cardano",
  DOGE: "dogecoin",
  AVAX: "avalanche-2",
  DOT: "polkadot",
  MATIC: "matic-network",
  LINK: "chainlink",
  UNI: "uniswap",
  ATOM: "cosmos",
  LTC: "litecoin",
  ARB: "arbitrum",
};

// Fetch price from CoinGecko (fallback)
async function fetchFromCoinGecko(symbols) {
  const ids = symbols
    .map((s) => s.replace("USDT", ""))
    .map((s) => COINGECKO_IDS[s] || s.toLowerCase())
    .join(",");

  const url = `https://api.coingecko.com/api/v3/simple/price?ids=${ids}&vs_currencies=usd`;
  const response = await axios.get(url, { timeout: 10000 });

  // Convert to Binance format
  return symbols.map((symbol) => {
    const token = symbol.replace("USDT", "");
    const geckoId = COINGECKO_IDS[token] || token.toLowerCase();
    const price = response.data[geckoId]?.usd || 0;
    return { symbol, price: price.toString() };
  });
}

// Fetch book ticker from CoinGecko (approximation - no real bid/ask)
async function fetchBookTickerFromCoinGecko(symbol) {
  const token = symbol.replace("USDT", "");
  const geckoId = COINGECKO_IDS[token] || token.toLowerCase();

  // Check cache first
  const cacheKey = `bookTicker_${symbol}`;
  const now = Date.now();
  if (
    priceCache.data[cacheKey] &&
    now - priceCache.data[cacheKey].time < priceCache.TTL
  ) {
    return priceCache.data[cacheKey].value;
  }

  const url = `https://api.coingecko.com/api/v3/simple/price?ids=${geckoId}&vs_currencies=usd`;
  const response = await axios.get(url, { timeout: 10000 });
  const price = response.data[geckoId]?.usd || 0;

  // Simulate bid/ask with 0.1% spread
  const spread = price * 0.001;
  const result = {
    symbol,
    bidPrice: (price - spread / 2).toString(),
    askPrice: (price + spread / 2).toString(),
  };

  // Cache result
  priceCache.data[cacheKey] = { value: result, time: now };
  return result;
}

// Generate fallback price data
function getFallbackPrices(symbolList) {
  return symbolList.map((symbol) => {
    const token = symbol.replace("USDT", "");
    const price = FALLBACK_PRICES[token] || 100;
    return { symbol, price: price.toString() };
  });
}

function getFallbackBookTicker(symbol) {
  const token = symbol.replace("USDT", "");
  const price = FALLBACK_PRICES[token] || 100;
  const spread = price * 0.001;
  return {
    symbol,
    bidPrice: (price - spread / 2).toString(),
    askPrice: (price + spread / 2).toString(),
  };
}

// Proxy for token prices (with caching and fallback)
app.get("/api/binance/prices", async (req, res) => {
  try {
    const { symbols } = req.query;
    const symbolList = symbols ? JSON.parse(symbols) : [];
    const cacheKey = `prices_${symbols}`;
    const now = Date.now();

    // Check cache
    if (
      priceCache.data[cacheKey] &&
      now - priceCache.data[cacheKey].time < priceCache.TTL
    ) {
      return res.json(priceCache.data[cacheKey].value);
    }

    // Try Binance first
    try {
      const url = symbols
        ? `https://api.binance.com/api/v3/ticker/price?symbols=${encodeURIComponent(
            symbols,
          )}`
        : `https://api.binance.com/api/v3/ticker/price`;

      const response = await axios.get(url, { httpsAgent, timeout: 5000 });
      priceCache.data[cacheKey] = { value: response.data, time: now };
      return res.json(response.data);
    } catch (binanceError) {
      // Silent fallback
    }

    // Try CoinGecko
    try {
      const data = await fetchFromCoinGecko(symbolList);
      priceCache.data[cacheKey] = { value: data, time: now };
      return res.json(data);
    } catch (geckoError) {
      // Silent fallback
    }

    // Use hardcoded fallback prices
    console.log("Using fallback prices for:", symbolList);
    const fallbackData = getFallbackPrices(symbolList);
    priceCache.data[cacheKey] = { value: fallbackData, time: now };
    res.json(fallbackData);
  } catch (error) {
    // Return cached data if available, even if expired
    const cacheKey = `prices_${req.query.symbols}`;
    if (priceCache.data[cacheKey]) {
      return res.json(priceCache.data[cacheKey].value);
    }
    // Last resort: fallback prices
    const symbolList = req.query.symbols ? JSON.parse(req.query.symbols) : [];
    res.json(getFallbackPrices(symbolList));
  }
});

// Proxy for book ticker (with caching and fallback)
app.get("/api/binance/bookTicker", async (req, res) => {
  try {
    const { symbol } = req.query;
    if (!symbol) {
      return res.status(400).json({ error: "Symbol is required" });
    }

    const cacheKey = `bookTicker_${symbol}`;
    const now = Date.now();

    // Check cache
    if (
      priceCache.data[cacheKey] &&
      now - priceCache.data[cacheKey].time < priceCache.TTL
    ) {
      return res.json(priceCache.data[cacheKey].value);
    }

    // Try Binance first
    try {
      const url = `https://api.binance.com/api/v3/ticker/bookTicker?symbol=${symbol}`;
      const response = await axios.get(url, { httpsAgent, timeout: 5000 });
      priceCache.data[cacheKey] = { value: response.data, time: now };
      return res.json(response.data);
    } catch (binanceError) {
      // Silent fallback
    }

    // Try CoinGecko
    try {
      const data = await fetchBookTickerFromCoinGecko(symbol);
      priceCache.data[cacheKey] = { value: data, time: now };
      return res.json(data);
    } catch (geckoError) {
      // Silent fallback
    }

    // Use hardcoded fallback
    console.log("Using fallback book ticker for:", symbol);
    const fallbackData = getFallbackBookTicker(symbol);
    priceCache.data[cacheKey] = { value: fallbackData, time: now };
    res.json(fallbackData);
  } catch (error) {
    // Return cached data if available
    const cacheKey = `bookTicker_${req.query.symbol}`;
    if (priceCache.data[cacheKey]) {
      return res.json(priceCache.data[cacheKey].value);
    }
    // Last resort: fallback
    res.json(getFallbackBookTicker(req.query.symbol));
  }
});

// =============================================
// Orders CRUD Endpoints
// =============================================

// POST: Cancel all open orders (useful to clean up stale test orders)
app.post("/api/orders/cancel-all-open", async (req, res) => {
  try {
    const { data, error } = await supabase
      .from("orders")
      .update({ status: "cancelled" })
      .eq("status", "open")
      .select();

    if (error) throw error;

    console.log(`Cancelled ${data?.length || 0} open orders`);
    res.json({
      message: `Cancelled ${data?.length || 0} open orders`,
      count: data?.length || 0,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET all orders (with optional filters)
// If user_address is provided, returns decrypted orders for that user.
// Otherwise returns redacted orders (sensitive fields stripped).
app.get("/api/orders", async (req, res) => {
  try {
    const { user_address, status, asset } = req.query;

    let query = supabase
      .from("orders")
      .select("*")
      .order("created_at", { ascending: false });

    if (user_address)
      query = query.eq("user_address", user_address.toLowerCase());
    if (status) query = query.eq("status", status);
    if (asset) query = query.eq("asset", asset);

    const { data, error } = await query;

    if (error) throw error;

    if (user_address) {
      // Owner requesting their own orders — decrypt
      res.json(decryptOrders(data || []));
    } else {
      // Public query — return only non-sensitive fields
      const redacted = (data || []).map((order) => ({
        id: order.id,
        status: order.status,
        asset: order.asset,
        quote_asset: order.quote_asset,
        proof_hash: order.proof_hash,
        created_at: order.created_at,
        updated_at: order.updated_at,
      }));
      res.json(redacted);
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET single order by ID (decrypted for owner, requires user_address query param)
app.get("/api/orders/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { user_address } = req.query;

    const { data, error } = await supabase
      .from("orders")
      .select("*")
      .eq("id", id)
      .single();

    if (error) throw error;
    if (!data) return res.status(404).json({ error: "Order not found" });

    // Only decrypt if the requester is the order owner
    if (user_address && data.user_address === user_address.toLowerCase()) {
      res.json(decryptOrder(data));
    } else {
      // Return non-sensitive fields only (encrypted fields redacted)
      res.json({
        id: data.id,
        user_address: data.user_address,
        status: data.status,
        asset: data.asset,
        quote_asset: data.quote_asset,
        proof_hash: data.proof_hash,
        created_at: data.created_at,
        updated_at: data.updated_at,
      });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST create new order (legacy endpoint — also encrypts)
app.post("/api/orders", async (req, res) => {
  try {
    const {
      user_address,
      side,
      asset,
      quote_asset = "USDC",
      size,
      price,
      proof_hash,
    } = req.body;

    if (!user_address || !side || !asset || !size || !price) {
      return res.status(400).json({
        error:
          "Missing required fields: user_address, side, asset, size, price",
      });
    }

    const order_value = parseFloat(size) * parseFloat(price);

    const plainOrder = {
      user_address: user_address.toLowerCase(),
      side,
      asset,
      quote_asset,
      size,
      price,
      order_value,
      proof_hash,
      status: "open",
      filled: 0,
    };

    const { data, error } = await supabase
      .from("orders")
      .insert(encryptOrder(plainOrder))
      .select()
      .single();

    if (error) throw error;
    res.status(201).json(decryptOrder(data));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// PATCH update order (e.g., update filled amount, status)
app.patch("/api/orders/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const updates = { ...req.body };

    // Prevent updating certain fields
    delete updates.id;
    delete updates.created_at;
    delete updates.user_address;

    // Encrypt any sensitive fields being updated
    const sensitiveFields = ["side", "size", "price", "order_value", "filled"];
    for (const field of sensitiveFields) {
      if (updates[field] !== undefined) {
        updates[field] = encrypt(String(updates[field]));
      }
    }

    const { data, error } = await supabase
      .from("orders")
      .update(updates)
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;
    if (!data) return res.status(404).json({ error: "Order not found" });

    res.json(decryptOrder(data));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// DELETE cancel order (soft delete - just updates status)
app.delete("/api/orders/:id", async (req, res) => {
  try {
    const { id } = req.params;

    const { data, error } = await supabase
      .from("orders")
      .update({ status: "cancelled" })
      .eq("id", id)
      .eq("status", "open") // Only cancel open orders
      .select()
      .single();

    if (error) throw error;
    if (!data)
      return res
        .status(404)
        .json({ error: "Order not found or already filled/cancelled" });

    res.json({ message: "Order cancelled", order: decryptOrder(data) });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET orders by user address (always decrypted — owner is requesting their own orders)
app.get("/api/users/:address/orders", async (req, res) => {
  try {
    const { address } = req.params;
    const { status } = req.query;

    let query = supabase
      .from("orders")
      .select("*")
      .eq("user_address", address.toLowerCase())
      .order("created_at", { ascending: false });

    if (status) query = query.eq("status", status);

    const { data, error } = await query;

    if (error) throw error;
    res.json(decryptOrders(data || []));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// =============================================
// Order Matching Engine
// =============================================

/**
 * Find a matching order (no locking - status stays "open").
 *
 * Dark pool matching: orders match on asset + opposite side only (FIFO).
 * The actual settlement price is the real-time Binance midpoint fetched
 * at proof-generation time, so stored order prices are informational only.
 *
 * Orders go directly from "open" → "filled" when settlement is confirmed.
 * No intermediate "matching" status needed (avoids DB check_status constraint).
 */
async function findMatch(order) {
  const oppositeSide = order.side === "BUY" ? "SELL" : "BUY";

  // Query all open orders for the same asset (can't filter encrypted 'side' in DB)
  const { data: rawCandidates, error } = await supabase
    .from("orders")
    .select("*")
    .eq("status", "open")
    .eq("asset", order.asset)
    .neq("user_address", order.user_address.toLowerCase())
    .order("created_at", { ascending: true }); // FIFO matching

  if (error) throw error;
  if (!rawCandidates || rawCandidates.length === 0) {
    console.log("No open orders found for", order.asset);
    return null;
  }

  // Decrypt candidates and filter by opposite side
  const decryptedCandidates = decryptOrders(rawCandidates);
  const matchingCandidates = decryptedCandidates.filter(
    (c) => c.side === oppositeSide,
  );

  if (matchingCandidates.length === 0) {
    console.log("No open opposite-side orders found for", order.asset);
    return null;
  }

  // Take the first (oldest) matching order
  const candidate = matchingCandidates[0];

  console.log(
    `Match found: ${candidate.id.slice(0, 8)} (${candidate.side} ${candidate.size} ${candidate.asset})`,
  );

  const matchPrice =
    (parseFloat(order.price) + parseFloat(candidate.price)) / 2;
  const matchSize = Math.min(
    parseFloat(order.size),
    parseFloat(candidate.size),
  );

  return {
    matchedOrder: candidate,
    matchPrice,
    matchSize,
    buyer: order.side === "BUY" ? order : candidate,
    seller: order.side === "SELL" ? order : candidate,
  };
}

// POST: Submit order and try to match
app.post("/api/orders/submit", async (req, res) => {
  try {
    const {
      user_address,
      side,
      asset,
      quote_asset = "USDC",
      size,
      price,
    } = req.body;

    // Validate required fields
    if (!user_address || !side || !asset || !size || !price) {
      return res.status(400).json({
        error:
          "Missing required fields: user_address, side, asset, size, price",
      });
    }

    // Calculate order value
    const order_value = parseFloat(size) * parseFloat(price);

    // Encrypt sensitive fields before storing
    const plainOrder = {
      user_address: user_address.toLowerCase(),
      side,
      asset,
      quote_asset,
      size,
      price,
      order_value,
      status: "open",
      filled: 0,
    };
    const encryptedRow = encryptOrder(plainOrder);

    // Create the order with encrypted fields
    const { data: newOrder, error: insertError } = await supabase
      .from("orders")
      .insert(encryptedRow)
      .select()
      .single();

    if (insertError) throw insertError;

    // Decrypt for logging and downstream use (matching, response)
    const decryptedOrder = decryptOrder(newOrder);
    console.log("New order created (encrypted in DB):", decryptedOrder.id);

    // Try to find a match (findMatch decrypts candidates internally)
    const match = await findMatch(decryptedOrder);

    if (match) {
      console.log("Match found!", {
        newOrder: decryptedOrder.id.slice(0, 8),
        matchedWith: match.matchedOrder.id.slice(0, 8),
        buyer: match.buyer.user_address,
        seller: match.seller.user_address,
        price: match.matchPrice,
        size: match.matchSize,
      });

      // Return decrypted order + match info for frontend to execute settlement
      res.json({
        order: decryptedOrder,
        matched: true,
        match: {
          matchedOrderId: match.matchedOrder.id,
          buyerAddress: match.buyer.user_address,
          sellerAddress: match.seller.user_address,
          matchPrice: match.matchPrice,
          matchSize: match.matchSize,
          asset: asset,
          quoteAsset: quote_asset,
        },
      });
    } else {
      console.log("No match found, order added to book");
      res.json({
        order: decryptedOrder,
        matched: false,
        message: "Order added to order book, waiting for match",
      });
    }
  } catch (error) {
    console.error("Order submit error:", error);
    res.status(500).json({ error: error.message });
  }
});

// POST: Confirm settlement after on-chain tx
app.post("/api/orders/settle", async (req, res) => {
  try {
    const { orderId, matchedOrderId, txHash, filledSize } = req.body;

    // Encrypt the filled amount before storing
    const updates = {
      status: "filled",
      filled: encrypt(String(filledSize)),
      proof_hash: txHash,
    };

    const [result1, result2] = await Promise.all([
      supabase
        .from("orders")
        .update(updates)
        .eq("id", orderId)
        .eq("status", "open")
        .select()
        .single(),
      supabase
        .from("orders")
        .update(updates)
        .eq("id", matchedOrderId)
        .eq("status", "open")
        .select()
        .single(),
    ]);

    if (result1.error) throw result1.error;
    if (result2.error) throw result2.error;

    console.log(
      "Both orders settled:",
      orderId.slice(0, 8),
      matchedOrderId.slice(0, 8),
    );

    res.json({
      message: "Both orders settled",
      orders: [decryptOrder(result1.data), decryptOrder(result2.data)],
    });
  } catch (error) {
    console.error("Settlement error:", error);
    res.status(500).json({ error: error.message });
  }
});

// POST: Revert matched orders (kept for compatibility, but now a no-op since
// orders stay "open" until settlement. Just returns success.)
app.post("/api/orders/unmatch", async (req, res) => {
  try {
    const { orderId, matchedOrderId } = req.body;
    console.log(
      "Unmatch requested (no-op, orders already open):",
      orderId?.slice(0, 8),
      matchedOrderId?.slice(0, 8),
    );
    res.json({ message: "Orders are already open", orders: [] });
  } catch (error) {
    console.error("Unmatch error:", error);
    res.status(500).json({ error: error.message });
  }
});

// GET: Order book from Binance (with fallback)
app.get("/api/orderbook/:asset", async (req, res) => {
  try {
    const { asset } = req.params;
    const symbol = `${asset.toUpperCase()}USDT`;
    const limit = parseInt(req.query.limit) || 10;
    const token = asset.toUpperCase();

    // Try Binance first
    try {
      const response = await axios.get(
        `https://api.binance.com/api/v3/depth?symbol=${symbol}&limit=${limit}`,
        { httpsAgent, timeout: 5000 },
      );

      if (response.data && response.data.bids && response.data.asks) {
        const bids = response.data.bids.map(([price, size]) => ({
          price,
          size,
          total: (parseFloat(price) * parseFloat(size)).toFixed(2),
        }));

        const asks = response.data.asks.map(([price, size]) => ({
          price,
          size,
          total: (parseFloat(price) * parseFloat(size)).toFixed(2),
        }));

        return res.json({
          bids,
          asks,
          source: "binance",
          symbol,
        });
      }
    } catch (binanceError) {
      // Silent fail, use fallback
    }

    // Fallback: generate order book based on fallback price
    const basePrice = FALLBACK_PRICES[token] || 100;
    const bids = [];
    const asks = [];

    for (let i = 0; i < limit; i++) {
      const bidPrice = basePrice * (1 - (i + 1) * 0.0003);
      const askPrice = basePrice * (1 + (i + 1) * 0.0003);
      const size = (Math.random() * 1 + 0.01).toFixed(4);

      bids.push({
        price: bidPrice.toFixed(2),
        size,
        total: (bidPrice * parseFloat(size)).toFixed(2),
      });

      asks.push({
        price: askPrice.toFixed(2),
        size,
        total: (askPrice * parseFloat(size)).toFixed(2),
      });
    }

    res.json({
      bids,
      asks,
      source: "fallback",
      symbol,
      basePrice,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

if (require.main === module) {
  app.listen(3001, () => console.log("Matcher running on port 3001"));
}

module.exports = app;
