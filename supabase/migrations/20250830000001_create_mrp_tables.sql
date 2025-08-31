-- Create MRP (Material Requirements Planning) tables for Fulfillment section
-- Schema: m8_schema

-- 1. Replenishment Plans Table
CREATE TABLE IF NOT EXISTS m8_schema.replenishment_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id VARCHAR(50) UNIQUE NOT NULL,
  plan_name VARCHAR(255) NOT NULL,
  plan_type VARCHAR(50) DEFAULT 'MRP', -- MRP, DRP, Manual
  planning_horizon_weeks INTEGER DEFAULT 12,
  time_bucket VARCHAR(20) DEFAULT 'weekly', -- daily, weekly, monthly
  status VARCHAR(50) DEFAULT 'draft', -- draft, active, archived
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  last_run_at TIMESTAMPTZ,
  next_run_at TIMESTAMPTZ,
  parameters JSONB DEFAULT '{}', -- Additional MRP parameters
  CONSTRAINT valid_plan_type CHECK (plan_type IN ('MRP', 'DRP', 'Manual')),
  CONSTRAINT valid_status CHECK (status IN ('draft', 'active', 'archived', 'running')),
  CONSTRAINT valid_time_bucket CHECK (time_bucket IN ('daily', 'weekly', 'monthly'))
);

-- 2. Purchase Order Recommendations Table
CREATE TABLE IF NOT EXISTS m8_schema.purchase_order_recommendations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id UUID REFERENCES m8_schema.replenishment_plans(id) ON DELETE CASCADE,
  recommendation_id VARCHAR(50) UNIQUE NOT NULL,
  product_id VARCHAR(50) NOT NULL,
  location_id VARCHAR(50) NOT NULL,
  supplier_id VARCHAR(50),
  supplier_name VARCHAR(255),
  week_start_date DATE NOT NULL,
  week_end_date DATE NOT NULL,
  week_number INTEGER NOT NULL,
  year INTEGER NOT NULL,
  recommended_quantity DECIMAL(15,2) NOT NULL,
  minimum_order_quantity DECIMAL(15,2),
  order_multiple DECIMAL(15,2),
  final_order_quantity DECIMAL(15,2), -- After applying MOQ and multiples
  unit_cost DECIMAL(15,4),
  total_value DECIMAL(15,2),
  lead_time_days INTEGER DEFAULT 14,
  recommended_order_date DATE,
  expected_delivery_date DATE,
  approval_status VARCHAR(50) DEFAULT 'pending', -- pending, approved, rejected, modified
  approval_threshold_exceeded BOOLEAN DEFAULT FALSE,
  approved_by UUID REFERENCES auth.users(id),
  approved_at TIMESTAMPTZ,
  po_number VARCHAR(50), -- When converted to actual PO
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT valid_approval_status CHECK (approval_status IN ('pending', 'approved', 'rejected', 'modified', 'converted'))
);

-- 3. Planning Exceptions Table
CREATE TABLE IF NOT EXISTS m8_schema.planning_exceptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id UUID REFERENCES m8_schema.replenishment_plans(id) ON DELETE CASCADE,
  exception_id VARCHAR(50) UNIQUE NOT NULL,
  exception_type VARCHAR(50) NOT NULL, -- stockout, excess_inventory, below_safety_stock, order_urgency
  severity VARCHAR(20) NOT NULL, -- critical, high, medium, low
  product_id VARCHAR(50) NOT NULL,
  location_id VARCHAR(50) NOT NULL,
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
  resolution_status VARCHAR(50) DEFAULT 'open', -- open, in_progress, resolved, ignored
  resolved_by UUID REFERENCES auth.users(id),
  resolved_at TIMESTAMPTZ,
  resolution_notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT valid_exception_type CHECK (exception_type IN ('stockout', 'excess_inventory', 'below_safety_stock', 'order_urgency', 'forecast_deviation')),
  CONSTRAINT valid_severity CHECK (severity IN ('critical', 'high', 'medium', 'low')),
  CONSTRAINT valid_resolution_status CHECK (resolution_status IN ('open', 'in_progress', 'resolved', 'ignored'))
);

