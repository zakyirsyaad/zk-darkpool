export interface Order {
    id: string
    user_address: string
    status: 'open' | 'filled' | 'partial' | 'cancelled'
    side: 'BUY' | 'SELL'
    asset: string
    quote_asset: string
    order_value: number
    size: number
    filled: number
    price: number
    proof_hash?: string
    created_at: string
    updated_at: string
}

export interface CreateOrderRequest {
    user_address: string
    side: 'BUY' | 'SELL'
    asset: string
    quote_asset?: string
    size: string
    price: string
    proof_hash?: string
}
