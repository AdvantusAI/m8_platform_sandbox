-- PHASE 2: Secure Supply Network Tables and Add Sample Data

-- Enable RLS on all new supply network tables
ALTER TABLE public.supply_network_node_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.supply_network_relationship_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.supply_network_configurations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.supply_network_nodes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.supply_network_node_properties ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.supply_network_relationships ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.supply_network_relationship_properties ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.supply_network_analysis_cache ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for supply network tables
-- Node Types policies
CREATE POLICY "Authenticated users can view node types" 
ON public.supply_network_node_types 
FOR SELECT 
USING (auth.role() = 'authenticated');

CREATE POLICY "Administrators can manage node types" 
ON public.supply_network_node_types 
FOR ALL 
USING (public.has_role('administrator'))
WITH CHECK (public.has_role('administrator'));

-- Relationship Types policies
CREATE POLICY "Authenticated users can view relationship types" 
ON public.supply_network_relationship_types 
FOR SELECT 
USING (auth.role() = 'authenticated');

CREATE POLICY "Administrators can manage relationship types" 
ON public.supply_network_relationship_types 
FOR ALL 
USING (public.has_role('administrator'))
WITH CHECK (public.has_role('administrator'));

-- Network Configurations policies
CREATE POLICY "Authenticated users can view configurations" 
ON public.supply_network_configurations 
FOR SELECT 
USING (auth.role() = 'authenticated');

CREATE POLICY "Administrators can manage configurations" 
ON public.supply_network_configurations 
FOR ALL 
USING (public.has_role('administrator'))
WITH CHECK (public.has_role('administrator'));

-- Supply Network Nodes policies
CREATE POLICY "Authenticated users can view supply network nodes" 
ON public.supply_network_nodes 
FOR SELECT 
USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can create supply network nodes" 
ON public.supply_network_nodes 
FOR INSERT 
WITH CHECK (auth.role() = 'authenticated' AND auth.uid() = created_by);

CREATE POLICY "Users can update their own nodes" 
ON public.supply_network_nodes 
FOR UPDATE 
USING (auth.uid() = created_by OR public.has_role('administrator'))
WITH CHECK (auth.uid() = created_by OR public.has_role('administrator'));

CREATE POLICY "Administrators can delete supply network nodes" 
ON public.supply_network_nodes 
FOR DELETE 
USING (public.has_role('administrator'));

-- Node Properties policies
CREATE POLICY "Authenticated users can view node properties" 
ON public.supply_network_node_properties 
FOR SELECT 
USING (auth.role() = 'authenticated');

CREATE POLICY "Users can manage properties for their nodes" 
ON public.supply_network_node_properties 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM public.supply_network_nodes n 
    WHERE n.id = supply_network_node_properties.node_id 
    AND (n.created_by = auth.uid() OR public.has_role('administrator'))
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.supply_network_nodes n 
    WHERE n.id = supply_network_node_properties.node_id 
    AND (n.created_by = auth.uid() OR public.has_role('administrator'))
  )
);

-- Supply Network Relationships policies
CREATE POLICY "Authenticated users can view supply network relationships" 
ON public.supply_network_relationships 
FOR SELECT 
USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can create supply network relationships" 
ON public.supply_network_relationships 
FOR INSERT 
WITH CHECK (auth.role() = 'authenticated' AND auth.uid() = created_by);

CREATE POLICY "Users can update their own relationships" 
ON public.supply_network_relationships 
FOR UPDATE 
USING (auth.uid() = created_by OR public.has_role('administrator'))
WITH CHECK (auth.uid() = created_by OR public.has_role('administrator'));

CREATE POLICY "Administrators can delete supply network relationships" 
ON public.supply_network_relationships 
FOR DELETE 
USING (public.has_role('administrator'));

-- Relationship Properties policies
CREATE POLICY "Authenticated users can view relationship properties" 
ON public.supply_network_relationship_properties 
FOR SELECT 
USING (auth.role() = 'authenticated');

CREATE POLICY "Users can manage properties for their relationships" 
ON public.supply_network_relationship_properties 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM public.supply_network_relationships r 
    WHERE r.id = supply_network_relationship_properties.relationship_id 
    AND (r.created_by = auth.uid() OR public.has_role('administrator'))
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.supply_network_relationships r 
    WHERE r.id = supply_network_relationship_properties.relationship_id 
    AND (r.created_by = auth.uid() OR public.has_role('administrator'))
  )
);

