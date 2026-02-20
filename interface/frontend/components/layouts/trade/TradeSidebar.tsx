'use client'
import React from 'react'
import Amount, { type InputMode } from '@/components/layouts/trade/Amount'
import Balance from '@/components/layouts/trade/Balance'
import Info from '@/components/layouts/trade/Info'
import Options from '@/components/layouts/trade/Options'
import {
  useSubmitOrder,
  useConfirmSettlement,
  useUnmatchOrders,
  type MatchResult,
} from '@/hooks/useOrders'
import { useBinanceBookTicker } from '@/hooks/useBinanceBookTicker'
import { useTokenBalance } from '@/hooks/useTokenBalance'
import { useAccount } from 'wagmi'
import { useConnectModal } from '@rainbow-me/rainbowkit'
import { useDarkPool, generateProof } from '@/hooks/useDarkPool'
import { parseUnits } from 'viem'
import { API_BASE_URL } from '@/constants/api'
import { Alert, AlertTitle, AlertDescription, AlertAction } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { CircleCheck, CircleAlert, X } from 'lucide-react'

type AlertInfo = {
  variant: 'default' | 'destructive'
  title: string
  description: string
  txHash?: string
} | null

type TradeStatus =
  | 'idle'
  | 'submitting_order'   // Step 1: Submit order with matching
  | 'approving'          // Step 2: Approve token
  | 'waiting_match'      // No match - order in book, waiting
  | 'generating_proof'   // Step 3: Generate ZK proof (matched)
  | 'settling'           // Step 4: On-chain settlement
  | 'confirming'         // Step 5: Confirm settlement in DB
  | 'success'
  | 'error'

