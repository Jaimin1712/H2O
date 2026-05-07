-- Run this in your Supabase SQL Editor to sync the schema with the application

-- Update suppliers table (if not already done)
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='suppliers' AND column_name='business_name') THEN
        ALTER TABLE suppliers RENAME COLUMN name TO business_name;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='suppliers' AND column_name='owner_name') THEN
        ALTER TABLE suppliers ADD COLUMN owner_name TEXT DEFAULT 'Owner';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='suppliers' AND column_name='bottle_type_default') THEN
        ALTER TABLE suppliers ADD COLUMN bottle_type_default TEXT DEFAULT '20L jar';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='suppliers' AND column_name='onboarding_completed') THEN
        ALTER TABLE suppliers ADD COLUMN onboarding_completed BOOLEAN DEFAULT FALSE;
    END IF;
END $$;

-- Update drivers table
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='drivers' AND column_name='email') THEN
        ALTER TABLE drivers ADD COLUMN email TEXT UNIQUE;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='drivers' AND column_name='status') THEN
        ALTER TABLE drivers ADD COLUMN status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'on_delivery'));
    END IF;
END $$;

-- Note: Customer email column removal requested by user
-- Update customers table
-- (No changes needed for email)

-- Create inventory table if it doesn't exist
CREATE TABLE IF NOT EXISTS inventory (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    supplier_id UUID REFERENCES suppliers(id) ON DELETE CASCADE,
    item_name TEXT NOT NULL,
    category TEXT CHECK (category IN ('bottle', 'dispenser', 'part', 'other')),
    total_stock INTEGER DEFAULT 0,
    available_stock INTEGER DEFAULT 0,
    low_stock_threshold INTEGER DEFAULT 10,
    unit_price DECIMAL(10, 2),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create deliveries table if it doesn't exist
CREATE TABLE IF NOT EXISTS deliveries (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    supplier_id UUID REFERENCES suppliers(id) ON DELETE CASCADE,
    driver_id UUID REFERENCES drivers(id) ON DELETE SET NULL,
    customer_id UUID REFERENCES customers(id) ON DELETE CASCADE,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'cancelled')),
    scheduled_date DATE NOT NULL,
    completed_at TIMESTAMP WITH TIME ZONE,
    bottles_delivered INTEGER DEFAULT 0,
    bottles_returned INTEGER DEFAULT 0,
    total_amount DECIMAL(10, 2),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS for all tables
ALTER TABLE suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE drivers ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE deliveries ENABLE ROW LEVEL SECURITY;

-- Re-apply policies (Safely)
DROP POLICY IF EXISTS "Suppliers can manage their own drivers" ON drivers;
CREATE POLICY "Suppliers can manage their own drivers" ON drivers
    FOR ALL USING (supplier_id IN (SELECT id FROM suppliers WHERE id = auth.uid()));

DROP POLICY IF EXISTS "Suppliers can manage their own customers" ON customers;
CREATE POLICY "Suppliers can manage their own customers" ON customers
    FOR ALL USING (supplier_id IN (SELECT id FROM suppliers WHERE id = auth.uid()));

DROP POLICY IF EXISTS "Suppliers can manage their own inventory" ON inventory;
CREATE POLICY "Suppliers can manage their own inventory" ON inventory
    FOR ALL USING (supplier_id IN (SELECT id FROM suppliers WHERE id = auth.uid()));

DROP POLICY IF EXISTS "Suppliers can manage their own deliveries" ON deliveries;
CREATE POLICY "Suppliers can manage their own deliveries" ON deliveries
    FOR ALL USING (supplier_id IN (SELECT id FROM suppliers WHERE id = auth.uid()));
