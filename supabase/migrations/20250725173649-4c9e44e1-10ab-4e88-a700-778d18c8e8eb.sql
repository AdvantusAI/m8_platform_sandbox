-- Create channel partners table
CREATE TABLE public.channel_partners (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  partner_code text NOT NULL UNIQUE,
  partner_name text NOT NULL,
  partner_type text NOT NULL CHECK (partner_type IN ('distributor', 'retailer', 'wholesaler', 'e_commerce', 'direct')),
  region text,
  country text,
  contact_information jsonb DEFAULT '{}',
  performance_metrics jsonb DEFAULT '{}',
  status text DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'suspended')),
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Create sell-in data table (manufacturer to channel partner)
CREATE TABLE public.sell_in_data (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  product_id text NOT NULL,
  location_id text NOT NULL,
  channel_partner_id uuid REFERENCES public.channel_partners(id),
  transaction_date date NOT NULL,
  quantity numeric NOT NULL DEFAULT 0,
  unit_price numeric DEFAULT 0,
  total_value numeric DEFAULT 0,
  order_number text,
  shipment_method text,
  lead_time_days integer,
  promotional_activity boolean DEFAULT false,
  promotion_type text,
  discount_percentage numeric DEFAULT 0,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Create sell-out data table (channel partner to end customer - POS data)
CREATE TABLE public.sell_out_data (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  product_id text NOT NULL,
  location_id text NOT NULL,
  channel_partner_id uuid REFERENCES public.channel_partners(id),
  transaction_date date NOT NULL,
  quantity numeric NOT NULL DEFAULT 0,
  unit_price numeric DEFAULT 0,
  total_value numeric DEFAULT 0,
  pos_system_id text,
  store_id text,
  customer_segment text,
  promotional_activity boolean DEFAULT false,
  promotion_type text,
  discount_percentage numeric DEFAULT 0,
  inventory_on_hand numeric DEFAULT 0,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Create sell-through rates calculation table
CREATE TABLE public.sell_through_rates (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  product_id text NOT NULL,
  location_id text NOT NULL,
  channel_partner_id uuid REFERENCES public.channel_partners(id),
  calculation_period date NOT NULL,
  period_type text NOT NULL DEFAULT 'monthly' CHECK (period_type IN ('weekly', 'monthly', 'quarterly')),
  sell_in_quantity numeric NOT NULL DEFAULT 0,
  sell_out_quantity numeric NOT NULL DEFAULT 0,
  sell_through_rate numeric NOT NULL DEFAULT 0,
  inventory_turn_rate numeric DEFAULT 0,
  days_of_inventory numeric DEFAULT 0,
  velocity_trend text CHECK (velocity_trend IN ('increasing', 'stable', 'decreasing')),
  performance_category text CHECK (performance_category IN ('high', 'medium', 'low', 'critical')),
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Create forecast reconciliation table
CREATE TABLE public.forecast_reconciliation (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  product_id text NOT NULL,
  location_id text NOT NULL,
  channel_partner_id uuid REFERENCES public.channel_partners(id),
  forecast_period date NOT NULL,
  sell_in_forecast numeric NOT NULL DEFAULT 0,
  sell_out_forecast numeric NOT NULL DEFAULT 0,
  actual_sell_in numeric DEFAULT 0,
  actual_sell_out numeric DEFAULT 0,
  sell_in_variance numeric DEFAULT 0,
  sell_out_variance numeric DEFAULT 0,
  sell_in_accuracy_percentage numeric DEFAULT 0,
  sell_out_accuracy_percentage numeric DEFAULT 0,
  reconciliation_status text DEFAULT 'pending' CHECK (reconciliation_status IN ('pending', 'reviewed', 'approved', 'rejected')),
  gap_analysis jsonb DEFAULT '{}',
  action_items text[],
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Add sell-in/sell-out columns to existing forecast_data table
ALTER TABLE public.forecast_data 
ADD COLUMN sell_in_forecast numeric DEFAULT 0,
ADD COLUMN sell_out_forecast numeric DEFAULT 0,
ADD COLUMN channel_partner_id uuid REFERENCES public.channel_partners(id),
ADD COLUMN forecast_reconciliation_id uuid REFERENCES public.forecast_reconciliation(id);

-- Create indexes for performance
CREATE INDEX idx_sell_in_data_product_location_date ON public.sell_in_data(product_id, location_id, transaction_date);
CREATE INDEX idx_sell_in_data_channel_partner ON public.sell_in_data(channel_partner_id, transaction_date);
CREATE INDEX idx_sell_out_data_product_location_date ON public.sell_out_data(product_id, location_id, transaction_date);
CREATE INDEX idx_sell_out_data_channel_partner ON public.sell_out_data(channel_partner_id, transaction_date);
CREATE INDEX idx_sell_through_rates_period ON public.sell_through_rates(product_id, location_id, calculation_period);
CREATE INDEX idx_forecast_reconciliation_period ON public.forecast_reconciliation(product_id, location_id, forecast_period);

-- Create function to calculate sell-through rate
CREATE OR REPLACE FUNCTION public.calculate_sell_through_rate(
  p_product_id text,
  p_location_id text,
  p_channel_partner_id uuid,
  p_period_start date,
  p_period_end date
) RETURNS numeric
LANGUAGE plpgsql
AS $$
DECLARE
  total_sell_in numeric := 0;
  total_sell_out numeric := 0;
  sell_through_rate numeric := 0;
BEGIN
  -- Calculate total sell-in for the period
  SELECT COALESCE(SUM(quantity), 0)
  INTO total_sell_in
  FROM public.sell_in_data
  WHERE product_id = p_product_id
    AND location_id = p_location_id
    AND channel_partner_id = p_channel_partner_id
    AND transaction_date BETWEEN p_period_start AND p_period_end;

  -- Calculate total sell-out for the period
  SELECT COALESCE(SUM(quantity), 0)
  INTO total_sell_out
  FROM public.sell_out_data
  WHERE product_id = p_product_id
    AND location_id = p_location_id
    AND channel_partner_id = p_channel_partner_id
    AND transaction_date BETWEEN p_period_start AND p_period_end;

  -- Calculate sell-through rate (avoid division by zero)
  IF total_sell_in > 0 THEN
    sell_through_rate := (total_sell_out / total_sell_in) * 100;
  ELSE
    sell_through_rate := 0;
  END IF;

  RETURN sell_through_rate;
END;
$$;

-- Create function to refresh sell-through rates
CREATE OR REPLACE FUNCTION public.refresh_sell_through_rates(
  p_period_start date DEFAULT (CURRENT_DATE - INTERVAL '3 months'),
  p_period_end date DEFAULT CURRENT_DATE
) RETURNS boolean
LANGUAGE plpgsql
AS $$
DECLARE
  rec RECORD;
  period_date date;
  sell_through_rate numeric;
  inventory_days numeric;
BEGIN
  -- Delete existing data for the refresh period
  DELETE FROM public.sell_through_rates
  WHERE calculation_period BETWEEN p_period_start AND p_period_end;

  -- Calculate monthly sell-through rates
  FOR rec IN (
    SELECT DISTINCT 
      si.product_id,
      si.location_id,
      si.channel_partner_id
    FROM public.sell_in_data si
    WHERE si.transaction_date BETWEEN p_period_start AND p_period_end
  ) LOOP
    -- Generate monthly periods
    period_date := date_trunc('month', p_period_start);
    
    WHILE period_date <= p_period_end LOOP
      -- Calculate sell-through rate for this period
      sell_through_rate := public.calculate_sell_through_rate(
        rec.product_id,
        rec.location_id,
        rec.channel_partner_id,
        period_date,
        (period_date + INTERVAL '1 month' - INTERVAL '1 day')::date
      );

      -- Calculate days of inventory (simplified)
      SELECT COALESCE(AVG(inventory_on_hand), 0) / NULLIF(AVG(quantity), 0)
      INTO inventory_days
      FROM public.sell_out_data
      WHERE product_id = rec.product_id
        AND location_id = rec.location_id
        AND channel_partner_id = rec.channel_partner_id
        AND transaction_date BETWEEN period_date AND (period_date + INTERVAL '1 month' - INTERVAL '1 day')::date;

      -- Insert calculated metrics
      INSERT INTO public.sell_through_rates (
        product_id,
        location_id,
        channel_partner_id,
        calculation_period,
        period_type,
        sell_through_rate,
        days_of_inventory,
        performance_category
      ) VALUES (
        rec.product_id,
        rec.location_id,
        rec.channel_partner_id,
        period_date,
        'monthly',
        sell_through_rate,
        COALESCE(inventory_days, 0),
        CASE 
          WHEN sell_through_rate >= 90 THEN 'high'
          WHEN sell_through_rate >= 70 THEN 'medium'
          WHEN sell_through_rate >= 50 THEN 'low'
          ELSE 'critical'
        END
      );

      period_date := period_date + INTERVAL '1 month';
    END LOOP;
  END LOOP;

  RETURN true;
END;
$$;

-- Create function for forecast reconciliation
CREATE OR REPLACE FUNCTION public.reconcile_forecasts(
  p_product_id text,
  p_location_id text,
  p_forecast_period date
) RETURNS uuid
LANGUAGE plpgsql
AS $$
DECLARE
  reconciliation_id uuid;
  sell_in_actual numeric := 0;
  sell_out_actual numeric := 0;
  sell_in_forecast numeric := 0;
  sell_out_forecast numeric := 0;
  gap_analysis jsonb;
BEGIN
  -- Get actual sell-in data
  SELECT COALESCE(SUM(quantity), 0)
  INTO sell_in_actual
  FROM public.sell_in_data
  WHERE product_id = p_product_id
    AND location_id = p_location_id
    AND date_trunc('month', transaction_date) = date_trunc('month', p_forecast_period);

  -- Get actual sell-out data
  SELECT COALESCE(SUM(quantity), 0)
  INTO sell_out_actual
  FROM public.sell_out_data
  WHERE product_id = p_product_id
    AND location_id = p_location_id
    AND date_trunc('month', transaction_date) = date_trunc('month', p_forecast_period);

  -- Get forecast data
  SELECT 
    COALESCE(sell_in_forecast, 0),
    COALESCE(sell_out_forecast, 0)
  INTO sell_in_forecast, sell_out_forecast
  FROM public.forecast_data
  WHERE product_id = p_product_id
    AND location_id = p_location_id
    AND postdate = p_forecast_period
  LIMIT 1;

  -- Create gap analysis
  gap_analysis := jsonb_build_object(
    'sell_in_gap', sell_in_actual - sell_in_forecast,
    'sell_out_gap', sell_out_actual - sell_out_forecast,
    'sell_through_actual', CASE WHEN sell_in_actual > 0 THEN (sell_out_actual / sell_in_actual * 100) ELSE 0 END,
    'sell_through_forecast', CASE WHEN sell_in_forecast > 0 THEN (sell_out_forecast / sell_in_forecast * 100) ELSE 0 END
  );

  -- Insert reconciliation record
  INSERT INTO public.forecast_reconciliation (
    product_id,
    location_id,
    forecast_period,
    sell_in_forecast,
    sell_out_forecast,
    actual_sell_in,
    actual_sell_out,
    sell_in_variance,
    sell_out_variance,
    sell_in_accuracy_percentage,
    sell_out_accuracy_percentage,
    gap_analysis
  ) VALUES (
    p_product_id,
    p_location_id,
    p_forecast_period,
    sell_in_forecast,
    sell_out_forecast,
    sell_in_actual,
    sell_out_actual,
    sell_in_actual - sell_in_forecast,
    sell_out_actual - sell_out_forecast,
    CASE WHEN sell_in_forecast > 0 THEN (1 - ABS(sell_in_actual - sell_in_forecast) / sell_in_forecast) * 100 ELSE 0 END,
    CASE WHEN sell_out_forecast > 0 THEN (1 - ABS(sell_out_actual - sell_out_forecast) / sell_out_forecast) * 100 ELSE 0 END,
    gap_analysis
  ) RETURNING id INTO reconciliation_id;

  RETURN reconciliation_id;
END;
$$;

-- Create triggers for updated_at columns
CREATE TRIGGER update_channel_partners_updated_at
  BEFORE UPDATE ON public.channel_partners
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_sell_in_data_updated_at
  BEFORE UPDATE ON public.sell_in_data
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_sell_out_data_updated_at
  BEFORE UPDATE ON public.sell_out_data
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_sell_through_rates_updated_at
  BEFORE UPDATE ON public.sell_through_rates
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_forecast_reconciliation_updated_at
  BEFORE UPDATE ON public.forecast_reconciliation
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Enable RLS on new tables
ALTER TABLE public.channel_partners ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sell_in_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sell_out_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sell_through_rates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.forecast_reconciliation ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view channel partners" ON public.channel_partners FOR SELECT USING (true);
CREATE POLICY "Users can view sell-in data" ON public.sell_in_data FOR SELECT USING (true);
CREATE POLICY "Users can view sell-out data" ON public.sell_out_data FOR SELECT USING (true);
CREATE POLICY "Users can view sell-through rates" ON public.sell_through_rates FOR SELECT USING (true);
CREATE POLICY "Users can view forecast reconciliation" ON public.forecast_reconciliation FOR SELECT USING (true);

CREATE POLICY "Users can insert sell-in data" ON public.sell_in_data FOR INSERT WITH CHECK (true);
CREATE POLICY "Users can insert sell-out data" ON public.sell_out_data FOR INSERT WITH CHECK (true);
CREATE POLICY "Users can insert reconciliation data" ON public.forecast_reconciliation FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can update reconciliation data" ON public.forecast_reconciliation FOR UPDATE USING (true);