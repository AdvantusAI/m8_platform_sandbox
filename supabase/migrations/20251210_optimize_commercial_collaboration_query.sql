-- Migration: Optimize Commercial Collaboration Query Performance
-- Date: 2025-12-10
-- Purpose: Create optimized database function to prevent statement timeouts

-- 1. Create indexes for better query performance (if they don't exist)
CREATE INDEX IF NOT EXISTS idx_commercial_collaboration_view_postdate 
ON m8_schema.commercial_collaboration USING btree (postdate);

CREATE INDEX IF NOT EXISTS idx_commercial_collaboration_view_product_id 
ON m8_schema.commercial_collaboration USING btree (product_id);

CREATE INDEX IF NOT EXISTS idx_commercial_collaboration_view_customer_node_id 
ON m8_schema.commercial_collaboration USING btree (customer_node_id);

CREATE INDEX IF NOT EXISTS idx_commercial_collaboration_view_location_node_id 
ON m8_schema.commercial_collaboration USING btree (location_node_id);

CREATE INDEX IF NOT EXISTS idx_commercial_collaboration_view_subcategory_id 
ON m8_schema.commercial_collaboration USING btree (subcategory_id);

-- Composite index for common filter combinations
CREATE INDEX IF NOT EXISTS idx_commercial_collaboration_composite_1
ON m8_schema.commercial_collaboration USING btree (postdate, product_id, customer_node_id);

CREATE INDEX IF NOT EXISTS idx_commercial_collaboration_composite_2
ON m8_schema.commercial_collaboration USING btree (postdate, location_node_id, product_id);

-- 2. Drop existing functions if they exist (handles signature changes)
DROP FUNCTION IF EXISTS m8_schema.get_commercial_collaboration_optimized(DATE, DATE, UUID[], UUID[], UUID[], UUID[], INTEGER);
DROP FUNCTION IF EXISTS m8_schema.get_commercial_collaboration_optimized(DATE, DATE, TEXT[], UUID[], UUID[], TEXT[], INTEGER);
DROP FUNCTION IF EXISTS m8_schema.get_kam_adjustments_optimized(DATE, DATE, UUID[], UUID[], UUID[], INTEGER);
DROP FUNCTION IF EXISTS m8_schema.get_kam_adjustments_optimized(DATE, DATE, TEXT[], UUID[], UUID[], INTEGER);
DROP FUNCTION IF EXISTS m8_schema.get_commercial_col_laboration_summary(DATE, DATE, UUID[], UUID[], UUID[], UUID[]);
DROP FUNCTION IF EXISTS m8_schema.get_commercial_collaboration_summary(DATE, DATE, TEXT[], UUID[], UUID[], TEXT[]);

-- 3. Create optimized function to fetch commercial collaboration data
-- This function handles filtering at the database level for better performance
-- NOTE: product_id and subcategory_id are TEXT, not UUID
CREATE OR REPLACE FUNCTION m8_schema.get_commercial_collaboration_optimized(
  p_date_from DATE DEFAULT '2025-01-01',
  p_date_to DATE DEFAULT '2025-12-31',
  p_product_ids TEXT[] DEFAULT NULL,
  p_customer_ids UUID[] DEFAULT NULL,
  p_location_ids UUID[] DEFAULT NULL,
  p_subcategory_ids TEXT[] DEFAULT NULL,
  p_limit INTEGER DEFAULT 500
)
RETURNS TABLE (
  customer_node_id UUID,
  postdate DATE,
  forecast_ly DOUBLE PRECISION,
  forecast DOUBLE PRECISION,
  approved_sm_kam DOUBLE PRECISION,
  sm_kam_override DOUBLE PRECISION,
  forecast_sales_manager DOUBLE PRECISION,
  commercial_input DOUBLE PRECISION,
  forecast_sales_gap DOUBLE PRECISION,
  product_id TEXT,
  subcategory_id TEXT,
  location_node_id UUID,
  actual DOUBLE PRECISION
) 
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET statement_timeout = '30s'
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ccv.customer_node_id,
    ccv.postdate,
    ccv.forecast_ly::DOUBLE PRECISION,
    ccv.forecast::DOUBLE PRECISION,
    ccv.approved_sm_kam::DOUBLE PRECISION,
    ccv.sm_kam_override::DOUBLE PRECISION,
    ccv.forecast_sales_manager::DOUBLE PRECISION,
    ccv.commercial_input::DOUBLE PRECISION,
    ccv.forecast_sales_gap::DOUBLE PRECISION,
    ccv.product_id,
    ccv.subcategory_id,
    ccv.location_node_id,
    ccv.actual::DOUBLE PRECISION
  FROM m8_schema.commercial_collaboration_view ccv
  WHERE 
    ccv.postdate >= p_date_from
    AND ccv.postdate <= p_date_to
    AND (p_product_ids IS NULL OR ccv.product_id = ANY(p_product_ids))
    AND (p_customer_ids IS NULL OR ccv.customer_node_id = ANY(p_customer_ids))
    AND (p_location_ids IS NULL OR ccv.location_node_id = ANY(p_location_ids))
    AND (p_subcategory_ids IS NULL OR ccv.subcategory_id = ANY(p_subcategory_ids))
  ORDER BY 
    ccv.customer_node_id ASC,
    ccv.postdate ASC
  LIMIT p_limit;
END;
$$;

-- 4. Create function for KAM data with timeout protection
-- NOTE: product_id is TEXT, not UUID
-- This function now includes DDI, PPTO, M8 Predict, and PCI data
CREATE OR REPLACE FUNCTION m8_schema.get_kam_adjustments_optimized(
  p_date_from DATE DEFAULT '2025-01-01',
  p_date_to DATE DEFAULT '2025-12-31',
  p_product_ids TEXT[] DEFAULT NULL,
  p_customer_ids UUID[] DEFAULT NULL,
  p_location_ids UUID[] DEFAULT NULL,
  p_limit INTEGER DEFAULT 300
)
RETURNS TABLE (
  product_id TEXT,
  customer_node_id UUID,
  location_node_id UUID,
  postdate DATE,
  commercial_input DOUBLE PRECISION,
  commercial_notes TEXT,
  initial_sales_plan DOUBLE PRECISION,
  sm_kam_override DOUBLE PRECISION,
  ddi_totales DOUBLE PRECISION,
  m8_predict DOUBLE PRECISION,
  pci_actual DOUBLE PRECISION
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET statement_timeout = '30s'
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COALESCE(cc.product_id, inv.product_id) as product_id,
    -- FIX: Use customer_id field (not customer_node_id which is NULL)
    COALESCE(cc.customer_id, cc.customer_node_id, inv.customer_node_id) as customer_node_id,
    -- FIX: Use location_id field (not location_node_id which is NULL)
    COALESCE(cc.location_id, cc.location_node_id, inv.location_node_id) as location_node_id,
    COALESCE(cc.postdate, inv.postdate) as postdate,
    COALESCE(cc.commercial_input::DOUBLE PRECISION, 0) as commercial_input,
    cc.commercial_notes,
    -- Handle product-level PPTO budgets (customer_id IS NULL)
    COALESCE(
      cc.initial_sales_plan::DOUBLE PRECISION,
      (SELECT cc2.initial_sales_plan::DOUBLE PRECISION
       FROM m8_schema.commercial_collaboration cc2
       WHERE cc2.product_id = COALESCE(cc.product_id, inv.product_id)
         AND cc2.postdate = COALESCE(cc.postdate, inv.postdate)
         AND cc2.customer_id IS NULL
         AND cc2.initial_sales_plan IS NOT NULL
       LIMIT 1),
      NULL
    ) as initial_sales_plan,
    COALESCE(cc.sm_kam_override::DOUBLE PRECISION, 0) as sm_kam_override,
    -- DDI Totales from inventory_transactions.eoh
    COALESCE(inv.eoh::DOUBLE PRECISION, 0) as ddi_totales,
    -- M8 Predict from commercial_collaboration_view.actual
    COALESCE(
      (SELECT ccv.actual::DOUBLE PRECISION
       FROM m8_schema.commercial_collaboration_view ccv
       WHERE ccv.customer_node_id = COALESCE(cc.customer_id, cc.customer_node_id, inv.customer_node_id)
         AND ccv.product_id = COALESCE(cc.product_id, inv.product_id)
         AND ccv.postdate = COALESCE(cc.postdate, inv.postdate)
       LIMIT 1),
      0
    ) as m8_predict,
    -- PCI Actual from commercial_collaboration.commercial_input
    COALESCE(cc.commercial_input::DOUBLE PRECISION, 0) as pci_actual
  FROM m8_schema.commercial_collaboration cc
  FULL OUTER JOIN m8_schema.inventory_transactions inv
    ON COALESCE(cc.customer_id, cc.customer_node_id) = inv.customer_node_id
    AND cc.product_id = inv.product_id
    AND COALESCE(cc.location_id, cc.location_node_id) = inv.location_node_id
    AND cc.postdate = inv.postdate
  WHERE 
    COALESCE(cc.postdate, inv.postdate) >= p_date_from
    AND COALESCE(cc.postdate, inv.postdate) <= p_date_to
    AND (p_product_ids IS NULL OR COALESCE(cc.product_id, inv.product_id) = ANY(p_product_ids))
    AND (p_customer_ids IS NULL OR COALESCE(cc.customer_id, cc.customer_node_id, inv.customer_node_id) = ANY(p_customer_ids) OR cc.customer_id IS NULL)
    AND (p_location_ids IS NULL OR COALESCE(cc.location_id, cc.location_node_id, inv.location_node_id) = ANY(p_location_ids))
  ORDER BY 
    COALESCE(cc.customer_id, cc.customer_node_id, inv.customer_node_id) ASC,
    COALESCE(cc.postdate, inv.postdate) ASC
  LIMIT p_limit;
END;
$$;

-- 5. Create aggregated summary function for faster initial loads
-- NOTE: product_id is TEXT, not UUID
CREATE OR REPLACE FUNCTION m8_schema.get_commercial_collaboration_summary(
  p_date_from DATE DEFAULT '2025-01-01',
  p_date_to DATE DEFAULT '2025-12-31',
  p_product_ids TEXT[] DEFAULT NULL,
  p_customer_ids UUID[] DEFAULT NULL,
  p_location_ids UUID[] DEFAULT NULL
)
RETURNS TABLE (
  customer_node_id UUID,
  product_id TEXT,
  location_node_id UUID,
  total_forecast DOUBLE PRECISION,
  total_actual DOUBLE PRECISION,
  avg_commercial_input DOUBLE PRECISION,
  record_count BIGINT
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET statement_timeout = '15s'
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ccv.customer_node_id,
    ccv.product_id,
    ccv.location_node_id,
    SUM(ccv.forecast)::DOUBLE PRECISION as total_forecast,
    SUM(ccv.actual)::DOUBLE PRECISION as total_actual,
    AVG(ccv.commercial_input)::DOUBLE PRECISION as avg_commercial_input,
    COUNT(*) as record_count
  FROM m8_schema.commercial_collaboration_view ccv
  WHERE 
    ccv.postdate >= p_date_from
    AND ccv.postdate <= p_date_to
    AND (p_product_ids IS NULL OR ccv.product_id = ANY(p_product_ids))
    AND (p_customer_ids IS NULL OR ccv.customer_node_id = ANY(p_customer_ids))
    AND (p_location_ids IS NULL OR ccv.location_node_id = ANY(p_location_ids))
  GROUP BY 
    ccv.customer_node_id,
    ccv.product_id,
    ccv.location_node_id
  ORDER BY 
    record_count DESC
  LIMIT 100;
END;
$$;

-- 6. Grant necessary permissions
GRANT EXECUTE ON FUNCTION m8_schema.get_commercial_collaboration_optimized TO authenticated;
GRANT EXECUTE ON FUNCTION m8_schema.get_kam_adjustments_optimized TO authenticated;
GRANT EXECUTE ON FUNCTION m8_schema.get_commercial_collaboration_summary TO authenticated;

-- 7. Create helpful comments
COMMENT ON FUNCTION m8_schema.get_commercial_collaboration_optimized IS 
'Optimized function to fetch commercial collaboration data with automatic timeout protection (30s). Use this instead of direct view queries to prevent timeouts.';

COMMENT ON FUNCTION m8_schema.get_kam_adjustments_optimized IS 
'Optimized function to fetch KAM adjustments, PPTO budgets, DDI inventory, M8 Predict, and PCI data with automatic timeout protection (30s). Returns data dynamically for any year range.';

COMMENT ON FUNCTION m8_schema.get_commercial_collaboration_summary IS 
'Fast aggregated summary of commercial collaboration data for initial dashboard loads (15s timeout).';

-- 8. Analyze tables for better query planning
ANALYZE m8_schema.commercial_collaboration;
ANALYZE m8_schema.products;
ANALYZE m8_schema.supply_network_nodes;
