import { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ShoppingCart, Eye, Plus, Package } from "lucide-react";
import { toast } from "sonner";
import { OrderFilters } from "@/components/OrderFilters";

interface PurchaseOrderSuggestion {
  id: string;
  product_id: number | string;
  product_name: string;
  vendor_id: string;
  vendor_name: string;
  node_id: string;
  node_name: string;
  location_code: number;
  recommended_quantity: number;
  unit_cost: number;
  total_cost: number;
  lead_time_days: number;
  node_lead_time: number;
  reasoning: string;
  status: string;
  required_delivery_date: string;
  recommended_order_date: string;
  urgency: string;
  order_multiple: number;
  minimum_order_quantity: number;
  maximum_order_quantity: number;
  created_at: string;
  updated_at: string;
  // Legacy fields for backward compatibility
  suggested_quantity?: number;
  reason?: string;
  warehouse_id?: number;
  vendor_code?: string;
  current_stock?: number;
  available_stock?: number;
  reorder_point?: number;
  safety_stock?: number;
  demand_forecast?: number;
  bracket_info?: any;
  order_date?: string;
  days_until_stockout?: number;
  recommended_order_urgency?: string;
}

interface PurchaseOrderCalculation {
  id: string;
  purchase_order_suggestion_id: string;
  calculation_step: string;
  step_order: number;
  step_data: any;
}

