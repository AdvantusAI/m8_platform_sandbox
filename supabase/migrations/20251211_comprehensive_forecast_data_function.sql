-- Migration: Comprehensive Forecast Data Function
-- Date: 2025-12-11
-- Purpose: Create unified database function that returns ALL forecast-related data in one query
--          Includes: Sell-in, Sell-out, DDI/Inventory, PPTO/Budget, M8 Predict, PCI, KAM adjustments

-- 1. Drop existing comprehensive function if it exists
DROP FUNCTION IF EXISTS m8_schema.get_comprehensive_forecast_data(DATE, DATE, TEXT[], UUID[], UUID[]);

-- 2. Create comprehensive function that returns ALL data needed for ForecastCollaboration
CREATE OR REPLACE FUNCTION m8_schema.get_comprehensive_forecast_data(
  p_date_from DATE DEFAULT '2025-01-01',
  p_date_to DATE DEFAULT '2025-12-31',
  p_product_ids TEXT[] DEFAULT NULL,
  p_customer_ids UUID[] DEFAULT NULL,
  p_location_ids UUID[] DEFAULT NULL
)
RETURNS TABLE (
  -- Identifiers
  customer_node_id UUID,
  product_id TEXT,
  location_node_id UUID,
  postdate DATE,
  
  -- Historical & Forecast data (from commercial_collaboration_view)
  forecast_ly DOUBLE PRECISION,
  forecast DOUBLE PRECISION,
  approved_sm_kam DOUBLE PRECISION,
  sm_kam_override DOUBLE PRECISION,
  forecast_sales_manager DOUBLE PRECISION,
  commercial_input DOUBLE PRECISION,
  forecast_sales_gap DOUBLE PRECISION,
  actual DOUBLE PRECISION,
  
  -- Sell-in data (from v_time_series_sell_in) - by year
  sell_in_2023 DOUBLE PRECISION,
  sell_in_2024 DOUBLE PRECISION,
  sell_in_2025 DOUBLE PRECISION,
  
  -- Sell-out data (from v_time_series_sell_out) - by year
  sell_out_2023 DOUBLE PRECISION,
  sell_out_2024 DOUBLE PRECISION,
  sell_out_2025 DOUBLE PRECISION,
  
  -- Inventory/DDI data (from inventory_transactions)
  ddi_totales DOUBLE PRECISION,
  
  -- PPTO/Budget data (from commercial_collaboration.initial_sales_plan)
  ppto_budget DOUBLE PRECISION,
  
  -- KAM adjustments (from commercial_collaboration)
  kam_adjustment DOUBLE PRECISION,
  kam_notes TEXT
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET statement_timeout = '45s'
AS $$
BEGIN
  RETURN QUERY
  WITH 
  -- Base forecast data from commercial_collaboration_view
  forecast_base AS (
    SELECT 
      ccv.customer_node_id,
      ccv.product_id,
      ccv.location_node_id,
      ccv.postdate,
      ccv.forecast_ly::DOUBLE PRECISION,
      ccv.forecast::DOUBLE PRECISION,
      ccv.approved_sm_kam::DOUBLE PRECISION,
      ccv.sm_kam_override::DOUBLE PRECISION,
      ccv.forecast_sales_manager::DOUBLE PRECISION,
      ccv.commercial_input::DOUBLE PRECISION,
      ccv.forecast_sales_gap::DOUBLE PRECISION,
      ccv.actual::DOUBLE PRECISION
    FROM m8_schema.commercial_collaboration_view ccv
    WHERE 
      ccv.postdate >= p_date_from
      AND ccv.postdate <= p_date_to
      AND (p_product_ids IS NULL OR ccv.product_id = ANY(p_product_ids))
      AND (p_customer_ids IS NULL OR ccv.customer_node_id = ANY(p_customer_ids))
      AND (p_location_ids IS NULL OR ccv.location_node_id = ANY(p_location_ids))
  ),
  
  -- Sell-in data aggregated by year
  sell_in_data AS (
    SELECT 
      si.customer_node_id,
      si.product_id,
      si.location_node_id,
      si.postdate,
      CASE WHEN EXTRACT(YEAR FROM si.postdate) = 2023 THEN si.quantity::DOUBLE PRECISION ELSE 0 END as sell_in_2023,
      CASE WHEN EXTRACT(YEAR FROM si.postdate) = 2024 THEN si.quantity::DOUBLE PRECISION ELSE 0 END as sell_in_2024,
      CASE WHEN EXTRACT(YEAR FROM si.postdate) = 2025 THEN si.quantity::DOUBLE PRECISION ELSE 0 END as sell_in_2025
    FROM m8_schema.v_time_series_sell_in si
    WHERE 
      si.postdate >= p_date_from
      AND si.postdate <= p_date_to
      AND (p_product_ids IS NULL OR si.product_id = ANY(p_product_ids))
      AND (p_customer_ids IS NULL OR si.customer_node_id = ANY(p_customer_ids))
      AND (p_location_ids IS NULL OR si.location_node_id = ANY(p_location_ids))
  ),
  
  -- Sell-out data aggregated by year
  sell_out_data AS (
    SELECT 
      so.customer_node_id,
      so.product_id,
      so.location_node_id,
      so.postdate,
      CASE WHEN EXTRACT(YEAR FROM so.postdate) = 2023 THEN so.quantity::DOUBLE PRECISION ELSE 0 END as sell_out_2023,
      CASE WHEN EXTRACT(YEAR FROM so.postdate) = 2024 THEN so.quantity::DOUBLE PRECISION ELSE 0 END as sell_out_2024,
      CASE WHEN EXTRACT(YEAR FROM so.postdate) = 2025 THEN so.quantity::DOUBLE PRECISION ELSE 0 END as sell_out_2025
    FROM m8_schema.v_time_series_sell_out so
    WHERE 
      so.postdate >= p_date_from
      AND so.postdate <= p_date_to
      AND (p_product_ids IS NULL OR so.product_id = ANY(p_product_ids))
      AND (p_customer_ids IS NULL OR so.customer_node_id = ANY(p_customer_ids))
      AND (p_location_ids IS NULL OR so.location_node_id = ANY(p_location_ids))
  ),
  
  -- Inventory/DDI data (EOH = End of Hand inventory days)
  inventory_data AS (
    SELECT 
      it.customer_node_id,
      it.product_id,
      it.location_node_id,
      it.postdate,
      COALESCE(it.eoh::DOUBLE PRECISION, 0) as ddi_totales
    FROM m8_schema.inventory_transactions it
    WHERE 
      it.postdate >= p_date_from
      AND it.postdate <= p_date_to
      AND (p_product_ids IS NULL OR it.product_id = ANY(p_product_ids))
      AND (p_customer_ids IS NULL OR it.customer_node_id = ANY(p_customer_ids))
      AND (p_location_ids IS NULL OR it.location_node_id = ANY(p_location_ids))
  ),
  
  -- PPTO/Budget and KAM data from commercial_collaboration
  ppto_kam_data AS (
    SELECT 
      cc.customer_node_id,
      cc.product_id,
      cc.location_node_id,
      cc.postdate,
      cc.initial_sales_plan::DOUBLE PRECISION as ppto_budget,
      COALESCE(cc.sm_kam_override, cc.commercial_input)::DOUBLE PRECISION as kam_adjustment,
      cc.commercial_notes as kam_notes
    FROM m8_schema.commercial_collaboration cc
    WHERE 
      cc.postdate >= p_date_from
      AND cc.postdate <= p_date_to
      AND (p_product_ids IS NULL OR cc.product_id = ANY(p_product_ids))
      AND (p_location_ids IS NULL OR cc.location_node_id = ANY(p_location_ids))
      -- Note: For PPTO records, customer_node_id might be NULL (product-level budgets)
      AND (p_customer_ids IS NULL OR cc.customer_node_id = ANY(p_customer_ids) OR cc.customer_node_id IS NULL)
  ),
  
  -- Get all unique customer-product-location-date combinations
  all_combinations AS (
    SELECT DISTINCT
      COALESCE(fb.customer_node_id, si.customer_node_id, so.customer_node_id, inv.customer_node_id, pk.customer_node_id) as customer_node_id,
      COALESCE(fb.product_id, si.product_id, so.product_id, inv.product_id, pk.product_id) as product_id,
      COALESCE(fb.location_node_id, si.location_node_id, so.location_node_id, inv.location_node_id, pk.location_node_id) as location_node_id,
      COALESCE(fb.postdate, si.postdate, so.postdate, inv.postdate, pk.postdate) as postdate
    FROM forecast_base fb
    FULL OUTER JOIN sell_in_data si 
      ON fb.customer_node_id = si.customer_node_id 
      AND fb.product_id = si.product_id 
      AND fb.location_node_id = si.location_node_id 
      AND fb.postdate = si.postdate
    FULL OUTER JOIN sell_out_data so 
      ON COALESCE(fb.customer_node_id, si.customer_node_id) = so.customer_node_id 
      AND COALESCE(fb.product_id, si.product_id) = so.product_id 
      AND COALESCE(fb.location_node_id, si.location_node_id) = so.location_node_id 
      AND COALESCE(fb.postdate, si.postdate) = so.postdate
    FULL OUTER JOIN inventory_data inv 
      ON COALESCE(fb.customer_node_id, si.customer_node_id, so.customer_node_id) = inv.customer_node_id 
      AND COALESCE(fb.product_id, si.product_id, so.product_id) = inv.product_id 
      AND COALESCE(fb.location_node_id, si.location_node_id, so.location_node_id) = inv.location_node_id 
      AND COALESCE(fb.postdate, si.postdate, so.postdate) = inv.postdate
    FULL OUTER JOIN ppto_kam_data pk 
      ON COALESCE(fb.customer_node_id, si.customer_node_id, so.customer_node_id, inv.customer_node_id) = pk.customer_node_id 
      AND COALESCE(fb.product_id, si.product_id, so.product_id, inv.product_id) = pk.product_id 
      AND COALESCE(fb.location_node_id, si.location_node_id, so.location_node_id, inv.location_node_id) = pk.location_node_id 
      AND COALESCE(fb.postdate, si.postdate, so.postdate, inv.postdate) = pk.postdate
  )
  
  -- Final join to combine all data
  SELECT 
    ac.customer_node_id,
    ac.product_id,
    ac.location_node_id,
    ac.postdate,
    
    -- Forecast data
    COALESCE(fb.forecast_ly, 0) as forecast_ly,
    COALESCE(fb.forecast, 0) as forecast,
    COALESCE(fb.approved_sm_kam, 0) as approved_sm_kam,
    COALESCE(fb.sm_kam_override, 0) as sm_kam_override,
    COALESCE(fb.forecast_sales_manager, 0) as forecast_sales_manager,
    COALESCE(fb.commercial_input, 0) as commercial_input,
    COALESCE(fb.forecast_sales_gap, 0) as forecast_sales_gap,
    COALESCE(fb.actual, 0) as actual,
    
    -- Sell-in data by year
    COALESCE(si.sell_in_2023, 0) as sell_in_2023,
    COALESCE(si.sell_in_2024, 0) as sell_in_2024,
    COALESCE(si.sell_in_2025, 0) as sell_in_2025,
    
    -- Sell-out data by year
    COALESCE(so.sell_out_2023, 0) as sell_out_2023,
    COALESCE(so.sell_out_2024, 0) as sell_out_2024,
    COALESCE(so.sell_out_2025, 0) as sell_out_2025,
    
    -- Inventory/DDI
    COALESCE(inv.ddi_totales, 0) as ddi_totales,
    
    -- PPTO/Budget (handle product-level budgets by matching product_id only)
    COALESCE(
      pk.ppto_budget,
      (SELECT initial_sales_plan::DOUBLE PRECISION 
       FROM m8_schema.commercial_collaboration cc2 
       WHERE cc2.product_id = ac.product_id 
         AND cc2.postdate = ac.postdate 
         AND cc2.customer_node_id IS NULL 
         AND cc2.initial_sales_plan IS NOT NULL
       LIMIT 1),
      0
    ) as ppto_budget,
    
    -- KAM adjustments
    COALESCE(pk.kam_adjustment, 0) as kam_adjustment,
    pk.kam_notes
    
  FROM all_combinations ac
  LEFT JOIN forecast_base fb 
    ON ac.customer_node_id = fb.customer_node_id 
    AND ac.product_id = fb.product_id 
    AND ac.location_node_id = fb.location_node_id 
    AND ac.postdate = fb.postdate
  LEFT JOIN sell_in_data si 
    ON ac.customer_node_id = si.customer_node_id 
    AND ac.product_id = si.product_id 
    AND ac.location_node_id = si.location_node_id 
    AND ac.postdate = si.postdate
  LEFT JOIN sell_out_data so 
    ON ac.customer_node_id = so.customer_node_id 
    AND ac.product_id = so.product_id 
    AND ac.location_node_id = so.location_node_id 
    AND ac.postdate = so.postdate
  LEFT JOIN inventory_data inv 
    ON ac.customer_node_id = inv.customer_node_id 
    AND ac.product_id = inv.product_id 
    AND ac.location_node_id = inv.location_node_id 
    AND ac.postdate = inv.postdate
  LEFT JOIN ppto_kam_data pk 
    ON ac.customer_node_id = pk.customer_node_id 
    AND ac.product_id = pk.product_id 
    AND ac.location_node_id = pk.location_node_id 
    AND ac.postdate = pk.postdate
  WHERE ac.customer_node_id IS NOT NULL  -- Ensure we have a valid customer
  ORDER BY 
    ac.customer_node_id ASC,
    ac.product_id ASC,
    ac.postdate ASC
  LIMIT 1000;
END;
$$;

-- 3. Grant permissions
GRANT EXECUTE ON FUNCTION m8_schema.get_comprehensive_forecast_data TO authenticated;

-- 4. Add helpful comment
COMMENT ON FUNCTION m8_schema.get_comprehensive_forecast_data IS 
'Comprehensive function that returns ALL forecast-related data in a single query:
- Historical & Forecast data (forecast_ly, forecast, KAM, etc.)
- Sell-in data (2023, 2024, 2025)
- Sell-out data (2023, 2024, 2025)
- DDI/Inventory data (ddi_totales from EOH)
- PPTO/Budget data (initial_sales_plan)
- KAM adjustments (sm_kam_override, commercial_input)

Handles product-level PPTO budgets (where customer_node_id is NULL) by matching on product_id and postdate.
Timeout: 45 seconds. Use this instead of multiple separate queries for better performance.';

-- 5. Create indexes for inventory_transactions if they don't exist
CREATE INDEX IF NOT EXISTS idx_inventory_transactions_postdate 
ON m8_schema.inventory_transactions USING btree (postdate);

CREATE INDEX IF NOT EXISTS idx_inventory_transactions_product_id 
ON m8_schema.inventory_transactions USING btree (product_id);

CREATE INDEX IF NOT EXISTS idx_inventory_transactions_customer_node_id 
ON m8_schema.inventory_transactions USING btree (customer_node_id);

CREATE INDEX IF NOT EXISTS idx_inventory_transactions_composite 
ON m8_schema.inventory_transactions USING btree (postdate, product_id, customer_node_id);

-- 6. Create indexes for v_time_series_sell_in if they don't exist
CREATE INDEX IF NOT EXISTS idx_sell_in_postdate 
ON m8_schema.v_time_series_sell_in USING btree (postdate);

CREATE INDEX IF NOT EXISTS idx_sell_in_product_id 
ON m8_schema.v_time_series_sell_in USING btree (product_id);

CREATE INDEX IF NOT EXISTS idx_sell_in_customer_node_id 
ON m8_schema.v_time_series_sell_in USING btree (customer_node_id);

-- 7. Create indexes for v_time_series_sell_out if they don't exist
CREATE INDEX IF NOT EXISTS idx_sell_out_postdate 
ON m8_schema.v_time_series_sell_out USING btree (postdate);

CREATE INDEX IF NOT EXISTS idx_sell_out_product_id 
ON m8_schema.v_time_series_sell_out USING btree (product_id);

CREATE INDEX IF NOT EXISTS idx_sell_out_customer_node_id 
ON m8_schema.v_time_series_sell_out USING btree (customer_node_id);

-- 8. Analyze tables for better query planning
ANALYZE m8_schema.commercial_collaboration;
ANALYZE m8_schema.commercial_collaboration_view;
ANALYZE m8_schema.v_time_series_sell_in;
ANALYZE m8_schema.v_time_series_sell_out;
ANALYZE m8_schema.inventory_transactions;
