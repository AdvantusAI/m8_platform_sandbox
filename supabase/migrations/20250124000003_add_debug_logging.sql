-- Add comprehensive debug logging for trigger issues
-- This will help identify exactly what's causing the "control reached end of trigger procedure without RETURN" error

-- Create a logging function for debugging
CREATE OR REPLACE FUNCTION m8_schema.log_debug(message TEXT, data JSONB DEFAULT '{}'::jsonb)
RETURNS VOID AS $$
BEGIN
    -- Log to PostgreSQL logs
    RAISE LOG 'M8_DEBUG: % - %', message, data;
    
    -- Also insert into a debug log table for easier querying
    INSERT INTO m8_schema.debug_logs (message, data, created_at)
    VALUES (message, data, now());
EXCEPTION
    WHEN OTHERS THEN
        -- If the debug_logs table doesn't exist, just use RAISE LOG
        RAISE LOG 'M8_DEBUG: % - % (debug_logs table not available)', message, data;
END;
$$ LANGUAGE plpgsql;

-- Create debug logs table if it doesn't exist
CREATE TABLE IF NOT EXISTS m8_schema.debug_logs (
    id SERIAL PRIMARY KEY,
    message TEXT NOT NULL,
    data JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create index for easier querying
CREATE INDEX IF NOT EXISTS idx_debug_logs_created_at ON m8_schema.debug_logs(created_at);

-- Enhanced trigger function with comprehensive logging
CREATE OR REPLACE FUNCTION m8_schema.update_supply_network_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    -- Log the trigger execution
    PERFORM m8_schema.log_debug('Trigger function called', jsonb_build_object(
        'table_name', TG_TABLE_NAME,
        'schema_name', TG_TABLE_SCHEMA,
        'operation', TG_OP,
        'old_id', COALESCE(OLD.id::text, 'NULL'),
        'new_id', COALESCE(NEW.id::text, 'NULL'),
        'old_updated_at', COALESCE(OLD.updated_at::text, 'NULL'),
        'new_updated_at', now()::text
    ));
    
    -- Update the updated_at field
    NEW.updated_at = now();
    
    -- Log successful completion
    PERFORM m8_schema.log_debug('Trigger function completed successfully', jsonb_build_object(
        'table_name', TG_TABLE_NAME,
        'new_updated_at', NEW.updated_at::text
    ));
    
    -- Return the NEW record
    RETURN NEW;
EXCEPTION
    WHEN OTHERS THEN
        -- Log any errors
        PERFORM m8_schema.log_debug('Trigger function error', jsonb_build_object(
            'table_name', TG_TABLE_NAME,
            'error_message', SQLERRM,
            'error_detail', SQLSTATE
        ));
        RAISE;
END;
$$ LANGUAGE plpgsql;

-- Create a function to log SQL operations
CREATE OR REPLACE FUNCTION m8_schema.log_sql_operation(operation TEXT, table_name TEXT, data JSONB DEFAULT '{}'::jsonb)
RETURNS VOID AS $$
BEGIN
    PERFORM m8_schema.log_debug('SQL Operation', jsonb_build_object(
        'operation', operation,
        'table_name', table_name,
        'data', data,
        'timestamp', now()::text
    ));
END;
$$ LANGUAGE plpgsql;

-- Create a wrapper function for relationship insertion with logging
CREATE OR REPLACE FUNCTION m8_schema.insert_supply_network_relationship_with_logging(
    p_relationship_code TEXT,
    p_source_node_id UUID,
    p_target_node_id UUID,
    p_relationship_type_id UUID,
    p_lead_time_days INTEGER,
    p_primary_transport_method TEXT,
    p_primary_transport_cost NUMERIC,
    p_cost_unit TEXT,
    p_priority_rank INTEGER,
    p_status TEXT DEFAULT 'active',
    p_description TEXT DEFAULT NULL,
    p_alternate_transport_method TEXT DEFAULT NULL,
    p_alternate_lead_time_days INTEGER DEFAULT NULL,
    p_alternate_transport_cost NUMERIC DEFAULT NULL,
    p_capacity_constraint INTEGER DEFAULT NULL,
    p_is_bidirectional BOOLEAN DEFAULT FALSE,
    p_effective_from TIMESTAMP WITH TIME ZONE DEFAULT now(),
    p_alternate_sources JSONB DEFAULT '[]'::jsonb,
    p_created_by UUID DEFAULT NULL,
    p_version INTEGER DEFAULT 1
)
RETURNS m8_schema.supply_network_relationships AS $$
DECLARE
    v_result m8_schema.supply_network_relationships;
    v_input_data JSONB;
BEGIN
    -- Log the input data
    v_input_data := jsonb_build_object(
        'relationship_code', p_relationship_code,
        'source_node_id', p_source_node_id,
        'target_node_id', p_target_node_id,
        'relationship_type_id', p_relationship_type_id,
        'lead_time_days', p_lead_time_days,
        'primary_transport_method', p_primary_transport_method,
        'primary_transport_cost', p_primary_transport_cost,
        'cost_unit', p_cost_unit,
        'priority_rank', p_priority_rank,
        'status', p_status,
        'description', p_description,
        'alternate_transport_method', p_alternate_transport_method,
        'alternate_lead_time_days', p_alternate_lead_time_days,
        'alternate_transport_cost', p_alternate_transport_cost,
        'capacity_constraint', p_capacity_constraint,
        'is_bidirectional', p_is_bidirectional,
        'effective_from', p_effective_from,
        'alternate_sources', p_alternate_sources,
        'created_by', p_created_by,
        'version', p_version
    );
    
    PERFORM m8_schema.log_debug('Starting relationship insertion', v_input_data);
    
    -- Perform the insertion
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
        status,
        description,
        alternate_transport_method,
        alternate_lead_time_days,
        alternate_transport_cost,
        capacity_constraint,
        is_bidirectional,
        effective_from,
        alternate_sources,
        created_by,
        version
    ) VALUES (
        p_relationship_code,
        p_source_node_id,
        p_target_node_id,
        p_relationship_type_id,
        p_lead_time_days,
        p_primary_transport_method,
        p_primary_transport_cost,
        p_cost_unit,
        p_priority_rank,
        p_status,
        p_description,
        p_alternate_transport_method,
        p_alternate_lead_time_days,
        p_alternate_transport_cost,
        p_capacity_constraint,
        p_is_bidirectional,
        p_effective_from,
        p_alternate_sources,
        p_created_by,
        p_version
    ) RETURNING * INTO v_result;
    
    -- Log successful insertion
    PERFORM m8_schema.log_debug('Relationship inserted successfully', jsonb_build_object(
        'inserted_id', v_result.id,
        'relationship_code', v_result.relationship_code
    ));
    
    RETURN v_result;
