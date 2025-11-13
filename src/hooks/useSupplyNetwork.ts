import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Database } from '@/integrations/supabase/types';

type SupplyNetworkNode = Database['m8_schema']['Tables']['supply_network_nodes']['Row'];
type SupplyNetworkRelationship = Database['m8_schema']['Tables']['supply_network_relationships']['Row'];
type SupplyNetworkNodeInsert = Database['m8_schema']['Tables']['supply_network_nodes']['Insert'];
type SupplyNetworkNodeUpdate = Database['m8_schema']['Tables']['supply_network_nodes']['Update'];
type SupplyNetworkRelationshipInsert = Database['m8_schema']['Tables']['supply_network_relationships']['Insert'];
type SupplyNetworkRelationshipUpdate = Database['m8_schema']['Tables']['supply_network_relationships']['Update'];

export interface NetworkGraphData {
  nodes: SupplyNetworkNode[];
  relationships: SupplyNetworkRelationship[];
}

export const useSupplyNetwork = () => {
  const queryClient = useQueryClient();

  // Fetch all nodes
  const {
    data: nodes,
    isLoading: nodesLoading,
    error: nodesError,
  } = useQuery({
    queryKey: ['supply-network-nodes'],
    queryFn: async () => {
      const { data, error } = await supabase
        .schema('m8_schema')
        .from('supply_network_nodes')
        .select('*')
        .order('created_at', { ascending: true });
      
      if (error) throw error;
      return data;
    },
  });

  // Fetch all relationships
  const {
    data: relationships,
    isLoading: relationshipsLoading,
    error: relationshipsError,
  } = useQuery({
    queryKey: ['supply-network-relationships'],
    queryFn: async () => {
      const { data, error } = await supabase
        .schema('m8_schema')
        .from('supply_network_relationships')
        .select('*')
        .order('created_at', { ascending: true });
      
      if (error) throw error;
      return data;
    },
  });

  // Create node mutation
  const createNodeMutation = useMutation({
    mutationFn: async (nodeData: SupplyNetworkNodeInsert) => {
      const { data, error } = await supabase
        .schema('m8_schema')
        .from('supply_network_nodes')
        .insert(nodeData)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['supply-network-nodes'] });
    },
  });

  // Create relationship mutation
  const createRelationshipMutation = useMutation({
    mutationFn: async (relationshipData: SupplyNetworkRelationshipInsert) => {
      ////console.log('Attempting to create relationship with data:', relationshipData);
      
      // First, try to log the operation
      // try {
      //   await supabase
      //     .schema('m8_schema')
      //     .rpc('log_sql_operation', {
      //       operation: 'INSERT',
      //       table_name: 'supply_network_relationships',
      //       data: relationshipData as any
      //     });
      // } catch (logError) {
      //   console.warn('Failed to log operation:', logError);
      // }
      
      const { data, error } = await supabase
        .schema('m8_schema')
        .from('supply_network_relationships')
        .insert(relationshipData)
        .select()
        .single();
      
      if (error) {
        console.error('Supabase error details:', error);
        throw error;
      }
      
      ////console.log('Relationship created successfully:', data);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['supply-network-relationships'] });
    },
  });// Update relationship mutation
  const updateRelationshipMutation = useMutation({
    mutationFn: async (relationshipData: SupplyNetworkRelationshipUpdate & { id: string }) => {
      const { id, ...updateData } = relationshipData;
      const { data, error } = await supabase
        .schema('m8_schema')
        .from('supply_network_relationships')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['supply-network-relationships'] });
    },
  });


  // Update node mutation
  const updateNodeMutation = useMutation({
    mutationFn: async (nodeData: SupplyNetworkNodeUpdate & { id: string }) => {
      const { id, ...updateData } = nodeData;
      const { data, error } = await supabase
        .schema('m8_schema')
        .from('supply_network_nodes')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['supply-network-nodes'] });
    },
  });

  // Delete node mutation
  const deleteNodeMutation = useMutation({
    mutationFn: async (nodeId: string) => {
      const { error } = await supabase
        .schema('m8_schema')
        .from('supply_network_nodes')
        .delete()
        .eq('id', nodeId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['supply-network-nodes'] });
      queryClient.invalidateQueries({ queryKey: ['supply-network-relationships'] });
    },
  });

  // Delete relationship mutation
  const deleteRelationshipMutation = useMutation({
    mutationFn: async (relationshipId: string) => {
      const { error } = await supabase
        .schema('m8_schema')
          .from('supply_network_relationships')
        .delete()
        .eq('id', relationshipId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['supply-network-relationships'] });
    },
  });

  return {
    // Data
    nodes: nodes || [],
    relationships: relationships || [],
    
    // Loading states
    isLoading: nodesLoading || relationshipsLoading,
    
    // Errors
    error: nodesError || relationshipsError,
    
    // Mutations
    createNode: createNodeMutation,
    updateNode: updateNodeMutation,
    createRelationship: createRelationshipMutation,
    updateRelationship: updateRelationshipMutation,
    deleteNode: deleteNodeMutation,
    deleteRelationship: deleteRelationshipMutation,
  };
};

export const useSupplyNetworkGraph = () => {
  const { data, isLoading, error } = useQuery({
    queryKey: ['supply-network-graph'],
    queryFn: async () => {
      const { data, error } = await (supabase as any).schema('m8_schema').rpc('get_supply_network_graph');
      if (error) throw error;
      
      // Parse the result properly
      if (data && Array.isArray(data) && data.length > 0) {
        const result = data[0];
        return {
          nodes: result.nodes || [],
          relationships: result.relationships || []
        } as NetworkGraphData;
      }
      
      return { nodes: [], relationships: [] } as NetworkGraphData;
    },
  });

  return {
    graphData: data,
    isLoading,
    error,
  };
};