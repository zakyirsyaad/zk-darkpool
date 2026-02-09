'use client'
import React from 'react'
import {
    Tooltip,
    TooltipContent,
    TooltipTrigger,
} from "@/components/ui/tooltip"
import Link from 'next/link'
import { useBinancePrice } from '@/hooks/useBinancePrice'
import { useCoinbasePrice } from '@/hooks/useCoinbasePrice'
import { useOKXPrice } from '@/hooks/useOKXPrice'

export default function BboPrice({ token }: { token: string }) {
    const price = useBinancePrice(token);
    const CoinbasePrice = useCoinbasePrice(token);
    const okxPrice = useOKXPrice(token);


    return (
        <div className='border p-3 flex justify-evenly'>
            <Tooltip>
                <TooltipTrigger>BBO Feeds Live {token}</TooltipTrigger>
                <TooltipContent>
                    <p>All prices are streamed from centralized exchanges in real-time, and all trades clear at the middle of the Binance bid-ask spread.</p>
                </TooltipContent>
            </Tooltip>
            <p>-</p>
            <Link href={"/"}>
                <p className='hover:underline'>
                    Binance {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(price)}
                </p>
            </Link>
            <p>-</p>
            <Link href={"/"}>
                <p className='hover:underline'>Coinbase {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(CoinbasePrice)} </p>
            </Link>
            <p>-</p>
            <Link href={"/"}>
                <p className='hover:underline'>
                    OKX {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(okxPrice)}
                </p>
            </Link>
        </div>
    )
}