-- 4. Demand Explosion Results Table (MRP calculations)
CREATE TABLE IF NOT EXISTS m8_schema.demand_explosion_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id UUID REFERENCES m8_schema.replenishment_plans(id) ON DELETE CASCADE,
  product_id VARCHAR(50) NOT NULL,
  location_id VARCHAR(50) NOT NULL,
  week_start_date DATE NOT NULL,
  week_end_date DATE NOT NULL,
  week_number INTEGER NOT NULL,
  year INTEGER NOT NULL,
  beginning_inventory DECIMAL(15,2) DEFAULT 0,
  gross_requirements DECIMAL(15,2) DEFAULT 0, -- Total demand
  scheduled_receipts DECIMAL(15,2) DEFAULT 0, -- Already ordered
  projected_available DECIMAL(15,2) DEFAULT 0, -- After demand and receipts
  net_requirements DECIMAL(15,2) DEFAULT 0, -- What's needed
  planned_order_receipts DECIMAL(15,2) DEFAULT 0, -- Recommended orders
  planned_order_releases DECIMAL(15,2) DEFAULT 0, -- When to place orders
  safety_stock DECIMAL(15,2) DEFAULT 0,
  reorder_point DECIMAL(15,2) DEFAULT 0,
  lot_size DECIMAL(15,2),
  lead_time_offset INTEGER DEFAULT 0, -- Weeks to offset for lead time
  firm_planned_orders DECIMAL(15,2) DEFAULT 0, -- Manual overrides
  pegging_info JSONB DEFAULT '{}', -- Demand source tracking
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(plan_id, product_id, location_id, week_start_date)
);

-- 5. MRP Parameters Table (per product/location)
CREATE TABLE IF NOT EXISTS m8_schema.mrp_parameters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id VARCHAR(50) NOT NULL,
  location_id VARCHAR(50) NOT NULL,
  safety_stock_method VARCHAR(50) DEFAULT 'statistical', -- statistical, fixed, lead_time_based
  safety_stock_value DECIMAL(15,2),
  safety_stock_days INTEGER,
  service_level DECIMAL(5,2) DEFAULT 95.0, -- For statistical calculation
  lot_sizing_rule VARCHAR(50) DEFAULT 'min_max', -- lot_for_lot, fixed_quantity, min_max, economic_order_quantity
  minimum_order_quantity DECIMAL(15,2) DEFAULT 1,
  maximum_order_quantity DECIMAL(15,2),
  order_multiple DECIMAL(15,2) DEFAULT 1,
  lead_time_days INTEGER DEFAULT 14,
  planning_time_fence_days INTEGER DEFAULT 7, -- Frozen period
  demand_time_fence_days INTEGER DEFAULT 30,
  inspection_time_days INTEGER DEFAULT 0,
  supplier_id VARCHAR(50),
  preferred_supplier VARCHAR(255),
  unit_cost DECIMAL(15,4),
  carrying_cost_percentage DECIMAL(5,2) DEFAULT 20.0,
  ordering_cost DECIMAL(15,2) DEFAULT 50.0,
  abc_classification CHAR(1), -- A, B, C
  xyz_classification CHAR(1), -- X, Y, Z (demand variability)
  active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(product_id, location_id),
  CONSTRAINT valid_safety_stock_method CHECK (safety_stock_method IN ('statistical', 'fixed', 'lead_time_based', 'percentage')),
  CONSTRAINT valid_lot_sizing CHECK (lot_sizing_rule IN ('lot_for_lot', 'fixed_quantity', 'min_max', 'economic_order_quantity', 'periods_of_supply'))
);

-- Create indexes for performance
CREATE INDEX idx_replenishment_plans_status ON m8_schema.replenishment_plans(status);
CREATE INDEX idx_replenishment_plans_created_by ON m8_schema.replenishment_plans(created_by);

CREATE INDEX idx_po_recommendations_plan ON m8_schema.purchase_order_recommendations(plan_id);
CREATE INDEX idx_po_recommendations_product_location ON m8_schema.purchase_order_recommendations(product_id, location_id);
CREATE INDEX idx_po_recommendations_week ON m8_schema.purchase_order_recommendations(week_start_date);
CREATE INDEX idx_po_recommendations_status ON m8_schema.purchase_order_recommendations(approval_status);
CREATE INDEX idx_po_recommendations_supplier ON m8_schema.purchase_order_recommendations(supplier_id);

CREATE INDEX idx_exceptions_plan ON m8_schema.planning_exceptions(plan_id);
CREATE INDEX idx_exceptions_product_location ON m8_schema.planning_exceptions(product_id, location_id);
CREATE INDEX idx_exceptions_type_severity ON m8_schema.planning_exceptions(exception_type, severity);
CREATE INDEX idx_exceptions_status ON m8_schema.planning_exceptions(resolution_status);

