-- Add missing columns to m8_schema.supply_network_relationships table
-- These columns are being used by the RelationshipForm but don't exist in the table

-- Add effective_from column for temporal validity
ALTER TABLE m8_schema.supply_network_relationships 
ADD COLUMN IF NOT EXISTS effective_from TIMESTAMP WITH TIME ZONE DEFAULT now();

-- Add effective_to column for temporal validity
ALTER TABLE m8_schema.supply_network_relationships 
ADD COLUMN IF NOT EXISTS effective_to TIMESTAMP WITH TIME ZONE;

-- Add alternate_sources column as JSONB to store alternate source information
ALTER TABLE m8_schema.supply_network_relationships 
ADD COLUMN IF NOT EXISTS alternate_sources JSONB DEFAULT '[]';

-- Add created_by column to track who created the relationship
ALTER TABLE m8_schema.supply_network_relationships 
ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id);

-- Add version column for optimistic locking
ALTER TABLE m8_schema.supply_network_relationships 
ADD COLUMN IF NOT EXISTS version INTEGER DEFAULT 1;

-- Create index for temporal queries
CREATE INDEX IF NOT EXISTS idx_supply_relationships_effective 
ON m8_schema.supply_network_relationships(effective_from, effective_to);

-- Create index for alternate_sources JSONB queries
CREATE INDEX IF NOT EXISTS idx_supply_relationships_alternate_sources 
ON m8_schema.supply_network_relationships USING gin(alternate_sources);

-- Add constraint to prevent self-relationships (if not already exists)
ALTER TABLE m8_schema.supply_network_relationships 
ADD CONSTRAINT IF NOT EXISTS no_self_relationship 
CHECK (source_node_id != target_node_id);

-- Add constraint to ensure effective_from is before effective_to
ALTER TABLE m8_schema.supply_network_relationships 
ADD CONSTRAINT IF NOT EXISTS valid_effective_period 
CHECK (effective_to IS NULL OR effective_from < effective_to);

-- Update the RLS policy to include the new columns
DROP POLICY IF EXISTS "Allow all operations on relationships" ON m8_schema.supply_network_relationships;
CREATE POLICY "Allow all operations on relationships" ON m8_schema.supply_network_relationships 
FOR ALL USING (true);
