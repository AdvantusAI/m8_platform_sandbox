-- Digital Twin Supply Network Database Schema
-- Comprehensive DDL for runtime-configurable supply network management

-- 1. Node Types Table - Define available node categories
CREATE TABLE public.supply_network_node_types (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    type_code VARCHAR(50) UNIQUE NOT NULL,
    type_name VARCHAR(100) NOT NULL,
    description TEXT,
    icon_name VARCHAR(50), -- For UI representation
    color_code VARCHAR(7), -- Hex color for visualization
    default_properties JSONB DEFAULT '{}', -- Default properties for this node type
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 2. Relationship Types Table - Define available relationship categories
CREATE TABLE public.supply_network_relationship_types (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    type_code VARCHAR(50) UNIQUE NOT NULL,
    type_name VARCHAR(100) NOT NULL,
    description TEXT,
    is_directed BOOLEAN DEFAULT true, -- true for directed, false for undirected
    allows_multiple BOOLEAN DEFAULT true, -- multiple relationships of same type between nodes
    default_properties JSONB DEFAULT '{}',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 3. Network Configurations Table - Store runtime configuration settings
CREATE TABLE public.supply_network_configurations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    config_key VARCHAR(100) UNIQUE NOT NULL,
    config_value JSONB NOT NULL,
    description TEXT,
    config_category VARCHAR(50) DEFAULT 'general',
    is_system_config BOOLEAN DEFAULT false, -- System vs user configs
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 4. Supply Network Nodes Table - Store all network entities
CREATE TABLE public.supply_network_nodes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    node_code VARCHAR(100) UNIQUE NOT NULL, -- Business identifier
    node_name VARCHAR(200) NOT NULL,
    node_type_id UUID NOT NULL REFERENCES public.supply_network_node_types(id),
    description TEXT,
    
    -- Geospatial data
    latitude DECIMAL(10, 8),
    longitude DECIMAL(11, 8),
    address TEXT,
    city VARCHAR(100),
    state_province VARCHAR(100),
    country VARCHAR(100),
    postal_code VARCHAR(20),
    
    -- Operational data
    capacity_metrics JSONB DEFAULT '{}', -- Storage, throughput, etc.
    operational_hours JSONB DEFAULT '{}', -- Operating schedules
    contact_information JSONB DEFAULT '{}', -- Contact details
    
    -- Status and metadata
    status VARCHAR(50) DEFAULT 'active', -- active, inactive, maintenance, etc.
    parent_node_id UUID REFERENCES public.supply_network_nodes(id), -- For hierarchical relationships
    hierarchy_level INTEGER DEFAULT 0,
    hierarchy_path TEXT, -- Materialized path for hierarchy queries
    
    -- Audit fields
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    version INTEGER DEFAULT 1 -- For versioning support
);

-- 5. Node Properties Table - Store flexible attributes for each node
CREATE TABLE public.supply_network_node_properties (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    node_id UUID NOT NULL REFERENCES public.supply_network_nodes(id) ON DELETE CASCADE,
    property_key VARCHAR(100) NOT NULL,
    property_value JSONB NOT NULL,
    property_type VARCHAR(50) DEFAULT 'string', -- string, number, boolean, object, array
    is_system_property BOOLEAN DEFAULT false,
    is_required BOOLEAN DEFAULT false,
    validation_rules JSONB DEFAULT '{}', -- JSON schema or validation rules
    
    -- Versioning and audit
    effective_from TIMESTAMP WITH TIME ZONE DEFAULT now(),
    effective_to TIMESTAMP WITH TIME ZONE,
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    
    UNIQUE(node_id, property_key, effective_from)
);

-- 6. Supply Network Relationships Table - Define connections between nodes
CREATE TABLE public.supply_network_relationships (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    relationship_code VARCHAR(100), -- Optional business identifier
    source_node_id UUID NOT NULL REFERENCES public.supply_network_nodes(id) ON DELETE CASCADE,
    target_node_id UUID NOT NULL REFERENCES public.supply_network_nodes(id) ON DELETE CASCADE,
    relationship_type_id UUID NOT NULL REFERENCES public.supply_network_relationship_types(id),
    
    -- Relationship attributes
    strength DECIMAL(5,2) DEFAULT 1.0, -- Relationship strength/weight (0-100)
    capacity DECIMAL(15,2), -- Flow capacity if applicable
    cost DECIMAL(15,2), -- Cost associated with relationship
    lead_time_days INTEGER, -- Lead time in days
    
    -- Status and metadata
    status VARCHAR(50) DEFAULT 'active',
    description TEXT,
    
    -- Temporal validity
    effective_from TIMESTAMP WITH TIME ZONE DEFAULT now(),
    effective_to TIMESTAMP WITH TIME ZONE,
    
    -- Audit fields
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    version INTEGER DEFAULT 1,
    
    -- Prevent self-relationships
    CONSTRAINT no_self_relationship CHECK (source_node_id != target_node_id)
);

-- 7. Relationship Properties Table - Store flexible attributes for relationships
CREATE TABLE public.supply_network_relationship_properties (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    relationship_id UUID NOT NULL REFERENCES public.supply_network_relationships(id) ON DELETE CASCADE,
    property_key VARCHAR(100) NOT NULL,
    property_value JSONB NOT NULL,
    property_type VARCHAR(50) DEFAULT 'string',
    is_system_property BOOLEAN DEFAULT false,
    
    -- Temporal validity
    effective_from TIMESTAMP WITH TIME ZONE DEFAULT now(),
    effective_to TIMESTAMP WITH TIME ZONE,
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    
    UNIQUE(relationship_id, property_key, effective_from)
);

-- 8. Network Analysis Cache Table - Store computed network metrics
CREATE TABLE public.supply_network_analysis_cache (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    analysis_type VARCHAR(100) NOT NULL, -- shortest_path, centrality, clustering, etc.
    analysis_parameters JSONB NOT NULL,
    analysis_result JSONB NOT NULL,
    computed_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    expires_at TIMESTAMP WITH TIME ZONE,
    is_valid BOOLEAN DEFAULT true
);

-- Create indexes for performance optimization
-- Node indexes
CREATE INDEX idx_supply_nodes_type ON public.supply_network_nodes(node_type_id);
CREATE INDEX idx_supply_nodes_status ON public.supply_network_nodes(status);
CREATE INDEX idx_supply_nodes_parent ON public.supply_network_nodes(parent_node_id);
CREATE INDEX idx_supply_nodes_hierarchy_path ON public.supply_network_nodes USING gin(to_tsvector('english', hierarchy_path));
CREATE INDEX idx_supply_nodes_location ON public.supply_network_nodes(latitude, longitude) WHERE latitude IS NOT NULL AND longitude IS NOT NULL;
CREATE INDEX idx_supply_nodes_created_at ON public.supply_network_nodes(created_at);

-- Relationship indexes
CREATE INDEX idx_supply_relationships_source ON public.supply_network_relationships(source_node_id);
CREATE INDEX idx_supply_relationships_target ON public.supply_network_relationships(target_node_id);
CREATE INDEX idx_supply_relationships_type ON public.supply_network_relationships(relationship_type_id);
CREATE INDEX idx_supply_relationships_status ON public.supply_network_relationships(status);
CREATE INDEX idx_supply_relationships_effective ON public.supply_network_relationships(effective_from, effective_to);
CREATE INDEX idx_supply_relationships_source_target ON public.supply_network_relationships(source_node_id, target_node_id);

-- Property indexes
CREATE INDEX idx_supply_node_properties_node ON public.supply_network_node_properties(node_id);
CREATE INDEX idx_supply_node_properties_key ON public.supply_network_node_properties(property_key);
CREATE INDEX idx_supply_node_properties_effective ON public.supply_network_node_properties(effective_from, effective_to);
CREATE INDEX idx_supply_relationship_properties_rel ON public.supply_network_relationship_properties(relationship_id);
CREATE INDEX idx_supply_relationship_properties_key ON public.supply_network_relationship_properties(property_key);

-- Configuration indexes
CREATE INDEX idx_supply_config_category ON public.supply_network_configurations(config_category);
CREATE INDEX idx_supply_config_system ON public.supply_network_configurations(is_system_config);

-- Analysis cache indexes
CREATE INDEX idx_supply_analysis_type ON public.supply_network_analysis_cache(analysis_type);
CREATE INDEX idx_supply_analysis_expires ON public.supply_network_analysis_cache(expires_at);
CREATE INDEX idx_supply_analysis_valid ON public.supply_network_analysis_cache(is_valid);

-- Add triggers for automatic timestamp updates
CREATE OR REPLACE FUNCTION public.update_supply_network_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = '';

-- Apply update triggers
CREATE TRIGGER update_supply_node_types_updated_at
    BEFORE UPDATE ON public.supply_network_node_types
    FOR EACH ROW EXECUTE FUNCTION public.update_supply_network_updated_at();

CREATE TRIGGER update_supply_relationship_types_updated_at
    BEFORE UPDATE ON public.supply_network_relationship_types
    FOR EACH ROW EXECUTE FUNCTION public.update_supply_network_updated_at();

CREATE TRIGGER update_supply_configurations_updated_at
    BEFORE UPDATE ON public.supply_network_configurations
    FOR EACH ROW EXECUTE FUNCTION public.update_supply_network_updated_at();

CREATE TRIGGER update_supply_nodes_updated_at
    BEFORE UPDATE ON public.supply_network_nodes
    FOR EACH ROW EXECUTE FUNCTION public.update_supply_network_updated_at();

CREATE TRIGGER update_supply_relationships_updated_at
    BEFORE UPDATE ON public.supply_network_relationships
    FOR EACH ROW EXECUTE FUNCTION public.update_supply_network_updated_at();