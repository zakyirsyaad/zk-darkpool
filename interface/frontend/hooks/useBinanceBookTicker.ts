"use client";
import { useEffect, useState, useRef, useCallback } from "react";
import { API_BASE_URL } from "@/constants/api";

export interface BookTickerData {
  bestBid: number;
  bestAsk: number;
  midpoint: number;
  spread: number;
  symbol: string;
}

/**
 * Custom hook for real-time best bid/ask
 * Tries WebSocket first, falls back to backend proxy polling if WebSocket fails
 * @param symbol - Token symbol (e.g. 'BTC', 'ETH')
 * @param pair - Trading pair (default: 'USDT')
 * @returns BookTickerData with bestBid, bestAsk, midpoint, spread
 */
export function useBinanceBookTicker(symbol: string, pair: string = "USDT") {
  const [data, setData] = useState<BookTickerData>({
    bestBid: 0,
    bestAsk: 0,
    midpoint: 0,
    spread: 0,
    symbol: "",
  });
  const [loading, setLoading] = useState(true);
  const [usePolling, setUsePolling] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);
  const pollingRef = useRef<NodeJS.Timeout | null>(null);

  // Fetch via backend proxy (fallback)
  const fetchViaProxy = useCallback(async () => {
    try {
      const tickerSymbol = `${symbol.toUpperCase()}${pair.toUpperCase()}`;
      const res = await fetch(`${API_BASE_URL}/api/binance/bookTicker?symbol=${tickerSymbol}`);
      
      if (!res.ok) throw new Error('Proxy fetch failed');
      
      const msg = await res.json();
      const bestBid = parseFloat(msg.bidPrice);
      const bestAsk = parseFloat(msg.askPrice);
      const midpoint = (bestBid + bestAsk) / 2;
      const spread = bestAsk - bestBid;

      setData({
        bestBid,
        bestAsk,
        midpoint,
        spread,
        symbol: msg.symbol,
      });
      setLoading(false);
    } catch (error) {
      console.error("[BookTicker] Proxy fetch error:", error);
    }
  }, [symbol, pair]);

  useEffect(() => {
    // Try WebSocket first
    const streamSymbol = `${symbol.toLowerCase()}${pair.toLowerCase()}@bookTicker`;
    
    try {
      const ws = new WebSocket(`wss://fstream.binance.com/ws/${streamSymbol}`);
      wsRef.current = ws;

      const wsTimeout = setTimeout(() => {
        // If not connected after 5 seconds, switch to polling
        if (ws.readyState !== WebSocket.OPEN) {
          console.log("[BookTicker] WebSocket timeout, switching to polling");
          ws.close();
          setUsePolling(true);
        }
      }, 5000);

      ws.onopen = () => {
        clearTimeout(wsTimeout);
        console.log(`[BookTicker] WebSocket connected to ${streamSymbol}`);
      };

      ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);
          const bestBid = parseFloat(msg.b);
          const bestAsk = parseFloat(msg.a);
          const midpoint = (bestBid + bestAsk) / 2;
          const spread = bestAsk - bestBid;

          setData({
            bestBid,
            bestAsk,
            midpoint,
            spread,
            symbol: msg.s,
          });
          setLoading(false);
        } catch (error) {
          console.error("[BookTicker] Error parsing WebSocket data:", error);
        }
      };

      ws.onerror = () => {
        clearTimeout(wsTimeout);
        console.log("[BookTicker] WebSocket error, switching to polling");
        setUsePolling(true);
      };

      ws.onclose = () => {
        console.log("[BookTicker] WebSocket closed");
      };

      return () => {
        clearTimeout(wsTimeout);
        ws.close();
      };
    } catch {
      console.log("[BookTicker] WebSocket not supported, using polling");
      setUsePolling(true);
    }
  }, [symbol, pair]);

  // Polling fallback
  useEffect(() => {
    if (!usePolling) return;

    console.log("[BookTicker] Using backend proxy polling");
    
    // Initial fetch
    fetchViaProxy();
    
    // Poll every 15 seconds (reduced to avoid rate limits)
    pollingRef.current = setInterval(fetchViaProxy, 15000);

    return () => {
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
      }
    };
  }, [usePolling, fetchViaProxy]);

  return { data, loading };
}
