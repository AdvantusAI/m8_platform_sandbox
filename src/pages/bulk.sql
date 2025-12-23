-- Additional PostgreSQL function to handle KAM adjustments for multiple customers
-- This function can update KAM values for all customers matching certain criteria


 drop function m8_schema.update_kam_adjustment_bulk
CREATE OR REPLACE FUNCTION m8_schema.update_kam_adjustment_bulk(
  p_month_abbr      text,
  p_year            text,
  p_kam_value       numeric,
  p_customer_ids    text[]    DEFAULT NULL, -- <-- ahora text[]
  p_product_ids     text[]    DEFAULT NULL, -- <-- ahora text[]
  p_marca_names     text[]    DEFAULT NULL,
  p_product_lines   text[]    DEFAULT NULL
)
RETURNS TABLE (
  success boolean,
  customers_count integer,
  records_count integer,
  message text,
  summary jsonb
)
LANGUAGE plpgsql
AS $func$
DECLARE
  v_month_start date;
  v_month_end date;
  v_month_num text;
  v_full_year integer;
  v_customers_count integer := 0;
  v_records_count integer := 0;
  v_value_per_record numeric;
  v_summary jsonb := '{}'::jsonb;
  v_error_msg text;
BEGIN
  -- Input validation
  IF p_month_abbr IS NULL OR p_year IS NULL OR p_kam_value IS NULL THEN
    RETURN QUERY SELECT false, 0, 0, 'Missing required parameters'::text, '{}'::jsonb;
    RETURN;
  END IF;

  -- Convert month abbreviation to month number
  v_month_num := CASE lower(p_month_abbr)
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
    RETURN QUERY SELECT false, 0, 0, 'Invalid month abbreviation'::text, '{}'::jsonb;
    RETURN;
  END IF;

  -- Convert year to full year
  v_full_year := CASE
    WHEN length(p_year) = 2 THEN 2000 + p_year::integer
    ELSE p_year::integer
  END;

  -- Create month range
  v_month_start := (v_full_year::text || '-' || v_month_num || '-01')::date;
  v_month_end := (date_trunc('month', v_month_start) + interval '1 month' - interval '1 day')::date;

  -- Count valid records and customers first
  WITH valid_combinations AS (
    SELECT DISTINCT
      cc.customer_id,
      cc.product_id,
      cc.location_id,
      cc.postdate
    FROM m8_schema.commercial_collaboration cc
  JOIN m8_schema.products p ON cc.product_id = p.product_id
  WHERE cc.postdate >= v_month_start
    AND cc.postdate <= v_month_end
    AND (p_customer_ids IS NULL OR cc.customer_id = ANY(p_customer_ids))
    AND (p_product_ids IS NULL OR cc.product_id = ANY(p_product_ids))
    AND (p_marca_names IS NULL OR p.subcategory_name = ANY(p_marca_names))
    AND (p_product_lines IS NULL OR p.class_name = ANY(p_product_lines))
  )
  
  SELECT
    COUNT(*)::int AS total_records,
    COUNT(DISTINCT customer_id)::int AS unique_customers
  INTO v_records_count, v_customers_count
  FROM valid_combinations;

  IF v_records_count = 0 THEN
    RETURN QUERY SELECT false, 0, 0, 'No valid records found for the specified criteria'::text, '{}'::jsonb;
    RETURN;
  END IF;

  -- Calculate value per record
  v_value_per_record := p_kam_value / v_records_count;

  -- Update all valid records with the calculated value
 -- ...existing code...
WITH valid_combinations AS (
  SELECT DISTINCT
    cc.customer_id,
    cc.product_id,
    cc.location_id,
    cc.postdate
  FROM m8_schema.commercial_collaboration cc
  JOIN m8_schema.products p ON cc.product_id = p.product_id
  WHERE cc.postdate >= v_month_start
    AND cc.postdate <= v_month_end
    AND (p_customer_ids IS NULL OR cc.customer_id = ANY(p_customer_ids))
    AND (p_product_ids IS NULL OR cc.product_id = ANY(p_product_ids))
    AND (p_marca_names IS NULL OR p.subcategory_name = ANY(p_marca_names))
    AND (p_product_lines IS NULL OR p.class_name = ANY(p_product_lines))

-- ...existing code...
  )
  UPDATE m8_schema.commercial_collaboration cc
  SET sm_kam_override = v_value_per_record,
      updated_at = now()
  FROM valid_combinations vc
  WHERE cc.customer_id = vc.customer_id
    AND cc.product_id = vc.product_id
    AND cc.location_id = vc.location_id
    AND cc.postdate = vc.postdate;

  -- Create summary
  v_summary := jsonb_build_object(
    'total_kam_value', p_kam_value,
    'value_per_record', v_value_per_record,
    'month_range', jsonb_build_object(
      'start', v_month_start,
      'end', v_month_end
    ),
    'filters_applied', jsonb_build_object(
      'product_ids_count', COALESCE(array_length(p_product_ids, 1), 0),
      'marca_names_count', COALESCE(array_length(p_marca_names, 1), 0),
      'product_lines_count', COALESCE(array_length(p_product_lines, 1), 0),
      'specific_customers_count', COALESCE(array_length(p_customer_ids, 1), 0)
    )
  );

  RETURN QUERY SELECT
    true,
    v_customers_count,
    v_records_count,
    'KAM adjustment updated successfully for multiple customers'::text,
    v_summary;

EXCEPTION
  WHEN others THEN
    GET STACKED DIAGNOSTICS v_error_msg = MESSAGE_TEXT;
    RETURN QUERY SELECT
      false,
      0,
      0,
      ('Error updating bulk KAM adjustment: ' || v_error_msg)::text,
      '{}'::jsonb;
END;
$func$;