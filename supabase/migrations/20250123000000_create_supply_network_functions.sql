-- Create supply network functions in m8_schema

-- Function to get supply network node types
CREATE OR REPLACE FUNCTION m8_schema.get_supply_network_node_types()
RETURNS TABLE (
    id UUID,
    type_code TEXT,
    type_name TEXT,
    icon_name TEXT,
    description TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        nt.id,
        nt.type_code,
        nt.type_name,
        nt.icon_name,
        nt.description
    FROM m8_schema.supply_network_node_types nt
    ORDER BY nt.type_name;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get supply network relationship types
CREATE OR REPLACE FUNCTION m8_schema.get_supply_network_relationship_types()
RETURNS TABLE (
    id UUID,
    type_code TEXT,
    type_name TEXT,
    description TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        rt.id,
        rt.type_code,
        rt.type_name,
        rt.description
    FROM m8_schema.supply_network_relationship_types rt
    ORDER BY rt.type_name;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get supply network graph data
CREATE OR REPLACE FUNCTION m8_schema.get_supply_network_graph()
RETURNS TABLE (
    nodes JSONB,
    relationships JSONB
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COALESCE(
            (SELECT jsonb_agg(
                jsonb_build_object(
                    'id', n.id,
                    'node_name', n.node_name,
                    'node_code', n.node_code,
                    'node_type_id', n.node_type_id,
                    'status', n.status,
                    'description', n.description,
                    'address', n.address,
                    'contact_information', n.contact_information,
                    'created_at', n.created_at,
                    'updated_at', n.updated_at
                )
            ) FROM m8_schema.supply_network_nodes n),
            '[]'::jsonb
        ) as nodes,
        COALESCE(
            (SELECT jsonb_agg(
                jsonb_build_object(
                    'id', r.id,
                    'source_node_id', r.source_node_id,
                    'target_node_id', r.target_node_id,
                    'relationship_type_id', r.relationship_type_id,
                    'status', r.status,
                    'description', r.description,
                    'lead_time_days', r.lead_time_days,
                    'primary_transport_method', r.primary_transport_method,
                    'primary_transport_cost', r.primary_transport_cost,
                    'cost_unit', r.cost_unit,
                    'alternate_transport_method', r.alternate_transport_method,
                    'alternate_lead_time_days', r.alternate_lead_time_days,
                    'alternate_transport_cost', r.alternate_transport_cost,
                    'capacity_constraint', r.capacity_constraint,
                    'is_bidirectional', r.is_bidirectional,
                    'priority_rank', r.priority_rank,
                    'created_at', r.created_at,
                    'updated_at', r.updated_at
                )
            ) FROM m8_schema.supply_network_relationships r),
            '[]'::jsonb
        ) as relationships;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