CREATE INDEX idx_explosion_plan ON m8_schema.demand_explosion_results(plan_id);
CREATE INDEX idx_explosion_product_location_week ON m8_schema.demand_explosion_results(product_id, location_id, week_start_date);

CREATE INDEX idx_mrp_params_product_location ON m8_schema.mrp_parameters(product_id, location_id);
CREATE INDEX idx_mrp_params_active ON m8_schema.mrp_parameters(active);

-- Create RLS policies
ALTER TABLE m8_schema.replenishment_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE m8_schema.purchase_order_recommendations ENABLE ROW LEVEL SECURITY;
ALTER TABLE m8_schema.planning_exceptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE m8_schema.demand_explosion_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE m8_schema.mrp_parameters ENABLE ROW LEVEL SECURITY;

-- Policies for replenishment_plans
CREATE POLICY "Users can view all replenishment plans" ON m8_schema.replenishment_plans
  FOR SELECT USING (true);

CREATE POLICY "Users can create replenishment plans" ON m8_schema.replenishment_plans
  FOR INSERT WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Users can update their own plans" ON m8_schema.replenishment_plans
  FOR UPDATE USING (auth.uid() = created_by);

-- Policies for other tables (view all, modify with appropriate permissions)
CREATE POLICY "Users can view all recommendations" ON m8_schema.purchase_order_recommendations
  FOR SELECT USING (true);

CREATE POLICY "Users can modify recommendations" ON m8_schema.purchase_order_recommendations
  FOR ALL USING (true);

CREATE POLICY "Users can view all exceptions" ON m8_schema.planning_exceptions
  FOR SELECT USING (true);

CREATE POLICY "Users can modify exceptions" ON m8_schema.planning_exceptions
  FOR ALL USING (true);

CREATE POLICY "Users can view explosion results" ON m8_schema.demand_explosion_results
  FOR SELECT USING (true);

CREATE POLICY "Users can modify explosion results" ON m8_schema.demand_explosion_results
  FOR ALL USING (true);

CREATE POLICY "Users can view MRP parameters" ON m8_schema.mrp_parameters
  FOR SELECT USING (true);

CREATE POLICY "Users can modify MRP parameters" ON m8_schema.mrp_parameters
  FOR ALL USING (true);

