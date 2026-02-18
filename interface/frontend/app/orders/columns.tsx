"use client"

import { ColumnDef } from "@tanstack/react-table"
import { ArrowUpDown, MoreHorizontal } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import type { Order } from "@/types/order"

function formatNumber(num: number, decimals = 2) {
  return new Intl.NumberFormat("en-US", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(num)
}

function formatDate(dateString: string) {
  return new Date(dateString).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
}

const statusColors: Record<string, string> = {
  open: "text-blue-500 bg-blue-500/10",
  matching: "text-orange-500 bg-orange-500/10",
  filled: "text-green-500 bg-green-500/10",
  partial: "text-yellow-500 bg-yellow-500/10",
  cancelled: "text-gray-500 bg-gray-500/10",
}

export const columns: ColumnDef<Order>[] = [
  {
    accessorKey: "status",
    header: "Status",
    cell: ({ row }) => {
      const status = row.getValue("status") as string
      return (
        <span className={`px-2 py-1 rounded text-xs font-semibold capitalize ${statusColors[status] || ""}`}>
          {status}
        </span>
      )
    },
    filterFn: (row, id, value) => value.includes(row.getValue(id)),
  },
  {
    accessorKey: "side",
    header: "Side",
    cell: ({ row }) => {
      const side = row.getValue("side") as string
      return (
        <span className={`font-semibold ${side === "BUY" ? "text-green-500" : "text-red-500"}`}>
          {side}
        </span>
      )
    },
    filterFn: (row, id, value) => value.includes(row.getValue(id)),
  },
  {
    id: "pair",
    header: "Pair",
    accessorFn: (row) => `${row.asset}/${row.quote_asset}`,
    cell: ({ row }) => (
      <span className="font-medium">{row.original.asset}/{row.original.quote_asset}</span>
    ),
  },
  {
    accessorKey: "price",
    header: ({ column }) => (
      <Button
        variant="ghost"
        className="px-0 hover:bg-transparent"
        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
      >
        Price
        <ArrowUpDown className="ml-1 h-3 w-3" />
      </Button>
    ),
    cell: ({ row }) => (
      <div className="text-right font-mono">${formatNumber(row.getValue("price"))}</div>
    ),
  },
  {
    accessorKey: "size",
    header: ({ column }) => (
      <Button
        variant="ghost"
        className="px-0 hover:bg-transparent"
        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
      >
        Size
        <ArrowUpDown className="ml-1 h-3 w-3" />
      </Button>
    ),
    cell: ({ row }) => (
      <div className="text-right font-mono">{formatNumber(row.getValue("size"), 4)}</div>
    ),
  },
  {
    accessorKey: "filled",
    header: "Filled",
    cell: ({ row }) => {
      const filled = row.getValue("filled") as number
      const size = row.original.size
      const pct = size > 0 ? Math.round((filled / size) * 100) : 0
      return (
        <div className="text-right font-mono">
          {formatNumber(filled, 4)} <span className="text-muted-foreground text-xs">({pct}%)</span>
        </div>
      )
    },
  },
  {
    accessorKey: "order_value",
    header: ({ column }) => (
      <Button
        variant="ghost"
        className="px-0 hover:bg-transparent"
        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
      >
        Value
        <ArrowUpDown className="ml-1 h-3 w-3" />
      </Button>
    ),
    cell: ({ row }) => (
      <div className="text-right font-mono">${formatNumber(row.getValue("order_value"))}</div>
    ),
  },
  {
    accessorKey: "created_at",
    header: ({ column }) => (
      <Button
        variant="ghost"
        className="px-0 hover:bg-transparent"
        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
      >
        Time
        <ArrowUpDown className="ml-1 h-3 w-3" />
      </Button>
    ),
    cell: ({ row }) => (
      <span className="text-muted-foreground text-sm">
        {formatDate(row.getValue("created_at"))}
      </span>
    ),
  },
  {
    id: "tx",
    header: "Tx",
    cell: ({ row }) => {
      const hash = row.original.proof_hash
      if (!hash) return null
      return (
        <a
          href={`https://sepolia.arbiscan.io/tx/${hash}`}
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-500 hover:text-blue-400 text-xs underline"
        >
          View
        </a>
      )
    },
  },
  {
    id: "actions",
    cell: ({ row, table }) => {
      const order = row.original
      const meta = table.options.meta as { onCancel?: (id: string) => void } | undefined

      if (order.status !== "open") return null

      return (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="h-8 w-8 p-0">
              <span className="sr-only">Open menu</span>
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>Actions</DropdownMenuLabel>
            <DropdownMenuItem
              onClick={() => navigator.clipboard.writeText(order.id)}
            >
              Copy Order ID
            </DropdownMenuItem>
            {order.proof_hash && (
              <DropdownMenuItem
                onClick={() => navigator.clipboard.writeText(order.proof_hash!)}
              >
                Copy Tx Hash
              </DropdownMenuItem>
            )}
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="text-red-500 focus:text-red-500"
              onClick={() => meta?.onCancel?.(order.id)}
            >
              Cancel Order
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )
    },
  },
]