export default function TradeSidebar({ token }: { token: string }) {
  const [amount, setAmount] = React.useState('')
  const [inputMode, setInputMode] = React.useState<InputMode>('token')
  const [side, setSide] = React.useState<'BUY' | 'SELL'>('BUY')
  const [status, setStatus] = React.useState<TradeStatus>('idle')
  const [txHash, setTxHash] = React.useState<string>('')
  const [errorMsg, setErrorMsg] = React.useState('')
  const [savings, setSavings] = React.useState<number>(0)
  const [matchInfo, setMatchInfo] = React.useState<MatchResult | null>(null)
  const [alertInfo, setAlertInfo] = React.useState<AlertInfo>(null)

  const showAlert = (variant: 'default' | 'destructive', title: string, description: string, txHash?: string) => {
    setAlertInfo({ variant, title, description, txHash })
  }

  const { address, isConnected } = useAccount()
  const { openConnectModal } = useConnectModal()
  const { data: ticker } = useBinanceBookTicker(token.toUpperCase())
  const submitOrder = useSubmitOrder()
  const confirmSettlement = useConfirmSettlement()
  const unmatchOrders = useUnmatchOrders()
  const { settleTrade, approveToken, quoteTokenAddress, baseTokenAddress, isPending } = useDarkPool()

  // Token balances for insufficient balance check
  const baseBalance = useTokenBalance(token)
  const quoteBalance = useTokenBalance('USDC')

  const midpoint = ticker?.midpoint ?? 0

  const tokenSize = React.useMemo(() => {
    const val = parseFloat(amount)
    if (!val || val <= 0 || !midpoint) return 0
    return inputMode === 'token' ? val : val / midpoint
  }, [amount, inputMode, midpoint])

  const equivalentDisplay = React.useMemo(() => {
    const val = parseFloat(amount)
    if (!val || val <= 0 || !midpoint) return ''
    if (inputMode === 'token') {
      return `≈ ${(val * midpoint).toFixed(2)} USDC`
    }
    return `≈ ${(val / midpoint).toFixed(6)} ${token}`
  }, [amount, inputMode, midpoint, token])

  // Track the current order ID for polling
  const [currentOrderId, setCurrentOrderId] = React.useState<string | null>(null)

  // Poll order status while waiting for counterparty match
  React.useEffect(() => {
    if (status !== 'waiting_match' || !currentOrderId) return

    const interval = setInterval(async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/api/orders/${currentOrderId}?user_address=${address}`)
        if (!res.ok) return
        const order = await res.json()

        if (order.status === 'filled') {
          clearInterval(interval)
          setTxHash(order.proof_hash || '')
          setStatus('success')
          setAmount('')
          showAlert(
            'default',
            'Order Filled!',
            `Your ${side.toLowerCase()} order for ${order.size} ${token} has been filled by a counterparty.`,
            order.proof_hash
          )
        }
      } catch {
        // Silently ignore polling errors
      }
    }, 5000)

    return () => clearInterval(interval)
  }, [status, currentOrderId, side, token, address])

  const isLoading = status !== 'idle' && status !== 'success' && status !== 'error' && status !== 'waiting_match'
  const isOrderActive = status === 'waiting_match' || status === 'success'

  const insufficientBalance = React.useMemo(() => {
    if (!tokenSize || tokenSize <= 0) return false

    if (side === 'BUY') {
      const neededQuote = midpoint ? tokenSize * midpoint : 0
      const availableQuote = parseFloat(quoteBalance.balance)
      return neededQuote > 0 && availableQuote < neededQuote
    } else {
      const availableBase = parseFloat(baseBalance.balance)
      return availableBase < tokenSize
    }
  }, [tokenSize, side, midpoint, baseBalance.balance, quoteBalance.balance])

  const getStatusMessage = () => {
    switch (status) {
      case 'submitting_order': return '1/5 Submitting order...'
      case 'generating_proof': return '2/5 Generating ZK Proof...'
      case 'approving': return '3/5 Approving token...'
      case 'waiting_match': return 'Order placed! Waiting for counterparty...'
      case 'settling': return matchInfo ? '4/5 Settling on-chain...' : 'Counterparty found! Settling...'
      case 'confirming': return '5/5 Confirming settlement...'
      case 'success': return 'Trade completed!'
      case 'error': return errorMsg || 'Error occurred'
      default: return ''
    }
  }

  const getButtonLabel = () => {
    if (!isConnected || !address) return 'Connect wallet first'
    if (insufficientBalance) return 'Insufficient Balance'
    if (status === 'waiting_match') return 'Order Placed'
    if (status === 'success') return 'Trade Completed'
    if (isLoading) return getStatusMessage()
    return `${side} ${token}`
  }

  const handleSubmit = async () => {
    // Validation
    if (!isConnected || !address) {
      showAlert('destructive', 'Wallet Required', 'Please connect your wallet first.')
      return
    }

    if (!tokenSize || tokenSize <= 0) {
      showAlert('destructive', 'Invalid Amount', 'Please enter a valid amount.')
      return
    }

    if (!ticker?.midpoint || !ticker?.spread) {
      showAlert('destructive', 'Price Unavailable', 'Price not available, please try again.')
      return
    }

    // Reset state
    setStatus('idle')
    setErrorMsg('')
    setTxHash('')
    setSavings(0)
    setMatchInfo(null)
    setCurrentOrderId(null)
    setAlertInfo(null)

    let orderId: string | null = null
    let matchResult: MatchResult | null = null

    try {
      // ============================================
      // Step 1: Submit order with matching
      // Backend will try to find a counterparty
      // ============================================
      setStatus('submitting_order')
      const tickerSymbol = `${token.toUpperCase()}USDT`

      const result = await submitOrder.mutateAsync({
        user_address: address,
        side,
        asset: token.toUpperCase(),
        quote_asset: 'USDC',
        size: tokenSize.toString(),
        price: ticker.midpoint.toString(),
      })

      orderId = result.order.id
      setCurrentOrderId(orderId)
      matchResult = result.matched ? (result.match ?? null) : null
      setMatchInfo(matchResult)
      console.log('Order submitted:', result)

      // ============================================
      // Step 2: Check match result and branch
      // ============================================
      if (matchResult) {
        // ============================================
        // MATCHED - Generate proof FIRST, then approve with exact amounts, then settle
        // ============================================
        const match = matchResult
        const matchAmountQuote = match.matchSize * match.matchPrice

        console.log('Match found:', {
          buyer: match.buyerAddress,
          seller: match.sellerAddress,
          price: match.matchPrice,
          size: match.matchSize,
          quoteAmount: matchAmountQuote,
        })

        // Step 2a: Generate ZK proof FIRST to get exact on-chain amounts
        setStatus('generating_proof')
        const proof = await generateProof(match.matchSize, matchAmountQuote, tickerSymbol)
        console.log('ZK Proof generated:', proof)

        // Check if proof is valid
        if (proof.publicInputs[0] === "0" || String(proof.publicInputs[0]) === "0") {
          throw new Error('ZK proof computed valid=0. Trade check failed in circuit.')
        }

        // Extract exact amounts from proof publicInputs (these are in wei)
        // Circom output order: [valid, amountBase, amountQuote, midpointPrice, toleranceBps]
        const proofAmountBaseWei = BigInt(proof.publicInputs[1])
        const proofAmountQuoteWei = BigInt(proof.publicInputs[2])

        console.log('Proof amounts (wei):', {
          amountBase: proofAmountBaseWei.toString(),
          amountQuote: proofAmountQuoteWei.toString(),
        })

        // Step 2b: Approve token using EXACT amounts from proof
        setStatus('approving')

        if (side === 'BUY' && quoteTokenAddress) {
          console.log(`Approving quote token (USDC) as buyer, amount: ${proofAmountQuoteWei}`)
          await approveToken(quoteTokenAddress as `0x${string}`, proofAmountQuoteWei)
        } else if (side === 'SELL' && baseTokenAddress) {
          console.log(`Approving base token (${token}) as seller, amount: ${proofAmountBaseWei}`)
          await approveToken(baseTokenAddress as `0x${string}`, proofAmountBaseWei)
        }

        console.log('Token approved with exact proof amounts')

        // Step 2c: Settle trade on-chain (amounts come from proof's publicInputs)
        setStatus('settling')
        const hash = await settleTrade({
          proof,
          buyer: match.buyerAddress as `0x${string}`,
          seller: match.sellerAddress as `0x${string}`,
        })

        setTxHash(hash)
        console.log('Trade settled on-chain:', hash)

        // Step 2d: Confirm settlement in DB (updates both orders)
        setStatus('confirming')
        await confirmSettlement.mutateAsync({
          orderId: orderId,
          matchedOrderId: match.matchedOrderId,
          txHash: hash,
          filledSize: match.matchSize,
        })
        console.log('Settlement confirmed for both orders')

        // ============================================
        // Success!
        // ============================================
        const spreadSavings = match.matchSize * (ticker.spread / 2)
        setSavings(spreadSavings)
        setStatus('success')
        setAmount('')

        const counterparty = side === 'BUY'
          ? match.sellerAddress
          : match.buyerAddress
        const counterpartyShort = `${counterparty.slice(0, 6)}...${counterparty.slice(-4)}`

        if (side === 'BUY') {
          showAlert(
            'default',
            `Bought ${match.matchSize} ${token}`,
            `Matched with ${counterpartyShort} · Paid ${matchAmountQuote.toFixed(2)} USDC · Price $${match.matchPrice.toFixed(2)} · Saved $${spreadSavings.toFixed(4)}`,
            hash
          )
        } else {
          showAlert(
            'default',
            `Sold ${match.matchSize} ${token}`,
            `Matched with ${counterpartyShort} · Received ${matchAmountQuote.toFixed(2)} USDC · Price $${match.matchPrice.toFixed(2)} · Saved $${spreadSavings.toFixed(4)}`,
            hash
          )
        }

      } else {
        // ============================================
        // NO MATCH - Approve token with generous buffer, wait for counterparty
        // When counterparty settles, their proof determines exact amounts.
        // We add 10% buffer to handle midpoint price fluctuations.
        // ============================================
        setStatus('approving')

        if (side === 'BUY' && quoteTokenAddress) {
          const estimatedQuote = tokenSize * ticker.midpoint
          const bufferedQuote = estimatedQuote * 1.1
          const quoteAmountWei = parseUnits(bufferedQuote.toFixed(6), 18)
          console.log(`No match - approving ${bufferedQuote.toFixed(2)} USDC (with 10% buffer) as buyer...`)
          await approveToken(quoteTokenAddress as `0x${string}`, quoteAmountWei)
        } else if (side === 'SELL' && baseTokenAddress) {
          const baseAmountWei = parseUnits(tokenSize.toString(), 18)
          console.log(`No match - approving ${tokenSize} ${token} (base token) as seller...`)
          await approveToken(baseTokenAddress as `0x${string}`, baseAmountWei)
        }

        console.log('Token approved, waiting for counterparty')
        setStatus('waiting_match')
        setAmount('')
        console.log('No match found, order added to book:', orderId)
      }

    } catch (error) {
      console.error('Trade error:', error)
      setStatus('error')
      const message = error instanceof Error ? error.message : 'Failed to complete trade'
      setErrorMsg(message)

      // If we had a match and settlement failed, revert both orders to open
      if (orderId && matchResult) {
        try {
          console.log('Reverting matched orders to open...')
          await unmatchOrders.mutateAsync({
            orderId: orderId,
            matchedOrderId: matchResult.matchedOrderId,
          })
          console.log('Orders reverted to open')
        } catch (unmatchError) {
          console.error('Failed to revert orders:', unmatchError)
        }
      }

      showAlert('destructive', 'Trade Failed', message)
    }
  }

  const handleReset = () => {
    setStatus('idle')
    setErrorMsg('')
    setTxHash('')
    setSavings(0)
    setMatchInfo(null)
    setCurrentOrderId(null)
    setAlertInfo(null)
  }

  const handlePrimaryAction = () => {
    if (!isConnected || !address) {
      openConnectModal?.()
      return
    }
    handleSubmit()
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
        onSubmit={handlePrimaryAction}
        isLoading={isLoading || isPending}
        disabled={(isLoading || isPending) || (isConnected && isOrderActive)}
        buttonLabel={getButtonLabel()}
        insufficientBalance={insufficientBalance}
        inputMode={inputMode}
        onToggleInputMode={() => setInputMode(m => m === 'token' ? 'usdc' : 'token')}
        equivalentDisplay={equivalentDisplay}
        isConnectWallet={!isConnected || !address}
      />
      <p className='text-xs text-muted-foreground'>
        {side === 'BUY'
          ? `Pay USDC to receive ${token} at Binance midpoint price`
          : `Sell ${token} to receive USDC at Binance midpoint price`
        }
      </p>
      <Info token={token} amount={tokenSize.toString()} />

      {/* Status indicator */}
      {status !== 'idle' && (
        <div className={`text-sm p-3 rounded space-y-1 ${status === 'success' ? 'bg-green-500/10 text-green-500' :
          status === 'error' ? 'bg-red-500/10 text-red-500' :
            status === 'waiting_match' ? 'bg-yellow-500/10 text-yellow-500' :
              'bg-blue-500/10 text-blue-500'
          }`}>
          <p className="font-medium">{getStatusMessage()}</p>

          {status === 'waiting_match' && (
            <div className="space-y-2">
              <p className="text-xs opacity-80">
                Your {side.toLowerCase()} order has been placed and your{' '}
                {side === 'BUY' ? 'USDC (quote)' : `${token} (base)`} token approved.
                When a counterparty places a matching order, settlement will happen automatically.
              </p>
              <button
                onClick={handleReset}
                className="text-xs underline opacity-70 hover:opacity-100"
              >
                Place another order
              </button>
            </div>
          )}



          {status === 'success' && savings > 0 && (
            <p className="text-xs">
              Spread savings: ${savings.toFixed(4)}
            </p>
          )}

          {status === 'success' && matchInfo && (
            <p className="text-xs opacity-80">
              Matched with: {side === 'BUY'
                ? `${matchInfo.sellerAddress.slice(0, 6)}...${matchInfo.sellerAddress.slice(-4)}`
                : `${matchInfo.buyerAddress.slice(0, 6)}...${matchInfo.buyerAddress.slice(-4)}`
              }
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

      {alertInfo && (
        <Alert variant={alertInfo.variant} className="animate-in fade-in slide-in-from-top-1 duration-300">
          {alertInfo.variant === 'destructive' ? <CircleAlert className="size-4" /> : <CircleCheck className="size-4" />}
          <AlertTitle>{alertInfo.title}</AlertTitle>
          <AlertDescription>
            {alertInfo.description}
            {alertInfo.txHash && (
              <a
                href={`https://sepolia.arbiscan.io/tx/${alertInfo.txHash}`}
                target="_blank"
                rel="noopener noreferrer"
                className="block mt-1 underline"
              >
                View on Arbiscan
              </a>
            )}
          </AlertDescription>
          <AlertAction>
            <Button variant="ghost" size="icon" className="size-6" onClick={() => setAlertInfo(null)}>
              <X className="size-3" />
            </Button>
          </AlertAction>
        </Alert>
      )}
      <p className='text-sm'>All orders are pre-trade and post-trade private.</p>
    </div>
  )
}
