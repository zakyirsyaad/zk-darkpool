-- =============================================
-- Migration: Convert order fields to encrypted TEXT
-- Run this on your existing Supabase orders table
-- =============================================

-- 1. Drop constraints that can't work on encrypted data
ALTER TABLE orders DROP CONSTRAINT IF EXISTS check_side;
ALTER TABLE orders DROP CONSTRAINT IF EXISTS check_filled;

-- 2. Change column types from DECIMAL/VARCHAR to TEXT
ALTER TABLE orders ALTER COLUMN side TYPE TEXT;
ALTER TABLE orders ALTER COLUMN size TYPE TEXT USING size::TEXT;
ALTER TABLE orders ALTER COLUMN price TYPE TEXT USING price::TEXT;
ALTER TABLE orders ALTER COLUMN order_value TYPE TEXT USING order_value::TEXT;
ALTER TABLE orders ALTER COLUMN filled TYPE TEXT USING filled::TEXT;

-- NOTE: After running this migration, restart the backend with RELAYER_SECRET set.
-- All NEW orders will be encrypted. Existing plaintext orders will still be readable
-- (the decryptOrder function gracefully handles non-encrypted legacy data).
