-- PHASE 1C: Final RLS Implementation - Excluding Views
-- Enable RLS on remaining tables (excluding views)

-- Create safe role checking functions with proper search_path
CREATE OR REPLACE FUNCTION public.get_current_user_role()
RETURNS TEXT AS $$
  SELECT ur.role::text
  FROM public.user_roles ur
  WHERE ur.user_id = auth.uid()
  LIMIT 1;
$$ LANGUAGE SQL SECURITY DEFINER STABLE SET search_path = '';

CREATE OR REPLACE FUNCTION public.has_role(_role text)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 
    FROM public.user_roles ur
    WHERE ur.user_id = auth.uid() 
    AND ur.role::text = _role
  );
$$ LANGUAGE SQL SECURITY DEFINER STABLE SET search_path = '';

-- Enable RLS on remaining tables (excluding views like forecast_results_with_outlier_impact)
ALTER TABLE public.alembic_version ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.annotation_layer ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_impact_analysis ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.forecast_lag_analysis ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.purchase_order_lines ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.purchase_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scenarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.seasonal_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vendor_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vendor_lead_times ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.warehouses ENABLE ROW LEVEL SECURITY;

-- Create policies for alembic_version (admin only)
CREATE POLICY "Only administrators can access alembic_version" 
ON public.alembic_version 
FOR ALL 
USING (public.has_role('administrator'))
WITH CHECK (public.has_role('administrator'));

-- Create policies for annotation_layer
CREATE POLICY "Authenticated users can view annotation_layer" 
ON public.annotation_layer 
FOR SELECT 
USING (auth.role() = 'authenticated');

CREATE POLICY "Administrators can manage annotation_layer" 
ON public.annotation_layer 
FOR ALL 
USING (public.has_role('administrator'))
WITH CHECK (public.has_role('administrator'));

-- Create policies for event_impact_analysis
CREATE POLICY "Authenticated users can view event_impact_analysis" 
ON public.event_impact_analysis 
FOR SELECT 
USING (auth.role() = 'authenticated');

CREATE POLICY "Administrators can manage event_impact_analysis" 
ON public.event_impact_analysis 
FOR ALL 
USING (public.has_role('administrator'))
WITH CHECK (public.has_role('administrator'));

-- Create policies for forecast_lag_analysis
CREATE POLICY "Authenticated users can view forecast_lag_analysis" 
ON public.forecast_lag_analysis 
FOR SELECT 
USING (auth.role() = 'authenticated');

CREATE POLICY "Administrators can manage forecast_lag_analysis" 
ON public.forecast_lag_analysis 
FOR ALL 
USING (public.has_role('administrator'))
WITH CHECK (public.has_role('administrator'));

-- Create policies for purchase_order_lines
CREATE POLICY "Authenticated users can view purchase_order_lines" 
ON public.purchase_order_lines 
FOR SELECT 
USING (auth.role() = 'authenticated');

CREATE POLICY "Administrators can manage purchase_order_lines" 
ON public.purchase_order_lines 
FOR ALL 
USING (public.has_role('administrator'))
WITH CHECK (public.has_role('administrator'));

-- Create policies for purchase_orders
CREATE POLICY "Authenticated users can view purchase_orders" 
ON public.purchase_orders 
FOR SELECT 
USING (auth.role() = 'authenticated');

CREATE POLICY "Administrators can manage purchase_orders" 
ON public.purchase_orders 
FOR ALL 
USING (public.has_role('administrator'))
WITH CHECK (public.has_role('administrator'));

-- Create policies for sales_history
CREATE POLICY "Authenticated users can view sales_history" 
ON public.sales_history 
FOR SELECT 
USING (auth.role() = 'authenticated');

CREATE POLICY "Administrators can manage sales_history" 
ON public.sales_history 
FOR ALL 
USING (public.has_role('administrator'))
WITH CHECK (public.has_role('administrator'));

-- Create policies for scenarios
CREATE POLICY "Authenticated users can view scenarios" 
ON public.scenarios 
FOR SELECT 
USING (auth.role() = 'authenticated');

CREATE POLICY "Administrators can manage scenarios" 
ON public.scenarios 
FOR ALL 
USING (public.has_role('administrator'))
WITH CHECK (public.has_role('administrator'));

-- Create policies for seasonal_profiles
CREATE POLICY "Authenticated users can view seasonal_profiles" 
ON public.seasonal_profiles 
FOR SELECT 
USING (auth.role() = 'authenticated');

CREATE POLICY "Administrators can manage seasonal_profiles" 
ON public.seasonal_profiles 
FOR ALL 
USING (public.has_role('administrator'))
WITH CHECK (public.has_role('administrator'));

-- Create policies for user_preferences
CREATE POLICY "Users can manage their own preferences" 
ON public.user_preferences 
FOR ALL 
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Create policies for user_profiles  
CREATE POLICY "Users can view their own profile" 
ON public.user_profiles 
FOR SELECT 
USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile" 
ON public.user_profiles 
FOR UPDATE 
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

CREATE POLICY "Administrators can view all profiles" 
ON public.user_profiles 
FOR SELECT 
USING (public.has_role('administrator'));

-- Create policies for vendor_assignments
CREATE POLICY "Authenticated users can view vendor_assignments" 
ON public.vendor_assignments 
FOR SELECT 
USING (auth.role() = 'authenticated');

CREATE POLICY "Administrators can manage vendor_assignments" 
ON public.vendor_assignments 
FOR ALL 
USING (public.has_role('administrator'))
WITH CHECK (public.has_role('administrator'));

-- Create policies for vendor_lead_times
CREATE POLICY "Authenticated users can view vendor_lead_times" 
ON public.vendor_lead_times 
FOR SELECT 
USING (auth.role() = 'authenticated');

CREATE POLICY "Administrators can manage vendor_lead_times" 
ON public.vendor_lead_times 
FOR ALL 
USING (public.has_role('administrator'))
WITH CHECK (public.has_role('administrator'));

-- Create policies for warehouses
CREATE POLICY "Authenticated users can view warehouses" 
ON public.warehouses 
FOR SELECT 
USING (auth.role() = 'authenticated');

CREATE POLICY "Administrators can manage warehouses" 
ON public.warehouses 
FOR ALL 
USING (public.has_role('administrator'))
WITH CHECK (public.has_role('administrator'));

-- Fix search_path for existing functions to comply with security best practices
CREATE OR REPLACE FUNCTION public.update_purchase_order_suggestions_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $function$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $function$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.update_modified_column()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $function$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.update_inventory_projections_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $function$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.update_safety_stock_parameters_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $function$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$function$;