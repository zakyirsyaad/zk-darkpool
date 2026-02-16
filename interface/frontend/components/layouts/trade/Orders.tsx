'use client'
import React from 'react'
import {
    Table,
    TableBody,
    TableCaption,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { useOrders, useCancelOrder } from '@/hooks/useOrders'
import { useAccount } from 'wagmi'

function formatDate(dateString: string) {
    const date = new Date(dateString)
    return date.toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    })
}

function formatNumber(num: number, decimals = 2) {
    return new Intl.NumberFormat('en-US', {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
    }).format(num)
}

function StatusBadge({ status }: { status: string }) {
    const colors: Record<string, string> = {
        open: 'text-blue-500 bg-blue-500/10',
        matching: 'text-orange-500 bg-orange-500/10',
        filled: 'text-green-500 bg-green-500/10',
        partial: 'text-yellow-500 bg-yellow-500/10',
        cancelled: 'text-gray-500 bg-gray-500/10',
    }

    return (
        <span className={`px-2 py-1 rounded text-xs font-semibold capitalize ${colors[status] || ''}`}>
            {status}
        </span>
    )
}

function SideBadge({ side }: { side: 'BUY' | 'SELL' }) {
    return (
        <span className={`font-semibold ${side === 'BUY' ? 'text-green-500' : 'text-red-500'}`}>
            {side}
        </span>
    )
}

export default function Orders() {
    const { isConnected } = useAccount()
    const { data: orders, isLoading, isError } = useOrders()
    const cancelOrder = useCancelOrder()

    const handleCancel = (orderId: string) => {
        if (confirm('Are you sure you want to cancel this order?')) {
            cancelOrder.mutate(orderId)
        }
    }

    if (!isConnected) {
        return (
            <div className="p-8 text-center text-muted-foreground">
                Connect your wallet to view orders
            </div>
        )
    }

    if (isLoading) {
        return (
            <div className="p-8 text-center text-muted-foreground">
                Loading orders...
            </div>
        )
    }

    if (isError) {
        return (
            <div className="p-8 text-center text-red-500">
                Failed to load orders
            </div>
        )
    }

    return (
        <Table>
            <TableCaption>
                {orders?.length === 0
                    ? 'No orders yet. Place your first order!'
                    : `Showing ${orders?.length} order(s)`
                }
            </TableCaption>
            <TableHeader>
                <TableRow>
                    <TableHead className="w-[100px]">Status</TableHead>
                    <TableHead>Side</TableHead>
                    <TableHead>Asset</TableHead>
                    <TableHead className="text-right">Price</TableHead>
                    <TableHead className="text-right">Size</TableHead>
                    <TableHead className="text-right">Filled</TableHead>
                    <TableHead className="text-right">Value</TableHead>
                    <TableHead>Time</TableHead>
                    <TableHead>Tx</TableHead>
                    <TableHead className="w-[80px]"></TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
                {orders?.map((order) => (
                    <TableRow key={order.id}>
                        <TableCell>
                            <StatusBadge status={order.status} />
                        </TableCell>
                        <TableCell>
                            <SideBadge side={order.side} />
                        </TableCell>
                        <TableCell className="font-medium">
                            {order.asset}/{order.quote_asset}
                        </TableCell>
                        <TableCell className="text-right font-mono">
                            ${formatNumber(order.price)}
                        </TableCell>
                        <TableCell className="text-right font-mono">
                            {formatNumber(order.size, 4)}
                        </TableCell>
                        <TableCell className="text-right font-mono">
                            {formatNumber(order.filled, 4)} ({Math.round((order.filled / order.size) * 100)}%)
                        </TableCell>
                        <TableCell className="text-right font-mono">
                            ${formatNumber(order.order_value)}
                        </TableCell>
                        <TableCell className="text-muted-foreground text-sm">
                            {formatDate(order.created_at)}
                        </TableCell>
                        <TableCell>
                            {order.proof_hash && (
                                <a
                                    href={`https://sepolia.arbiscan.io/tx/${order.proof_hash}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-blue-500 hover:text-blue-600 text-xs underline"
                                >
                                    View
                                </a>
                            )}
                        </TableCell>
                        <TableCell>
                            {order.status === 'open' && (
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    className="text-red-500 hover:text-red-600 hover:bg-red-500/10"
                                    onClick={() => handleCancel(order.id)}
                                    disabled={cancelOrder.isPending}
                                >
                                    Cancel
                                </Button>
                            )}
                        </TableCell>
                    </TableRow>
                ))}
            </TableBody>
        </Table>
    )
}
