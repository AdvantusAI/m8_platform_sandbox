
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Package, Plus, Search, Edit, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Product {
  product_id: string;
  product_name: string;
  category_name: string | null;
  category_id: string | null;
  subcategory_name: string | null;
  subcategory_id: string | null;
  class_name: string | null;
  class_id: string | null;
  subclass_name: string | null;
  subclass_id: string | null;
}

interface ProductForm {
  product_id: string;
  product_name: string;
  category_name?: string;
  category_id?: string;
  subcategory_name?: string;
  subcategory_id?: string;
  class_name?: string;
  class_id?: string;
  subclass_name?: string;
  subclass_id?: string;
}

export default function ProductsCatalog() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [formData, setFormData] = useState<ProductForm>({
    product_id: "",
    product_name: "",
    category_name: "",
    category_id: "",
    subcategory_name: "",
    subcategory_id: "",
    class_name: "",
    class_id: "",
    subclass_name: "",
    subclass_id: ""
  });

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .order('product_id');

      if (error) throw error;
      
      // Map the data to our interface
      const mappedData: Product[] = (data || []).map((item: any) => ({
        product_id: item.product_id,
        product_name: item.product_name || '',
        category_name: item.category_name,
        category_id: item.category_id,
        subcategory_name: item.subcategory_name,
        subcategory_id: item.subcategory_id,
        class_name: item.class_name,
        class_id: item.class_id,
        subclass_name: item.subclass_name,
        subclass_id: item.subclass_id
      }));
      
      setProducts(mappedData);
    } catch (error) {
      console.error('Error fetching products:', error);
      toast.error('Error al cargar productos');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      if (editingProduct) {
        const { error } = await supabase
          .from('products')
          .update(formData)
          .eq('product_id', editingProduct.product_id);
        
        if (error) throw error;
        toast.success('Producto actualizado exitosamente');
      } else {
        // Transform formData to match database schema
        const insertData = {
          id: Date.now().toString(), // Generate a temporary ID
          code: formData.product_id,
          product_name: formData.product_name,
          category_name: formData.category_name || null,
          category_id: formData.category_id || null,
          subcategory_name: formData.subcategory_name || null,
          subcategory_id: formData.subcategory_id || null,
          class_name: formData.class_name || null,
          class_id: formData.class_id || null,
          subclass_name: formData.subclass_name || null,
          subclass_id: formData.subclass_id || null
        };
        
        const { error } = await supabase
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
      product_name: product.product_name,
      category_name: product.category_name || "",
      category_id: product.category_id || "",
      subcategory_name: product.subcategory_name || "",
      subcategory_id: product.subcategory_id || "",
      class_name: product.class_name || "",
      class_id: product.class_id || "",
      subclass_name: product.subclass_name || "",
      subclass_id: product.subclass_id || ""
    });
    setIsDialogOpen(true);
  };

  const handleDelete = async (productId: string) => {
    if (!confirm('¿Está seguro de que desea eliminar este producto?')) return;

    try {
      const { error } = await supabase
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
      category_name: "",
      category_id: "",
      subcategory_name: "",
      subcategory_id: "",
      class_name: "",
      class_id: "",
      subclass_name: "",
      subclass_id: ""
    });
  };

  const filteredProducts = products.filter(product =>
    product.product_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
    product.product_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (product.category_name && product.category_name.toLowerCase().includes(searchTerm.toLowerCase()))||
    (product.subcategory_name && product.subcategory_name.toLowerCase().includes(searchTerm.toLowerCase()))
  );

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
                  <Label htmlFor="category_name">Categoría</Label>
                  <Input
                    id="category_name"
                    value={formData.category_name}
                    onChange={(e) => setFormData({...formData, category_name: e.target.value})}
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
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por ID, nombre o categoría..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      {/* Products Table */}
      <Card>
        <CardHeader>
          <CardTitle>Lista de Productos ({filteredProducts.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ID</TableHead>
                  <TableHead>Nombre</TableHead>
                  <TableHead>Categoría</TableHead>
                  <TableHead>Subcategoría</TableHead>
                  <TableHead>Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredProducts.map((product) => (
                  <TableRow key={product.product_id}>
                    <TableCell className="font-medium">{product.product_id}</TableCell>
                    <TableCell>{product.product_name}</TableCell>
                    <TableCell>{product.category_name || '-'}</TableCell>
                    <TableCell>{product.subcategory_name || '-'}</TableCell>
                    <TableCell>
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
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
