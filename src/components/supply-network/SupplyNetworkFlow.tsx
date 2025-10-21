import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ReactFlow,
  MiniMap,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  addEdge,
  Connection,
  Edge,
  Node,
  NodeTypes,
  MarkerType,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

import { useSupplyNetwork } from '@/hooks/useSupplyNetwork';
import { SupplyNetworkNode } from './SupplyNetworkNode';
import { SupplyNetworkToolbar } from './SupplyNetworkToolbar';
import { EditNodeModal } from './EditNodeModal';
import { RelationshipEditorModal } from './RelationshipEditorModal';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

const nodeTypes: NodeTypes = {
  supplyNetworkNode: SupplyNetworkNode,
};

const getNodeColor = (nodeTypeCode: string) => {
  switch (nodeTypeCode?.toLowerCase()) {
    case 'factory': 
    case 'manufacturer': 
      return '#ef4444'; // Red
    case 'warehouse': 
      return '#3b82f6'; // Blue
    case 'distributor': 
    case 'distribution_center':
      return '#10b981'; // Green
    case 'retailer': 
    case 'retail':
    case 'customer':
      return '#8b5cf6'; // Purple
    case 'supplier': 
      return '#f59e0b'; // Orange
    default: 
      return '#6b7280'; // Gray
  }
};

const getIconNameForType = (typeCode: string) => {
  switch (typeCode?.toLowerCase()) {
    case 'factory':
    case 'manufacturer':
      return 'Factory';
    case 'warehouse':
      return 'Warehouse';
    case 'distributor':
    case 'distribution_center':
      return 'Truck';
    case 'retailer':
    case 'retail':
    case 'customer':
      return 'Store';
    case 'supplier':
      return 'Package';
    default:
      return 'Package';
  }
};

// Save/load positions from localStorage
const saveNodePositions = (nodes: Node[]) => {
  const positions = nodes.reduce((acc, node) => {
    acc[node.id] = node.position;
    return acc;
  }, {} as Record<string, { x: number; y: number }>);
  localStorage.setItem('supply-network-positions', JSON.stringify(positions));
};

const loadNodePositions = (): Record<string, { x: number; y: number }> => {
  try {
    const saved = localStorage.getItem('supply-network-positions');
    return saved ? JSON.parse(saved) : {};
  } catch {
    return {};
  }
};

