'use client'
import React from 'react'
import { Button } from "@/components/ui/button"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog"
import { HugeiconsIcon } from '@hugeicons/react'
import { ArrowLeftRight } from '@hugeicons/core-free-icons'
import Link from 'next/link'
import { getAvailableTokens } from '@/constants/tokens'
import { API_BASE_URL } from '@/constants/api'
import { useAccount } from 'wagmi'
import { arbitrumSepolia } from 'viem/chains'

export default function Options({
    token,
    side,
    onSideChange,
}: {
    token: string
    side: 'BUY' | 'SELL'
    onSideChange: (side: 'BUY' | 'SELL') => void
}) {
    const { chainId } = useAccount()
    const allTokens = getAvailableTokens()
    const availableTokens = React.useMemo(
        () => {
            // Di Arbitrum Sepolia, hanya tampilkan token ETH (base token) saja
            if (chainId === arbitrumSepolia.id) {
                return ['ETH']
            }
            return allTokens
        },
        [chainId, allTokens]
    )
    const [tokenPrices, setTokenPrices] = React.useState<Record<string, number>>({})
    const [loading, setLoading] = React.useState(true)

    React.useEffect(() => {
        const fetchPrices = async () => {
            try {
                // Fetch via backend proxy to bypass ISP blocking
                const symbols = availableTokens.map(t => `${t}USDT`)
                const symbolsParam = JSON.stringify(symbols)
                const response = await fetch(`${API_BASE_URL}/api/binance/prices?symbols=${encodeURIComponent(symbolsParam)}`)
                const data = await response.json()

                // Check if data is an array (could be error object)
                if (!Array.isArray(data)) {
                    console.error('Invalid price data:', data)
                    return
                }

                // Convert to an easy-to-use format
                const prices: Record<string, number> = {}
                data.forEach((item: { symbol: string; price: string }) => {
                    const symbol = item.symbol.replace('USDT', '')
                    prices[symbol] = parseFloat(item.price)
                })

                setTokenPrices(prices)
            } catch (error) {
                console.error('Error fetching token prices:', error)
            } finally {
                setLoading(false)
            }
        }

        fetchPrices()

        // Refresh setiap 30 detik (reduced to avoid rate limits)
        const interval = setInterval(fetchPrices, 30_000)

        return () => clearInterval(interval)
    }, [availableTokens])

    return (
        <div className='grid grid-cols-2'>
            <Button
                variant="outline"
                size={"lg"}
                onClick={() => onSideChange(side === 'BUY' ? 'SELL' : 'BUY')}
                className={side === 'BUY' ? 'text-green-500 border-green-500' : 'text-red-500 border-red-500'}
            >
                {side} <HugeiconsIcon icon={ArrowLeftRight} strokeWidth={2} className="size-4" />
            </Button>
            <Dialog>
                <DialogTrigger asChild>
                    <Button variant="outline" size={"lg"}>{token}</Button>
                </DialogTrigger>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Select Token</DialogTitle>
                        <DialogDescription>
                            Choose a token to trade. Prices are updated in real-time.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="no-scrollbar -mx-4 max-h-[50vh] overflow-y-auto px-4">
                        {loading ? (
                            <div className="p-4 text-center text-sm text-muted-foreground">Loading prices...</div>
                        ) : (
                            <ul className="space-y-1">
                                {availableTokens.map((symbol) => {
                                    const price = tokenPrices[symbol] || 0
                                    return (
                                        <Link href={`/trade/${symbol}`} key={symbol}>
                                            <li className="p-4 flex justify-between items-center hover:bg-secondary cursor-pointer">
                                                <span className="font-semibold">{symbol} / USDC</span>
                                                <span className="font-mono font-medium text-blue-600">
                                                    {new Intl.NumberFormat('en-US', {
                                                        style: 'currency',
                                                        currency: 'USD',
                                                        minimumFractionDigits: 2,
                                                        maximumFractionDigits: 6
                                                    }).format(price)}
                                                </span>
                                            </li>
                                        </Link>
                                    )
                                })}
                            </ul>
                        )}
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    )
}
