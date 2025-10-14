import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Pagination, PaginationContent, PaginationEllipsis, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from "@/components/ui/pagination";
import { useForm } from "react-hook-form";
import { Plus, Search, Edit, Trash2, MapPin } from "lucide-react";
import { toast } from "sonner";

interface Location {
  id: string;
  description: string | null;
  location_code: string | null;
  type_code: string | null;
  node_type_id: string | null;
}

type LocationForm = Omit<Location, 'created_at' | 'updated_at'>;

const ITEMS_PER_PAGE = 10;

interface NodeType {
  id: string;
  type_code: string;
}

const LocationsCatalog = () => {
  const [locations, setLocations] = useState<Location[]>([]);
  const [nodeTypes, setNodeTypes] = useState<NodeType[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingLocation, setEditingLocation] = useState<Location | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [totalPages, setTotalPages] = useState(0);

  const form = useForm<LocationForm>({
    defaultValues: {
      id: "",
      description: "",
      location_code: "",
      type_code: "",
      node_type_id: "",
    },
  });

  const fetchNodeTypes = async () => {
    try {
      const { data, error } = await (supabase as any)
        .schema('m8_schema')
        .from("supply_network_node_types")
        .select("id, type_code")
        .in("type_code", ["Warehouse", "Customer"]);
      
      if (error) throw error;
      setNodeTypes(data || []);
    } catch (error) {
      console.error("Error fetching node types:", error);
    }
  };

  const fetchLocations = async (page: number = 1) => {
    try {
      setLoading(true);
      const start = (page - 1) * ITEMS_PER_PAGE;
      const end = start + ITEMS_PER_PAGE - 1;
      
      let query = (supabase as any)
        .schema('m8_schema')
        .from("supply_network_nodes")
        .select(`
          id,
          description,
          location_code,
          node_type_id,
          supply_network_node_types!inner(type_code)
        `, { count: 'exact' })
        .in('supply_network_node_types.type_code', ['Warehouse', 'Customer'])
        .range(start, end);
      
      if (searchTerm) {
        query = query.or(`description.ilike.%${searchTerm}%,location_code.ilike.%${searchTerm}%`);
      }
      
      const { data, error, count } = await query.order("location_code");
      
      if (error) throw error;
      
      // Transform the data to match our interface
      const transformedData = (data || []).map((item: any) => ({
        id: item.id,
        description: item.description,
        location_code: item.location_code,
        type_code: item.supply_network_node_types?.type_code,
        node_type_id: item.node_type_id
      }));
      
      setLocations(transformedData);
      setTotalCount(count || 0);
      setTotalPages(Math.ceil((count || 0) / ITEMS_PER_PAGE));
      
      //////console.log('Locations fetched:', transformedData?.length, 'Total count:', count, 'Total pages:', Math.ceil((count || 0) / ITEMS_PER_PAGE));
    } catch (error) {
      console.error("Error fetching locations:", error);
      toast.error("Error al cargar las ubicaciones");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (data: LocationForm) => {
    try {
      if (editingLocation) {
        // Update the supply_network_nodes table
        const { error } = await (supabase as any)
          .schema('m8_schema')
          .from("supply_network_nodes")
          .update({
            description: data.description,
            location_code: data.location_code,
            node_type_id: data.node_type_id
          })
          .eq("id", editingLocation.id);
        
        if (error) throw error;
        toast.success("Ubicación actualizada exitosamente");
      } else {
        // Insert into supply_network_nodes table
        const { error } = await (supabase as any)
          .schema('m8_schema')
          .from("supply_network_nodes")
          .insert([{
            description: data.description,
            location_code: data.location_code,
            node_type_id: data.node_type_id
          }]);
        
        if (error) throw error;
        toast.success("Ubicación creada exitosamente");
      }
      
      setIsDialogOpen(false);
      setEditingLocation(null);
      form.reset();
      fetchLocations(currentPage);
    } catch (error) {
      console.error("Error saving location:", error);
      toast.error("Error al guardar la ubicación");
    }
  };

  const handleEdit = (location: Location) => {
    // For editing, we need to fetch the full record from supply_network_nodes
    // since the view doesn't include the id field
    const editData = {
      id: location.id || "",
      description: location.description || "",
      location_code: location.location_code || "",
      type_code: location.type_code || "",
      node_type_id: location.node_type_id || "",
    };
    setEditingLocation(editData);
    form.reset(editData);
    setIsDialogOpen(true);
  };

  const handleDelete = async (locationId: string) => {
    if (!confirm("¿Estás seguro de que quieres eliminar esta ubicación?")) {
      return;
    }

    try {
      const { error } = await (supabase as any)
        .schema('m8_schema')
        .from("supply_network_nodes")
        .delete()
        .eq("id", locationId);
      
      if (error) throw error;
      toast.success("Ubicación eliminada exitosamente");
      fetchLocations(currentPage);
    } catch (error) {
      console.error("Error deleting location:", error);
      toast.error("Error al eliminar la ubicación");
    }
  };

  const handleNewLocation = () => {
    setEditingLocation(null);
    form.reset();
    setIsDialogOpen(true);
  };

  const handlePageChange = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
      fetchLocations(page);
    }
  };

  const handleSearch = () => {
    setCurrentPage(1);
    fetchLocations(1);
  };

  useEffect(() => {
    fetchNodeTypes();
    fetchLocations(currentPage);
  }, []);

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      handleSearch();
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [searchTerm]);

  const renderPaginationItems = () => {
    const items = [];
    const maxVisiblePages = 5;
    const startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
    const endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);

    for (let page = startPage; page <= endPage; page++) {
      items.push(
        <PaginationItem key={page}>
          <PaginationLink
            onClick={() => handlePageChange(page)}
            isActive={page === currentPage}
            className="cursor-pointer"
          >
            {page}
          </PaginationLink>
        </PaginationItem>
      );
    }

    return items;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <MapPin className="h-8 w-8 animate-spin mx-auto mb-2" />
          <p>Cargando ubicaciones...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Catálogo de Ubicaciones</h1>
          <p className="text-muted-foreground">Gestiona tus ubicaciones y almacenes</p>
        </div>
        
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={handleNewLocation}>
              <Plus className="h-4 w-4 mr-2" />
              Nueva Ubicación
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingLocation ? "Editar Ubicación" : "Nueva Ubicación"}
              </DialogTitle>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="id"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>ID de Ubicación *</FormLabel>
                        <FormControl>
                          <Input {...field} disabled={!!editingLocation} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="location_code"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Código de Ubicación *</FormLabel>
                        <FormControl>
                          <Input {...field} value={field.value || ""} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="description"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Descripción</FormLabel>
                        <FormControl>
                          <Input {...field} value={field.value || ""} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="node_type_id"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Tipo de Nodo *</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value || ""}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Seleccionar tipo" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {nodeTypes.map((nodeType) => (
                              <SelectItem key={nodeType.id} value={nodeType.id}>
                                {nodeType.type_code}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <div className="flex justify-end space-x-2">
                  <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                    Cancelar
                  </Button>
                  <Button type="submit">
                    {editingLocation ? "Actualizar" : "Crear"}
                  </Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Search */}
      <Card>
        <CardHeader>
          <CardTitle>Buscar Ubicaciones</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar ubicaciones por ID, nombre o tipo..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      {/* Locations Table */}
      <Card>
        <CardHeader>
          <CardTitle>Lista de Ubicaciones ({totalCount})</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ID</TableHead>
                  <TableHead>Código de Ubicación</TableHead>
                  <TableHead>Descripción</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {locations.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-4">
                      No se encontraron ubicaciones
                    </TableCell>
                  </TableRow>
                ) : (
                  locations.map((location) => (
                    <TableRow key={location.id}>
                      <TableCell className="font-medium">{location.id}</TableCell>
                      <TableCell>{location.location_code || "-"}</TableCell>
                      <TableCell>{location.description || "-"}</TableCell>
                      <TableCell>{location.type_code || "-"}</TableCell>
                      <TableCell>
                        <div className="flex space-x-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleEdit(location)}
                          >
                            <Edit className="h-3 w-3" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDelete(location.id)}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="mt-6">
          <Pagination>
            <PaginationContent>
              <PaginationItem>
                <PaginationPrevious 
                  onClick={() => handlePageChange(currentPage - 1)}
                  className={currentPage <= 1 ? "pointer-events-none opacity-50" : "cursor-pointer"}
                />
              </PaginationItem>

              {/* Show first page if not visible */}
              {currentPage > 3 && totalPages > 5 && (
                <>
                  <PaginationItem>
                    <PaginationLink onClick={() => handlePageChange(1)} className="cursor-pointer">
                      1
                    </PaginationLink>
                  </PaginationItem>
                  {currentPage > 4 && (
                    <PaginationItem>
                      <PaginationEllipsis />
                    </PaginationItem>
                  )}
                </>
              )}

              {/* Visible pages */}
              {renderPaginationItems()}

              {/* Show last page if not visible */}
              {currentPage < totalPages - 2 && totalPages > 5 && (
                <>
                  {currentPage < totalPages - 3 && (
                    <PaginationItem>
                      <PaginationEllipsis />
                    </PaginationItem>
                  )}
                  <PaginationItem>
                    <PaginationLink onClick={() => handlePageChange(totalPages)} className="cursor-pointer">
                      {totalPages}
                    </PaginationLink>
                  </PaginationItem>
                </>
              )}

              <PaginationItem>
                <PaginationNext 
                  onClick={() => handlePageChange(currentPage + 1)}
                  className={currentPage >= totalPages ? "pointer-events-none opacity-50" : "cursor-pointer"}
                />
              </PaginationItem>
            </PaginationContent>
          </Pagination>
        </div>
      )}
    </div>
  );
};

export default LocationsCatalog;
