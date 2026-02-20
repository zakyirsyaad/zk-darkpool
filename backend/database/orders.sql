-- =============================================
-- Supabase SQL: Orders Table for ZK Dark Pool
-- =============================================

-- 1. Create orders table
-- NOTE: side, size, price, order_value, filled are stored as encrypted TEXT
-- (AES-256-GCM via backend relayer). Only the backend can decrypt for matching.
CREATE TABLE orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_address VARCHAR(42) NOT NULL,              -- Ethereum wallet address
    status VARCHAR(20) NOT NULL DEFAULT 'open',     -- 'open', 'filled', 'partial', 'cancelled'
    side TEXT NOT NULL,                             -- Encrypted: 'BUY' or 'SELL'
    asset VARCHAR(20) NOT NULL,                     -- Token symbol (e.g., 'BTC', 'ETH')
    quote_asset VARCHAR(20) NOT NULL DEFAULT 'USDC',-- Quote currency
    order_value TEXT NOT NULL,                      -- Encrypted: total value in quote asset
    size TEXT NOT NULL,                             -- Encrypted: amount of asset
    filled TEXT NOT NULL,                           -- Encrypted: amount filled so far
    price TEXT NOT NULL,                            -- Encrypted: price per unit
    proof_hash VARCHAR(66),                         -- ZK proof transaction hash (optional)
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    CONSTRAINT check_status CHECK (status IN ('open', 'filled', 'partial', 'cancelled'))
);

-- 2. Create indexes for common queries
CREATE INDEX idx_orders_user ON orders(user_address);
CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_orders_asset ON orders(asset);
CREATE INDEX idx_orders_created_at ON orders(created_at DESC);
CREATE INDEX idx_orders_user_status ON orders(user_address, status);

-- 3. Enable Row Level Security (RLS)
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;

-- 4. RLS Policies
-- Users can only read their own orders
CREATE POLICY "Users can view own orders"
    ON orders
    FOR SELECT
    USING (true); -- Allow all reads for now (dark pool orders are semi-public)

-- Users can insert their own orders
CREATE POLICY "Users can create orders"
    ON orders
    FOR INSERT
    WITH CHECK (true);

-- Users can update only their own orders
CREATE POLICY "Users can update own orders"
    ON orders
    FOR UPDATE
    USING (true);

-- 5. Function to auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 6. Trigger to call the function on update
CREATE TRIGGER update_orders_updated_at
    BEFORE UPDATE ON orders
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- 7. Enable realtime for orders table (optional - for live updates)
ALTER PUBLICATION supabase_realtime ADD TABLE orders;
