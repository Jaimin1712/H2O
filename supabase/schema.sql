-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Suppliers Table (Multiple suppliers sharing the platform)
CREATE TABLE suppliers (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    business_name TEXT NOT NULL,
    owner_name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    phone TEXT,
    address TEXT,
    bottle_type_default TEXT DEFAULT '20L jar',
    onboarding_completed BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Drivers Table
CREATE TABLE drivers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    supplier_id UUID REFERENCES suppliers(id) ON DELETE CASCADE,
    full_name TEXT NOT NULL,
    email TEXT UNIQUE,
    phone TEXT,
    license_number TEXT,
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'on_delivery')),
    auth_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Customers Table
CREATE TABLE customers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    supplier_id UUID REFERENCES suppliers(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    phone TEXT,
    address TEXT NOT NULL,
    driver_id UUID REFERENCES drivers(id) ON DELETE SET NULL,
    delivery_date DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Inventory Table
CREATE TABLE inventory (
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

-- Deliveries Table
CREATE TABLE deliveries (
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

-- Row Level Security (Initial setup)
ALTER TABLE suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE drivers ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE deliveries ENABLE ROW LEVEL SECURITY;

-- Policies for suppliers
CREATE POLICY "Suppliers can view their own record" ON suppliers
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Suppliers can update their own record" ON suppliers
    FOR UPDATE USING (auth.uid() = id);

-- Policies for drivers
CREATE POLICY "Suppliers can manage their own drivers" ON drivers
    FOR ALL USING (supplier_id IN (SELECT id FROM suppliers WHERE id = auth.uid()));

-- Policies for customers
CREATE POLICY "Suppliers can manage their own customers" ON customers
    FOR ALL USING (supplier_id IN (SELECT id FROM suppliers WHERE id = auth.uid()));

-- Policies for inventory
CREATE POLICY "Suppliers can manage their own inventory" ON inventory
    FOR ALL USING (supplier_id IN (SELECT id FROM suppliers WHERE id = auth.uid()));

-- Policies for deliveries
CREATE POLICY "Suppliers can manage their own deliveries" ON deliveries
    FOR ALL USING (supplier_id IN (SELECT id FROM suppliers WHERE id = auth.uid()));

-- Policies for Driver Access
CREATE POLICY "Drivers can view their own profile" ON drivers
    FOR SELECT USING (auth.uid() = auth_user_id);

CREATE POLICY "Drivers can view their assigned deliveries" ON deliveries
    FOR SELECT USING (driver_id IN (SELECT id FROM drivers WHERE auth_user_id = auth.uid()));

CREATE POLICY "Drivers can update their assigned deliveries" ON deliveries
    FOR UPDATE USING (driver_id IN (SELECT id FROM drivers WHERE auth_user_id = auth.uid()));

CREATE POLICY "Drivers can view their assigned customers" ON customers
    FOR SELECT USING (driver_id IN (SELECT id FROM drivers WHERE auth_user_id = auth.uid()));
