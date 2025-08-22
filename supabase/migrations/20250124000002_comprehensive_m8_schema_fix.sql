-- Comprehensive fix for m8_schema.supply_network_relationships table
-- This migration addresses all potential trigger and schema issues

-- First, ensure the trigger function exists in m8_schema
CREATE OR REPLACE FUNCTION m8_schema.update_supply_network_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop any existing triggers that might be causing conflicts
DROP TRIGGER IF EXISTS update_supply_relationships_updated_at ON m8_schema.supply_network_relationships;
DROP TRIGGER IF EXISTS update_supply_relationships_updated_at ON public.supply_network_relationships;

-- Create the proper trigger for m8_schema.supply_network_relationships
CREATE TRIGGER update_supply_relationships_updated_at
    BEFORE UPDATE ON m8_schema.supply_network_relationships
    FOR EACH ROW EXECUTE FUNCTION m8_schema.update_supply_network_updated_at();

-- Ensure all required columns exist in m8_schema.supply_network_relationships
DO $$ 
BEGIN
    -- Add effective_from if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_schema = 'm8_schema' 
                   AND table_name = 'supply_network_relationships' 
                   AND column_name = 'effective_from') THEN
        ALTER TABLE m8_schema.supply_network_relationships 
        ADD COLUMN effective_from TIMESTAMP WITH TIME ZONE DEFAULT now();
    END IF;

    -- Add effective_to if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_schema = 'm8_schema' 
                   AND table_name = 'supply_network_relationships' 
                   AND column_name = 'effective_to') THEN
        ALTER TABLE m8_schema.supply_network_relationships 
        ADD COLUMN effective_to TIMESTAMP WITH TIME ZONE;
    END IF;

    -- Add alternate_sources if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_schema = 'm8_schema' 
                   AND table_name = 'supply_network_relationships' 
                   AND column_name = 'alternate_sources') THEN
        ALTER TABLE m8_schema.supply_network_relationships 
        ADD COLUMN alternate_sources JSONB DEFAULT '[]';
    END IF;

    -- Add created_by if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_schema = 'm8_schema' 
                   AND table_name = 'supply_network_relationships' 
                   AND column_name = 'created_by') THEN
        ALTER TABLE m8_schema.supply_network_relationships 
        ADD COLUMN created_by UUID REFERENCES auth.users(id);
    END IF;

    -- Add version if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_schema = 'm8_schema' 
                   AND table_name = 'supply_network_relationships' 
                   AND column_name = 'version') THEN
        ALTER TABLE m8_schema.supply_network_relationships 
        ADD COLUMN version INTEGER DEFAULT 1;
    END IF;
END $$;

-- Create indexes if they don't exist
CREATE INDEX IF NOT EXISTS idx_m8_supply_relationships_effective 
ON m8_schema.supply_network_relationships(effective_from, effective_to);

CREATE INDEX IF NOT EXISTS idx_m8_supply_relationships_alternate_sources 
ON m8_schema.supply_network_relationships USING gin(alternate_sources);

-- Add constraints if they don't exist
DO $$
BEGIN
    -- Add no_self_relationship constraint if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints 
                   WHERE table_schema = 'm8_schema' 
                   AND table_name = 'supply_network_relationships' 
                   AND constraint_name = 'no_self_relationship') THEN
        ALTER TABLE m8_schema.supply_network_relationships 
        ADD CONSTRAINT no_self_relationship 
        CHECK (source_node_id != target_node_id);
    END IF;

    -- Add valid_effective_period constraint if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints 
                   WHERE table_schema = 'm8_schema' 
                   AND table_name = 'supply_network_relationships' 
                   AND constraint_name = 'valid_effective_period') THEN
        ALTER TABLE m8_schema.supply_network_relationships 
        ADD CONSTRAINT valid_effective_period 
        CHECK (effective_to IS NULL OR effective_from < effective_to);
    END IF;
END $$;

-- Ensure RLS is enabled and policy exists
ALTER TABLE m8_schema.supply_network_relationships ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow all operations on relationships" ON m8_schema.supply_network_relationships;
CREATE POLICY "Allow all operations on relationships" ON m8_schema.supply_network_relationships 
FOR ALL USING (true);