EXCEPTION
    WHEN OTHERS THEN
        -- Log the error
        PERFORM m8_schema.log_debug('Relationship insertion failed', jsonb_build_object(
            'error_message', SQLERRM,
            'error_detail', SQLSTATE,
            'input_data', v_input_data
        ));
        RAISE;
END;
$$ LANGUAGE plpgsql;

-- Create a view to easily query debug logs
CREATE OR REPLACE VIEW m8_schema.debug_logs_view AS
SELECT 
    id,
    message,
    data,
    created_at,
    EXTRACT(EPOCH FROM (now() - created_at)) as seconds_ago
FROM m8_schema.debug_logs
ORDER BY created_at DESC;

-- Grant permissions
GRANT SELECT ON m8_schema.debug_logs TO authenticated;
GRANT SELECT ON m8_schema.debug_logs_view TO authenticated;
GRANT EXECUTE ON FUNCTION m8_schema.log_debug(TEXT, JSONB) TO authenticated;
GRANT EXECUTE ON FUNCTION m8_schema.log_sql_operation(TEXT, TEXT, JSONB) TO authenticated;
GRANT EXECUTE ON FUNCTION m8_schema.insert_supply_network_relationship_with_logging(TEXT, UUID, UUID, UUID, INTEGER, TEXT, NUMERIC, TEXT, INTEGER, TEXT, TEXT, TEXT, INTEGER, NUMERIC, INTEGER, BOOLEAN, TIMESTAMP WITH TIME ZONE, JSONB, UUID, INTEGER) TO authenticated;
