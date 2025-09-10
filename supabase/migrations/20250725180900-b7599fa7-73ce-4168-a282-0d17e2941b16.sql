-- Create sell_in_data table
CREATE TABLE IF NOT EXISTS public.sell_in_data (
    id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    product_id text NOT NULL,
    location_node_id text NOT NULL,
    channel_partner_id uuid REFERENCES channel_partners(id),
    transaction_date date NOT NULL,
    quantity numeric NOT NULL DEFAULT 0,
    unit_price numeric NOT NULL DEFAULT 0,
    total_value numeric NOT NULL DEFAULT 0,
    invoice_number text,
    payment_terms text,
    discount_percentage numeric DEFAULT 0,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

-- Create sell_out_data table
CREATE TABLE IF NOT EXISTS public.sell_out_data (
    id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    product_id text NOT NULL,
    location_node_id text NOT NULL,
    channel_partner_id uuid REFERENCES channel_partners(id),
    transaction_date date NOT NULL,
    quantity numeric NOT NULL DEFAULT 0,
    unit_price numeric NOT NULL DEFAULT 0,
    total_value numeric NOT NULL DEFAULT 0,
    end_customer_node_id text,
    inventory_on_hand numeric DEFAULT 0,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

-- Create sell_through_rates table
CREATE TABLE IF NOT EXISTS public.sell_through_rates (
    id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    product_id text NOT NULL,
    location_node_id text NOT NULL,
    channel_partner_id uuid REFERENCES channel_partners(id),
    calculation_period date NOT NULL,
    period_type text NOT NULL DEFAULT 'monthly',
    sell_through_rate numeric NOT NULL DEFAULT 0,
    days_of_inventory numeric DEFAULT 0,
    performance_category text DEFAULT 'medium',
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    UNIQUE(product_id, location_node_id, channel_partner_id, calculation_period)
);

-- Enable RLS on all new tables
ALTER TABLE public.sell_in_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sell_out_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sell_through_rates ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for sell_in_data
CREATE POLICY "Users can view sell-in data" ON public.sell_in_data FOR SELECT USING (true);
CREATE POLICY "Users can insert sell-in data" ON public.sell_in_data FOR INSERT WITH CHECK (true);
CREATE POLICY "Users can update sell-in data" ON public.sell_in_data FOR UPDATE USING (true);

-- Create RLS policies for sell_out_data
CREATE POLICY "Users can view sell-out data" ON public.sell_out_data FOR SELECT USING (true);
CREATE POLICY "Users can insert sell-out data" ON public.sell_out_data FOR INSERT WITH CHECK (true);
CREATE POLICY "Users can update sell-out data" ON public.sell_out_data FOR UPDATE USING (true);

-- Create RLS policies for sell_through_rates
CREATE POLICY "Users can view sell-through rates" ON public.sell_through_rates FOR SELECT USING (true);
CREATE POLICY "Users can insert sell-through rates" ON public.sell_through_rates FOR INSERT WITH CHECK (true);
CREATE POLICY "Users can update sell-through rates" ON public.sell_through_rates FOR UPDATE USING (true);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_sell_in_data_product_date ON public.sell_in_data(product_id, transaction_date);
CREATE INDEX IF NOT EXISTS idx_sell_in_data_partner ON public.sell_in_data(channel_partner_id);
CREATE INDEX IF NOT EXISTS idx_sell_out_data_product_date ON public.sell_out_data(product_id, transaction_date);
CREATE INDEX IF NOT EXISTS idx_sell_out_data_partner ON public.sell_out_data(channel_partner_id);
CREATE INDEX IF NOT EXISTS idx_sell_through_rates_period ON public.sell_through_rates(calculation_period);

-- Add triggers for updated_at
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