'use client'
import React from 'react'
import { useBinanceBookTicker } from '@/hooks/useBinanceBookTicker'

const USD = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' })

export default function Info({
    token,
    amount,
}: {
    token: string
    amount: string
}) {
    const { data, loading } = useBinanceBookTicker(token.toUpperCase())

    const qty = Number(amount || 0)
    const { midpoint, spread, bestBid, bestAsk } = data

    // Hackathon MVP assumptions:
    // - Midpoint execution saves half-spread vs crossing the book.
    // - Fee is a simple bps model.
    const feeBps = 10 // 0.10%
    const orderValue = qty * midpoint
    const fee = orderValue * (feeBps / 10_000)
    // Savings = half spread per unit * quantity
    const savings = qty * (spread / 2)

    return (
        <section className='grid grid-cols-2 text-sm'>
            <div>
                <p>Type</p>
                <p>Best Bid / Ask</p>
                <p>Midpoint</p>
                <p>Order Value</p>
                <p>Fee (0.10%)</p>
                <p>Spread Saving</p>
            </div>
            <div className='text-right'>
                <p>Midpoint Execution</p>
                <p>
                    {loading ? 'Loading…' : `${USD.format(bestBid)} / ${USD.format(bestAsk)}`}
                </p>
                <p>
                    {loading ? 'Loading…' : USD.format(midpoint)}
                </p>
                <p>{USD.format(orderValue)}</p>
                <p>{USD.format(fee)}</p>
                <p>{USD.format(savings)}</p>
            </div>
        </section>
    )
}
