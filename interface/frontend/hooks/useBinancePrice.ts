'use client'
import { useEffect, useState } from 'react'

/**
 * Custom hook untuk mendapatkan harga real-time dari Binance WebSocket
 * @param symbol - Symbol token (contoh: 'BTC', 'ETH')
 * @param pair - Trading pair (default: 'USDT')
 * @returns Harga token dalam bentuk number
 */
export function useBinancePrice(symbol: string, pair: string = 'USDT') {
    const [price, setPrice] = useState(0);

    useEffect(() => {
        // Format symbol untuk Binance WebSocket (lowercase)
        const streamSymbol = `${symbol.toLowerCase()}${pair.toLowerCase()}@aggTrade`;
        const ws = new WebSocket(`wss://stream.binance.com:9443/ws/${streamSymbol}`);

        ws.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data);
                setPrice(parseFloat(data.p));
            } catch (error) {
                console.error('Error parsing WebSocket data:', error);
            }
        };

        ws.onerror = (error) => {
            console.error('WebSocket error:', error);
        };

        ws.onclose = () => {
            console.log('WebSocket connection closed');
        };

        // Bersihkan koneksi saat komponen tidak lagi digunakan (unmount)
        return () => {
            ws.close();
        };
    }, [symbol, pair]);

    return price;
}
