'use client'
import React from 'react'
import { useTokenBalance } from '@/hooks/useTokenBalance'

export default function Balance({ token }: { token: string }) {
    const tokenBalance = useTokenBalance(token)
    const usdcBalance = useTokenBalance('USDC')

    return (
        <div className='grid grid-cols-2'>
            <div>
                <p>{token}</p>
                <p>USDC</p>
            </div>
            <div className='text-right'>
                <p>
                    {tokenBalance.isLoading
                        ? 'Loading...'
                        : parseFloat(tokenBalance.balance).toLocaleString('en-US', {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 6
                        })
                    }
                </p>
                <p>
                    {usdcBalance.isLoading
                        ? 'Loading...'
                        : parseFloat(usdcBalance.balance).toLocaleString('en-US', {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2
                        })
                    }
                </p>
            </div>
        </div>
    )
}

// convertion currency from exchange, ETC.

// function formatCurency(amount, currencyCode, locale = getDefaultLocale(currencyCode)) {
//     return ()
// }
