-- Migration: Add NPI (New Product Introduction) Infrastructure
-- Date: 2025-07-17
-- Description: Creates tables and columns for NPI functionality

-- 1. Create NPI Products table
CREATE TABLE IF NOT EXISTS npi_products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id VARCHAR REFERENCES products(id),
    npi_status VARCHAR NOT NULL CHECK (npi_status IN ('planning', 'pre_launch', 'launch', 'post_launch', 'discontinued')),
    launch_date DATE,
    launch_confidence_level VARCHAR CHECK (launch_confidence_level IN ('low', 'medium', 'high')),
    market_segment VARCHAR,
    cannibalization_products TEXT[], -- Array of product IDs that may be cannibalized
    launch_locations TEXT[], -- Array of location IDs for phased rollouts
    launch_volume_projection DECIMAL,
    ramp_up_weeks INTEGER DEFAULT 12,
    market_penetration_rate DECIMAL DEFAULT 0.05,
    expected_roi DECIMAL,
    responsible_planner VARCHAR,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 2. Create NPI Forecast Scenarios table
CREATE TABLE IF NOT EXISTS npi_forecast_scenarios (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    npi_product_id UUID REFERENCES npi_products(id) ON DELETE CASCADE,
    scenario_name VARCHAR NOT NULL,
    scenario_type VARCHAR NOT NULL CHECK (scenario_type IN ('optimistic', 'realistic', 'pessimistic')),
    postdate DATE NOT NULL,
    forecast_value DECIMAL NOT NULL,
    confidence_level VARCHAR CHECK (confidence_level IN ('low', 'medium', 'high')),
    assumptions TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    UNIQUE(npi_product_id, scenario_type, postdate)
);

-- 3. Create NPI Launch Milestones table
CREATE TABLE IF NOT EXISTS npi_milestones (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    npi_product_id UUID REFERENCES npi_products(id) ON DELETE CASCADE,
    milestone_name VARCHAR NOT NULL,
    milestone_date DATE NOT NULL,
    milestone_status VARCHAR NOT NULL CHECK (milestone_status IN ('not_started', 'in_progress', 'completed', 'delayed', 'cancelled')),
    responsible_team VARCHAR,
    responsible_person VARCHAR,
    milestone_priority VARCHAR CHECK (milestone_priority IN ('low', 'medium', 'high', 'critical')),
    dependencies TEXT[], -- Array of milestone IDs this depends on
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 4. Add NPI columns to existing products table
ALTER TABLE products ADD COLUMN IF NOT EXISTS is_npi BOOLEAN DEFAULT false;
ALTER TABLE products ADD COLUMN IF NOT EXISTS npi_launch_date DATE;
ALTER TABLE products ADD COLUMN IF NOT EXISTS npi_status VARCHAR CHECK (npi_status IN ('planning', 'pre_launch', 'launch', 'post_launch', 'discontinued'));

-- 5. Add NPI columns to existing forecast_data table
ALTER TABLE forecast_data ADD COLUMN IF NOT EXISTS npi_product_id UUID REFERENCES npi_products(id);
ALTER TABLE forecast_data ADD COLUMN IF NOT EXISTS is_npi_forecast BOOLEAN DEFAULT false;
ALTER TABLE forecast_data ADD COLUMN IF NOT EXISTS npi_scenario_type VARCHAR CHECK (npi_scenario_type IN ('optimistic', 'realistic', 'pessimistic'));

-- 6. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_npi_products_product_id ON npi_products(product_id);
CREATE INDEX IF NOT EXISTS idx_npi_products_status ON npi_products(npi_status);
CREATE INDEX IF NOT EXISTS idx_npi_products_launch_date ON npi_products(launch_date);
CREATE INDEX IF NOT EXISTS idx_npi_forecast_scenarios_npi_product_id ON npi_forecast_scenarios(npi_product_id);
CREATE INDEX IF NOT EXISTS idx_npi_forecast_scenarios_postdate ON npi_forecast_scenarios(postdate);
CREATE INDEX IF NOT EXISTS idx_npi_milestones_npi_product_id ON npi_milestones(npi_product_id);
CREATE INDEX IF NOT EXISTS idx_npi_milestones_date ON npi_milestones(milestone_date);
CREATE INDEX IF NOT EXISTS idx_products_is_npi ON products(is_npi);
CREATE INDEX IF NOT EXISTS idx_forecast_data_npi_product_id ON forecast_data(npi_product_id);
CREATE INDEX IF NOT EXISTS idx_forecast_data_is_npi_forecast ON forecast_data(is_npi_forecast);

-- 7. Create updated_at trigger function if not exists
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 8. Create triggers for updated_at columns
CREATE TRIGGER update_npi_products_updated_at
    BEFORE UPDATE ON npi_products
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_npi_forecast_scenarios_updated_at
    BEFORE UPDATE ON npi_forecast_scenarios
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_npi_milestones_updated_at
    BEFORE UPDATE ON npi_milestones
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- 9. Create RLS policies for NPI tables
ALTER TABLE npi_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE npi_forecast_scenarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE npi_milestones ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to read all NPI data
CREATE POLICY "Allow authenticated users to read npi_products" ON npi_products
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated users to read npi_forecast_scenarios" ON npi_forecast_scenarios
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated users to read npi_milestones" ON npi_milestones
    FOR SELECT USING (auth.role() = 'authenticated');

-- Allow authenticated users to insert/update/delete NPI data
CREATE POLICY "Allow authenticated users to insert npi_products" ON npi_products
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated users to update npi_products" ON npi_products
    FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated users to delete npi_products" ON npi_products
    FOR DELETE USING (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated users to insert npi_forecast_scenarios" ON npi_forecast_scenarios
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated users to update npi_forecast_scenarios" ON npi_forecast_scenarios
    FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated users to delete npi_forecast_scenarios" ON npi_forecast_scenarios
    FOR DELETE USING (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated users to insert npi_milestones" ON npi_milestones
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated users to update npi_milestones" ON npi_milestones
    FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated users to delete npi_milestones" ON npi_milestones
    FOR DELETE USING (auth.role() = 'authenticated');

-- 10. Insert some sample data for testing
INSERT INTO npi_products (product_id, npi_status, launch_date, launch_confidence_level, market_segment, launch_volume_projection, ramp_up_weeks, market_penetration_rate, responsible_planner, notes)
SELECT 
    p.id,
    'planning',
    '2025-09-01',
    'medium',
    'Premium',
    1000,
    16,
    0.08,
    'Demo Planner',
    'Sample NPI product for testing'
FROM products p
WHERE p.active = true
LIMIT 1
ON CONFLICT DO NOTHING;

COMMENT ON TABLE npi_products IS 'New Product Introduction master data';
COMMENT ON TABLE npi_forecast_scenarios IS 'Forecast scenarios for NPI products';
COMMENT ON TABLE npi_milestones IS 'Launch milestones and timeline tracking';