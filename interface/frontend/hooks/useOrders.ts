"use client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAccount } from "wagmi";
import { API_BASE_URL } from "@/constants/api";
import type { Order, CreateOrderRequest } from "@/types/order";

// Fetch orders for current user
async function fetchUserOrders(
  address: string,
  status?: string,
): Promise<Order[]> {
  const params = new URLSearchParams();
  if (status) params.append("status", status);

  const url = `${API_BASE_URL}/api/users/${address}/orders${
    params.toString() ? `?${params}` : ""
  }`;
  const res = await fetch(url);

  if (!res.ok) {
    throw new Error("Failed to fetch orders");
  }

  return res.json();
}

// Create new order (legacy - use submitOrder instead)
async function createOrder(data: CreateOrderRequest): Promise<Order> {
  const res = await fetch(`${API_BASE_URL}/api/orders`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });

  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.error || "Failed to create order");
  }

  return res.json();
}

// Submit order and try to match
export interface MatchResult {
  matchedOrderId: string;
  buyerAddress: string;
  sellerAddress: string;
  matchPrice: number;
  matchSize: number;
  asset: string;
  quoteAsset: string;
}

export interface SubmitOrderResponse {
  order: Order;
  matched: boolean;
  match?: MatchResult;
  message?: string;
}

async function submitOrder(
  data: CreateOrderRequest,
): Promise<SubmitOrderResponse> {
  const res = await fetch(`${API_BASE_URL}/api/orders/submit`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });

  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.error || "Failed to submit order");
  }

  return res.json();
}
// Confirm settlement after on-chain tx
async function confirmSettlement(data: {
  orderId: string;
  matchedOrderId: string;
  txHash: string;
  filledSize: number;
}): Promise<{ orders: Order[] }> {
  const res = await fetch(`${API_BASE_URL}/api/orders/settle`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });

  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.error || "Failed to confirm settlement");
  }

  return res.json();
}

// Cancel order
async function cancelOrder(orderId: string): Promise<Order> {
  const res = await fetch(`${API_BASE_URL}/api/orders/${orderId}`, {
    method: "DELETE",
  });

  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.error || "Failed to cancel order");
  }

  const data = await res.json();
  return data.order;
}

// Update order (status, filled, proof_hash)
export interface UpdateOrderRequest {
  status?: "open" | "filled" | "partial" | "cancelled" | "matching";
  filled?: number;
  proof_hash?: string;
}

async function updateOrder(
  orderId: string,
  data: UpdateOrderRequest,
): Promise<Order> {
  const res = await fetch(`${API_BASE_URL}/api/orders/${orderId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });

  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.error || "Failed to update order");
  }

  return res.json();
}

/**
 * Hook to fetch user's orders
 */
export function useOrders(
  status?: "open" | "filled" | "partial" | "cancelled" | "matching",
) {
  const { address, isConnected } = useAccount();

  return useQuery({
    queryKey: ["orders", address, status],
    queryFn: () => fetchUserOrders(address!, status),
    enabled: isConnected && !!address,
    staleTime: 10_000, // 10 seconds
    refetchInterval: 30_000, // 30 seconds
  });
}

/**
 * Hook to create a new order
 */
export function useCreateOrder() {
  const queryClient = useQueryClient();
  const { address } = useAccount();

  return useMutation({
    mutationFn: createOrder,
    onSuccess: () => {
      // Invalidate orders query to refetch
      queryClient.invalidateQueries({ queryKey: ["orders", address] });
    },
  });
}

/**
 * Hook to cancel an order
 */
export function useCancelOrder() {
  const queryClient = useQueryClient();
  const { address } = useAccount();

  return useMutation({
    mutationFn: cancelOrder,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["orders", address] });
    },
  });
}

/**
 * Hook to update an order (status, filled, proof_hash)
 */
export function useUpdateOrder() {
  const queryClient = useQueryClient();
  const { address } = useAccount();

  return useMutation({
    mutationFn: ({
      orderId,
      data,
    }: {
      orderId: string;
      data: UpdateOrderRequest;
    }) => updateOrder(orderId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["orders", address] });
    },
  });
}

/**
 * Hook to submit order with matching
 */
export function useSubmitOrder() {
  const queryClient = useQueryClient();
  const { address } = useAccount();

  return useMutation({
    mutationFn: submitOrder,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["orders", address] });
    },
  });
}

/**
 * Hook to confirm settlement
 */
export function useConfirmSettlement() {
  const queryClient = useQueryClient();
  const { address } = useAccount();

  return useMutation({
    mutationFn: confirmSettlement,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["orders", address] });
    },
  });
}

// Revert matched orders back to open (when settlement fails)
async function unmatchOrders(data: {
  orderId: string;
  matchedOrderId: string;
}): Promise<{ message: string; orders: Order[] }> {
  const res = await fetch(`${API_BASE_URL}/api/orders/unmatch`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });

  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.error || "Failed to unmatch orders");
  }

  return res.json();
}

/**
 * Hook to revert matched orders back to open (on settlement failure)
 */
export function useUnmatchOrders() {
  const queryClient = useQueryClient();
  const { address } = useAccount();

  return useMutation({
    mutationFn: unmatchOrders,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["orders", address] });
    },
  });
}
