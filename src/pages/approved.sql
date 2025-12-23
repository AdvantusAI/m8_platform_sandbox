-- Drop the function if it exists before creating it
DROP FUNCTION IF EXISTS m8_schema.update_commercial_input_approved(
);

CREATE OR REPLACE FUNCTION m8_schema.update_commercial_input_approved(
  p_month_abbr TEXT,
  p_year TEXT,
  p_marca_names TEXT[] DEFAULT NULL,
  p_product_lines TEXT[] DEFAULT NULL,
  p_client_hierarchy TEXT[] DEFAULT NULL,
  p_channel TEXT[] DEFAULT NULL,
  p_agente TEXT[] DEFAULT NULL,
  p_udn TEXT[] DEFAULT NULL
)
RETURNS TABLE (
  updated_count INTEGER,
  message TEXT
) AS $$
DECLARE
  v_month_num TEXT;
  v_full_year INTEGER;
  v_month_start DATE;
  v_month_end DATE;
BEGIN
  -- Convert month abbreviation to number
  v_month_num := CASE LOWER(p_month_abbr)
    WHEN 'ene' THEN '01'
    WHEN 'feb' THEN '02'
    WHEN 'mar' THEN '03'
    WHEN 'abr' THEN '04'
    WHEN 'may' THEN '05'
    WHEN 'jun' THEN '06'
    WHEN 'jul' THEN '07'
    WHEN 'ago' THEN '08'
    WHEN 'sep' THEN '09'
    WHEN 'oct' THEN '10'
    WHEN 'nov' THEN '11'
    WHEN 'dic' THEN '12'
    ELSE NULL
  END;

  IF v_month_num IS NULL THEN
    RETURN QUERY SELECT 0, 'Invalid month abbreviation';
    RETURN;
  END IF;

  v_full_year := CASE
    WHEN LENGTH(p_year) = 2 THEN 2000 + p_year::INTEGER
    ELSE p_year::INTEGER
  END;

  v_month_start := (v_full_year::TEXT || '-' || v_month_num || '-01')::DATE;
  v_month_end := (DATE_TRUNC('MONTH', v_month_start) + INTERVAL '1 MONTH' - INTERVAL '1 DAY')::DATE;

  -- Update forecast_data.commercial_input with cc.sm_kam_override
  RETURN QUERY
  WITH filtered_products AS (
    SELECT product_id
    FROM m8_schema.products
    WHERE (p_marca_names IS NULL OR subcategory_name = ANY(p_marca_names))
      AND (p_product_lines IS NULL OR class_name = ANY(p_product_lines))
  ),
  filtered_nodes AS (
    SELECT id AS location_node_id, client_hierarchy, channel, agente, udn
    FROM m8_schema.supply_network_nodes
    WHERE (p_client_hierarchy IS NULL OR client_hierarchy = ANY(p_client_hierarchy))
      AND (p_channel IS NULL OR channel = ANY(p_channel))
      AND (p_agente IS NULL OR agente = ANY(p_agente))
      AND (p_udn IS NULL OR udn = ANY(p_udn))
  ),
  filtered_cc AS (
    SELECT cc.*
    FROM m8_schema.commercial_collaboration cc
    JOIN filtered_products fp ON cc.product_id = fp.product_id
    JOIN filtered_nodes fn ON cc.location_id = fn.location_node_id::text
    WHERE cc.postdate >= v_month_start AND cc.postdate <= v_month_end
  ),
  matched_forecast AS (
    SELECT
      fd.product_id,
      fd.location_node_id,
      fd.customer_node_id,
      fd.postdate,
      cc.sm_kam_override
    FROM m8_schema.forecast_data fd
    JOIN filtered_cc cc
      ON fd.product_id = cc.product_id
     AND fd.location_node_id = cc.location_id::uuid
     AND fd.customer_node_id = cc.customer_id::uuid
     AND fd.postdate = cc.postdate
  ),
  updated AS (
    UPDATE m8_schema.forecast_data fd
    SET commercial_input = mf.sm_kam_override
    FROM matched_forecast mf
    WHERE fd.product_id = mf.product_id
      AND fd.location_node_id = mf.location_node_id
      AND fd.customer_node_id = mf.customer_node_id
      AND fd.postdate = mf.postdate
    RETURNING 1
  )
  SELECT COUNT(*)::INTEGER AS updated_count, 'Updated forecast_data.commercial_input from commercial_collaboration.sm_kam_override' AS message FROM updated;
END;
$$ LANGUAGE plpgsql;