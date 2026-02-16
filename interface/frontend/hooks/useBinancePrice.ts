"use client";
import { useEffect, useState, useRef } from "react";
import { API_BASE_URL } from "@/constants/api";

/**
 * Custom hook untuk mendapatkan harga real-time dari Binance.
 * Coba WebSocket dulu; bila gagal/diblokir, fallback ke REST via backend.
 * @param symbol - Symbol token (contoh: 'BTC', 'ETH')
 * @param pair - Trading pair (default: 'USDT')
 * @returns Harga token dalam bentuk number
 */
export function useBinancePrice(symbol: string, pair: string = "USDT") {
  const [price, setPrice] = useState(0);
  const fallbackRef = useRef(false);

  useEffect(() => {
    fallbackRef.current = false;
    const ticker = `${symbol.toUpperCase()}${pair.toUpperCase()}`;

    const fetchViaApi = async () => {
      try {
        const symbolsParam = JSON.stringify([ticker]);
        const res = await fetch(
          `${API_BASE_URL}/api/binance/prices?symbols=${encodeURIComponent(symbolsParam)}`
        );
        const data = await res.json();
        if (Array.isArray(data) && data[0]) {
          setPrice(parseFloat(data[0].price));
        }
      } catch {
        // Silent; avoid spamming when backend is down
      }
    };

    const streamSymbol = `${symbol.toLowerCase()}${pair.toLowerCase()}@aggTrade`;
    const ws = new WebSocket(
      `wss://stream.binance.com:9443/ws/${streamSymbol}`,
    );

    let fallbackInterval: ReturnType<typeof setInterval> | null = null;

    ws.onopen = () => {
      if (fallbackInterval) {
        clearInterval(fallbackInterval);
        fallbackInterval = null;
      }
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        setPrice(parseFloat(data.p));
      } catch {
        // ignore parse errors
      }
    };

    ws.onerror = () => {
      if (!fallbackRef.current) {
        fallbackRef.current = true;
        if (typeof process !== "undefined" && process.env.NODE_ENV === "development") {
          console.warn("Binance WebSocket failed, using REST fallback for", ticker);
        }
        fetchViaApi();
        fallbackInterval = setInterval(fetchViaApi, 15_000);
      }
    };

    ws.onclose = () => {
      if (!fallbackRef.current) {
        fallbackRef.current = true;
        fetchViaApi();
        fallbackInterval = setInterval(fetchViaApi, 15_000);
      }
    };

    return () => {
      ws.close();
      if (fallbackInterval) clearInterval(fallbackInterval);
    };
  }, [symbol, pair]);

  return price;
}
