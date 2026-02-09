import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import React from 'react'

export default function Amount({
    token,
    amount,
    onAmountChange,
    side,
    onSubmit,
    isLoading,
    disabled,
    statusMessage,
}: {
    token: string
    amount: string
    onAmountChange: (next: string) => void
    side: 'BUY' | 'SELL'
    onSubmit: () => void
    isLoading?: boolean
    disabled?: boolean
    statusMessage?: string
}) {
    return (
        <div className='space-y-1'>
            <Label>Amount</Label>
            <Input
                placeholder='0'
                value={amount}
                inputMode="decimal"
                onChange={(e) => onAmountChange(e.target.value)}
                disabled={isLoading}
            />
            <Button
                className={`w-full font-bold ${side === 'BUY' ? 'bg-emerald-500 hover:bg-emerald-600' : 'bg-red-600 hover:bg-red-700'}`}
                size={"lg"}
                onClick={onSubmit}
                disabled={isLoading || disabled}
            >
                {statusMessage || `${side} ${token}`}
            </Button>
        </div>
    )
}
