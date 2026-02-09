'use client'
import { useAccount, useBalance, useReadContracts } from 'wagmi'
import { formatUnits } from 'viem'
import { TOKEN_ADDRESSES } from '@/constants/tokens'

// ERC20 ABI untuk balanceOf
const ERC20_ABI = [
    {
        inputs: [{ name: 'account', type: 'address' }],
        name: 'balanceOf',
        outputs: [{ name: '', type: 'uint256' }],
        stateMutability: 'view',
        type: 'function',
    },
    {
        inputs: [],
        name: 'decimals',
        outputs: [{ name: '', type: 'uint8' }],
        stateMutability: 'view',
        type: 'function',
    },
] as const

/**
 * Custom hook untuk mendapatkan balance token dari wallet
 * @param symbol - Symbol token (contoh: 'BTC', 'ETH', 'USDC')
 * @returns Balance token dalam bentuk string (formatted) dan raw bigint
 */
export function useTokenBalance(symbol: string) {
    const { address, chainId, isConnected } = useAccount()
    
    // Get token address for current chain
    const tokenAddress = chainId ? TOKEN_ADDRESSES[symbol.toUpperCase()]?.[chainId] : undefined
    
    // For native ETH
    const isNative = symbol.toUpperCase() === 'ETH'
    
    // Debug logging
    if (process.env.NODE_ENV === 'development') {
        console.log('useTokenBalance:', { symbol, chainId, address, tokenAddress, isNative, isConnected })
    }
    
    // Use useBalance for native token
    const { data: nativeBalance, isLoading: isLoadingNative, isError: isErrorNative } = useBalance({
        address: address,
        query: {
            enabled: isNative && !!address,
            staleTime: 10_000, // 10 seconds
            refetchInterval: 30_000, // 30 seconds
            refetchOnWindowFocus: false,
        },
    })
    
    // Use useReadContracts for ERC20 tokens (multicall - fetch balance and decimals together)
    const shouldFetchToken = !isNative && !!tokenAddress && !!address && isConnected
    const { data: tokenData, isLoading: isLoadingToken, isError: isErrorToken } = useReadContracts({
        contracts: shouldFetchToken ? [
            {
                address: tokenAddress as `0x${string}`,
                abi: ERC20_ABI,
                functionName: 'balanceOf',
                args: [address],
            },
            {
                address: tokenAddress as `0x${string}`,
                abi: ERC20_ABI,
                functionName: 'decimals',
            },
        ] : [],
        query: {
            enabled: shouldFetchToken,
            staleTime: 10_000, // 10 seconds
            refetchInterval: 30_000, // 30 seconds
            refetchOnWindowFocus: false,
        },
    })
    
    // Extract balance and decimals from multicall result
    const tokenBalance = tokenData?.[0]?.result as bigint | undefined
    const decimals = tokenData?.[1]?.result as number | undefined
    
    // Format balance
    let formattedBalance = '0.00'
    let rawBalance = BigInt(0)
    
    if (isNative && nativeBalance) {
        rawBalance = nativeBalance.value
        formattedBalance = formatUnits(nativeBalance.value, 18)
    } else if (tokenBalance !== undefined) {
        rawBalance = tokenBalance
        // Use decimals if available, otherwise default to 18 (most ERC20 tokens use 18)
        const tokenDecimals = decimals !== undefined ? decimals : 18
        formattedBalance = formatUnits(tokenBalance, tokenDecimals)
    }
    
    // Determine loading state
    // If not connected, not loading
    if (!address) {
        return {
            balance: '0.00',
            rawBalance: BigInt(0),
            isLoading: false,
            isConnected: false,
            tokenAddress,
            hasError: false,
        }
    }
    
    // If token not found for current chain
    if (!isNative && !tokenAddress) {
        return {
            balance: '0.00',
            rawBalance: BigInt(0),
            isLoading: false,
            isConnected: true,
            tokenAddress: undefined,
            hasError: false,
        }
    }
    
    // Only show loading if we're actually fetching and don't have data yet
    const isLoading = isNative 
        ? (isLoadingNative && !nativeBalance)
        : (isLoadingToken && (tokenBalance === undefined || decimals === undefined))
    
    return {
        balance: formattedBalance,
        rawBalance,
        isLoading,
        isConnected: true,
        tokenAddress,
        hasError: isNative ? isErrorNative : isErrorToken,
    }
}
