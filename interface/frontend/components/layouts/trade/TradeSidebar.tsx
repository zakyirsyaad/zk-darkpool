'use client'
import React from 'react'
import Amount from '@/components/layouts/trade/Amount'
import Balance from '@/components/layouts/trade/Balance'
import Info from '@/components/layouts/trade/Info'
import Options from '@/components/layouts/trade/Options'
import { useCreateOrder, useUpdateOrder } from '@/hooks/useOrders'
import { useBinanceBookTicker } from '@/hooks/useBinanceBookTicker'
import { useAccount } from 'wagmi'
import { useDarkPool, generateProof } from '@/hooks/useDarkPool'
import { parseUnits } from 'viem'

type TradeStatus =
  | 'idle'
  | 'saving_order'      // Step 1: Save order to DB
  | 'generating_proof'  // Step 2: Generate ZK proof
  | 'approving'         // Step 3: Approve token
  | 'settling'          // Step 4: On-chain settlement
  | 'updating_order'    // Step 5: Update order in DB
  | 'success'
  | 'error'

export default function TradeSidebar({ token }: { token: string }) {
  const [amount, setAmount] = React.useState('')
  const [side, setSide] = React.useState<'BUY' | 'SELL'>('BUY')
  const [status, setStatus] = React.useState<TradeStatus>('idle')
  const [txHash, setTxHash] = React.useState<string>('')
  const [errorMsg, setErrorMsg] = React.useState('')
  const [savings, setSavings] = React.useState<number>(0)

  const { address, isConnected } = useAccount()
  const { data: ticker } = useBinanceBookTicker(token.toUpperCase())
  const createOrder = useCreateOrder()
  const updateOrder = useUpdateOrder()
  const { settleTrade, approveToken, quoteTokenAddress, baseTokenAddress, isPending } = useDarkPool()

  const isLoading = status !== 'idle' && status !== 'success' && status !== 'error'

  const getStatusMessage = () => {
    switch (status) {
      case 'saving_order': return '1/5 Saving order...'
      case 'generating_proof': return '2/5 Generating ZK Proof...'
      case 'approving': return '3/5 Approving token...'
      case 'settling': return '4/5 Settling on-chain...'
      case 'updating_order': return '5/5 Updating order...'
      case 'success': return 'Trade completed!'
      case 'error': return errorMsg || 'Error occurred'
      default: return `${side} ${token}`
    }
  }

  const handleSubmit = async () => {
    // Validation
    if (!isConnected || !address) {
      alert('Please connect your wallet first')
      return
    }

    const size = parseFloat(amount)
    if (!size || size <= 0) {
      alert('Please enter a valid amount')
      return
    }

    if (!ticker?.midpoint || !ticker?.spread) {
      alert('Price not available, please try again')
      return
    }

    // Reset state
    setStatus('idle')
    setErrorMsg('')
    setTxHash('')
    setSavings(0)

    let orderId: string | null = null

    try {
      // ============================================
      // Step 1: Save order to database
      // ============================================
      setStatus('saving_order')
      const amountQuote = size * ticker.midpoint

      const order = await createOrder.mutateAsync({
        user_address: address,
        side,
        asset: token.toUpperCase(),
        quote_asset: 'USDC',
        size: amount,
        price: ticker.midpoint.toString(),
      })

      orderId = order.id
      console.log('Order saved:', order)

      // ============================================
      // Step 2: Generate ZK proof
      // ============================================
      setStatus('generating_proof')
      const tickerSymbol = `${token.toUpperCase()}USDT`
      const proof = await generateProof(size, amountQuote, tickerSymbol)
      console.log('ZK Proof generated:', proof)

      // Check if proof is valid
      if (proof.publicInputs[0] === "0" || String(proof.publicInputs[0]) === "0") {
        throw new Error('ZK proof computed valid=0. Trade check failed in circuit.')
      }

      // ============================================
      // Step 3: Approve token
      // BUY: User pays USDC to get base token
      // SELL: User pays base token to get USDC
      // ============================================
      setStatus('approving')

      if (side === 'BUY') {
        // Buyer pays USDC
        const quoteAmountWei = parseUnits(amountQuote.toFixed(6), 18)
        if (quoteTokenAddress) {
          console.log(`Approving ${amountQuote.toFixed(2)} USDC...`)
          await approveToken(quoteTokenAddress as `0x${string}`, quoteAmountWei)
        }
      } else {
        // Seller pays base token
        const baseAmountWei = parseUnits(size.toString(), 18)
        if (baseTokenAddress) {
          console.log(`Approving ${size} ${token}...`)
          await approveToken(baseTokenAddress as `0x${string}`, baseAmountWei)
        }
      }
      console.log('Token approved')

      // ============================================
      // Step 4: Settle trade on-chain
      // For testing: user is both buyer and seller (self-trade)
      // In production: would be matched with counterparty
      // ============================================
      setStatus('settling')

      // Self-trade for testing
      const buyer = address
      const seller = address

      console.log('Settling trade:', {
        side,
        buyer,
        seller,
        amountBase: size,
        amountQuote: amountQuote.toFixed(2),
      })

      const hash = await settleTrade({
        proof,
        buyer,
        seller,
        amountBase: size.toString(),
        amountQuote: amountQuote.toFixed(6),
        ticker: tickerSymbol,
      })

      setTxHash(hash)
      console.log('Trade settled:', hash)

      // ============================================
      // Step 5: Update order in database
      // ============================================
      setStatus('updating_order')
      await updateOrder.mutateAsync({
        orderId: orderId,
        data: {
          status: 'filled',
          filled: size,
          proof_hash: hash,
        }
      })
      console.log('Order updated')

      // ============================================
      // Success!
      // ============================================
      const spreadSavings = size * (ticker.spread / 2)
      setSavings(spreadSavings)
      setStatus('success')
      setAmount('')

      const explorerUrl = `https://sepolia.arbiscan.io/tx/${hash}`

      if (side === 'BUY') {
        alert(
          `Successfully bought ${size} ${token}!\n\n` +
          `Paid: ${amountQuote.toFixed(2)} USDC\n` +
          `Received: ${size} ${token}\n` +
          `Price: $${ticker.midpoint.toFixed(2)}\n` +
          `Spread savings: $${spreadSavings.toFixed(4)}\n\n` +
          `View tx: ${explorerUrl}`
        )
      } else {
        alert(
          `Successfully sold ${size} ${token}!\n\n` +
          `Sold: ${size} ${token}\n` +
          `Received: ${amountQuote.toFixed(2)} USDC\n` +
          `Price: $${ticker.midpoint.toFixed(2)}\n` +
          `Spread savings: $${spreadSavings.toFixed(4)}\n\n` +
          `View tx: ${explorerUrl}`
        )
      }

    } catch (error) {
      console.error('Trade error:', error)
      setStatus('error')
      const message = error instanceof Error ? error.message : 'Failed to complete trade'
      setErrorMsg(message)

      // Cancel order if it was created
      if (orderId) {
        try {
          await updateOrder.mutateAsync({
            orderId: orderId,
            data: { status: 'cancelled' }
          })
        } catch (updateError) {
          console.error('Failed to cancel order:', updateError)
        }
      }

      alert(message)
    }
  }

  return (
    <div className='space-y-5 border-x border-b p-5'>
      <Balance token={token} />
      <Options token={token} side={side} onSideChange={setSide} />
      <Amount
        token={token}
        amount={amount}
        onAmountChange={setAmount}
        side={side}
        onSubmit={handleSubmit}
        isLoading={isLoading || isPending}
        disabled={!isConnected}
        statusMessage={isLoading ? getStatusMessage() : undefined}
      />
      <Info token={token} amount={amount} />

      {/* Status indicator */}
      {status !== 'idle' && (
        <div className={`text-sm p-3 rounded space-y-1 ${status === 'success' ? 'bg-green-500/10 text-green-500' :
            status === 'error' ? 'bg-red-500/10 text-red-500' :
              'bg-blue-500/10 text-blue-500'
          }`}>
          <p className="font-medium">{getStatusMessage()}</p>

          {status === 'success' && savings > 0 && (
            <p className="text-xs">
              Spread savings: ${savings.toFixed(4)}
            </p>
          )}

          {txHash && (
            <a
              href={`https://sepolia.arbiscan.io/tx/${txHash}`}
              target="_blank"
              rel="noopener noreferrer"
              className="block underline text-xs opacity-80 hover:opacity-100"
            >
              View on Arbiscan →
            </a>
          )}
        </div>
      )}

      <p className='text-xs text-muted-foreground'>
        {side === 'BUY'
          ? `Pay USDC to receive ${token} at Binance midpoint price`
          : `Sell ${token} to receive USDC at Binance midpoint price`
        }
      </p>
    </div>
  )
}