export default function OrdenesCompra() {
  const [replenishmentOrders, setReplenishmentOrders] = useState<PurchaseOrderSuggestion[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<PurchaseOrderSuggestion | null>(null);
  const [orderCalculations, setOrderCalculations] = useState<PurchaseOrderCalculation[]>([]);
  const [loading, setLoading] = useState(true);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [calculationsLoading, setCalculationsLoading] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [showCalculations, setShowCalculations] = useState(false);
  const [filters, setFilters] = useState({
    vendorFilter: '',
    productFilter: '',
    statusFilter: '',
    dateFrom: undefined as Date | undefined,
    dateTo: undefined as Date | undefined
  });

  useEffect(() => {
    fetchReplenishmentOrders();
  }, []);

  const fetchReplenishmentOrders = async () => {
    try {
      setLoading(true);
      
      const response = await fetch('/api/purchase-order-suggestions');
      if (!response.ok) {
        throw new Error(`Failed to fetch purchase order suggestions: ${response.statusText}`);
      }
      
      const data = await response.json();
      setReplenishmentOrders(data || []);
    } catch (error) {
      console.error('Error fetching purchase order suggestions:', error);
      toast.error('Error al cargar órdenes de reabastecimiento: ' + (error as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const fetchOrderDetails = async (order: PurchaseOrderSuggestion) => {
    try {
      setDetailsLoading(true);
      setSelectedOrder(order);
      setShowCalculations(false);
      setOrderCalculations([]);
      //console.log('Fetching details for order:', order.id);
      setIsDialogOpen(true);
    } catch (error) {
      console.error('Error fetching order details:', error);
      toast.error('Error al cargar detalles de la orden');
    } finally {
      setDetailsLoading(false);
    }
  };

  const fetchOrderCalculations = async (order: PurchaseOrderSuggestion) => {
    try {
      setCalculationsLoading(true);
      
      const response = await fetch(`/api/purchase-order-calculations/${order.id}`);
      if (!response.ok) {
        throw new Error(`Failed to fetch calculations: ${response.statusText}`);
      }
      
      const data = await response.json();
      setOrderCalculations(data || []);
    } catch (error) {
      console.error('Error fetching calculations:', error);
      toast.error('Error al cargar cálculos de la orden');
      setOrderCalculations([]);
    } finally {
      setCalculationsLoading(false);
    }
  };

  const handleNewOrder = async () => {
    try {
      setLoading(true);
      toast.info('Generando nuevas sugerencias de órdenes...');
      
      // Refresh the purchase order suggestions to get latest recommendations
      await fetchReplenishmentOrders();
      
      toast.success('Sugerencias de órdenes actualizadas correctamente');
    } catch (error) {
      console.error('Error creating new order:', error);
      toast.error('Error al generar nuevas órdenes');
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      'draft': { color: 'bg-gray-100 text-gray-700', label: 'Borrador' },
      'pending': { color: 'bg-yellow-100 text-yellow-700', label: 'Pendiente' },
      'ordered': { color: 'bg-cyan-100 text-cyan-700', label: 'Ordenada' },
      'approved': { color: 'bg-blue-100 text-blue-700', label: 'Aprobada' },
      'sent': { color: 'bg-green-100 text-green-700', label: 'Enviada' },
      'received': { color: 'bg-purple-100 text-purple-700', label: 'Recibida' },
      'cancelled': { color: 'bg-red-100 text-red-700', label: 'Cancelada' }
    };
    const config = statusConfig[status?.toLowerCase() as keyof typeof statusConfig] || statusConfig['pending'];
    return <Badge className={config.color}>{config.label}</Badge>;
  };

  const formatCurrency = (amount: number | null) => {
    if (!amount) return '$0.00';
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN'
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  // Filter the orders based on active filters
  const filteredOrders = useMemo(() => {
    return replenishmentOrders.filter(order => {
      // Vendor filter
      if (filters.vendorFilter && !order.vendor_name.toLowerCase().includes(filters.vendorFilter.toLowerCase())) {
        return false;
      }
 
      // Product filter - search in both product_name and product_id
      if (filters.productFilter) {
        const productSearch = filters.productFilter.toLowerCase();
        const productName = order.product_name?.toLowerCase() || '';
        const productId = order.product_id?.toString().toLowerCase() || '';
        
        if (!productName.includes(productSearch) && !productId.includes(productSearch)) {
          return false;
        }
      }

      // Status filter - handle "all" value properly and case-insensitive comparison
      if (filters.statusFilter && filters.statusFilter !== 'all') {
        const orderStatus = order.status?.toLowerCase() || '';
        const filterStatus = filters.statusFilter.toLowerCase();
        if (orderStatus !== filterStatus) {
          return false;
        }
      }

      // Date range filter - use the new date fields
      if (filters.dateFrom) {
        const orderDate = new Date(order.recommended_order_date || order.order_date);
        const fromDate = new Date(filters.dateFrom);
        fromDate.setHours(0, 0, 0, 0);
        if (orderDate < fromDate) {
          return false;
        }
      }

      if (filters.dateTo) {
        const orderDate = new Date(order.recommended_order_date || order.order_date);
        const toDate = new Date(filters.dateTo);
        toDate.setHours(23, 59, 59, 999);
        if (orderDate > toDate) {
          return false;
        }
      }

      return true;
    });
  }, [replenishmentOrders, filters]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <ShoppingCart className="h-8 w-8 animate-spin mx-auto mb-2" />
          <p>Cargando órdenes de reabastecimiento...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Órdenes de Reabastecimiento</h1>
          <p className="text-muted-foreground">Gestiona y monitorea las órdenes de reabastecimiento</p>
        </div>
        <Button onClick={handleNewOrder} disabled={loading}>
          <Plus className="h-4 w-4 mr-2" />
          {loading ? 'Actualizando...' : 'Actualizar Sugerencias'}
        </Button>
      </div>

      {/* Filters */}
      <OrderFilters filters={filters} onFiltersChange={setFilters} />

      {/* Replenishment Orders Table */}
      <Card>
        <CardHeader>
          <CardTitle>
            Lista de Órdenes de Reabastecimiento ({filteredOrders.length}
            {filteredOrders.length !== replenishmentOrders.length && ` de ${replenishmentOrders.length}`})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {filteredOrders.length === 0 ? (
            <div className="text-center py-8">
              <Package className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">
                {replenishmentOrders.length === 0 
                  ? "No hay órdenes de reabastecimiento" 
                  : "No se encontraron órdenes con los filtros aplicados"
                }
              </h3>
              <p className="text-muted-foreground">
                {replenishmentOrders.length === 0
                  ? "No se encontraron órdenes de reabastecimiento en el sistema."
                  : "Intenta ajustar los filtros para encontrar las órdenes que buscas."
                }
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Producto</TableHead>
                    <TableHead>Nodo</TableHead>
                    <TableHead>Fecha</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead>Total</TableHead>
                    <TableHead>Cantidad</TableHead>
                    <TableHead>Proveedor</TableHead>
                    <TableHead>Urgencia</TableHead>
                    <TableHead>Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredOrders.map((order) => (
                    <TableRow key={order.id}>
                      <TableCell className="font-medium">
                        <div>
                          <div className="font-semibold">{order.product_name || order.product_id}</div>
                          <div className="text-sm text-gray-500">ID: {order.product_id}</div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div>
                          <div className="font-medium">{order.node_name}</div>
                          <div className="text-sm text-gray-500">Loc: {order.location_code}</div>
                        </div>
                      </TableCell>
                      <TableCell>{formatDate(order.recommended_order_date || order.order_date)}</TableCell>
                      <TableCell>{getStatusBadge(order.status)}</TableCell>
                      <TableCell>{formatCurrency(order.total_cost)}</TableCell>
                      <TableCell>
                        <div>
                          <div className="font-medium">{(order.recommended_quantity || order.suggested_quantity)?.toLocaleString()}</div>
                          <div className="text-sm text-gray-500">Min: {order.minimum_order_quantity?.toLocaleString()}</div>
                        </div>
                      </TableCell>
                      <TableCell>{order.vendor_name}</TableCell>
                      <TableCell>
                        <Badge className={
                          (order.urgency === 'critical' || order.recommended_order_urgency === 'urgent')
                            ? 'bg-red-100 text-red-700' 
                            : order.urgency === 'normal'
                            ? 'bg-green-100 text-green-700'
                            : 'bg-yellow-100 text-yellow-700'
                        }>
                          {order.urgency === 'critical' ? 'Crítico' : 
                           order.urgency === 'normal' ? 'Normal' : 
                           order.recommended_order_urgency === 'urgent' ? 'Urgente' : 'Normal'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => fetchOrderDetails(order)}
                          disabled={detailsLoading}
                        >
                          <Eye className="h-3 w-3 mr-1" />
                          Ver Detalles
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Order Details Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-6xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              Detalles de Orden - {selectedOrder?.product_name || selectedOrder?.product_id}
            </DialogTitle>
          </DialogHeader>

          {selectedOrder && (
            <div className="space-y-6">
              {/* Order Summary */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Resumen de la Orden</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div>
                      <p className="text-sm text-muted-foreground">Estado</p>
                      <div className="mt-1">{getStatusBadge(selectedOrder.status)}</div>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Total</p>
                      <p className="font-medium">{formatCurrency(selectedOrder.total_cost)}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Fecha de Orden</p>
                      <p className="font-medium">{formatDate(selectedOrder.recommended_order_date || selectedOrder.order_date)}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Fecha Requerida</p>
                      <p className="font-medium">{formatDate(selectedOrder.required_delivery_date)}</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
                    <div>
                      <p className="text-sm text-muted-foreground">Proveedor</p>
                      <p className="font-medium">{selectedOrder.vendor_name}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Nodo</p>
                      <p className="font-medium">{selectedOrder.node_name}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Código de Ubicación</p>
                      <p className="font-medium">{selectedOrder.location_code}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Tiempo de Entrega</p>
                      <p className="font-medium">{selectedOrder.lead_time_days} días</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
                    <div>
                      <p className="text-sm text-muted-foreground">Tiempo de Entrega del Nodo</p>
                      <p className="font-medium">{selectedOrder.node_lead_time} días</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Múltiplo de Orden</p>
                      <p className="font-medium">{selectedOrder.order_multiple}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Urgencia</p>
                      <Badge className={
                        selectedOrder.urgency === 'critical' 
                          ? 'bg-red-100 text-red-700' 
                          : selectedOrder.urgency === 'normal'
                          ? 'bg-green-100 text-green-700'
                          : 'bg-yellow-100 text-yellow-700'
                      }>
                        {selectedOrder.urgency === 'critical' ? 'Crítico' : 
                         selectedOrder.urgency === 'normal' ? 'Normal' : selectedOrder.urgency}
                      </Badge>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Cantidad Recomendada</p>
                      <p className="font-medium">{(selectedOrder.recommended_quantity || selectedOrder.suggested_quantity)?.toLocaleString()}</p>
                    </div>
                  </div>
                  <div className="mt-4">
                    <p className="text-sm text-muted-foreground">Razón</p>
                    <p className="mt-1">{selectedOrder.reasoning || selectedOrder.reason}</p>
                  </div>
                </CardContent>
              </Card>

              {/* Order Details */}
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle className="text-lg">
                    {showCalculations ? 'Detalles del Cálculo' : 'Detalles del Producto'}
                  </CardTitle>
                  <div className="flex gap-2">
                    <Button
                      variant={!showCalculations ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setShowCalculations(false)}
                    >
                      Detalles del Producto
                    </Button>
                    <Button
                      variant={showCalculations ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => {
                        setShowCalculations(true);
                        if (selectedOrder && orderCalculations.length === 0) {
                          fetchOrderCalculations(selectedOrder);
                        }
                      }}
                      disabled={calculationsLoading}
                    >
                      {calculationsLoading ? 'Cargando...' : 'Detalles del Cálculo'}
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  {!showCalculations ? (
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                      <div>
                        <p className="text-sm text-muted-foreground">Producto</p>
                        <p className="font-medium">{selectedOrder.product_name}</p>
                        <p className="text-sm text-gray-500">ID: {selectedOrder.product_id}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Cantidad Recomendada</p>
                        <p className="font-medium">{(selectedOrder.recommended_quantity || selectedOrder.suggested_quantity)?.toLocaleString()}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Precio Unitario</p>
                        <p className="font-medium">{formatCurrency(selectedOrder.unit_cost)}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Cantidad Mínima</p>
                        <p className="font-medium">{selectedOrder.minimum_order_quantity?.toLocaleString() || 'N/A'}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Cantidad Máxima</p>
                        <p className="font-medium">{selectedOrder.maximum_order_quantity?.toLocaleString() || 'N/A'}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Múltiplo de Orden</p>
                        <p className="font-medium">{selectedOrder.order_multiple || 1}</p>
                      </div>
                      {/* Legacy fields for backward compatibility */}
                      {selectedOrder.available_stock && (
                        <div>
                          <p className="text-sm text-muted-foreground">Stock Disponible</p>
                          <p className="font-medium">{selectedOrder.available_stock.toLocaleString()}</p>
                        </div>
                      )}
                      {selectedOrder.safety_stock && (
                        <div>
                          <p className="text-sm text-muted-foreground">Stock de Seguridad</p>
                          <p className="font-medium">{selectedOrder.safety_stock.toLocaleString()}</p>
                        </div>
                      )}
                      {selectedOrder.demand_forecast && (
                        <div>
                          <p className="text-sm text-muted-foreground">Pronóstico de Demanda</p>
                          <p className="font-medium">{selectedOrder.demand_forecast.toFixed(2)}</p>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div>
                      {calculationsLoading ? (
                        <div className="text-center py-4">
                          <p>Cargando cálculos...</p>
                        </div>
                      ) : orderCalculations.length === 0 ? (
                        <p className="text-muted-foreground">No se encontraron cálculos para esta orden.</p>
                      ) : (
                        <div className="overflow-x-auto">
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>ID</TableHead>
                                <TableHead>Paso de Cálculo</TableHead>
                                <TableHead>Orden del Paso</TableHead>
                                <TableHead>Datos del Paso</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {orderCalculations.map((calc) => (
                                <TableRow key={calc.id}>
                                  <TableCell className="font-medium">{calc.id}</TableCell>
                                  <TableCell>{calc.calculation_step}</TableCell>
                                  <TableCell>{calc.step_order}</TableCell>
                                  <TableCell className="max-w-xs">
                                    <pre className="text-xs bg-muted p-2 rounded overflow-auto">
                                      {JSON.stringify(calc.step_data, null, 2)}
                                    </pre>
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
