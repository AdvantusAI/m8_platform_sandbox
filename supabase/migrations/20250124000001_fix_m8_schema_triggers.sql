-- Fix triggers for m8_schema.supply_network_relationships table
-- The issue is that triggers were created for public.supply_network_relationships but we're using m8_schema

-- Create trigger function for m8_schema tables
CREATE OR REPLACE FUNCTION m8_schema.update_supply_network_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for m8_schema.supply_network_relationships
DROP TRIGGER IF EXISTS update_supply_relationships_updated_at ON m8_schema.supply_network_relationships;
CREATE TRIGGER update_supply_relationships_updated_at
    BEFORE UPDATE ON m8_schema.supply_network_relationships
    FOR EACH ROW EXECUTE FUNCTION m8_schema.update_supply_network_updated_at();

-- Create trigger for m8_schema.supply_network_nodes
DROP TRIGGER IF EXISTS update_supply_nodes_updated_at ON m8_schema.supply_network_nodes;
CREATE TRIGGER update_supply_nodes_updated_at
    BEFORE UPDATE ON m8_schema.supply_network_nodes
    FOR EACH ROW EXECUTE FUNCTION m8_schema.update_supply_network_updated_at();

-- Create trigger for m8_schema.supply_network_node_types
DROP TRIGGER IF EXISTS update_supply_node_types_updated_at ON m8_schema.supply_network_node_types;
CREATE TRIGGER update_supply_node_types_updated_at
    BEFORE UPDATE ON m8_schema.supply_network_node_types
    FOR EACH ROW EXECUTE FUNCTION m8_schema.update_supply_network_updated_at();

-- Create trigger for m8_schema.supply_network_relationship_types
DROP TRIGGER IF EXISTS update_supply_relationship_types_updated_at ON m8_schema.supply_network_relationship_types;
CREATE TRIGGER update_supply_relationship_types_updated_at
    BEFORE UPDATE ON m8_schema.supply_network_relationship_types
    FOR EACH ROW EXECUTE FUNCTION m8_schema.update_supply_network_updated_at();
