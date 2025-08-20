-- PHASE 1: EMERGENCY RLS IMPLEMENTATION
-- Critical security fixes to prevent privilege escalation and data breaches

-- 1. Create security definer function for safe role checking (prevents RLS recursion)
CREATE OR REPLACE FUNCTION public.get_current_user_role()
RETURNS TEXT AS $$
  SELECT ur.role::text
  FROM public.user_roles ur
  WHERE ur.user_id = auth.uid()
  LIMIT 1;
$$ LANGUAGE SQL SECURITY DEFINER STABLE;

-- 2. Create function to check if user has specific role
CREATE OR REPLACE FUNCTION public.has_role(_role text)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 
    FROM public.user_roles ur
    WHERE ur.user_id = auth.uid() 
    AND ur.role::text = _role
  );
$$ LANGUAGE SQL SECURITY DEFINER STABLE;

-- 3. Enable RLS on user_roles table (CRITICAL - prevents privilege escalation)
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Create policies for user_roles table
CREATE POLICY "Users can view their own role" 
ON public.user_roles 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Only administrators can manage user roles" 
ON public.user_roles 
FOR ALL 
USING (public.has_role('administrator'))
WITH CHECK (public.has_role('administrator'));

-- 4. Enable RLS on critical business data tables
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vendors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stock_status ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.current_inventory ENABLE ROW LEVEL SECURITY;

-- 5. Create basic policies for business data (authenticated users can access)
-- Products policies
CREATE POLICY "Authenticated users can view products" 
ON public.products 
FOR SELECT 
USING (auth.role() = 'authenticated');

CREATE POLICY "Administrators can manage products" 
ON public.products 
FOR ALL 
USING (public.has_role('administrator'))
WITH CHECK (public.has_role('administrator'));

-- Customers policies  
CREATE POLICY "Authenticated users can view customers" 
ON public.customers 
FOR SELECT 
USING (auth.role() = 'authenticated');

CREATE POLICY "Administrators can manage customers" 
ON public.customers 
FOR ALL 
USING (public.has_role('administrator'))
WITH CHECK (public.has_role('administrator'));

-- Vendors policies
CREATE POLICY "Authenticated users can view vendors" 
ON public.vendors 
FOR SELECT 
USING (auth.role() = 'authenticated');

CREATE POLICY "Administrators can manage vendors" 
ON public.vendors 
FOR ALL 
USING (public.has_role('administrator'))
WITH CHECK (public.has_role('administrator'));

-- Locations policies
CREATE POLICY "Authenticated users can view locations" 
ON public.locations 
FOR SELECT 
USING (auth.role() = 'authenticated');

CREATE POLICY "Administrators can manage locations" 
ON public.locations 
FOR ALL 
USING (public.has_role('administrator'))
WITH CHECK (public.has_role('administrator'));

-- Stock status policies
CREATE POLICY "Authenticated users can view stock status" 
ON public.stock_status 
FOR SELECT 
USING (auth.role() = 'authenticated');

CREATE POLICY "Administrators can manage stock status" 
ON public.stock_status 
FOR ALL 
USING (public.has_role('administrator'))
WITH CHECK (public.has_role('administrator'));

-- Current inventory policies
CREATE POLICY "Authenticated users can view current inventory" 
ON public.current_inventory 
FOR SELECT 
USING (auth.role() = 'authenticated');

CREATE POLICY "Administrators can manage current inventory" 
ON public.current_inventory 
FOR ALL 
USING (public.has_role('administrator'))
WITH CHECK (public.has_role('administrator'));

-- 6. Enable RLS on sensitive forecast and demand tables
ALTER TABLE public.demand_forecasts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.demand_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.demand_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.demand_outliers ENABLE ROW LEVEL SECURITY;

-- Demand forecasts policies
CREATE POLICY "Authenticated users can view demand forecasts" 
ON public.demand_forecasts 
FOR SELECT 
USING (auth.role() = 'authenticated');

CREATE POLICY "Administrators can manage demand forecasts" 
ON public.demand_forecasts 
FOR ALL 
USING (public.has_role('administrator'))
WITH CHECK (public.has_role('administrator'));

-- Demand history policies
CREATE POLICY "Authenticated users can view demand history" 
ON public.demand_history 
FOR SELECT 
USING (auth.role() = 'authenticated');

CREATE POLICY "Administrators can manage demand history" 
ON public.demand_history 
FOR ALL 
USING (public.has_role('administrator'))
WITH CHECK (public.has_role('administrator'));

-- Demand events policies
CREATE POLICY "Authenticated users can view demand events" 
ON public.demand_events 
FOR SELECT 
USING (auth.role() = 'authenticated');

CREATE POLICY "Administrators can manage demand events" 
ON public.demand_events 
FOR ALL 
USING (public.has_role('administrator'))
WITH CHECK (public.has_role('administrator'));

