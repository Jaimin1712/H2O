-- Comprehensive fix for deliveries table schema
-- Run this in Supabase SQL Editor

-- Add missing columns that the application expects
ALTER TABLE deliveries ADD COLUMN IF NOT EXISTS completed_at TIMESTAMP WITH TIME ZONE;

-- Check if amount column exists and rename to total_amount if needed
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='deliveries' AND column_name='amount') 
       AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='deliveries' AND column_name='total_amount') THEN
        ALTER TABLE deliveries RENAME COLUMN amount TO total_amount;
    END IF;
    
    -- Add total_amount if neither exists
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='deliveries' AND column_name='total_amount') THEN
        ALTER TABLE deliveries ADD COLUMN total_amount DECIMAL(10, 2);
    END IF;
END $$;

-- Add notes column if missing
ALTER TABLE deliveries ADD COLUMN IF NOT EXISTS notes TEXT;

-- Refresh PostgREST schema cache
NOTIFY pgrst, 'reload schema';