-- Function to generate week buckets
CREATE OR REPLACE FUNCTION m8_schema.generate_week_buckets(
  start_date DATE,
  num_weeks INTEGER
)
RETURNS TABLE (
  week_number INTEGER,
  week_start DATE,
  week_end DATE,
  year INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    generate_series AS week_number,
    start_date + (generate_series - 1) * INTERVAL '7 days' AS week_start,
    start_date + (generate_series * 7 - 1) * INTERVAL '1 day' AS week_end,
    EXTRACT(YEAR FROM start_date + (generate_series - 1) * INTERVAL '7 days')::INTEGER AS year
  FROM generate_series(1, num_weeks);
END;
$$ LANGUAGE plpgsql;

-- Function to calculate MRP explosion
CREATE OR REPLACE FUNCTION m8_schema.calculate_mrp_explosion(
  p_plan_id UUID,
  p_product_id VARCHAR(50),
  p_location_id VARCHAR(50)
)
RETURNS VOID AS $$
DECLARE
  v_week RECORD;
  v_beginning_inv DECIMAL(15,2);
  v_gross_req DECIMAL(15,2);
  v_scheduled_rec DECIMAL(15,2);
  v_projected_avail DECIMAL(15,2);
  v_net_req DECIMAL(15,2);
  v_planned_receipt DECIMAL(15,2);
  v_safety_stock DECIMAL(15,2);
  v_reorder_point DECIMAL(15,2);
  v_min_order_qty DECIMAL(15,2);
  v_order_multiple DECIMAL(15,2);
  v_lead_time INTEGER;
  v_plan RECORD;
BEGIN
  -- Get plan details
  SELECT * INTO v_plan FROM m8_schema.replenishment_plans WHERE id = p_plan_id;
  
  -- Get MRP parameters
  SELECT 
    COALESCE(safety_stock_value, 0),
    COALESCE(minimum_order_quantity, 1),
    COALESCE(order_multiple, 1),
    COALESCE(lead_time_days, 14)
  INTO v_safety_stock, v_min_order_qty, v_order_multiple, v_lead_time
  FROM m8_schema.mrp_parameters
  WHERE product_id = p_product_id AND location_id = p_location_id;

  -- Get current inventory
  SELECT COALESCE(current_stock, 0) INTO v_beginning_inv
  FROM public.current_inventory
  WHERE product_id = p_product_id;

  -- Calculate reorder point
  v_reorder_point := v_safety_stock + (v_lead_time * 10); -- Simplified: 10 units per day average

  -- Process each week
  FOR v_week IN 
    SELECT * FROM m8_schema.generate_week_buckets(
      CURRENT_DATE, 
      v_plan.planning_horizon_weeks
    )
  LOOP
    -- Get gross requirements (demand) for the week
    SELECT COALESCE(SUM(forecast), 0) INTO v_gross_req
    FROM m8_schema.forecast_data
    WHERE product_id = p_product_id 
      AND location_id = p_location_id
      AND postdate BETWEEN v_week.week_start AND v_week.week_end;

    -- Get scheduled receipts (existing POs)
    v_scheduled_rec := 0; -- Would come from actual PO data

    -- Calculate projected available
    v_projected_avail := v_beginning_inv + v_scheduled_rec - v_gross_req;

    -- Calculate net requirements
    IF v_projected_avail < v_safety_stock THEN
      v_net_req := v_safety_stock - v_projected_avail;
    ELSE
      v_net_req := 0;
    END IF;

    -- Calculate planned order receipt (applying lot sizing)
    IF v_net_req > 0 THEN
      -- Apply minimum order quantity
      v_planned_receipt := GREATEST(v_net_req, v_min_order_qty);
      
      -- Apply order multiple
      IF v_order_multiple > 1 THEN
        v_planned_receipt := CEIL(v_planned_receipt / v_order_multiple) * v_order_multiple;
      END IF;
    ELSE
      v_planned_receipt := 0;
    END IF;

    -- Insert or update explosion results
    INSERT INTO m8_schema.demand_explosion_results (
      plan_id, product_id, location_id,
      week_start_date, week_end_date, week_number, year,
      beginning_inventory, gross_requirements, scheduled_receipts,
      projected_available, net_requirements, planned_order_receipts,
      safety_stock, reorder_point
    ) VALUES (
      p_plan_id, p_product_id, p_location_id,
      v_week.week_start, v_week.week_end, v_week.week_number, v_week.year,
      v_beginning_inv, v_gross_req, v_scheduled_rec,
      v_projected_avail, v_net_req, v_planned_receipt,
      v_safety_stock, v_reorder_point
    )
    ON CONFLICT (plan_id, product_id, location_id, week_start_date)
    DO UPDATE SET
      beginning_inventory = EXCLUDED.beginning_inventory,
      gross_requirements = EXCLUDED.gross_requirements,
      scheduled_receipts = EXCLUDED.scheduled_receipts,
      projected_available = EXCLUDED.projected_available,
      net_requirements = EXCLUDED.net_requirements,
      planned_order_receipts = EXCLUDED.planned_order_receipts,
      updated_at = NOW();

    -- Set beginning inventory for next week
    v_beginning_inv := v_projected_avail + v_planned_receipt;
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update timestamps
CREATE OR REPLACE FUNCTION m8_schema.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_replenishment_plans_updated_at BEFORE UPDATE ON m8_schema.replenishment_plans
  FOR EACH ROW EXECUTE FUNCTION m8_schema.update_updated_at_column();

CREATE TRIGGER update_po_recommendations_updated_at BEFORE UPDATE ON m8_schema.purchase_order_recommendations
  FOR EACH ROW EXECUTE FUNCTION m8_schema.update_updated_at_column();

CREATE TRIGGER update_planning_exceptions_updated_at BEFORE UPDATE ON m8_schema.planning_exceptions
  FOR EACH ROW EXECUTE FUNCTION m8_schema.update_updated_at_column();

CREATE TRIGGER update_explosion_results_updated_at BEFORE UPDATE ON m8_schema.demand_explosion_results
  FOR EACH ROW EXECUTE FUNCTION m8_schema.update_updated_at_column();

CREATE TRIGGER update_mrp_parameters_updated_at BEFORE UPDATE ON m8_schema.mrp_parameters
  FOR EACH ROW EXECUTE FUNCTION m8_schema.update_updated_at_column();