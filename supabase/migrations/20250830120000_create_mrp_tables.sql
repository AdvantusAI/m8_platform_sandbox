-- Create MRP Tables for Fulfillment System
-- This migration creates the core tables for MRP planning as specified in the PRD

-- Create replenishment_plans table
CREATE TABLE m8_schema.replenishment_plans (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    plan_id TEXT UNIQUE NOT NULL,
    plan_name TEXT NOT NULL,
    plan_type TEXT NOT NULL DEFAULT 'MRP' CHECK (plan_type IN ('MRP', 'DRP', 'Manual')),
    planning_horizon_weeks INTEGER NOT NULL DEFAULT 12,
    time_bucket TEXT NOT NULL DEFAULT 'weekly' CHECK (time_bucket IN ('daily', 'weekly', 'monthly')),
    status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'archived', 'running')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id),
    last_run_at TIMESTAMPTZ,
    next_run_at TIMESTAMPTZ,
    parameters JSONB
);

-- Create demand_explosion_results table
CREATE TABLE m8_schema.demand_explosion_results (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    plan_id TEXT NOT NULL REFERENCES m8_schema.replenishment_plans(plan_id),
    product_id TEXT NOT NULL,
    location_id TEXT NOT NULL,
    week_start_date DATE NOT NULL,
    week_end_date DATE NOT NULL,
    week_number INTEGER NOT NULL,
    year INTEGER NOT NULL,
    beginning_inventory DECIMAL(15,2) DEFAULT 0,
    gross_requirements DECIMAL(15,2) DEFAULT 0,
    scheduled_receipts DECIMAL(15,2) DEFAULT 0,
    projected_available DECIMAL(15,2) DEFAULT 0,
    net_requirements DECIMAL(15,2) DEFAULT 0,
    planned_order_receipts DECIMAL(15,2) DEFAULT 0,
    planned_order_releases DECIMAL(15,2) DEFAULT 0,
    safety_stock DECIMAL(15,2) DEFAULT 0,
    reorder_point DECIMAL(15,2) DEFAULT 0,
    lot_size DECIMAL(15,2),
    lead_time_offset INTEGER,
    firm_planned_orders DECIMAL(15,2) DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create purchase_order_recommendations table
CREATE TABLE m8_schema.purchase_order_recommendations (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    plan_id TEXT NOT NULL REFERENCES m8_schema.replenishment_plans(plan_id),
    recommendation_id TEXT UNIQUE NOT NULL,
    product_id TEXT NOT NULL,
    location_id TEXT NOT NULL,
    supplier_id TEXT,
    supplier_name TEXT,
    week_start_date DATE NOT NULL,
    week_end_date DATE NOT NULL,
    week_number INTEGER NOT NULL,
    year INTEGER NOT NULL,
    recommended_quantity DECIMAL(15,2) NOT NULL,
    minimum_order_quantity DECIMAL(15,2),
    order_multiple DECIMAL(15,2),
    final_order_quantity DECIMAL(15,2),
    unit_cost DECIMAL(10,4),
    total_value DECIMAL(15,2),
    lead_time_days INTEGER,
    recommended_order_date DATE,
    expected_delivery_date DATE,
    approval_status TEXT NOT NULL DEFAULT 'pending' CHECK (approval_status IN ('pending', 'approved', 'rejected', 'modified', 'converted')),
    approval_threshold_exceeded BOOLEAN DEFAULT FALSE,
    approved_by UUID REFERENCES auth.users(id),
    approved_at TIMESTAMPTZ,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create planning_exceptions table
CREATE TABLE m8_schema.planning_exceptions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    plan_id TEXT NOT NULL REFERENCES m8_schema.replenishment_plans(plan_id),
    exception_id TEXT UNIQUE NOT NULL,
    exception_type TEXT NOT NULL CHECK (exception_type IN ('stockout', 'excess_inventory', 'below_safety_stock', 'order_urgency', 'forecast_deviation')),
    severity TEXT NOT NULL CHECK (severity IN ('critical', 'high', 'medium', 'low')),
    product_id TEXT NOT NULL,
    location_id TEXT NOT NULL,
    week_start_date DATE,
    exception_date DATE,
    current_inventory DECIMAL(15,2),
    projected_inventory DECIMAL(15,2),
    safety_stock DECIMAL(15,2),
    reorder_point DECIMAL(15,2),
    projected_demand DECIMAL(15,2),
    projected_supply DECIMAL(15,2),
    shortage_quantity DECIMAL(15,2),
    excess_quantity DECIMAL(15,2),
    recommended_action TEXT,
    resolution_status TEXT NOT NULL DEFAULT 'open' CHECK (resolution_status IN ('open', 'in_progress', 'resolved', 'ignored')),
    resolved_by UUID REFERENCES auth.users(id),
    resolved_at TIMESTAMPTZ,
    resolution_notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create mrp_parameters table
CREATE TABLE m8_schema.mrp_parameters (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    product_id TEXT NOT NULL,
    location_id TEXT NOT NULL,
    safety_stock_method TEXT NOT NULL DEFAULT 'statistical' CHECK (safety_stock_method IN ('statistical', 'fixed', 'lead_time_based', 'percentage')),
    safety_stock_value DECIMAL(15,2),
    safety_stock_days INTEGER,
    service_level DECIMAL(5,2),
    lot_sizing_rule TEXT NOT NULL DEFAULT 'lot_for_lot' CHECK (lot_sizing_rule IN ('lot_for_lot', 'fixed_quantity', 'min_max', 'economic_order_quantity', 'periods_of_supply')),
    minimum_order_quantity DECIMAL(15,2),
    maximum_order_quantity DECIMAL(15,2),
    order_multiple DECIMAL(15,2),
    lead_time_days INTEGER DEFAULT 14,
    planning_time_fence_days INTEGER,
    demand_time_fence_days INTEGER,
    supplier_id TEXT,
    preferred_supplier TEXT,
    unit_cost DECIMAL(10,4),
    carrying_cost_percentage DECIMAL(5,2),
    ordering_cost DECIMAL(10,2),
    abc_classification TEXT CHECK (abc_classification IN ('A', 'B', 'C')),
    xyz_classification TEXT CHECK (xyz_classification IN ('X', 'Y', 'Z')),
    active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(product_id, location_id)
);

-- Create indexes for better performance
CREATE INDEX idx_demand_explosion_plan_product_location ON m8_schema.demand_explosion_results(plan_id, product_id, location_id);
CREATE INDEX idx_demand_explosion_week ON m8_schema.demand_explosion_results(week_start_date, week_number);
CREATE INDEX idx_purchase_recommendations_plan_status ON m8_schema.purchase_order_recommendations(plan_id, approval_status);
CREATE INDEX idx_purchase_recommendations_order_date ON m8_schema.purchase_order_recommendations(recommended_order_date);
CREATE INDEX idx_planning_exceptions_plan_status ON m8_schema.planning_exceptions(plan_id, resolution_status);
CREATE INDEX idx_planning_exceptions_severity ON m8_schema.planning_exceptions(severity, exception_type);
CREATE INDEX idx_mrp_parameters_product_location ON m8_schema.mrp_parameters(product_id, location_id);

-- Create updated_at triggers
CREATE OR REPLACE FUNCTION m8_schema.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_replenishment_plans_updated_at 
    BEFORE UPDATE ON m8_schema.replenishment_plans 
    FOR EACH ROW EXECUTE FUNCTION m8_schema.update_updated_at_column();

CREATE TRIGGER update_demand_explosion_updated_at 
    BEFORE UPDATE ON m8_schema.demand_explosion_results 
    FOR EACH ROW EXECUTE FUNCTION m8_schema.update_updated_at_column();

CREATE TRIGGER update_purchase_recommendations_updated_at 
    BEFORE UPDATE ON m8_schema.purchase_order_recommendations 
    FOR EACH ROW EXECUTE FUNCTION m8_schema.update_updated_at_column();

CREATE TRIGGER update_planning_exceptions_updated_at 
    BEFORE UPDATE ON m8_schema.planning_exceptions 
    FOR EACH ROW EXECUTE FUNCTION m8_schema.update_updated_at_column();

CREATE TRIGGER update_mrp_parameters_updated_at 
    BEFORE UPDATE ON m8_schema.mrp_parameters 
    FOR EACH ROW EXECUTE FUNCTION m8_schema.update_updated_at_column();

-- Create RLS policies
ALTER TABLE m8_schema.replenishment_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE m8_schema.demand_explosion_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE m8_schema.purchase_order_recommendations ENABLE ROW LEVEL SECURITY;
ALTER TABLE m8_schema.planning_exceptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE m8_schema.mrp_parameters ENABLE ROW LEVEL SECURITY;

-- Create policies (allow authenticated users to read/write)
CREATE POLICY "Allow authenticated users to view replenishment plans" ON m8_schema.replenishment_plans
    FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Allow authenticated users to view demand explosion results" ON m8_schema.demand_explosion_results
    FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Allow authenticated users to view purchase recommendations" ON m8_schema.purchase_order_recommendations
    FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Allow authenticated users to view planning exceptions" ON m8_schema.planning_exceptions
    FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Allow authenticated users to view mrp parameters" ON m8_schema.mrp_parameters
    FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Insert sample data for testing
INSERT INTO m8_schema.replenishment_plans (plan_id, plan_name, plan_type, status) VALUES
('MRP-2025-W01', 'Plan MRP Semana 1 - 2025', 'MRP', 'active');

-- Insert sample MRP parameters for existing products
INSERT INTO m8_schema.mrp_parameters (product_id, location_id, safety_stock_method, safety_stock_value, lot_sizing_rule, lead_time_days, unit_cost)
SELECT 
    p.product_id,
    l.location_id,
    'statistical',
    FLOOR(RANDOM() * 100 + 50),
    'min_max',
    FLOOR(RANDOM() * 21 + 7),
    ROUND((RANDOM() * 100 + 10)::numeric, 2)
FROM (SELECT DISTINCT product_id FROM m8_schema.forecast_data LIMIT 50) p
CROSS JOIN (SELECT DISTINCT location_id FROM m8_schema.forecast_data LIMIT 5) l;

-- Create stored procedure for MRP explosion calculation
CREATE OR REPLACE FUNCTION calculate_mrp_explosion(
    p_plan_id TEXT,
    p_product_id TEXT,
    p_location_id TEXT
)
RETURNS VOID AS $$
DECLARE
    plan_rec RECORD;
    mrp_params RECORD;
    current_inventory DECIMAL(15,2) := 0;
    week_counter INTEGER;
    week_start DATE;
    week_end DATE;
    projected_available DECIMAL(15,2);
    gross_requirements DECIMAL(15,2);
    net_requirements DECIMAL(15,2);
    planned_receipts DECIMAL(15,2);
BEGIN
    -- Get plan details
    SELECT * INTO plan_rec FROM m8_schema.replenishment_plans WHERE plan_id = p_plan_id;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Plan not found: %', p_plan_id;
    END IF;
    
    -- Get MRP parameters
    SELECT * INTO mrp_params FROM m8_schema.mrp_parameters 
    WHERE product_id = p_product_id AND location_id = p_location_id;
    
    -- Get current inventory (simplified - would come from actual inventory table)
    current_inventory := FLOOR(RANDOM() * 500 + 100);
    projected_available := current_inventory;
    
    -- Delete existing explosion results for this combination
    DELETE FROM m8_schema.demand_explosion_results 
    WHERE plan_id = p_plan_id AND product_id = p_product_id AND location_id = p_location_id;
    
    -- Calculate for each week in the planning horizon
    FOR week_counter IN 1..plan_rec.planning_horizon_weeks LOOP
        week_start := date_trunc('week', CURRENT_DATE) + INTERVAL '1 week' * (week_counter - 1);
        week_end := week_start + INTERVAL '6 days';
        
        -- Get gross requirements from forecast (simplified)
        SELECT COALESCE(SUM(forecast), 0) INTO gross_requirements
        FROM m8_schema.forecast_data 
        WHERE product_id = p_product_id 
        AND location_id = p_location_id
        AND postdate BETWEEN week_start AND week_end;
        
        -- Apply some randomization for testing
        gross_requirements := GREATEST(gross_requirements + (RANDOM() * 20 - 10), 0);
        
        -- Calculate projected available
        projected_available := projected_available - gross_requirements;
        
        -- Calculate net requirements
        net_requirements := 0;
        planned_receipts := 0;
        
        IF projected_available < COALESCE(mrp_params.safety_stock_value, 50) THEN
            net_requirements := COALESCE(mrp_params.safety_stock_value, 50) + gross_requirements - projected_available;
            
            -- Apply lot sizing rules
            IF mrp_params.lot_sizing_rule = 'min_max' THEN
                planned_receipts := GREATEST(net_requirements, COALESCE(mrp_params.minimum_order_quantity, 100));
            ELSE
                planned_receipts := net_requirements;
            END IF;
            
            projected_available := projected_available + planned_receipts;
        END IF;
        
        -- Insert explosion result
        INSERT INTO m8_schema.demand_explosion_results (
            plan_id,
            product_id,
            location_id,
            week_start_date,
            week_end_date,
            week_number,
            year,
            beginning_inventory,
            gross_requirements,
            scheduled_receipts,
            projected_available,
            net_requirements,
            planned_order_receipts,
            planned_order_releases,
            safety_stock,
            reorder_point
        ) VALUES (
            p_plan_id,
            p_product_id,
            p_location_id,
            week_start,
            week_end,
            week_counter,
            EXTRACT(YEAR FROM week_start),
            current_inventory,
            gross_requirements,
            0, -- scheduled receipts would come from PO system
            projected_available,
            net_requirements,
            planned_receipts,
            planned_receipts, -- simplified - would be offset by lead time
            COALESCE(mrp_params.safety_stock_value, 50),
            COALESCE(mrp_params.safety_stock_value, 50) * 1.5
        );
        
        current_inventory := projected_available;
    END LOOP;
END;
$$ LANGUAGE plpgsql;