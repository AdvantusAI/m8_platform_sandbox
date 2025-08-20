-- Create user_product_assignments table
CREATE TABLE public.user_product_assignments (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  customer_id text NOT NULL,
  product_id text NOT NULL,
  assignment_type text DEFAULT 'standard'::text,
  start_date date DEFAULT CURRENT_DATE,
  end_date date,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  UNIQUE(user_id, customer_id, product_id)
);

-- Enable RLS
ALTER TABLE public.user_product_assignments ENABLE ROW LEVEL SECURITY;

-- RLS Policies for user_product_assignments
CREATE POLICY "Admins can manage all product assignments"
ON public.user_product_assignments
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles ur 
    WHERE ur.user_id = auth.uid() AND ur.role = 'administrator'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.user_roles ur 
    WHERE ur.user_id = auth.uid() AND ur.role = 'administrator'
  )
);

CREATE POLICY "Users can view their own product assignments"
ON public.user_product_assignments
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Update customer_assignments policies for admin management
CREATE POLICY "Admins can manage all customer assignments"
ON public.customer_assignments
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles ur 
    WHERE ur.user_id = auth.uid() AND ur.role = 'administrator'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.user_roles ur 
    WHERE ur.user_id = auth.uid() AND ur.role = 'administrator'
  )
);

-- Trigger for updated_at
CREATE TRIGGER update_user_product_assignments_updated_at
BEFORE UPDATE ON public.user_product_assignments
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();