-- Analysis Cache policies
CREATE POLICY "Authenticated users can view analysis cache" 
ON public.supply_network_analysis_cache 
FOR SELECT 
USING (auth.role() = 'authenticated');

CREATE POLICY "Administrators can manage analysis cache" 
ON public.supply_network_analysis_cache 
FOR ALL 
USING (public.has_role('administrator'))
WITH CHECK (public.has_role('administrator'));

-- Insert sample node types based on the supply network diagram
INSERT INTO public.supply_network_node_types (type_code, type_name, description, icon_name, color_code, default_properties) VALUES
('FACTORY', 'Factory', 'Manufacturing facility that produces goods', 'Factory', '#FF6B6B', '{"capacity_unit": "units/day", "production_type": "manufacturing"}'),
('WAREHOUSE', 'Warehouse', 'Storage facility for inventory management', 'Warehouse', '#4ECDC4', '{"capacity_unit": "cubic_meters", "storage_type": "general"}'),
('DISTRIBUTION_CENTER', 'Distribution Center', 'Hub for distributing products to multiple locations', 'Truck', '#45B7D1', '{"capacity_unit": "shipments/day", "distribution_radius": "regional"}'),
('RETAIL', 'Retail', 'End customer-facing retail location', 'Store', '#96CEB4', '{"capacity_unit": "customers/day", "store_type": "retail"}'),
('SUPPLIER', 'Supplier', 'Raw material or component supplier', 'Package', '#FFEAA7', '{"capacity_unit": "tons/month", "supplier_type": "raw_materials"}');

-- Insert sample relationship types
INSERT INTO public.supply_network_relationship_types (type_code, type_name, description, is_directed, allows_multiple, default_properties) VALUES
('SUPPLIES', 'Supplies', 'Direct supply relationship between entities', true, true, '{"flow_type": "material", "measurement_unit": "units"}'),
('DISTRIBUTES_TO', 'Distributes To', 'Distribution relationship for finished goods', true, true, '{"flow_type": "finished_goods", "delivery_frequency": "daily"}'),
('SHIPS_TO', 'Ships To', 'Shipping relationship between locations', true, true, '{"flow_type": "transportation", "transport_mode": "truck"}'),
('SUPPORTS', 'Supports', 'Support or service relationship', true, false, '{"flow_type": "service", "support_type": "maintenance"}'),
('PARTNERS_WITH', 'Partners With', 'Strategic partnership relationship', false, false, '{"flow_type": "collaboration", "partnership_type": "strategic"}');

-- Insert sample network configurations
INSERT INTO public.supply_network_configurations (config_key, config_value, description, config_category) VALUES
('default_capacity_unit', '"units/day"', 'Default capacity measurement unit', 'system'),
('max_relationship_strength', '100.0', 'Maximum allowed relationship strength value', 'validation'),
('enable_geospatial_analysis', 'true', 'Enable geographic analysis features', 'features'),
('default_lead_time_days', '7', 'Default lead time in days for relationships', 'operations'),
('cache_expiry_hours', '24', 'Default cache expiry time in hours', 'performance'),
('visualization_theme', '{"primary": "#4ECDC4", "secondary": "#45B7D1", "accent": "#FF6B6B"}', 'Default color theme for network visualization', 'ui');

