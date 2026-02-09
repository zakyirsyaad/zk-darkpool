"use client";
import { useEffect, useState } from "react";

/**
 * Custom hook untuk mendapatkan harga real-time dari Coinbase WebSocket
 * @param symbol - Symbol token (contoh: 'BTC', 'ETH')
 * @param pair - Trading pair (default: 'USD' untuk Coinbase)
 * @returns Harga token dalam bentuk number
 */
export function useCoinbasePrice(symbol: string, pair: string = "USD") {
  const [price, setPrice] = useState(0);

  useEffect(() => {
    // Format product ID untuk Coinbase (contoh: BTC-USD)
    const productId = `${symbol}-${pair}`;

    // Coinbase Advanced Trade WebSocket
    const ws = new WebSocket("wss://advanced-trade-ws.coinbase.com");

    ws.onopen = () => {
      // Subscribe ke ticker channel untuk real-time price updates
      ws.send(
        JSON.stringify({
          type: "subscribe",
          product_ids: [productId],
          channel: "ticker",
        }),
      );
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);

        // Handle ticker update
        if (data.channel === "ticker" && data.events) {
          const tickerEvent = data.events[0];
          if (tickerEvent && tickerEvent.tickers && tickerEvent.tickers[0]) {
            const ticker = tickerEvent.tickers[0];
            // Price ada di field 'price' atau 'last_price'
            const priceValue = ticker.price || ticker.last_price;
            if (priceValue) {
              setPrice(parseFloat(priceValue));
            }
          }
        }
      } catch (error) {
        console.error("Error parsing Coinbase WebSocket data:", error);
      }
    };

    ws.onerror = (error) => {
      console.error("Coinbase WebSocket error:", error);
    };

    ws.onclose = () => {
      console.log("Coinbase WebSocket connection closed");
    };

    // Bersihkan koneksi saat komponen tidak lagi digunakan (unmount)
    return () => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.close();
      }
    };
  }, [symbol, pair]);

  return price;
}
