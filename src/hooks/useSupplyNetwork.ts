import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

// MongoDB-based supply network types
export interface SupplyNetworkNode {
  id: string;
  location_code: string;
  node_name: string;
  node_type_id: string;
  description: string;
  status: string;
  hierarchy_level: number;
  version: number;
  operating_cost_per_unit?: number;
  storage_cost_per_unit?: number;
  node_lead_time?: number;
  lot_sizing_method?: string;
  minimum_order_quantity?: number;
  maximum_order_quantity?: number;
  order_multiple?: number;
  economic_order_quantity?: number;
  capacity_metrics?: Record<string, any>;
  operational_hours?: Record<string, any>;
  contact_information?: Record<string, any>;
  created_at: string;
  updated_at: string;
  position_x?: number;
  position_y?: number;
}

export interface SupplyNetworkRelationship {
  id: string;
  from_node_id: string;
  to_node_id: string;
  relationship_type: string;
  capacity: number | null;
  cost: number | null;
  lead_time: number | null;
  created_at: string;
  updated_at: string;
}

type SupplyNetworkNodeInsert = Omit<SupplyNetworkNode, 'id' | 'created_at' | 'updated_at'>;
type SupplyNetworkNodeUpdate = Partial<SupplyNetworkNodeInsert>;
type SupplyNetworkRelationshipInsert = Omit<SupplyNetworkRelationship, 'id' | 'created_at' | 'updated_at'>;
type SupplyNetworkRelationshipUpdate = Partial<SupplyNetworkRelationshipInsert>;

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
      const response = await fetch('http://localhost:3001/api/supply-network-nodes');
      if (!response.ok) {
        throw new Error(`Failed to fetch supply network nodes: ${response.statusText}`);
      }
      return response.json();
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
      const response = await fetch('http://localhost:3001/api/supply-network-relationships');
      if (!response.ok) {
        throw new Error(`Failed to fetch supply network relationships: ${response.statusText}`);
      }
      return response.json();
    },
  });

  // Create node mutation
  const createNodeMutation = useMutation({
    mutationFn: async (nodeData: SupplyNetworkNodeInsert) => {
      const response = await fetch('http://localhost:3001/api/supply-network-nodes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(nodeData),
      });
      
      if (!response.ok) {
        throw new Error(`Failed to create supply network node: ${response.statusText}`);
      }
      
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['supply-network-nodes'] });
    },
  });

  // Create relationship mutation
  const createRelationshipMutation = useMutation({
    mutationFn: async (relationshipData: SupplyNetworkRelationshipInsert) => {
      const response = await fetch('http://localhost:3001/api/supply-network-relationships', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(relationshipData),
      });
      
      if (!response.ok) {
        throw new Error(`Failed to create supply network relationship: ${response.statusText}`);
      }
      
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['supply-network-relationships'] });
    },
  });

  // Update node mutation
  const updateNodeMutation = useMutation({
    mutationFn: async (nodeData: SupplyNetworkNodeUpdate & { id: string }) => {
      const { id, ...updateData } = nodeData;
      const response = await fetch(`http://localhost:3001/api/supply-network-nodes/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updateData),
      });
      
      if (!response.ok) {
        throw new Error(`Failed to update supply network node: ${response.statusText}`);
      }
      
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['supply-network-nodes'] });
    },
  });

  // Delete node mutation
  const deleteNodeMutation = useMutation({
    mutationFn: async (nodeId: string) => {
      const response = await fetch(`http://localhost:3001/api/supply-network-nodes/${nodeId}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) {
        throw new Error(`Failed to delete supply network node: ${response.statusText}`);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['supply-network-nodes'] });
      queryClient.invalidateQueries({ queryKey: ['supply-network-relationships'] });
    },
  });

  // Update relationship mutation
  const updateRelationshipMutation = useMutation({
    mutationFn: async (relationshipData: SupplyNetworkRelationshipUpdate & { id: string }) => {
      const { id, ...updateData } = relationshipData;
      const response = await fetch(`http://localhost:3001/api/supply-network-relationships/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updateData),
      });
      
      if (!response.ok) {
        throw new Error(`Failed to update supply network relationship: ${response.statusText}`);
      }
      
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['supply-network-relationships'] });
    },
  });

  // Delete relationship mutation
  const deleteRelationshipMutation = useMutation({
    mutationFn: async (relationshipId: string) => {
      const response = await fetch(`http://localhost:3001/api/supply-network-relationships/${relationshipId}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) {
        throw new Error(`Failed to delete supply network relationship: ${response.statusText}`);
      }
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
      // Fetch both nodes and relationships in parallel
      const [nodesResponse, relationshipsResponse] = await Promise.all([
        fetch('http://localhost:3001/api/supply-network-nodes'),
        fetch('http://localhost:3001/api/supply-network-relationships')
      ]);
      
      if (!nodesResponse.ok) {
        throw new Error(`Failed to fetch nodes: ${nodesResponse.statusText}`);
      }
      
      if (!relationshipsResponse.ok) {
        throw new Error(`Failed to fetch relationships: ${relationshipsResponse.statusText}`);
      }
      
      const nodes = await nodesResponse.json();
      const relationships = await relationshipsResponse.json();
      
      return {
        nodes: nodes || [],
        relationships: relationships || []
      } as NetworkGraphData;
    },
  });

  return {
    graphData: data,
    isLoading,
    error,
  };
};