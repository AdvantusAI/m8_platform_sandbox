import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter
} from '@/components/ui/dialog';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { 
  Network,
  Plus,
  Edit,
  Trash2,
  Building2,
  Users,
  ArrowRight,
  Save,
  X,
  Search,
  Filter
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { AgGridReact } from 'ag-grid-react';
import { ColDef, ICellRendererParams } from 'ag-grid-community';
import { myTheme } from '../styles/ag-grid-theme-m8.js';

interface SupplyNetworkNode {
  id: string;
  node_name: string;
  location_code: string;
  node_type: string;
  description?: string;
  address?: string;
  city?: string;
  state?: string;
  country?: string;
  postal_code?: string;
  is_active: boolean;
  capacity?: number;
  created_at: string;
  updated_at: string;
}

interface SupplyNetworkRelationship {
  id: string;
  source_node_id: string;
  target_node_id: string;
  relationship_type_id: string;
  relationship_type?: {
    id: string;
    type_name: string;
  };
  distance?: number;
  transport_time?: number;
  transport_cost?: number;
  is_active: boolean;
  created_at: string;
  source_node?: SupplyNetworkNode;
  target_node?: SupplyNetworkNode;
}

export default function Red() {
  const [nodes, setNodes] = useState<SupplyNetworkNode[]>([]);
  const [relationships, setRelationships] = useState<SupplyNetworkRelationship[]>([]);
  const [relationshipTypes, setRelationshipTypes] = useState<{id: string, type_name: string}[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all');
  
  // Node form state
  const [nodeFormOpen, setNodeFormOpen] = useState(false);
  const [editingNode, setEditingNode] = useState<SupplyNetworkNode | null>(null);
  const [nodeForm, setNodeForm] = useState({
    node_name: '',
    location_code: '',
    node_type: 'warehouse',
    description: '',
    address: '',
    city: '',
    state: '',
    country: '',
    postal_code: '',
    capacity: 0,
    is_active: true
  });

  // Relationship form state
  const [relationshipFormOpen, setRelationshipFormOpen] = useState(false);
  const [editingRelationship, setEditingRelationship] = useState<SupplyNetworkRelationship | null>(null);
  const [relationshipForm, setRelationshipForm] = useState({
    source_node_id: '',
    target_node_id: '',
    relationship_type_id: '',
    distance: 0,
    transport_time: 0,
    transport_cost: 0,
    is_active: true
  });

  // Create stable callback functions
  const setupWindowFunctions = useCallback(() => {
    (window as any).editNode = (nodeId: string) => {
      const node = nodes.find(n => n.id === nodeId);
      if (node) openNodeForm(node);
    };
    
    (window as any).deleteNode = (nodeId: string) => {
      const node = nodes.find(n => n.id === nodeId);
      if (node) handleDeleteNode(node);
    };
    
    (window as any).editRelationship = (relationshipId: string) => {
      const relationship = relationships.find(r => r.id === relationshipId);
      if (relationship) openRelationshipForm(relationship);
    };
    
    (window as any).deleteRelationship = (relationshipId: string) => {
      const relationship = relationships.find(r => r.id === relationshipId);
      if (relationship) handleDeleteRelationship(relationship);
    };
  }, [nodes, relationships]);

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    setupWindowFunctions();
    
    // Cleanup on unmount
    return () => {
      delete (window as any).editNode;
      delete (window as any).deleteNode;
      delete (window as any).editRelationship;
      delete (window as any).deleteRelationship;
    };
  }, [setupWindowFunctions]);

  const loadNodes = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .schema('m8_schema')
        .from('supply_network_nodes')
        .select('*')
        .order('node_name');

      if (error) throw error;
      setNodes(data || []);
    } catch (error) {
      console.error('Error loading nodes:', error);
    }
  }, []);

  const loadRelationshipTypes = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .schema('m8_schema')
        .from('supply_network_relationship_types')
        .select('id, type_name')
        .order('type_name');

      if (error) throw error;
      setRelationshipTypes(data || []);
    } catch (error) {
      console.error('Error loading relationship types:', error);
    }
  }, []);

  const loadRelationships = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .schema('m8_schema')
        .from('supply_network_relationships')
        .select(`
          *,
          source_node:source_node_id (id, node_name, location_code),
          target_node:target_node_id (id, node_name, location_code),
          relationship_type:relationship_type_id (id, type_name)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setRelationships(data || []);
    } catch (error) {
      console.error('Error loading relationships:', error);
    }
  }, []);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      await Promise.all([
        loadNodes(),
        loadRelationships(),
        loadRelationshipTypes()
      ]);
    } catch (error) {
      console.error('Error loading data:', error);
      toast({
        title: "Error al cargar datos",
        description: "Hubo un problema al cargar los datos de la red de suministro.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  }, [loadNodes, loadRelationships, loadRelationshipTypes]);

  const handleSaveNode = async () => {
    try {
      const nodeData = {
        ...nodeForm,
        capacity: nodeForm.capacity || null
      };

      if (editingNode) {
        const { error } = await supabase
          .schema('m8_schema')
          .from('supply_network_nodes')
          .update(nodeData)
          .eq('id', editingNode.id);

        if (error) throw error;
        toast({ title: "Nodo actualizado exitosamente" });
      } else {
        const { error } = await supabase
          .schema('m8_schema')
          .from('supply_network_nodes')
          .insert([nodeData]);

        if (error) throw error;
        toast({ title: "Nodo creado exitosamente" });
      }

      setNodeFormOpen(false);
      setEditingNode(null);
      resetNodeForm();
      loadNodes();
    } catch (error: any) {
      console.error('Error saving node:', error);
      toast({
        title: "Error al guardar nodo",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  const handleSaveRelationship = async () => {
    try {
      if (relationshipForm.source_node_id === relationshipForm.target_node_id) {
        toast({
          title: "Error",
          description: "Un nodo no puede tener una relación consigo mismo",
          variant: "destructive"
        });
        return;
      }

      const relationshipData = {
        ...relationshipForm,
        distance: relationshipForm.distance || null,
        transport_time: relationshipForm.transport_time || null,
        transport_cost: relationshipForm.transport_cost || null
      };

      if (editingRelationship) {
        const { error } = await supabase
          .schema('m8_schema')
          .from('supply_network_relationships')
          .update(relationshipData)
          .eq('id', editingRelationship.id);

        if (error) throw error;
        toast({ title: "Relación actualizada exitosamente" });
      } else {
        const { error } = await supabase
          .schema('m8_schema')
          .from('supply_network_relationships')
          .insert([relationshipData]);

        if (error) throw error;
        toast({ title: "Relación creada exitosamente" });
      }

      setRelationshipFormOpen(false);
      setEditingRelationship(null);
      resetRelationshipForm();
      loadRelationships();
    } catch (error: any) {
      console.error('Error saving relationship:', error);
      toast({
        title: "Error al guardar relación",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  const handleDeleteNode = async (node: SupplyNetworkNode) => {
    if (window.confirm(`¿Está seguro de que desea eliminar el nodo "${node.node_name}"?`)) {
      try {
        const { error } = await supabase
          .schema('m8_schema')
          .from('supply_network_nodes')
          .delete()
          .eq('id', node.id);

        if (error) throw error;
        toast({ title: "Nodo eliminado exitosamente" });
        loadNodes();
      } catch (error: any) {
        console.error('Error deleting node:', error);
        toast({
          title: "Error al eliminar nodo",
          description: error.message,
          variant: "destructive"
        });
      }
    }
  };

  const handleDeleteRelationship = async (relationship: SupplyNetworkRelationship) => {
    if (window.confirm('¿Está seguro de que desea eliminar esta relación?')) {
      try {
        const { error } = await supabase
          .schema('m8_schema')
          .from('supply_network_relationships')
          .delete()
          .eq('id', relationship.id);

        if (error) throw error;
        toast({ title: "Relación eliminada exitosamente" });
        loadRelationships();
      } catch (error: any) {
        console.error('Error deleting relationship:', error);
        toast({
          title: "Error al eliminar relación",
          description: error.message,
          variant: "destructive"
        });
      }
    }
  };

  const resetNodeForm = () => {
    setNodeForm({
      node_name: '',
      location_code: '',
      node_type: 'warehouse',
      description: '',
      address: '',
      city: '',
      state: '',
      country: '',
      postal_code: '',
      capacity: 0,
      is_active: true
    });
  };

  const resetRelationshipForm = () => {
    setRelationshipForm({
      source_node_id: '',
      target_node_id: '',
      relationship_type_id: '',
      distance: 0,
      transport_time: 0,
      transport_cost: 0,
      is_active: true
    });
  };

  const openNodeForm = (node?: SupplyNetworkNode) => {
    if (node) {
      setEditingNode(node);
      setNodeForm({
        node_name: node.node_name,
        location_code: node.location_code,
        node_type: node.node_type,
        description: node.description || '',
        address: node.address || '',
        city: node.city || '',
        state: node.state || '',
        country: node.country || '',
        postal_code: node.postal_code || '',
        capacity: node.capacity || 0,
        is_active: node.is_active
      });
    } else {
      setEditingNode(null);
      resetNodeForm();
    }
    setNodeFormOpen(true);
  };

  const openRelationshipForm = (relationship?: SupplyNetworkRelationship) => {
    if (relationship) {
      setEditingRelationship(relationship);
      setRelationshipForm({
        source_node_id: relationship.source_node_id,
        target_node_id: relationship.target_node_id,
        relationship_type_id: relationship.relationship_type_id,
        distance: relationship.distance || 0,
        transport_time: relationship.transport_time || 0,
        transport_cost: relationship.transport_cost || 0,
        is_active: relationship.is_active
      });
    } else {
      setEditingRelationship(null);
      resetRelationshipForm();
    }
    setRelationshipFormOpen(true);
  };

  const filteredNodes = nodes.filter(node => {
    const matchesSearch = node.node_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         node.location_code.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter = filterType === 'all' || node.node_type === filterType;
    return matchesSearch && matchesFilter;
  });

  // Cell renderers
  const NodeTypeCellRenderer = (params: ICellRendererParams) => {
    const type = params.value;
    if (!type) return '';
    
    const colorMap: { [key: string]: string } = {
      warehouse: 'bg-blue-100 text-blue-800',
      factory: 'bg-green-100 text-green-800',
      supplier: 'bg-purple-100 text-purple-800',
      customer: 'bg-orange-100 text-orange-800',
      distribution_center: 'bg-indigo-100 text-indigo-800'
    };
    
    const colorClass = colorMap[type] || 'bg-gray-100 text-gray-800';
    const displayText = type.replace('_', ' ').toUpperCase();
    
    return `<span class="inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ${colorClass}">
      ${displayText}
    </span>`;
  };

  const StatusCellRenderer = (params: ICellRendererParams) => {
    const isActive = params.value;
    if (isActive === undefined || isActive === null) return '';
    
    const colorClass = isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800';
    const text = isActive ? 'Activo' : 'Inactivo';
    
    return `<span class="inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ${colorClass}">
      ${text}
    </span>`;
  };

  const ActionsCellRenderer = (params: ICellRendererParams) => {
    const node = params.data;
    if (!node || !node.id) return '';
    
    return `
      <div class="flex gap-2">
        <button 
          class="inline-flex items-center justify-center rounded-md border border-gray-200 bg-white px-2 py-1 text-xs font-medium text-gray-600 hover:bg-gray-50 h-8 w-8"
          onclick="window.editNode && window.editNode('${node.id}')"
          title="Editar nodo"
        >
          ✏️
        </button>
        <button 
          class="inline-flex items-center justify-center rounded-md border border-gray-200 bg-white px-2 py-1 text-xs font-medium text-red-600 hover:bg-red-50 h-8 w-8"
          onclick="window.deleteNode && window.deleteNode('${node.id}')"
          title="Eliminar nodo"
        >
          🗑️
        </button>
      </div>
    `;
  };

  const AccuracyCellRenderer = (params: ICellRendererParams) => {
    const score = params.value;

    
    return (
      <span className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ${'text-green-600 bg-green-50'}`}>
        {score}
      </span>
    );
  };

  const RelationshipActionsCellRenderer = (params: ICellRendererParams) => {
    const relationship = params.data;
    if (!relationship || !relationship.id) return '';
    
    return `
      <div class="flex gap-2">
        <button 
          class="inline-flex items-center justify-center rounded-md border border-gray-200 bg-white px-2 py-1 text-xs font-medium text-gray-600 hover:bg-gray-50 h-8 w-8"
          onclick="window.editRelationship && window.editRelationship('${relationship.id}')"
          title="Editar relación"
        >
          ✏️
        </button>
        <button 
          class="inline-flex items-center justify-center rounded-md border border-gray-200 bg-white px-2 py-1 text-xs font-medium text-red-600 hover:bg-red-50 h-8 w-8"
          onclick="window.deleteRelationship && window.deleteRelationship('${relationship.id}')"
          title="Eliminar relación"
        >
          🗑️
        </button>
      </div>
    `;
  };

  // Column definitions
  const nodeColumns: ColDef[] = [
    {
      field: 'node_name',
      headerName: 'Nombre del Nodo',
      width: 200,
      cellClass: 'font-medium'
    },
    {
      field: 'location_code',
      headerName: 'Código de Ubicación',
      width: 150,
      cellClass: 'font-mono'
    },
    {
      field: 'node_type',
      headerName: 'Tipo',
      width: 150,
      cellRenderer: NodeTypeCellRenderer
    },
    {
      field: 'city',
      headerName: 'Ciudad',
      width: 120
    },
    {
      field: 'minimum_order_quantity',
      headerName: 'Cantidad mínima de pedido',
      width: 120
    },
    {
      field: 'status',
      headerName: 'Estatus',
      width: 120
    },
    {
      field: 'capacity',
      headerName: 'Capacidad',
      width: 120,
      cellClass: 'text-center'
    },
    {
      field: 'is_active',
      headerName: 'Estado',
      width: 100,
      cellRenderer: StatusCellRenderer
    }
  ];

  const relationshipColumns: ColDef[] = [
    {
      field: 'source_node.node_name',
      headerName: 'Nodo Origen',
      width: 200,
      cellClass: 'font-medium',
      valueGetter: (params: any) => {
        return params.data?.source_node?.node_name || '';
      }
    }, {
      field: 'relationship_type.type_name',
      headerName: 'Tipo de Relación',
      width: 150,
      cellRenderer:AccuracyCellRenderer
    },
    {
      field: 'target_node.node_name',
      headerName: 'Nodo Destino',
      width: 200,
      cellClass: 'font-medium',
      valueGetter: (params: any) => {
        return params.data?.target_node?.node_name || '';
      }
    },
   
    {
      field: 'distance',
      headerName: 'Distancia (km)',
      width: 130,
      cellClass: 'text-center'
    },
    {
      field: 'transport_time',
      headerName: 'Tiempo (hrs)',
      width: 130,
      cellClass: 'text-center'
    },
    {
      field: 'transport_cost',
      headerName: 'Costo',
      width: 120,
      cellClass: 'text-center'
    },
    {
      field: 'is_active',
      headerName: 'Estado',
      width: 100,
      cellRenderer: StatusCellRenderer
    }
  ];

  const nodeTypes = [
    { value: 'warehouse', label: 'Almacén' },
    { value: 'factory', label: 'Fábrica' },
    { value: 'supplier', label: 'Proveedor' },
    { value: 'customer', label: 'Cliente' },
    { value: 'distribution_center', label: 'Centro de Distribución' }
  ];


  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Gestión de Red de Suministro</h1>
          <p className="text-muted-foreground">
            Administre nodos y relaciones de la red de suministro
          </p>
        </div>
        <div className="flex items-center gap-4">
          <Button onClick={loadData} disabled={loading}>
            <Network className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Actualizar
          </Button>
        </div>
      </div>

      <Tabs defaultValue="nodes" className="space-y-4">
        <TabsList>
          <TabsTrigger value="nodes">Nodos de Red</TabsTrigger>
          <TabsTrigger value="relationships">Relaciones</TabsTrigger>
        </TabsList>

        <TabsContent value="nodes">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Building2 className="h-5 w-5" />
                  Nodos de la Red de Suministro ({filteredNodes.length})
                </CardTitle>
                <Button onClick={() => openNodeForm()}>
                  <Plus className="h-4 w-4 mr-2" />
                  Agregar Nodo
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex gap-4 mb-4">
                <div className="flex-1">
                  <div className="relative">
                    <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Buscar por nombre o código..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-8"
                    />
                  </div>
                </div>
                <Select value={filterType} onValueChange={setFilterType}>
                  <SelectTrigger className="w-48">
                    <Filter className="h-4 w-4 mr-2" />
                    <SelectValue placeholder="Filtrar por tipo" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos los tipos</SelectItem>
                    {nodeTypes.map(type => (
                      <SelectItem key={type.value} value={type.value}>
                        {type.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div style={{ height: '600px', width: '100%' }}>
                <AgGridReact
                  rowData={filteredNodes}
                  columnDefs={nodeColumns}
                  theme={myTheme}
                  defaultColDef={{
                    sortable: true,
                    filter: true,
                    resizable: true,
                  }}
                  pagination={true}
                  paginationPageSize={20}
                  suppressRowClickSelection={true}
                  rowSelection="multiple"
                  animateRows={true}
                  noRowsOverlayComponent={() => (
                    <div className="text-center py-8 text-muted-foreground">
                      No se encontraron nodos
                    </div>
                  )}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="relationships">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <ArrowRight className="h-5 w-5" />
                  Relaciones de la Red ({relationships.length})
                </CardTitle>
                <Button onClick={() => openRelationshipForm()}>
                  <Plus className="h-4 w-4 mr-2" />
                  Agregar Relación
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div style={{ height: '600px', width: '100%' }}>
                <AgGridReact
                  rowData={relationships}
                  columnDefs={relationshipColumns}
                  theme={myTheme}
                  defaultColDef={{
                    sortable: true,
                    filter: true,
                    resizable: true,
                  }}
                  pagination={true}
                  paginationPageSize={20}
                  suppressRowClickSelection={true}
                  rowSelection="multiple"
                  animateRows={true}
                  noRowsOverlayComponent={() => (
                    <div className="text-center py-8 text-muted-foreground">
                      No se encontraron relaciones
                    </div>
                  )}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Node Form Dialog */}
      <Dialog open={nodeFormOpen} onOpenChange={setNodeFormOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {editingNode ? 'Editar Nodo' : 'Agregar Nuevo Nodo'}
            </DialogTitle>
          </DialogHeader>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="node_name">Nombre del Nodo</Label>
              <Input
                id="node_name"
                value={nodeForm.node_name}
                onChange={(e) => setNodeForm(prev => ({ ...prev, node_name: e.target.value }))}
                placeholder="Ingrese el nombre del nodo"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="location_code">Código de Ubicación</Label>
              <Input
                id="location_code"
                value={nodeForm.location_code}
                onChange={(e) => setNodeForm(prev => ({ ...prev, location_code: e.target.value }))}
                placeholder="Ingrese el código"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="node_type">Tipo de Nodo</Label>
              <Select value={nodeForm.node_type} onValueChange={(value) => setNodeForm(prev => ({ ...prev, node_type: value }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {nodeTypes.map(type => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="capacity">Capacidad</Label>
              <Input
                id="capacity"
                type="number"
                value={nodeForm.capacity}
                onChange={(e) => setNodeForm(prev => ({ ...prev, capacity: Number(e.target.value) }))}
                placeholder="Capacidad"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="address">Dirección</Label>
              <Input
                id="address"
                value={nodeForm.address}
                onChange={(e) => setNodeForm(prev => ({ ...prev, address: e.target.value }))}
                placeholder="Dirección"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="city">Ciudad</Label>
              <Input
                id="city"
                value={nodeForm.city}
                onChange={(e) => setNodeForm(prev => ({ ...prev, city: e.target.value }))}
                placeholder="Ciudad"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="state">Estado</Label>
              <Input
                id="state"
                value={nodeForm.state}
                onChange={(e) => setNodeForm(prev => ({ ...prev, state: e.target.value }))}
                placeholder="Estado"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="country">País</Label>
              <Input
                id="country"
                value={nodeForm.country}
                onChange={(e) => setNodeForm(prev => ({ ...prev, country: e.target.value }))}
                placeholder="País"
              />
            </div>

            <div className="col-span-2 space-y-2">
              <Label htmlFor="description">Descripción</Label>
              <Textarea
                id="description"
                value={nodeForm.description}
                onChange={(e) => setNodeForm(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Descripción del nodo"
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setNodeFormOpen(false)}>
              <X className="h-4 w-4 mr-2" />
              Cancelar
            </Button>
            <Button onClick={handleSaveNode}>
              <Save className="h-4 w-4 mr-2" />
              {editingNode ? 'Actualizar' : 'Crear'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Relationship Form Dialog */}
      <Dialog open={relationshipFormOpen} onOpenChange={setRelationshipFormOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editingRelationship ? 'Editar Relación' : 'Agregar Nueva Relación'}
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="source_node_id">Nodo Origen</Label>
              <Select value={relationshipForm.source_node_id} onValueChange={(value) => setRelationshipForm(prev => ({ ...prev, source_node_id: value }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleccione el nodo origen" />
                </SelectTrigger>
                <SelectContent>
                  {nodes.map(node => (
                    <SelectItem key={node.id} value={node.id}>
                      {node.node_name} ({node.location_code})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="target_node_id">Nodo Destino</Label>
              <Select value={relationshipForm.target_node_id} onValueChange={(value) => setRelationshipForm(prev => ({ ...prev, target_node_id: value }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleccione el nodo destino" />
                </SelectTrigger>
                <SelectContent>
                  {nodes.map(node => (
                    <SelectItem key={node.id} value={node.id}>
                      {node.node_name} ({node.location_code})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="relationship_type_id">Tipo de Relación</Label>
              <Select value={relationshipForm.relationship_type_id} onValueChange={(value) => setRelationshipForm(prev => ({ ...prev, relationship_type_id: value }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleccione el tipo de relación" />
                </SelectTrigger>
                <SelectContent>
                  {relationshipTypes.map(type => (
                    <SelectItem key={type.id} value={type.id}>
                      {type.type_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-3 gap-2">
              <div className="space-y-2">
                <Label htmlFor="distance">Distancia (km)</Label>
                <Input
                  id="distance"
                  type="number"
                  value={relationshipForm.distance}
                  onChange={(e) => setRelationshipForm(prev => ({ ...prev, distance: Number(e.target.value) }))}
                  placeholder="0"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="transport_time">Tiempo (hrs)</Label>
                <Input
                  id="transport_time"
                  type="number"
                  value={relationshipForm.transport_time}
                  onChange={(e) => setRelationshipForm(prev => ({ ...prev, transport_time: Number(e.target.value) }))}
                  placeholder="0"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="transport_cost">Costo</Label>
                <Input
                  id="transport_cost"
                  type="number"
                  value={relationshipForm.transport_cost}
                  onChange={(e) => setRelationshipForm(prev => ({ ...prev, transport_cost: Number(e.target.value) }))}
                  placeholder="0"
                />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setRelationshipFormOpen(false)}>
              <X className="h-4 w-4 mr-2" />
              Cancelar
            </Button>
            <Button onClick={handleSaveRelationship}>
              <Save className="h-4 w-4 mr-2" />
              {editingRelationship ? 'Actualizar' : 'Crear'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}