const express = require('express');
const axios = require('axios');
const { exec } = require('child_process');
const util = require('util');
const execPromise = util.promisify(exec);
const fs = require('fs').promises;

const app = express();
app.use(express.json());

app.post('/match-and-settle', async (req, res) => {
  const { amountBase, amountQuote, ticker } = req.body;

  try {
    // 1. Query midpoint real-time
    const binanceRes = await axios.get(`https://api.binance.com/api/v3/ticker/bookTicker?symbol=${ticker}`);
    const midpoint = (parseFloat(binanceRes.data.bidPrice) + parseFloat(binanceRes.data.askPrice)) / 2;

    // 2. Generate input.json
    const input = {
      saldoBase: "10000000000000000000", // 10 ether - must be >= amountBase
      saldoQuote: "10000000000000000000", // 10 ether - must be >= amountQuote
      amountBase: (amountBase * 1e18).toString(),
      amountQuote: (amountQuote * 1e18).toString(), // 18 decimals (matching test)
      midpointPrice: midpoint.toString(), // Simple scalar, not in wei
      toleranceBps: "100"
    };

    await fs.writeFile('input.json', JSON.stringify(input));

    // 3. Generate witness & proof
    await execPromise('node ../build/trade_check_js/generate_witness.js ../build/trade_check_js/trade_check.wasm input.json witness.wtns');
    await execPromise('snarkjs groth16 prove ../build/circuit_final.zkey witness.wtns proof.json public.json');

    // 4. Baca proof & public
    const proof = JSON.parse(await fs.readFile('proof.json', 'utf8'));
    const publicInputs = JSON.parse(await fs.readFile('public.json', 'utf8'));

    if (!proof.pi_a || !proof.pi_b || !proof.pi_c) {
        return res.status(500).json({ error: 'Proof generation failed' });
      }

    // 5. Kembalikan ke frontend
    res.json({
      a: proof.pi_a,
      b: proof.pi_b,
      c: proof.pi_c,
      publicInputs
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.listen(3001, () => console.log('Matcher running on port 3001'));