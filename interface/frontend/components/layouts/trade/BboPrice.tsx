'use client'
import React, { useEffect, useRef, useState } from 'react'
import {
    Tooltip,
    TooltipContent,
    TooltipTrigger,
} from "@/components/ui/tooltip"
import Link from 'next/link'
import { useBinancePrice } from '@/hooks/useBinancePrice'
import { useCoinbasePrice } from '@/hooks/useCoinbasePrice'
import { useOKXPrice } from '@/hooks/useOKXPrice'

type PriceDir = 'up' | 'down' | null

function usePriceColor(price: number): PriceDir {
    const prev = useRef<number>(0)
    const [dir, setDir] = useState<PriceDir>(null)

    useEffect(() => {
        if (price <= 0) return
        const wasUp = prev.current > 0 && price > prev.current
        const wasDown = prev.current > 0 && price < prev.current
        prev.current = price

        const id = requestAnimationFrame(() => {
            if (wasUp) setDir('up')
            else if (wasDown) setDir('down')
        })
        const t = setTimeout(() => setDir(null), 1500)
        return () => {
            cancelAnimationFrame(id)
            clearTimeout(t)
        }
    }, [price])

    return dir
}

function PriceText({ price, label, href = '/' }: { price: number; label: string; href?: string }) {
    const dir = usePriceColor(price)
    const colorClass = dir === 'up' ? 'text-emerald-500' : dir === 'down' ? 'text-red-500' : ''
    const format = (n: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n)

    return (
        <Link href={href}>
            <p className={`hover:underline transition-colors duration-300 ${colorClass}`}>
                {label} {format(price)}
            </p>
        </Link>
    )
}

export default function BboPrice({ token }: { token: string }) {
    const price = useBinancePrice(token)
    const coinbasePrice = useCoinbasePrice(token)
    const okxPrice = useOKXPrice(token)

    return (
        <div className='border p-3 flex justify-evenly'>
            <Tooltip>
                <TooltipTrigger>BBO Feeds Live {token}</TooltipTrigger>
                <TooltipContent>
                    <p>All prices are streamed from centralized exchanges in real-time, and all trades clear at the middle of the Binance bid-ask spread.</p>
                </TooltipContent>
            </Tooltip>
            <p>-</p>
            <PriceText price={price} label="Binance" />
            <p>-</p>
            <PriceText price={coinbasePrice} label="Coinbase" />
            <p>-</p>
            <PriceText price={okxPrice} label="OKX" />
        </div>
    )
}