-- Create helper function to get node types for API usage
CREATE OR REPLACE FUNCTION public.get_supply_network_node_types()
RETURNS TABLE(
    id UUID,
    type_code VARCHAR(50),
    type_name VARCHAR(100),
    description TEXT,
    icon_name VARCHAR(50),
    color_code VARCHAR(7),
    default_properties JSONB
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        nt.id,
        nt.type_code,
        nt.type_name,
        nt.description,
        nt.icon_name,
        nt.color_code,
        nt.default_properties
    FROM public.supply_network_node_types nt
    WHERE nt.is_active = true
    ORDER BY nt.type_name;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';

-- Create helper function to get relationship types for API usage
CREATE OR REPLACE FUNCTION public.get_supply_network_relationship_types()
RETURNS TABLE(
    id UUID,
    type_code VARCHAR(50),
    type_name VARCHAR(100),
    description TEXT,
    is_directed BOOLEAN,
    allows_multiple BOOLEAN,
    default_properties JSONB
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        rt.id,
        rt.type_code,
        rt.type_name,
        rt.description,
        rt.is_directed,
        rt.allows_multiple,
        rt.default_properties
    FROM public.supply_network_relationship_types rt
    WHERE rt.is_active = true
    ORDER BY rt.type_name;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';

-- Create function to get complete network graph data
CREATE OR REPLACE FUNCTION public.get_supply_network_graph()
RETURNS TABLE(
    nodes JSONB,
    relationships JSONB
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        (
            SELECT jsonb_agg(
                jsonb_build_object(
                    'id', n.id,
                    'code', n.node_code,
                    'name', n.node_name,
                    'type', nt.type_code,
                    'type_name', nt.type_name,
                    'description', n.description,
                    'status', n.status,
                    'position', jsonb_build_object(
                        'lat', n.latitude,
                        'lng', n.longitude
                    ),
                    'properties', jsonb_build_object(
                        'capacity_metrics', n.capacity_metrics,
                        'operational_hours', n.operational_hours,
                        'contact_information', n.contact_information
                    ),
                    'ui', jsonb_build_object(
                        'icon', nt.icon_name,
                        'color', nt.color_code
                    )
                )
            )
            FROM public.supply_network_nodes n
            JOIN public.supply_network_node_types nt ON n.node_type_id = nt.id
            WHERE n.status = 'active'
        ) as nodes,
        (
            SELECT jsonb_agg(
                jsonb_build_object(
                    'id', r.id,
                    'code', r.relationship_code,
                    'source_id', r.source_node_id,
                    'target_id', r.target_node_id,
                    'type', rt.type_code,
                    'type_name', rt.type_name,
                    'description', r.description,
                    'status', r.status,
                    'attributes', jsonb_build_object(
                        'strength', r.strength,
                        'capacity', r.capacity,
                        'cost', r.cost,
                        'lead_time_days', r.lead_time_days
                    ),
                    'is_directed', rt.is_directed
                )
            )
            FROM public.supply_network_relationships r
            JOIN public.supply_network_relationship_types rt ON r.relationship_type_id = rt.id
            WHERE r.status = 'active'
            AND r.effective_from <= now()
            AND (r.effective_to IS NULL OR r.effective_to > now())
        ) as relationships;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';

-- Create function for network analysis queries
CREATE OR REPLACE FUNCTION public.analyze_supply_network_paths(
    source_node_code VARCHAR(100),
    target_node_code VARCHAR(100)
)
RETURNS TABLE(
    path_nodes JSONB,
    total_cost DECIMAL(15,2),
    total_lead_time INTEGER,
    path_strength DECIMAL(5,2)
) AS $$
BEGIN
    -- This is a simplified path analysis - in production you'd implement more sophisticated algorithms
    RETURN QUERY
    WITH RECURSIVE network_paths AS (
        -- Base case: direct relationships
        SELECT 
            jsonb_build_array(sn.node_code, tn.node_code) as path_nodes,
            r.cost as total_cost,
            r.lead_time_days as total_lead_time,
            r.strength as path_strength,
            1 as path_length
        FROM public.supply_network_relationships r
        JOIN public.supply_network_nodes sn ON r.source_node_id = sn.id
        JOIN public.supply_network_nodes tn ON r.target_node_id = tn.id
        WHERE sn.node_code = source_node_code
        AND r.status = 'active'
        
        UNION ALL
        
        -- Recursive case: extend paths
        SELECT 
            np.path_nodes || tn.node_code,
            np.total_cost + COALESCE(r.cost, 0),
            np.total_lead_time + COALESCE(r.lead_time_days, 0),
            LEAST(np.path_strength, r.strength),
            np.path_length + 1
        FROM network_paths np
        JOIN public.supply_network_relationships r ON 
            r.source_node_id = (
                SELECT id FROM public.supply_network_nodes 
                WHERE node_code = (np.path_nodes->>-1)::text
            )
        JOIN public.supply_network_nodes tn ON r.target_node_id = tn.id
        WHERE np.path_length < 5  -- Prevent infinite recursion
        AND r.status = 'active'
        AND NOT (np.path_nodes ? tn.node_code)  -- Prevent cycles
    )
    SELECT 
        np.path_nodes,
        np.total_cost,
        np.total_lead_time,
        np.path_strength
    FROM network_paths np
    WHERE np.path_nodes->>-1 = target_node_code
    ORDER BY np.path_length, np.total_cost
    LIMIT 10;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';