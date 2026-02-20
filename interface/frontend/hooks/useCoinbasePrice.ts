"use client";
import { useEffect, useState } from "react";

/**
 * Custom hook for real-time price from Coinbase WebSocket
 * @param symbol - Token symbol (e.g. 'BTC', 'ETH')
 * @param pair - Trading pair (default: 'USD' for Coinbase)
 * @returns Token price as number
 */
export function useCoinbasePrice(symbol: string, pair: string = "USD") {
  const [price, setPrice] = useState(0);

  useEffect(() => {
    // Coinbase product ID format (e.g. BTC-USD)
    const productId = `${symbol}-${pair}`;

    // Coinbase Advanced Trade WebSocket
    const ws = new WebSocket("wss://advanced-trade-ws.coinbase.com");

    ws.onopen = () => {
      // Subscribe to ticker channel for real-time price updates
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
            // Price is in 'price' or 'last_price' field
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

    // Clean up connection on unmount
    return () => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.close();
      }
    };
  }, [symbol, pair]);

  return price;
}
