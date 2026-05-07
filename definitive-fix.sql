-- Definitive fix for deliveries table
-- Run this in Supabase SQL Editor step by step

-- Step 1: Check current table structure
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'deliveries' 
AND table_schema = 'public'
ORDER BY ordinal_position;

-- Step 2: Add the missing completed_at column
ALTER TABLE public.deliveries 
ADD COLUMN completed_at TIMESTAMP WITH TIME ZONE;

-- Step 3: Verify the column was added
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'deliveries' 
AND table_schema = 'public'
ORDER BY ordinal_position;

-- Step 4: Force PostgREST to reload schema
NOTIFY pgrst, 'reload schema';

-- Step 5: Wait 2 seconds then reload again
SELECT pg_sleep(2);
NOTIFY pgrst, 'reload schema';
