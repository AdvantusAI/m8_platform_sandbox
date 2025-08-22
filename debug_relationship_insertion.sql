-- Debug script for relationship insertion
-- Run this directly in your database to test and debug the trigger issue

-- First, let's check if the table exists and its structure
SELECT 
    column_name, 
    data_type, 
    is_nullable, 
    column_default
FROM information_schema.columns 
WHERE table_schema = 'm8_schema' 
AND table_name = 'supply_network_relationships'
ORDER BY ordinal_position;

-- Check if there are any triggers on the table
SELECT 
    trigger_name,
    event_manipulation,
    action_statement,
    action_timing
FROM information_schema.triggers 
WHERE event_object_schema = 'm8_schema' 
AND event_object_table = 'supply_network_relationships';

-- Check if the trigger function exists
SELECT 
    routine_name,
    routine_type,
    data_type
FROM information_schema.routines 
WHERE routine_schema = 'm8_schema' 
AND routine_name = 'update_supply_network_updated_at';

-- Test the trigger function directly
SELECT m8_schema.update_supply_network_updated_at();

-- Clear any existing debug logs
DELETE FROM m8_schema.debug_logs;

-- Test relationship insertion with minimal data
DO $$
DECLARE
    v_node_id UUID;
    v_relationship_type_id UUID;
    v_result m8_schema.supply_network_relationships;
BEGIN
    -- Get a sample node ID
    SELECT id INTO v_node_id FROM m8_schema.supply_network_nodes LIMIT 1;
    
    -- Get a sample relationship type ID
    SELECT id INTO v_relationship_type_id FROM m8_schema.supply_network_relationship_types LIMIT 1;
    
    -- Log the test
    PERFORM m8_schema.log_debug('Starting test insertion', jsonb_build_object(
        'node_id', v_node_id,
        'relationship_type_id', v_relationship_type_id
    ));
    
    -- Try to insert a test relationship
    INSERT INTO m8_schema.supply_network_relationships (
        relationship_code,
        source_node_id,
        target_node_id,
        relationship_type_id,
        lead_time_days,
        primary_transport_method,
        primary_transport_cost,
        cost_unit,
        priority_rank,
        status
    ) VALUES (
        'TEST-REL-' || EXTRACT(EPOCH FROM now())::text,
        v_node_id,
        v_node_id, -- This should fail due to self-relationship constraint
        v_relationship_type_id,
        1,
        'truck',
        100.00,
        'per_shipment',
        1,
        'active'
    ) RETURNING * INTO v_result;
    
    -- Log success
    PERFORM m8_schema.log_debug('Test insertion successful', jsonb_build_object(
        'inserted_id', v_result.id
    ));
    
EXCEPTION
    WHEN OTHERS THEN
        -- Log the error
        PERFORM m8_schema.log_debug('Test insertion failed', jsonb_build_object(
            'error_message', SQLERRM,
            'error_detail', SQLSTATE
        ));
        RAISE;
END $$;

-- Check the debug logs
SELECT 
    id,
    message,
    data,
    created_at,
    EXTRACT(EPOCH FROM (now() - created_at)) as seconds_ago
FROM m8_schema.debug_logs
ORDER BY created_at DESC
LIMIT 10;

-- Check if any relationships were created
SELECT 
    id,
    relationship_code,
    source_node_id,
    target_node_id,
    created_at
FROM m8_schema.supply_network_relationships
WHERE relationship_code LIKE 'TEST-REL-%'
ORDER BY created_at DESC
LIMIT 5;
