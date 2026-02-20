'use client'
import { useEffect, useState } from 'react'

/**
 * Custom hook for real-time price from OKX WebSocket
 * @param symbol - Token symbol (e.g. 'BTC', 'ETH')
 * @param pair - Trading pair (default: 'USDT')
 * @returns Token price as number
 */
export function useOKXPrice(symbol: string, pair: string = 'USDT') {
    const [price, setPrice] = useState(0);

    useEffect(() => {
        // OKX instrument ID format (e.g. BTC-USDT)
        const instId = `${symbol}-${pair}`;
        
        // OKX WebSocket v5 Public
        const ws = new WebSocket('wss://ws.okx.com:8443/ws/v5/public');

        ws.onopen = () => {
            // Subscribe to tickers channel for real-time price updates
            ws.send(JSON.stringify({
                op: 'subscribe',
                args: [
                    {
                        channel: 'tickers',
                        instId: instId
                    }
                ]
            }));
        };

        ws.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data);
                
                // Handle ticker update
                if (data.arg && data.arg.channel === 'tickers' && data.data && data.data.length > 0) {
                    const ticker = data.data[0];
                    // Price is in 'last' field
                    const priceValue = ticker.last;
                    if (priceValue) {
                        setPrice(parseFloat(priceValue));
                    }
                }
            } catch (error) {
                console.error('Error parsing OKX WebSocket data:', error);
            }
        };

        ws.onerror = (error) => {
            console.error('OKX WebSocket error:', error);
        };

        ws.onclose = () => {
            console.log('OKX WebSocket connection closed');
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
