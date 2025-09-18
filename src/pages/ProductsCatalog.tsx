
import { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Package, Plus, Search, Edit, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { AgGridReact } from 'ag-grid-react';
import { ColDef } from 'ag-grid-community';
import { commonAgGridConfig, agGridContainerStyles, defaultGridOptions } from '../lib/ag-grid-config';


interface Product {
  product_id: string;
  product_name: string | null;
  category_id: string | null;
  category_name: string | null;
  subcategory_id: string | null;
  subcategory_name: string | null;
  class_id: string | null;
  class_name: string | null;
  subclass_id: string | null;
  subclass_name: string | null;
  created_at: string;
  updated_at: string | null;
  attr_1: string | null;
  attr_2: string | null;
  attr_3: string | null;
  attr_4: string | null;
  buyer_class: string | null;
  category_hierarchy: string | null;
  weight_per_unit: number | null;
  cube_per_unit: number | null;
  units_per_case: number | null;
  units_per_layer: number | null;
  units_per_pallet: number | null;
  default_service_level_goal: number | null;
  default_lead_time_days: number | null;
  default_minimum_quantity: number | null;
  default_buying_multiple: number | null;
  default_purchase_price: number | null;
  status: string | null;
}

interface ProductForm {
  product_id: string;
  product_name: string;
  category_id?: string;
  category_name?: string;
  subcategory_id?: string;
  subcategory_name?: string;
  class_id?: string;
  class_name?: string;
  subclass_id?: string;
  subclass_name?: string;
  attr_1?: string;
  attr_2?: string;
  attr_3?: string;
  attr_4?: string;
  buyer_class?: string;
  category_hierarchy?: string;
  weight_per_unit?: number;
  cube_per_unit?: number;
  units_per_case?: number;
  units_per_layer?: number;
  units_per_pallet?: number;
  default_service_level_goal?: number;
  default_lead_time_days?: number;
  default_minimum_quantity?: number;
  default_buying_multiple?: number;
  default_purchase_price?: number;
  status?: string;
}

// Database row type for mapping
interface ProductRow {
  product_id: string;
  product_name: string | null;
  category_id: string | null;
  category_name: string | null;
  subcategory_id: string | null;
  subcategory_name: string | null;
  class_id: string | null;
  class_name: string | null;
  subclass_id: string | null;
  subclass_name: string | null;
  created_at: string;
  updated_at: string | null;
  attr_1: string | null;
  attr_2: string | null;
  attr_3: string | null;
  attr_4: string | null;
  buyer_class: string | null;
  category_hierarchy: string | null;
  weight_per_unit: number | null;
  cube_per_unit: number | null;
  units_per_case: number | null;
  units_per_layer: number | null;
  units_per_pallet: number | null;
  default_service_level_goal: number | null;
  default_lead_time_days: number | null;
  default_minimum_quantity: number | null;
  default_buying_multiple: number | null;
  default_purchase_price: number | null;
  status: string | null;
}

export default function ProductsCatalog() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [gridApi, setGridApi] = useState<any>(null);
  const [formData, setFormData] = useState<ProductForm>({
    product_id: "",
    product_name: "",
    category_id: "",
    category_name: "",
    subcategory_id: "",
    subcategory_name: "",
    class_id: "",
    class_name: "",
    subclass_id: "",
    subclass_name: "",
    attr_1: "",
    attr_2: "",
    attr_3: "",
    attr_4: "",
    buyer_class: "R",
    category_hierarchy: "",
    weight_per_unit: 0,
    cube_per_unit: 0,
    units_per_case: 0,
    units_per_layer: 0,
    units_per_pallet: 0,
    default_service_level_goal: 0,
    default_lead_time_days: 0,
    default_minimum_quantity: 0,
    default_buying_multiple: 0,
    default_purchase_price: 0,
    status: ""
  });

  useEffect(() => {

    fetchProducts();
  }, []);


  const fetchProducts = async () => {
    try {
      setLoading(true);
      const { data, error } = await (supabase as any)
        .schema('m8_schema')
        .from('products')
        .select('*')
        .order('product_id');

      if (error) throw error;
      
      // Map the data to our interface
      const mappedData: Product[] = (data || []).map((item: ProductRow) => ({
        product_id: item.product_id,
        product_name: item.product_name,
        category_id: item.category_id,
        category_name: item.category_name,
        subcategory_id: item.subcategory_id,
        subcategory_name: item.subcategory_name,
        class_id: item.class_id,
        class_name: item.class_name,
        subclass_id: item.subclass_id,
        subclass_name: item.subclass_name,
        created_at: item.created_at,
        updated_at: item.updated_at,
        attr_1: item.attr_1,
        attr_2: item.attr_2,
        attr_3: item.attr_3,
        attr_4: item.attr_4,
        buyer_class: item.buyer_class,
        category_hierarchy: item.category_hierarchy,
        weight_per_unit: item.weight_per_unit,
        cube_per_unit: item.cube_per_unit,
        units_per_case: item.units_per_case,
        units_per_layer: item.units_per_layer,
        units_per_pallet: item.units_per_pallet,
        default_service_level_goal: item.default_service_level_goal,
        default_lead_time_days: item.default_lead_time_days,
        default_minimum_quantity: item.default_minimum_quantity,
        default_buying_multiple: item.default_buying_multiple,
        default_purchase_price: item.default_purchase_price,
        status: item.status
      }));
      
      setProducts(mappedData);
    } catch (error) {
      console.error('Error fetching products:', error);
      toast.error('Error al cargar productos');
    } finally {
      setLoading(false);
    }
  };

  const generateShortId = () => {
    // Generate a short 8-character ID for the code field
    return Math.random().toString(36).substring(2, 10).toUpperCase();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      if (editingProduct) {
        const updateData = {
          product_name: formData.product_name,
          category_id: formData.category_id || null,
          category_name: formData.category_name || null,
          subcategory_id: formData.subcategory_id || null,
          subcategory_name: formData.subcategory_name || null,
          class_id: formData.class_id || null,
          class_name: formData.class_name || null,
          subclass_id: formData.subclass_id || null,
          subclass_name: formData.subclass_name || null,
          attr_1: formData.attr_1 || null,
          attr_2: formData.attr_2 || null,
          attr_3: formData.attr_3 || null,
          attr_4: formData.attr_4 || null,
          buyer_class: formData.buyer_class || 'R',
          category_hierarchy: formData.category_hierarchy || null,
          weight_per_unit: formData.weight_per_unit || null,
          cube_per_unit: formData.cube_per_unit || null,
          units_per_case: formData.units_per_case || null,
          units_per_layer: formData.units_per_layer || null,
          units_per_pallet: formData.units_per_pallet || null,
          default_service_level_goal: formData.default_service_level_goal || null,
          default_lead_time_days: formData.default_lead_time_days || null,
          default_minimum_quantity: formData.default_minimum_quantity || null,
          default_buying_multiple: formData.default_buying_multiple || null,
          default_purchase_price: formData.default_purchase_price || null,
          status: formData.status || null,
          updated_at: new Date().toISOString().split('T')[0]
        };
        
        const { error } = await (supabase as any)
          .schema('m8_schema')
          .from('products')
          .update(updateData)
          .eq('product_id', editingProduct.product_id);
        
        if (error) throw error;
        toast.success('Producto actualizado exitosamente');
      } else {
        const insertData = {
          product_id: formData.product_id,
          product_name: formData.product_name,
          category_id: formData.category_id || null,
          category_name: formData.category_name || null,
          subcategory_id: formData.subcategory_id || null,
          subcategory_name: formData.subcategory_name || null,
          class_id: formData.class_id || null,
          class_name: formData.class_name || null,
          subclass_id: formData.subclass_id || null,
          subclass_name: formData.subclass_name || null,
          attr_1: formData.attr_1 || null,
          attr_2: formData.attr_2 || null,
          attr_3: formData.attr_3 || null,
          attr_4: formData.attr_4 || null,
          buyer_class: formData.buyer_class || 'R',
          category_hierarchy: formData.category_hierarchy || null,
          weight_per_unit: formData.weight_per_unit || null,
          cube_per_unit: formData.cube_per_unit || null,
          units_per_case: formData.units_per_case || null,
          units_per_layer: formData.units_per_layer || null,
          units_per_pallet: formData.units_per_pallet || null,
          default_service_level_goal: formData.default_service_level_goal || null,
          default_lead_time_days: formData.default_lead_time_days || null,
          default_minimum_quantity: formData.default_minimum_quantity || null,
          default_buying_multiple: formData.default_buying_multiple || null,
          default_purchase_price: formData.default_purchase_price || null,
          status: formData.status || null
        };
        
        const { error } = await (supabase as any)
        .schema('m8_schema') 
          .from('products')
          .insert(insertData);
        
        if (error) throw error;
        toast.success('Producto creado exitosamente');
      }

      setIsDialogOpen(false);
      setEditingProduct(null);
      resetForm();
      fetchProducts();
    } catch (error) {
      console.error('Error saving product:', error);
      toast.error('Error al guardar producto');
    }
  };

  const handleEdit = (product: Product) => {
    setEditingProduct(product);
    setFormData({
      product_id: product.product_id,
      product_name: product.product_name || "",
      category_id: product.category_id || "",
      category_name: product.category_name || "",
      subcategory_id: product.subcategory_id || "",
      subcategory_name: product.subcategory_name || "",
      class_id: product.class_id || "",
      class_name: product.class_name || "",
      subclass_id: product.subclass_id || "",
      subclass_name: product.subclass_name || "",
      attr_1: product.attr_1 || "",
      attr_2: product.attr_2 || "",
      attr_3: product.attr_3 || "",
      attr_4: product.attr_4 || "",
      buyer_class: product.buyer_class || "R",
      category_hierarchy: product.category_hierarchy || "",
      weight_per_unit: product.weight_per_unit || 0,
      cube_per_unit: product.cube_per_unit || 0,
      units_per_case: product.units_per_case || 0,
      units_per_layer: product.units_per_layer || 0,
      units_per_pallet: product.units_per_pallet || 0,
      default_service_level_goal: product.default_service_level_goal || 0,
      default_lead_time_days: product.default_lead_time_days || 0,
      default_minimum_quantity: product.default_minimum_quantity || 0,
      default_buying_multiple: product.default_buying_multiple || 0,
      default_purchase_price: product.default_purchase_price || 0,
      status: product.status || ""
    });
    setIsDialogOpen(true);
  };

  const handleDelete = async (productId: string) => {
    if (!confirm('¿Está seguro de que desea eliminar este producto?')) return;

    try {
      const { error } = await (supabase as any)
      .schema('m8_schema') 
        .from('products')
        .delete()
        .eq('product_id', productId);

      if (error) throw error;
      toast.success('Producto eliminado exitosamente');
      fetchProducts();
    } catch (error) {
      console.error('Error deleting product:', error);
      toast.error('Error al eliminar producto');
    }
  };

  const resetForm = () => {
    setFormData({
      product_id: "",
      product_name: "",
      category_id: "",
      category_name: "",
      subcategory_id: "",
      subcategory_name: "",
      class_id: "",
      class_name: "",
      subclass_id: "",
      subclass_name: "",
      attr_1: "",
      attr_2: "",
      attr_3: "",
      attr_4: "",
      buyer_class: "R",
      category_hierarchy: "",
      weight_per_unit: 0,
      cube_per_unit: 0,
      units_per_case: 0,
      units_per_layer: 0,
      units_per_pallet: 0,
      default_service_level_goal: 0,
      default_lead_time_days: 0,
      default_minimum_quantity: 0,
      default_buying_multiple: 0,
      default_purchase_price: 0,
      status: ""
    });
  };



  const ActionCellRenderer = (props: { data: Product }) => {
    const product = props.data;
    
    return (
      <div className="flex space-x-2">
        <Button
          size="sm"
          variant="outline"
          onClick={() => handleEdit(product)}
        >
          <Edit className="h-3 w-3" />
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={() => handleDelete(product.product_id)}
        >
          <Trash2 className="h-3 w-3" />
        </Button>
      </div>
    );
  };

  const defaultColDef = useMemo(() => ({
    ...defaultGridOptions.defaultColDef,
  }), []);

  const getRowClass = (params: any) => {
    return defaultGridOptions.getRowClass ? defaultGridOptions.getRowClass(params) : '';
  };

  const onGridReady = (params: any) => {
    setGridApi(params.api);
  };

  const columnDefs: ColDef[] = useMemo(() => [
    {
      headerName: "ID",
      field: "product_id",
      sortable: true,
      filter: true,
      width: 120,
      resizable: true
    },
    {
      headerName: "Nombre",
      field: "product_name",
      sortable: true,
      filter: true,
      flex: 1,
      resizable: true
    },
    {
      headerName: "Categoría",
      field: "category_name",
      sortable: true,
      filter: true,
      width: 150,
      resizable: true,
      valueFormatter: (params) => params.value || '-'
    },
    {
      headerName: "Subcategoría",
      field: "subcategory_name",
      sortable: true,
      filter: true,
      width: 150,
      resizable: true,
      valueFormatter: (params) => params.value || '-'
    },
    {
      headerName: "Clase",
      field: "class_name",
      sortable: true,
      filter: true,
      width: 120,
      resizable: true,
      valueFormatter: (params) => params.value || '-'
    },
    {
      headerName: "Subclase",
      field: "subclass_name",
      sortable: true,
      filter: true,
      width: 120,
      resizable: true,
      valueFormatter: (params) => params.value || '-'
    },
    {
      headerName: "Buyer Class",
      field: "buyer_class",
      sortable: true,
      filter: true,
      width: 100,
      resizable: true,
      valueFormatter: (params) => params.value || '-'
    },
    {
      headerName: "Estado",
      field: "status",
      sortable: true,
      filter: true,
      width: 100,
      resizable: true,
      valueFormatter: (params) => params.value || '-',
      rowGroup: true,
      hide: true
    },
    {
      headerName: "Precio Compra",
      field: "default_purchase_price",
      sortable: true,
      filter: true,
      width: 120,
      resizable: true,
      valueFormatter: (params) => params.value ? `$${params.value.toFixed(2)}` : '-'
    },
    {
      headerName: "Lead Time (días)",
      field: "default_lead_time_days",
      sortable: true,
      filter: true,
      width: 130,
      resizable: true,
      valueFormatter: (params) => params.value ? `${params.value} días` : '-'
    },
    {
      headerName: "Acciones",
      field: "actions",
      cellRenderer: ActionCellRenderer,
      width: 150,
      sortable: false,
      filter: false,
      resizable: false,
      pinned: 'right'
    }
  ], []);

  // Filter data based on search term
  const filteredProducts = useMemo(() => {
    return products.filter(product => {
      const matchesSearch = !searchTerm || 
        product.product_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (product.product_name && product.product_name.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (product.category_name && product.category_name.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (product.subcategory_name && product.subcategory_name.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (product.class_name && product.class_name.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (product.subclass_name && product.subclass_name.toLowerCase().includes(searchTerm.toLowerCase()));
      
      return matchesSearch;
    });
  }, [products, searchTerm]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <Package className="h-8 w-8 animate-spin mx-auto mb-2" />
          <p>Cargando productos...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Catálogo de Productos</h1>
          <p className="text-muted-foreground">Gestiona tu inventario de productos</p>
        </div>
        
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => { resetForm(); setEditingProduct(null); }}>
              <Plus className="h-4 w-4 mr-2" />
              Nuevo Producto
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>
                {editingProduct ? 'Editar Producto' : 'Nuevo Producto'}
              </DialogTitle>
              <DialogDescription>
                {editingProduct 
                  ? 'Modifica la información del producto existente.' 
                  : 'Completa la información para crear un nuevo producto en el catálogo.'
                }
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="product_id">ID del Producto</Label>
                  <Input
                    id="product_id"
                    value={formData.product_id}
                    onChange={(e) => setFormData({...formData, product_id: e.target.value})}
                    required
                    disabled={!!editingProduct}
                    maxLength={10}
                    placeholder="Máximo 10 caracteres"
                  />
                </div>
                <div>
                  <Label htmlFor="product_name">Nombre del Producto</Label>
                  <Input
                    id="product_name"
                    value={formData.product_name}
                    onChange={(e) => setFormData({...formData, product_name: e.target.value})}
                    required
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="category_id">ID Categoría</Label>
                  <Input
                    id="category_id"
                    value={formData.category_id}
                    onChange={(e) => setFormData({...formData, category_id: e.target.value})}
                  />
                </div>
                <div>
                  <Label htmlFor="category_name">Categoría</Label>
                  <Input
                    id="category_name"
                    value={formData.category_name}
                    onChange={(e) => setFormData({...formData, category_name: e.target.value})}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="subcategory_id">ID Subcategoría</Label>
                  <Input
                    id="subcategory_id"
                    value={formData.subcategory_id}
                    onChange={(e) => setFormData({...formData, subcategory_id: e.target.value})}
                  />
                </div>
                <div>
                  <Label htmlFor="subcategory_name">Subcategoría</Label>
                  <Input
                    id="subcategory_name"
                    value={formData.subcategory_name}
                    onChange={(e) => setFormData({...formData, subcategory_name: e.target.value})}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="class_id">ID Clase</Label>
                  <Input
                    id="class_id"
                    value={formData.class_id}
                    onChange={(e) => setFormData({...formData, class_id: e.target.value})}
                  />
                </div>
                <div>
                  <Label htmlFor="class_name">Clase</Label>
                  <Input
                    id="class_name"
                    value={formData.class_name}
                    onChange={(e) => setFormData({...formData, class_name: e.target.value})}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="subclass_id">ID Subclase</Label>
                  <Input
                    id="subclass_id"
                    value={formData.subclass_id}
                    onChange={(e) => setFormData({...formData, subclass_id: e.target.value})}
                  />
                </div>
                <div>
                  <Label htmlFor="subclass_name">Subclase</Label>
                  <Input
                    id="subclass_name"
                    value={formData.subclass_name}
                    onChange={(e) => setFormData({...formData, subclass_name: e.target.value})}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="buyer_class">Buyer Class</Label>
                  <Select 
                    value={formData.buyer_class} 
                    onValueChange={(value) => setFormData({...formData, buyer_class: value})}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar buyer class" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="R">R - Regular</SelectItem>
                      <SelectItem value="A">A - A Class</SelectItem>
                      <SelectItem value="B">B - B Class</SelectItem>
                      <SelectItem value="C">C - C Class</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="status">Estado</Label>
                  <Input
                    id="status"
                    value={formData.status}
                    onChange={(e) => setFormData({...formData, status: e.target.value})}
                    placeholder="Estado del producto"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="default_purchase_price">Precio de Compra</Label>
                  <Input
                    id="default_purchase_price"
                    type="number"
                    step="0.01"
                    value={formData.default_purchase_price}
                    onChange={(e) => setFormData({...formData, default_purchase_price: parseFloat(e.target.value) || 0})}
                  />
                </div>
                <div>
                  <Label htmlFor="default_lead_time_days">Lead Time (días)</Label>
                  <Input
                    id="default_lead_time_days"
                    type="number"
                    value={formData.default_lead_time_days}
                    onChange={(e) => setFormData({...formData, default_lead_time_days: parseFloat(e.target.value) || 0})}
                  />
                </div>
              </div>

              <div className="flex justify-end space-x-2">
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button type="submit">
                  {editingProduct ? 'Actualizar' : 'Crear'} Producto
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Search */}
      <Card>
        <CardHeader>
          <CardTitle>Buscar Productos</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por ID, nombre o categoría..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            
          </div>
        </CardContent>
      </Card>

      {/* Products Table */}
      <CardHeader>
          <CardTitle>Lista de Productos ({filteredProducts.length})</CardTitle>
        </CardHeader>
        <CardContent>
        </CardContent>

        <div className={agGridContainerStyles}>
            <AgGridReact
              rowData={filteredProducts}
              columnDefs={columnDefs}
              defaultColDef={defaultColDef}
              onGridReady={onGridReady}
              {...commonAgGridConfig}
              pagination={true}
              paginationPageSize={50}
              domLayout="autoHeight"
              getRowId={(params) => params.data.product_id}
              getRowClass={getRowClass}
              rowGroupPanelShow="always"
              groupDisplayType="groupRows"
              groupDefaultExpanded={-1}
              suppressRowGroupHidesColumns={true}
            />
          </div>
      <Card>
      </Card>
    </div>
  );
}
