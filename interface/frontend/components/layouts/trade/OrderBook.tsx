'use client'
import React from 'react'
import { useQuery } from '@tanstack/react-query'
import { API_BASE_URL } from '@/constants/api'

interface OrderBookEntry {
  price: string
  size: string
  total: string
}

interface OrderBookData {
  bids: OrderBookEntry[]
  asks: OrderBookEntry[]
  source: string
  symbol: string
}

async function fetchBinanceOrderBook(asset: string): Promise<OrderBookData> {
  const res = await fetch(`${API_BASE_URL}/api/orderbook/${asset}?limit=10`)
  if (!res.ok) throw new Error('Failed to fetch order book')
  return res.json()
}

interface OrderBookProps {
  token: string
}

export default function OrderBook({ token }: OrderBookProps) {
  const { data: orderBook, isLoading } = useQuery({
    queryKey: ['binance-orderbook', token],
    queryFn: () => fetchBinanceOrderBook(token.toUpperCase()),
    refetchInterval: 5000, // Refresh every 5 seconds
    staleTime: 2000,
  })

  if (isLoading) {
    return (
      <div className="border rounded-lg p-4">
        <h3 className="font-semibold mb-3">Binance Order Book</h3>
        <p className="text-sm text-muted-foreground">Loading...</p>
      </div>
    )
  }

  const bids = orderBook?.bids || []
  const asks = orderBook?.asks || []

  // Calculate spread
  const bestAsk = asks.length > 0 ? parseFloat(asks[0].price) : 0
  const bestBid = bids.length > 0 ? parseFloat(bids[0].price) : 0
  const spread = bestAsk - bestBid
  const spreadPercent = bestBid > 0 ? (spread / bestBid) * 100 : 0

  return (
    <div className="border rounded-lg p-4">
      <div className="flex justify-between items-center mb-3">
        <h3 className="font-semibold">{token}/USDT</h3>
        <span className="text-xs text-muted-foreground">
          {orderBook?.source === 'binance' ? '🟢 Live' : '🟡 Fallback'}
        </span>
      </div>

      {/* Asks (Sell orders) - reversed to show lowest at bottom */}
      <div className="space-y-0.5 mb-2">
        <div className="flex justify-between text-xs text-muted-foreground px-1 mb-1">
          <span>Price (USDT)</span>
          <span>Size</span>
          <span>Total</span>
        </div>
        {asks.slice(0, 8).reverse().map((order, i) => (
          <div
            key={`ask-${i}`}
            className="flex justify-between text-xs px-1 py-0.5 bg-red-500/5"
          >
            <span className="text-red-500 font-mono">
              {parseFloat(order.price).toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </span>
            <span className="text-muted-foreground font-mono">{parseFloat(order.size).toFixed(4)}</span>
            <span className="text-muted-foreground font-mono text-right">${order.total}</span>
          </div>
        ))}
      </div>

      {/* Spread indicator */}
      <div className="py-2 px-1 border-y my-2 flex justify-between items-center">
        <span className="text-sm font-semibold">
          ${bestBid > 0 ? ((bestAsk + bestBid) / 2).toLocaleString(undefined, { minimumFractionDigits: 2 }) : '-'}
        </span>
        <span className="text-xs text-muted-foreground">
          Spread: ${spread.toFixed(2)} ({spreadPercent.toFixed(3)}%)
        </span>
      </div>

      {/* Bids (Buy orders) */}
      <div className="space-y-0.5">
        {bids.slice(0, 8).map((order, i) => (
          <div
            key={`bid-${i}`}
            className="flex justify-between text-xs px-1 py-0.5 bg-green-500/5"
          >
            <span className="text-green-500 font-mono">
              {parseFloat(order.price).toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </span>
            <span className="text-muted-foreground font-mono">{parseFloat(order.size).toFixed(4)}</span>
            <span className="text-muted-foreground font-mono text-right">${order.total}</span>
          </div>
        ))}
      </div>

      <p className="text-xs text-muted-foreground mt-3 text-center">
        DarkPool executes at midpoint price
      </p>
    </div>
  )
}
