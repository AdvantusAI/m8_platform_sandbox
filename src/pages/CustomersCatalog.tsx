import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Users, Plus, Search, Edit, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Customer {
  id: string;
  customer_id: string;
  customer_name: string;
  customer_logo: string | null;
  level_1: string | null;
  level_1_name: string | null;
  level_2: string | null;
  level_2_name: string | null;
  created_at: string;
  updated_at: string;
}

interface CustomerForm {
  customer_id: string;
  customer_name: string;
  customer_logo?: string;
  level_1?: string;
  level_1_name?: string;
  level_2?: string;
  level_2_name?: string;
}

export default function CustomersCatalog() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [formData, setFormData] = useState<CustomerForm>({
    customer_id: "",
    customer_name: "",
    customer_logo: "",
    level_1: "",
    level_1_name: "",
    level_2: "",
    level_2_name: ""
  });

  useEffect(() => {
    fetchCustomers();
  }, []);

  const fetchCustomers = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('customers')
        .select('*')
        .order('customer_id');

      if (error) throw error;
      
      setCustomers(data || []);
    } catch (error) {
      console.error('Error fetching customers:', error);
      toast.error('Error al cargar clientes');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      if (editingCustomer) {
        const { error } = await supabase
          .from('customers')
          .update(formData)
          .eq('id', editingCustomer.id);
        
        if (error) throw error;
        toast.success('Cliente actualizado exitosamente');
      } else {
        const { error } = await supabase
          .from('customers')
          .insert([formData]);
        
        if (error) throw error;
        toast.success('Cliente creado exitosamente');
      }

      setIsDialogOpen(false);
      setEditingCustomer(null);
      resetForm();
      fetchCustomers();
    } catch (error) {
      console.error('Error saving customer:', error);
      toast.error('Error al guardar cliente');
    }
  };

  const handleEdit = (customer: Customer) => {
    setEditingCustomer(customer);
    setFormData({
      customer_id: customer.customer_id,
      customer_name: customer.customer_name,
      customer_logo: customer.customer_logo || "",
      level_1: customer.level_1 || "",
      level_1_name: customer.level_1_name || "",
      level_2: customer.level_2 || "",
      level_2_name: customer.level_2_name || ""
    });
    setIsDialogOpen(true);
  };

  const handleDelete = async (customerId: string) => {
    if (!confirm('¿Está seguro de que desea eliminar este cliente?')) return;

    try {
      const { error } = await supabase
        .from('customers')
        .delete()
        .eq('id', customerId);

      if (error) throw error;
      toast.success('Cliente eliminado exitosamente');
      fetchCustomers();
    } catch (error) {
      console.error('Error deleting customer:', error);
      toast.error('Error al eliminar cliente');
    }
  };

  const resetForm = () => {
    setFormData({
      customer_id: "",
      customer_name: "",
      customer_logo: "",
      level_1: "",
      level_1_name: "",
      level_2: "",
      level_2_name: ""
    });
  };

  const filteredCustomers = customers.filter(customer =>
    customer.customer_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
    customer.customer_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (customer.level_1_name && customer.level_1_name.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <Users className="h-8 w-8 animate-spin mx-auto mb-2" />
          <p>Cargando clientes...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Catálogo de Clientes</h1>
          <p className="text-muted-foreground">Gestiona tu cartera de clientes</p>
        </div>
        
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => { resetForm(); setEditingCustomer(null); }}>
              <Plus className="h-4 w-4 mr-2" />
              Nuevo Cliente
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>
                {editingCustomer ? 'Editar Cliente' : 'Nuevo Cliente'}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="customer_id">ID del Cliente</Label>
                  <Input
                    id="customer_id"
                    value={formData.customer_id}
                    onChange={(e) => setFormData({...formData, customer_id: e.target.value})}
                    required
                    disabled={!!editingCustomer}
                  />
                </div>
                <div>
                  <Label htmlFor="customer_name">Nombre del Cliente</Label>
                  <Input
                    id="customer_name"
                    value={formData.customer_name}
                    onChange={(e) => setFormData({...formData, customer_name: e.target.value})}
                    required
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="level_1">Nivel 1</Label>
                  <Input
                    id="level_1"
                    value={formData.level_1}
                    onChange={(e) => setFormData({...formData, level_1: e.target.value})}
                  />
                </div>
                <div>
                  <Label htmlFor="level_1_name">Nombre Nivel 1</Label>
                  <Input
                    id="level_1_name"
                    value={formData.level_1_name}
                    onChange={(e) => setFormData({...formData, level_1_name: e.target.value})}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="level_2">Nivel 2</Label>
                  <Input
                    id="level_2"
                    value={formData.level_2}
                    onChange={(e) => setFormData({...formData, level_2: e.target.value})}
                  />
                </div>
                <div>
                  <Label htmlFor="level_2_name">Nombre Nivel 2</Label>
                  <Input
                    id="level_2_name"
                    value={formData.level_2_name}
                    onChange={(e) => setFormData({...formData, level_2_name: e.target.value})}
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="customer_logo">Logo del Cliente (URL)</Label>
                <Input
                  id="customer_logo"
                  value={formData.customer_logo}
                  onChange={(e) => setFormData({...formData, customer_logo: e.target.value})}
                  placeholder="https://ejemplo.com/logo.png"
                />
              </div>

              <div className="flex justify-end space-x-2">
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button type="submit">
                  {editingCustomer ? 'Actualizar' : 'Crear'} Cliente
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Search */}
      <Card>
        <CardHeader>
          <CardTitle>Buscar Clientes</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por ID, nombre o nivel..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      {/* Customers Table */}
      <Card>
        <CardHeader>
          <CardTitle>Lista de Clientes ({filteredCustomers.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ID</TableHead>
                  <TableHead>Nombre</TableHead>
                  <TableHead>Nivel 1</TableHead>
                  <TableHead>Nivel 2</TableHead>
                  <TableHead>Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredCustomers.map((customer) => (
                  <TableRow key={customer.id}>
                    <TableCell className="font-medium">{customer.customer_id}</TableCell>
                    <TableCell>{customer.customer_name}</TableCell>
                    <TableCell>{customer.level_1_name || '-'}</TableCell>
                    <TableCell>{customer.level_2_name || '-'}</TableCell>
                    <TableCell>
                      <div className="flex space-x-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleEdit(customer)}
                        >
                          <Edit className="h-3 w-3" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleDelete(customer.id)}
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