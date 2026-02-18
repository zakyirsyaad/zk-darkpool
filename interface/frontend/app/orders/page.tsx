"use client"

import { useOrders, useCancelOrder } from "@/hooks/useOrders"
import { useAccount } from "wagmi"
import { columns } from "./columns"
import { DataTable } from "./data-table"

export default function OrdersPage() {
  const { isConnected } = useAccount()
  const { data: orders, isLoading, isError } = useOrders()
  const cancelOrder = useCancelOrder()

  const handleCancel = (orderId: string) => {
    if (confirm("Are you sure you want to cancel this order?")) {
      cancelOrder.mutate(orderId)
    }
  }

  if (!isConnected) {
    return (
      <div className="max-w-6xl mx-auto p-8 text-center text-muted-foreground">
        Connect your wallet to view orders
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="max-w-6xl mx-auto p-8 text-center text-muted-foreground">
        Loading orders...
      </div>
    )
  }

  if (isError) {
    return (
      <div className="max-w-6xl mx-auto p-8 text-center text-red-500">
        Failed to load orders
      </div>
    )
  }

  return (
    <div className="max-w-6xl mx-auto p-5">
      <h1 className="text-2xl font-bold mb-4">My Orders</h1>
      <DataTable
        columns={columns}
        data={orders ?? []}
        meta={{ onCancel: handleCancel }}
      />
    </div>
  )
}
