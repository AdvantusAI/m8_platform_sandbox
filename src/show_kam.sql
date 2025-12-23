CREATE OR REPLACE FUNCTION m8_schema.get_kam_a1_total_flexible(
  p_month_abbr TEXT,
  p_year TEXT,
  p_marca_names TEXT[] DEFAULT NULL,
  p_product_lines TEXT[] DEFAULT NULL,
  p_class_names TEXT[] DEFAULT NULL,
  p_subclass_names TEXT[] DEFAULT NULL,
  p_client_hierarchy TEXT[] DEFAULT NULL,
  p_channel TEXT[] DEFAULT NULL,
  p_agente TEXT[] DEFAULT NULL,
  p_udn TEXT[] DEFAULT NULL
)
RETURNS NUMERIC AS $$
DECLARE
  v_month_start DATE;
  v_month_end DATE;
  v_month_num TEXT;
  v_full_year INTEGER;
  v_total NUMERIC := 0;
BEGIN
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
    RETURN 0;
  END IF;

  v_full_year := CASE
    WHEN LENGTH(p_year) = 2 THEN 2000 + p_year::INTEGER
    ELSE p_year::INTEGER
  END;

  v_month_start := (v_full_year::TEXT || '-' || v_month_num || '-01')::DATE;
  v_month_end := (DATE_TRUNC('MONTH', v_month_start) + INTERVAL '1 MONTH' - INTERVAL '1 DAY')::DATE;

  SELECT COALESCE(SUM(cc.sm_kam_override), 0)
    INTO v_total
    FROM m8_schema.commercial_collaboration cc
    JOIN m8_schema.products p ON cc.product_id = p.product_id
    LEFT JOIN m8_schema.supply_network_nodes sn ON cc.location_node_id = sn.id
   WHERE cc.postdate >= v_month_start
     AND cc.postdate <= v_month_end
     AND cc.sm_kam_override IS NOT NULL
     AND (p_marca_names IS NULL OR p.subcategory_name = ANY(p_marca_names))
     AND (p_product_lines IS NULL OR p.class_name = ANY(p_product_lines))
    --  AND (p_class_names IS NULL OR p.class_name = ANY(p_class_names))
    --  AND (p_subclass_names IS NULL OR p.subclass_name = ANY(p_subclass_names))
    --  AND (p_client_hierarchy IS NULL OR sn.client_hierarchy = ANY(p_client_hierarchy))
    --  AND (p_channel IS NULL OR sn.channel = ANY(p_channel))
    --  AND (p_agente IS NULL OR sn.agente = ANY(p_agente))
    --  AND (p_udn IS NULL OR sn.udn = ANY(p_udn));

  RETURN v_total;
END;
$$ LANGUAGE plpgsql;
