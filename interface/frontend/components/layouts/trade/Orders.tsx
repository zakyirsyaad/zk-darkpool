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
import {
    Pagination,
    PaginationContent,
    PaginationEllipsis,
    PaginationItem,
    PaginationLink,
    PaginationNext,
    PaginationPrevious,
} from "@/components/ui/pagination"
import { Button } from "@/components/ui/button"
import { useOrders, useCancelOrder } from '@/hooks/useOrders'
import { useAccount } from 'wagmi'

const ORDERS_PER_PAGE = 8

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
    const [currentPage, setCurrentPage] = React.useState(1)

    const totalOrders = orders?.length ?? 0
    const totalPages = Math.max(1, Math.ceil(totalOrders / ORDERS_PER_PAGE))

    // Reset to page 1 if current page exceeds total pages
    React.useEffect(() => {
        if (currentPage > totalPages) setCurrentPage(1)
    }, [totalPages, currentPage])

    const paginatedOrders = React.useMemo(() => {
        if (!orders) return []
        const start = (currentPage - 1) * ORDERS_PER_PAGE
        return orders.slice(start, start + ORDERS_PER_PAGE)
    }, [orders, currentPage])

    const handleCancel = (orderId: string) => {
        if (confirm('Are you sure you want to cancel this order?')) {
            cancelOrder.mutate(orderId)
        }
    }

    // Generate page numbers to display
    const getPageNumbers = (): (number | 'ellipsis')[] => {
        if (totalPages <= 5) {
            return Array.from({ length: totalPages }, (_, i) => i + 1)
        }

        const pages: (number | 'ellipsis')[] = [1]

        if (currentPage > 3) pages.push('ellipsis')

        const start = Math.max(2, currentPage - 1)
        const end = Math.min(totalPages - 1, currentPage + 1)
        for (let i = start; i <= end; i++) pages.push(i)

        if (currentPage < totalPages - 2) pages.push('ellipsis')

        pages.push(totalPages)
        return pages
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
        <div className="space-y-4">
            <Table>
                <TableCaption>
                    {totalOrders === 0
                        ? 'No orders yet. Place your first order!'
                        : `Showing ${(currentPage - 1) * ORDERS_PER_PAGE + 1}–${Math.min(currentPage * ORDERS_PER_PAGE, totalOrders)} of ${totalOrders} order(s)`
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
                    {paginatedOrders.map((order) => (
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

            {totalPages > 1 && (
                <Pagination>
                    <PaginationContent>
                        <PaginationItem>
                            <PaginationPrevious
                                href="#"
                                onClick={(e) => {
                                    e.preventDefault()
                                    setCurrentPage((p) => Math.max(1, p - 1))
                                }}
                                className={currentPage === 1 ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                            />
                        </PaginationItem>

                        {getPageNumbers().map((page, idx) =>
                            page === 'ellipsis' ? (
                                <PaginationItem key={`ellipsis-${idx}`}>
                                    <PaginationEllipsis />
                                </PaginationItem>
                            ) : (
                                <PaginationItem key={page}>
                                    <PaginationLink
                                        href="#"
                                        isActive={page === currentPage}
                                        onClick={(e) => {
                                            e.preventDefault()
                                            setCurrentPage(page)
                                        }}
                                        className="cursor-pointer"
                                    >
                                        {page}
                                    </PaginationLink>
                                </PaginationItem>
                            )
                        )}

                        <PaginationItem>
                            <PaginationNext
                                href="#"
                                onClick={(e) => {
                                    e.preventDefault()
                                    setCurrentPage((p) => Math.min(totalPages, p + 1))
                                }}
                                className={currentPage === totalPages ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                            />
                        </PaginationItem>
                    </PaginationContent>
                </Pagination>
            )}
        </div>
    )
}
