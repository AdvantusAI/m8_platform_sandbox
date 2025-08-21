-- Create supply network tables in m8_schema

-- Create supply network node types table
CREATE TABLE IF NOT EXISTS m8_schema.supply_network_node_types (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    type_code TEXT NOT NULL UNIQUE,
    type_name TEXT NOT NULL,
    icon_name TEXT DEFAULT 'Package',
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create supply network relationship types table
CREATE TABLE IF NOT EXISTS m8_schema.supply_network_relationship_types (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    type_code TEXT NOT NULL UNIQUE,
    type_name TEXT NOT NULL,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create supply network nodes table
CREATE TABLE IF NOT EXISTS m8_schema.supply_network_nodes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    node_code TEXT NOT NULL UNIQUE,
    node_name TEXT NOT NULL,
    node_type_id UUID REFERENCES m8_schema.supply_network_node_types(id),
    status TEXT CHECK (status IN ('active', 'inactive', 'planning')) DEFAULT 'active',
    description TEXT,
    address TEXT,
    contact_information JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create supply network relationships table
CREATE TABLE IF NOT EXISTS m8_schema.supply_network_relationships (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    relationship_code TEXT NOT NULL UNIQUE,
    source_node_id UUID REFERENCES m8_schema.supply_network_nodes(id) ON DELETE CASCADE,
    target_node_id UUID REFERENCES m8_schema.supply_network_nodes(id) ON DELETE CASCADE,
    relationship_type_id UUID REFERENCES m8_schema.supply_network_relationship_types(id),
    status TEXT CHECK (status IN ('active', 'inactive', 'planning')) DEFAULT 'active',
    description TEXT,
    lead_time_days INTEGER DEFAULT 1,
    primary_transport_method TEXT,
    primary_transport_cost NUMERIC(10,2) DEFAULT 0,
    cost_unit TEXT,
    alternate_transport_method TEXT,
    alternate_lead_time_days INTEGER,
    alternate_transport_cost NUMERIC(10,2),
    capacity_constraint INTEGER,
    is_bidirectional BOOLEAN DEFAULT FALSE,
    priority_rank INTEGER DEFAULT 1,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert default node types
INSERT INTO m8_schema.supply_network_node_types (type_code, type_name, icon_name, description) VALUES
    ('factory', 'Factory', 'Factory', 'Manufacturing facility'),
    ('warehouse', 'Warehouse', 'Warehouse', 'Storage facility'),
    ('distributor', 'Distributor', 'Truck', 'Distribution center'),
    ('retailer', 'Retailer', 'Store', 'Retail store'),
    ('supplier', 'Supplier', 'Package', 'Raw material supplier')
ON CONFLICT (type_code) DO NOTHING;

-- Insert default relationship types
INSERT INTO m8_schema.supply_network_relationship_types (type_code, type_name, description) VALUES
    ('supplies', 'Supplies', 'One node supplies another'),
    ('distributes', 'Distributes', 'One node distributes to another'),
    ('stores', 'Stores', 'One node stores for another'),
    ('transports', 'Transports', 'One node transports to another')
ON CONFLICT (type_code) DO NOTHING;

-- Enable RLS on all tables
ALTER TABLE m8_schema.supply_network_node_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE m8_schema.supply_network_relationship_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE m8_schema.supply_network_nodes ENABLE ROW LEVEL SECURITY;
ALTER TABLE m8_schema.supply_network_relationships ENABLE ROW LEVEL SECURITY;

-- Create RLS policies (basic policies for now)
CREATE POLICY "Allow all operations on node types" ON m8_schema.supply_network_node_types FOR ALL USING (true);
CREATE POLICY "Allow all operations on relationship types" ON m8_schema.supply_network_relationship_types FOR ALL USING (true);
CREATE POLICY "Allow all operations on nodes" ON m8_schema.supply_network_nodes FOR ALL USING (true);
CREATE POLICY "Allow all operations on relationships" ON m8_schema.supply_network_relationships FOR ALL USING (true);