-- Demand outliers policies
CREATE POLICY "Authenticated users can view demand outliers" 
ON public.demand_outliers 
FOR SELECT 
USING (auth.role() = 'authenticated');

CREATE POLICY "Administrators can manage demand outliers" 
ON public.demand_outliers 
FOR ALL 
USING (public.has_role('administrator'))
WITH CHECK (public.has_role('administrator'));

-- 7. Enable RLS on remaining critical tables
ALTER TABLE public.forecast_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.forecast_error_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.forecast_interpretability ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.feature_importance ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.history ENABLE ROW LEVEL SECURITY;

-- Forecast results policies
CREATE POLICY "Authenticated users can view forecast results" 
ON public.forecast_results 
FOR SELECT 
USING (auth.role() = 'authenticated');

CREATE POLICY "Administrators can manage forecast results" 
ON public.forecast_results 
FOR ALL 
USING (public.has_role('administrator'))
WITH CHECK (public.has_role('administrator'));

-- Forecast error metrics policies
CREATE POLICY "Authenticated users can view forecast error metrics" 
ON public.forecast_error_metrics 
FOR SELECT 
USING (auth.role() = 'authenticated');

CREATE POLICY "Administrators can manage forecast error metrics" 
ON public.forecast_error_metrics 
FOR ALL 
USING (public.has_role('administrator'))
WITH CHECK (public.has_role('administrator'));

-- Forecast interpretability policies
CREATE POLICY "Authenticated users can view forecast interpretability" 
ON public.forecast_interpretability 
FOR SELECT 
USING (auth.role() = 'authenticated');

CREATE POLICY "Administrators can manage forecast interpretability" 
ON public.forecast_interpretability 
FOR ALL 
USING (public.has_role('administrator'))
WITH CHECK (public.has_role('administrator'));

-- Feature importance policies
CREATE POLICY "Authenticated users can view feature importance" 
ON public.feature_importance 
FOR SELECT 
USING (auth.role() = 'authenticated');

CREATE POLICY "Administrators can manage feature importance" 
ON public.feature_importance 
FOR ALL 
USING (public.has_role('administrator'))
WITH CHECK (public.has_role('administrator'));

-- History policies
CREATE POLICY "Authenticated users can view history" 
ON public.history 
FOR SELECT 
USING (auth.role() = 'authenticated');

CREATE POLICY "Administrators can manage history" 
ON public.history 
FOR ALL 
USING (public.has_role('administrator'))
WITH CHECK (public.has_role('administrator'));

-- 8. Enable RLS on operational tables
ALTER TABLE public.buyers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.purchase_order_suggestions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.purchase_order_calculations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.safety_stock_parameters ENABLE ROW LEVEL SECURITY;

-- Buyers policies
CREATE POLICY "Authenticated users can view buyers" 
ON public.buyers 
FOR SELECT 
USING (auth.role() = 'authenticated');

CREATE POLICY "Administrators can manage buyers" 
ON public.buyers 
FOR ALL 
USING (public.has_role('administrator'))
WITH CHECK (public.has_role('administrator'));

-- Companies policies (users can only see their own company data)
CREATE POLICY "Users can view their company data" 
ON public.companies 
FOR SELECT 
USING (auth.role() = 'authenticated');

CREATE POLICY "Administrators can manage companies" 
ON public.companies 
FOR ALL 
USING (public.has_role('administrator'))
WITH CHECK (public.has_role('administrator'));

-- Purchase order suggestions policies
CREATE POLICY "Authenticated users can view purchase order suggestions" 
ON public.purchase_order_suggestions 
FOR SELECT 
USING (auth.role() = 'authenticated');

CREATE POLICY "Administrators can manage purchase order suggestions" 
ON public.purchase_order_suggestions 
FOR ALL 
USING (public.has_role('administrator'))
WITH CHECK (public.has_role('administrator'));

-- Purchase order calculations policies
CREATE POLICY "Authenticated users can view purchase order calculations" 
ON public.purchase_order_calculations 
FOR SELECT 
USING (auth.role() = 'authenticated');

CREATE POLICY "Administrators can manage purchase order calculations" 
ON public.purchase_order_calculations 
FOR ALL 
USING (public.has_role('administrator'))
WITH CHECK (public.has_role('administrator'));

-- Safety stock parameters policies
CREATE POLICY "Authenticated users can view safety stock parameters" 
ON public.safety_stock_parameters 
FOR SELECT 
USING (auth.role() = 'authenticated');

CREATE POLICY "Administrators can manage safety stock parameters" 
ON public.safety_stock_parameters 
FOR ALL 
USING (public.has_role('administrator'))
WITH CHECK (public.has_role('administrator'));