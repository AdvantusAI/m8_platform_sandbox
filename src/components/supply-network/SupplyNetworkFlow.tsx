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
import { supabase } from '@/integrations/supabase/client';
import { Wrench, Settings } from 'lucide-react';
import { toast } from 'sonner';

const nodeTypes: NodeTypes = {
  supplyNetworkNode: SupplyNetworkNode,
};

const getNodeColor = (nodeTypeCode: string) => {
  // Return default color for all node types
  switch (nodeTypeCode?.toLowerCase()) {
    case 'factory': 
    case 'Planta de producción':
    case 'manufacturer': 
      return '#ef4444'; // Red
    case 'warehouse': 
    case 'cedis':
    case 'Cedis':
      return '#3b82f6'; // Blue
    case 'distributor': 
    case 'distribution_center':
      return '#10b981'; // Green
    case 'retailer': 
    case 'retail':
    case 'customer':
    case 'Customer':
    case 'customers':
    case 'Tiendas de retail':
      return '#8b5cf6'; // Purple
    case 'Proveedor':
    case 'supplier': 
      return '#f59e0b'; // Orange
    default: 
      return '#21788f'; // Default gray
  }
};


const getIconNameForType = (typeCode: string) => {
  switch (typeCode?.toLowerCase()) {
    case 'factory':
    case 'manufacturer':
    case 'Planta de producción':
      return 'Factory';
    case 'Cedis':
    case 'cedis':
    case 'warehouse':
      return 'Warehouse';
    case 'distributor':
    case 'distribution_center':

      return 'Truck';
    case 'retailer':
    case 'Retail':
    case 'Customer':
    case 'customer':
    case 'customers':
    case 'Tiendas de retail':
      return 'Store';
    case 'Supplier':
    case 'Proveedor':
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
  const [dbRelationshipTypes, setDbRelationshipTypes] = useState<Array<{id: string, type_code: string, type_name: string}>>([]);
  const [contextMenu, setContextMenu] = useState<{
    id: string;
    x: number;
    y: number;
  } | null>(null);

  // Fetch node types and relationship types
  useEffect(() => {
    const fetchNodeTypes = async () => {
      try {
        const { data, error } = await 
          (supabase as any).schema('m8_schema').rpc('get_supply_network_node_types');
           // Map the API response to match the expected format
          const nodeTypes = data;
          const mappedTypes = nodeTypes.map((type: any) => ({
            id: type.id,
            type_code: type.type_code?.toLowerCase() || 'unknown',
            type_name: type.type_name,
            icon_name: getIconNameForType(type.type_code)
          }));
        console.log('Fetched and mapped node types:', mappedTypes);
        if (error) throw error;
        setDbNodeTypes(mappedTypes || []);
      } catch (error) {
        console.error('Error fetching node types:', error);
      }
    };

    const fetchRelationshipTypes = async () => {
      try {
        const { data, error } = await 
          (supabase as any).schema('m8_schema').rpc('get_supply_network_relationship_types');
        if (error) throw error;
        console.log('Fetched relationship types:', data);
        setDbRelationshipTypes(data || []);
      } catch (error) {
        console.error('Error fetching relationship types:', error);
      }
    };

    fetchNodeTypes();
    fetchRelationshipTypes();
  }, []);
  
  // Convert database nodes to React Flow nodes
  const flowNodes: Node[] = useMemo(() => {
    
    if (!dbNodes) return [];
    
    const savedPositions = loadNodePositions();
    
    return dbNodes.map((node, index) => {
      const nodeTypeInfo = dbNodeTypes.find(nt => nt.id === node.node_type_id);
      const savedPosition = savedPositions[node.id];
      
      // If not found by ID, try to find by common patterns
      let finalNodeTypeCode = nodeTypeInfo?.type_code || 'unknown';
      let finalIconName = nodeTypeInfo?.icon_name || 'Package';
      
      // Special handling for known node types based on name patterns
      if (!nodeTypeInfo && node.node_name) {
        const nodeName = node.node_name.toLowerCase();
        if (nodeName.includes('centro') && nodeName.includes('distrib')) {
          finalNodeTypeCode = 'cedis';
          finalIconName = 'Warehouse';
        } else if (nodeName.includes('planta')) {
          finalNodeTypeCode = 'planta de producción';
          finalIconName = 'Factory';
        } else if (nodeName.includes('tienda')) {
          finalNodeTypeCode = 'tiendas de retail';
          finalIconName = 'Store';
        }
      }
      
      console.log(`Processing node ${node.node_name}:`, {
        nodeTypeId: node.node_type_id,
        availableTypes: dbNodeTypes.length,
        foundType: nodeTypeInfo,
        finalNodeTypeCode,
        finalIconName
      });
      
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
          nodeTypeCode: finalNodeTypeCode,
          iconName: finalIconName,
          properties: node.contact_information || {},
          status: node.status,
          color: getNodeColor(finalNodeTypeCode),
        },
      };
    });
  }, [dbNodes, dbNodeTypes]);

  // Convert database relationships to React Flow edges
  const flowEdges: Edge[] = useMemo(() => {
    
    if (!dbRelationships) return [];
    
    return dbRelationships.map((rel) => {
      // Create a meaningful label with lead time and cost
      const leadTime = rel.lead_time_days ? `${rel.lead_time_days}d` : '';
      const cost = rel.primary_transport_cost ? `$${rel.primary_transport_cost}` : '';
      const labelParts = [leadTime, cost].filter(Boolean);
      const label = labelParts.length > 0 ? labelParts.join(' | ') : 'Connection';

      return {
        id: rel.id,
        source: rel.source_node_id,
        target: rel.target_node_id,
        animated: rel.status === 'active',
        label: label,
        labelStyle: {
          fontSize: '12px',
          fontWeight: 'bold',
          fill: '#FF0072',
        },
        labelBgStyle: {
          fill: 'rgb(223, 251, 253)',
          fillOpacity: 0.8,
          stroke: '#FF0072',
          strokeWidth: 1,
          rx: 4,
          ry: 4,
        },
        style: {
          strokeWidth: 2,
          stroke: '#FF0072',
        },
        markerEnd: {
          type: MarkerType.ArrowClosed,
          width: 20,
          height: 20,
          color: '#FF0072',
        },
        data: {
          relationshipId: rel.id,
          relationshipType: rel.relationship_type_id || 'unknown',
          properties: { 
            description: rel.description || '', 
            cost: rel.cost || 0,
            leadTime: rel.lead_time_days || 0
          },
          status: rel.status,
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
        console.log('Attempting to connect:', params);
        console.log('Available relationship types:', dbRelationshipTypes);
        
        // Find the SUPPLIES relationship type UUID - try multiple possible codes
        let suppliesType = dbRelationshipTypes.find(rt => rt.type_code === 'SUPPLIES');
        if (!suppliesType) {
          suppliesType = dbRelationshipTypes.find(rt => rt.type_code === 'supplies');
        }
        if (!suppliesType) {
          suppliesType = dbRelationshipTypes.find(rt => rt.type_code?.toUpperCase() === 'SUPPLIES');
        }
        // If still not found, use the first available relationship type
        if (!suppliesType && dbRelationshipTypes.length > 0) {
          suppliesType = dbRelationshipTypes[0];
          console.warn('SUPPLIES type not found, using first available type:', suppliesType);
        }
        
        if (!suppliesType) {
          console.error('No relationship types available');
          toast.error('No hay tipos de relación disponibles');
          return;
        }

        console.log('Using relationship type:', suppliesType);

        createRelationship.mutate({
          source_node_id: params.source,
          target_node_id: params.target,
          relationship_type_id: suppliesType.id, // Use the proper UUID
          status: 'active',
          description: 'Auto-created relationship',
        }, {
          onSuccess: (data) => {
            console.log('Relationship created successfully:', data);
            toast.success('Relación creada exitosamente');
          },
          onError: (error) => {
            console.error('Error creating relationship:', error);
            toast.error('Error al crear la relación: ' + (error.message || 'Error desconocido'));
          }
        });
      }
    },
    [createRelationship, dbRelationshipTypes]
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

  const onNodeContextMenu = useCallback(
    (event: React.MouseEvent, node: Node) => {
      event.preventDefault();
      setContextMenu({
        id: node.id,
        x: event.clientX,
        y: event.clientY,
      });
    },
    []
  );

  const onPaneClick = useCallback(() => {
    setContextMenu(null);
  }, []);

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
        onNodeContextMenu={onNodeContextMenu}
        onPaneClick={onPaneClick}
        nodeTypes={nodeTypes}
        fitView
        style={{ 
          backgroundColor: 'hsl(var(--background))',
        }}
        attributionPosition="top-right"
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

      {/* Context Menu */}
      {contextMenu && (
        <div
          className="fixed z-50 bg-[#e1ebf7] border border-gray-200 rounded-lg shadow-lg py-1 min-w-[150px]"
          style={{
            left: contextMenu.x,
            top: contextMenu.y,
          }}
        >
          <button
            className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors flex items-center"
            onClick={() => {
              //console.log('Supply workbench clicked for node:', contextMenu.id);
              setContextMenu(null);
            }}
          >
            <Wrench className="mr-2 h-4 w-4" /> Supply workbench
          </button>
          <button
            className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors flex items-center"
            onClick={() => {
              //console.log('Parámetros de suministro clicked for node:', contextMenu.id);
              setContextMenu(null);
            }}
          >
            <Settings className="mr-2 h-4 w-4" /> Parámetros de suministro
          </button>
        </div>
      )}
    </div>
  );
};