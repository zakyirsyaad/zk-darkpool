import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ArrowLeftRight } from 'lucide-react'
import React from 'react'

export type InputMode = 'token' | 'usdc'

export default function Amount({
    token,
    amount,
    onAmountChange,
    side,
    onSubmit,
    isLoading,
    disabled,
    buttonLabel,
    insufficientBalance,
    inputMode,
    onToggleInputMode,
    equivalentDisplay,
    isConnectWallet,
}: {
    token: string
    amount: string
    onAmountChange: (next: string) => void
    side: 'BUY' | 'SELL'
    onSubmit: () => void
    isLoading?: boolean
    disabled?: boolean
    buttonLabel?: string
    insufficientBalance?: boolean
    inputMode: InputMode
    onToggleInputMode: () => void
    equivalentDisplay: string
    isConnectWallet?: boolean
}) {
    const buttonClass = isConnectWallet
        ? 'w-full font-bold bg-white text-black hover:bg-gray-100 border border-input'
        : insufficientBalance
            ? 'w-full font-bold bg-zinc-600 hover:bg-zinc-600 cursor-not-allowed opacity-70'
            : `w-full font-bold ${side === 'BUY' ? 'bg-emerald-500 hover:bg-emerald-600' : 'bg-red-600 hover:bg-red-700'}`

    const unit = inputMode === 'token' ? token : 'USDC'

    return (
        <div className='space-y-1'>
            <Label>Amount</Label>
            <div className="flex items-center">
                <Input
                    placeholder='0'
                    value={amount}
                    inputMode="decimal"
                    onChange={(e) => onAmountChange(e.target.value)}
                    disabled={isLoading || disabled}
                    className="pr-16"
                />
                {/* <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground pointer-events-none">
                    {unit}
                </span> */}
                <Button
                    type="button"
                    variant={"ghost"}
                    size={"lg"}
                    onClick={onToggleInputMode}
                    className="text-muted-foreground hover:text-foreground transition-colors text-xl"
                >
                    <ArrowLeftRight /><span className="font-semibold text-foreground">{unit}</span>
                </Button>
            </div>
            {equivalentDisplay && (
                <p className="text-muted-foreground">{equivalentDisplay}</p>
            )}
            <Button
                className={buttonClass}
                size={"lg"}
                onClick={onSubmit}
                disabled={isLoading || disabled || insufficientBalance}
            >
                {buttonLabel || `${side} ${token}`}
            </Button>
        </div>
    )
}