export const SupplyNetworkFlow: React.FC = () => {
  const { nodes: dbNodes, relationships: dbRelationships, isLoading, createRelationship, deleteRelationship } = useSupplyNetwork();
  const [editingNodeId, setEditingNodeId] = useState<string | null>(null);
  const [editingRelationshipId, setEditingRelationshipId] = useState<string | null>(null);
  const [dbNodeTypes, setDbNodeTypes] = useState<Array<{id: string, type_code: string, type_name: string, icon_name: string}>>([]);

  // Initialize node types from API
  useEffect(() => {
    const fetchNodeTypes = async () => {
      try {
        const response = await fetch('/api/supply-network-node-types');
        if (response.ok) {
          const nodeTypes = await response.json();
          // Map the API response to match the expected format
          const mappedTypes = nodeTypes.map((type: any) => ({
            id: type.id,
            type_code: type.type_code?.toLowerCase() || 'unknown',
            type_name: type.type_name,
            icon_name: getIconNameForType(type.type_code)
          }));
          setDbNodeTypes(mappedTypes);
        }
      } catch (error) {
        console.error('Failed to fetch node types:', error);
        // Fallback to hardcoded types if API fails
        const fallbackTypes = [
          { id: '1', type_code: 'supplier', type_name: 'Supplier', icon_name: 'Package' },
          { id: '2', type_code: 'warehouse', type_name: 'Warehouse', icon_name: 'Warehouse' },
          { id: '3', type_code: 'customer', type_name: 'Customer', icon_name: 'Store' },
        ];
        setDbNodeTypes(fallbackTypes);
      }
    };

    fetchNodeTypes();
  }, []);
  
  // Convert database nodes to React Flow nodes
  const flowNodes: Node[] = useMemo(() => {
    if (!dbNodes) return [];
    
    const savedPositions = loadNodePositions();
    
    return dbNodes.map((node, index) => {
      const nodeTypeInfo = dbNodeTypes.find(nt => nt.id === node.node_type_id);
      const savedPosition = savedPositions[node.id];
      
      return {
        id: node.id,
        type: 'supplyNetworkNode',
        position: savedPosition || { 
          x: (index % 4) * 250 + 100, 
          y: Math.floor(index / 4) * 200 + 100 
        },
        data: {
          label: node.node_name || node.id,
          nodeType: node.node_type_id || 'unknown',
          nodeTypeCode: nodeTypeInfo?.type_code || 'unknown',
          iconName: nodeTypeInfo?.icon_name || 'Package',
          properties: node.contact_information || {},
          status: node.status,
          color: getNodeColor(nodeTypeInfo?.type_code || 'unknown'),
        },
      };
    });
  }, [dbNodes, dbNodeTypes]);

  // Convert database relationships to React Flow edges
  const flowEdges: Edge[] = useMemo(() => {
    if (!dbRelationships) return [];
    
    return dbRelationships.map((rel) => {
      // Create a meaningful label with lead time and cost
      const leadTime = rel.lead_time ? `${rel.lead_time}d` : '';
      const cost = rel.cost ? `$${rel.cost}` : '';
      const labelParts = [leadTime, cost].filter(Boolean);
      const label = labelParts.length > 0 ? labelParts.join(' | ') : 'Connection';

      return {
        id: rel.id,
        source: rel.from_node_id,
        target: rel.to_node_id,
        type: 'smoothstep',
        animated: true,
        label: label,
        markerEnd: {
          type: MarkerType.ArrowClosed,
        },
        style: {
          stroke: 'hsl(var(--primary))',
          strokeWidth: 2,
        },
        data: {
          relationshipId: rel.id,
          relationshipType: rel.relationship_type || 'unknown',
          properties: { 
            description: '', 
            cost: rel.cost || 0,
            leadTime: rel.lead_time || 0
          },
        },
      };
    });
  }, [dbRelationships]);

  const [nodes, setNodes, onNodesChange] = useNodesState(flowNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(flowEdges);

  // Save positions when nodes change
  const handleNodesChange = useCallback((changes: any[]) => {
    onNodesChange(changes);
    // Save positions after a short delay to avoid excessive saves during dragging
    setTimeout(() => {
      setNodes((currentNodes) => {
        saveNodePositions(currentNodes);
        return currentNodes;
      });
    }, 100);
  }, [onNodesChange, setNodes]);

  // Update nodes and edges when database data changes
  useEffect(() => {
    setNodes(flowNodes);
  }, [flowNodes]);

  useEffect(() => {
    setEdges(flowEdges);
  }, [flowEdges]);

  const onConnect = useCallback(
    (params: Connection) => {
      if (params.source && params.target) {
        createRelationship.mutate({
          from_node_id: params.source,
          to_node_id: params.target,
          relationship_type: 'supply-001',
          capacity: null,
          cost: null,
          lead_time: null,
        });
      }
    },
    [createRelationship]
  );

  const onEdgeDoubleClick = useCallback(
    (event: React.MouseEvent, edge: Edge) => {
      event.preventDefault();
      if (edge.data?.relationshipId && typeof edge.data.relationshipId === 'string') {
        setEditingRelationshipId(edge.data.relationshipId);
      }
    },
    []
  );

  const onNodeDoubleClick = useCallback(
    (event: React.MouseEvent, node: Node) => {
      event.preventDefault();
      setEditingNodeId(node.id);
    },
    []
  );

  if (isLoading) {
    return (
      <Card className="w-full h-[800px] p-4">
        <div className="space-y-4">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-full w-full" />
        </div>
      </Card>
    );
  }

  return (
    <div className="w-full h-[800px] relative">
      <SupplyNetworkToolbar />
      
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={handleNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onEdgeDoubleClick={onEdgeDoubleClick}
        onNodeDoubleClick={onNodeDoubleClick}
        nodeTypes={nodeTypes}
        fitView
        attributionPosition="top-right"
        style={{ 
          backgroundColor: 'hsl(var(--background))',
        }}
        className="bg-background"
      >
        <Controls />
        <MiniMap 
          style={{
            backgroundColor: 'hsl(var(--muted))',
          }}
          nodeColor={(node) => node.style?.background as string || 'hsl(var(--primary))'}
        />
        <Background 
          color="hsl(var(--muted-foreground))" 
          gap={20}
          style={{
            backgroundColor: 'hsl(var(--background))',
          }}
        />
      </ReactFlow>

      {editingNodeId && (
        <EditNodeModal
          isOpen={!!editingNodeId}
          onClose={() => setEditingNodeId(null)}
          nodeId={editingNodeId}
        />
      )}

      {editingRelationshipId && (
        <RelationshipEditorModal
          isOpen={!!editingRelationshipId}
          onClose={() => setEditingRelationshipId(null)}
          relationshipId={editingRelationshipId}
        />
      )}
    </div>
  );
};