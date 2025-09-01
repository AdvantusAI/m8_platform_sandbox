-- Add CUSTOMERS node type to supply_network_node_types
INSERT INTO m8_schema.supply_network_node_types (type_code, type_name, icon_name, description) VALUES
    ('Customer', 'Customer', 'Users', 'Customer nodes in the supply network')
ON CONFLICT (type_code) DO NOTHING;

-- Add comment to the migration
COMMENT ON TABLE m8_schema.supply_network_node_types IS 'Node types for supply network including CUSTOMERS type';
