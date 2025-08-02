import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Save, X } from 'lucide-react';
import { useForecastCollaboration } from '@/hooks/useForecastCollaboration';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { getSystemConfig } from '@/utils/systemConfig'; // Add import for system configuration utility
import { fetchVentas3Months } from '@/utils/supabaseQueries'; // Import the new utility

interface ForecastPivotTableProps {
  data: any[];
  comments: any[];
}
export const ForecastPivotTable: React.FC<ForecastPivotTableProps> = ({
  data,
  comments
}) => {
  const {
    updateForecastCollaboration
  } = useForecastCollaboration();
  const [editingCells, setEditingCells] = useState<{
    [key: string]: string;
  }>({});
  const [pendingUpdates, setPendingUpdates] = useState<{
    [key: string]: number;
  }>({});

  const userRole = 'admin'; // Replace with actual logic to determine user role

  const handleApprove = async (id: string) => {
    try {
      const success = await updateForecastCollaboration(id, { collaboration_status: 'Approved' });
      if (success) {
        toast.success('Estado cambiado a "Aprobado" exitosamente');
      } else {
        toast.error('Error al cambiar el estado');
      }
    } catch (error) {
      console.error('Error al cambiar el estado:', error);
      toast.error('Error al cambiar el estado');
    }
  };

  const handleApproveAll = async () => {
    try {
      const systemConfig = await getSystemConfig('system_date'); // Ensure this is inside the async function
      const today = new Date(systemConfig?.currentDate || Date.now()); // Correct initialization

      const memoizedFilteredData = React.useMemo(() => {
        return data.filter(item => item.collaboration_status === 'pending');
      }, [data]);

      const filteredIds = memoizedFilteredData
        .filter(item => {
          const itemDate = new Date(item.postdate);
          const startDate = new Date(today.getFullYear(), today.getMonth() - monthsToFilter, 1);
          const endDate = new Date(today.getFullYear(), today.getMonth() + monthsToFilter, 31);
          return itemDate >= startDate && itemDate <= endDate; // Ensure only items within the filtered months are included
        })
        .map(item => item.id);

      const promises = filteredIds.map(id =>
        updateForecastCollaboration(id, { collaboration_status: 'approved' })
      );
      const results = await Promise.all(promises);
      const allSuccessful = results.every(success => success);

      if (allSuccessful) {
        toast.success('Todos los estados cambiados a "Aprobado" exitosamente');
      } else {
        toast.error('Error al cambiar algunos estados');
      }
    } catch (error) {
      console.error('Error al cambiar los estados:', error);
      toast.error('Error al cambiar los estados');
    }
  };

  const [monthsToFilter, setMonthsToFilter] = useState<number>(5); // Add state for monthsToFilter

  const getFilteredDates = async () => {
    const systemConfig = await getSystemConfig('system_date'); // Ensure this is inside the async function
    const today = new Date(systemConfig?.currentDate || Date.now()); // Correct initialization
    const startDate = new Date(today.getFullYear(), today.getMonth() - monthsToFilter, 1);
    const endDate = new Date(today.getFullYear(), today.getMonth() + monthsToFilter, 31);

    return data.filter(item => {
      const itemDate = new Date(item.postdate);
      return itemDate >= startDate && itemDate <= endDate;
    }).map(item => item.postdate);
  };

  const [uniqueDates, setUniqueDates] = useState<string[]>([]);

  useEffect(() => {
    const fetchFilteredDates = async () => {
      const filteredDates = await getFilteredDates();
      setUniqueDates([...new Set(filteredDates)].sort());
    };
    fetchFilteredDates();
  }, [data, monthsToFilter]);

  // Helper function to get data for a specific date
  const getDataForDate = (date: string) => {
    return data.find(item => item.postdate === date) || {};
  };

  // Helper function to format date for display
  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('es-ES', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  // Handle cell edit
  const handleCellEdit = (date: string, value: string) => {
    const cellKey = `input-${date}`;
    setEditingCells(prev => ({
      ...prev,
      [cellKey]: value
    }));
  };
 console.log(data);
  // Handle cell save
  const handleCellSave = async (date: string) => {
    const cellKey = `input-${date}`;
    const value = editingCells[cellKey];
    const dayData = getDataForDate(date);
    if (dayData.id && value !== undefined) {
      const success = await updateForecastCollaboration(dayData.id, {
        commercial_input: parseFloat(value) || 0,
        collaboration_status: 'reviewed'
      });
      if (success) {
        setPendingUpdates(prev => ({
          ...prev,
          [cellKey]: parseFloat(value) || 0
        }));
        setEditingCells(prev => {
          const newState = {
            ...prev
          };
          delete newState[cellKey];
          return newState;
        });
      }
    }
  };

  // Handle cell cancel
  const handleCellCancel = (date: string) => {
    const cellKey = `input-${date}`;
    setEditingCells(prev => {
      const newState = {
        ...prev
      };
      delete newState[cellKey];
      return newState;
    });
  };

  // Helper function to get status badge
  const getStatusBadge = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'approved':
      case 'aprobado':
        return 'default';
      case 'pending':
      case 'pendiente':
        return 'secondary';
      case 'rejected':
      case 'rechazado':
        return 'destructive';
      default:
        return 'outline';
    }
  };

  // Helper function to get confidence badge
  const getConfidenceBadge = (confidence: string) => {
    switch (confidence?.toLowerCase()) {
      case 'high':
      case 'alta':
        return 'default';
      case 'medium':
      case 'media':
        return 'secondary';
      case 'low':
      case 'baja':
        return 'destructive';
      default:
        return 'outline';
    }
  };

  // Helper function to get product name by ID
  const getProductName = (productId: string) => {
    console.log(productId);
    // Replace with actual logic to fetch product name
    const product = data.find(item => item.product_id === productId);
    return product && product.product_name ? product.product_name : productId;
  };

  // Helper function to get location name by ID
  const getLocationName = (locationId: string) => {
    // Replace with actual logic to fetch location name
    const location = data.find(item => item.location_id === locationId);
    return location && location.location_name ? location.location_name : locationId;
  };

  // Helper function to get customer name by ID
  const getCustomerName = (customerId: string) => {
    // Replace with actual logic to fetch customer name
    const customer = data.find(item => item.customer_id === customerId);
    return customer && customer.customer_name ? customer.customer_name : customerId;
  };

  const [selectedRow, setSelectedRow] = useState<any | null>(null);
  const [modalData, setModalData] = useState<any | null>(null);
  const [savingModalData, setSavingModalData] = useState(false);

  const handleOpenModal = (row: any) => {
    setSelectedRow(row);
    setModalData({
      commercial_input: row.commercial_input || '',
      commercial_confidence: row.commercial_confidence || '',
      commercial_notes: row.commercial_notes || '',
      commercial_reviewed_by: row.commercial_reviewed_by || '',
      commercial_reviewed_at: row.commercial_reviewed_at || '',
      market_intelligence: row.market_intelligence || '',
      promotional_activity: row.promotional_activity || '',
      competitive_impact: row.competitive_impact || ''
    });
  };

  const handleModalSave = async () => {
    if (!selectedRow) return;

    setSavingModalData(true);
    try {
      const success = await updateForecastCollaboration(selectedRow.id, modalData);
      if (success) {
        toast.success('Datos guardados exitosamente');
        setSelectedRow(null);
        setModalData(null);
      } else {
        toast.error('Error al guardar los datos');
      }
    } catch (error) {
      console.error('Error al guardar los datos:', error);
      toast.error('Error al guardar los datos');
    } finally {
      setSavingModalData(false);
    }
  };

  const handleModalClose = () => {
    setSelectedRow(null);
    setModalData(null);
  };

  // Render Dirección Comercial table
  const renderCommercialTable = () => (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Producto</TableHead>
          <TableHead>Ubicación</TableHead>
          <TableHead>Cliente</TableHead>
          <TableHead>Venta YTD</TableHead>
          <TableHead>Venta LY</TableHead>
          <TableHead>Venta 3 meses</TableHead>
          <TableHead>Plan KAM</TableHead>
          <TableHead>Estado</TableHead>
          <TableHead>Confianza Comercial</TableHead>
          <TableHead>Notas Comerciales</TableHead>
          {userRole === 'admin' && <TableHead>Acciones</TableHead>}
        </TableRow>
      </TableHeader>
      <TableBody>
        {data.map(item => (
          <TableRow key={item.id}>
            <TableCell>{getProductName(item.product_id)}</TableCell>
            <TableCell>{getLocationName(item.location_id)}</TableCell>
            <TableCell>{getCustomerName(item.customer_id)}</TableCell>
            <TableCell>{item.sales_ytd || '-'}</TableCell>
            <TableCell>{item.sales_ly || '-'}</TableCell>
            <TableCell>{item.sales_3_months || '-'}</TableCell>
            <TableCell>
              <div
                className="cursor-pointer text-blue-600 hover:underline"
                onClick={() => handleOpenModal(item)}
              >
                {item.commercial_input || '-'}
              </div>
            </TableCell>
            <TableCell>
              <Badge variant={getStatusBadge(item.collaboration_status)}>
                {item.collaboration_status || '-'}
              </Badge>
            </TableCell>
            <TableCell>{item.commercial_confidence || '-'}</TableCell>
            <TableCell>{item.commercial_notes || '-'}</TableCell>
            {userRole === 'admin' && (
              <TableCell>
                <Button size="sm" onClick={() => handleApprove(item.id)}>
                  Aprobar
                </Button>
              </TableCell>
            )}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );

  // Render Dirección Comercial Detallada table
  const renderDetailedCommercialTable = () => (
    <Table>
      <TableHeader>
        <TableRow>
        <TableHead>Producto</TableHead>
          <TableHead>Ubicación</TableHead>
          <TableHead>Cliente</TableHead>
          <TableHead>Venta YTD</TableHead>
          <TableHead>Venta LY</TableHead>
          <TableHead>Venta 3 meses</TableHead>
          <TableHead>Plan KAM</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {data.filter(item => item.collaboration_status === 'approved').map(item => (
          <TableRow key={item.id}>
            <TableCell>{getProductName(item.product_id)}</TableCell>
            <TableCell>{getLocationName(item.location_id)}</TableCell>
            <TableCell>{getCustomerName(item.customer_id)}</TableCell>
            <TableCell>{item.sales_ytd || '-'}</TableCell>
            <TableCell>{item.sales_ly || '-'}</TableCell>
            <TableCell>{item.sales_3_months || '-'}</TableCell>            
            <TableCell>{item.commercial_input || '-'}</TableCell>                        
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );

  if (!data || data.length === 0) {
    return <Card>
        <CardContent className="p-6">
          <p className="text-center text-muted-foreground">
            No hay datos disponibles para mostrar en la tabla pivote.
          </p>
        </CardContent>
      </Card>;
  }

  // Example filters (replace with actual filter logic)
  const selectedFilters = {
    productId: 'selectedProductId', // Replace with actual selected product ID
    locationId: 'selectedLocationId', // Replace with actual selected location ID
    clientId: 'selectedClientId' // Replace with actual selected client ID
  };

  // Modal for editing commercial data
  const renderModal = () => (
    <Dialog open={!!selectedRow} onOpenChange={handleModalClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Editar Datos Comerciales</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Input Comercial</label>
            <Input
              value={modalData?.commercial_input || ''}
              onChange={(e) => setModalData({ ...modalData, commercial_input: e.target.value })}
              className="mt-1"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Confianza Comercial</label>
            <Input
              value={modalData?.commercial_confidence || ''}
              onChange={(e) => setModalData({ ...modalData, commercial_confidence: e.target.value })}
              className="mt-1"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Notas Comerciales</label>
            <Textarea
              value={modalData?.commercial_notes || ''}
              onChange={(e) => setModalData({ ...modalData, commercial_notes: e.target.value })}
              className="mt-1"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Inteligencia de Mercado</label>
            <Input
              value={modalData?.market_intelligence || ''}
              onChange={(e) => setModalData({ ...modalData, market_intelligence: e.target.value })}
              className="mt-1"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Actividad Promocional</label>
            <Input
              value={modalData?.promotional_activity || ''}
              onChange={(e) => setModalData({ ...modalData, promotional_activity: e.target.value })}
              className="mt-1"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Impacto Competitivo</label>
            <Input
              value={modalData?.competitive_impact || ''}
              onChange={(e) => setModalData({ ...modalData, competitive_impact: e.target.value })}
              className="mt-1"
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={handleModalClose}>
              Cancelar
            </Button>
            <Button onClick={handleModalSave} disabled={savingModalData}>
              Guardar
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );

  const calculateVentasYTD = async (productId: string, locationId: string, customerId: string) => {
    try {
      const systemConfig = await getSystemConfig('system_date');
      const currentYear = new Date(systemConfig?.currentDate || Date.now()).getFullYear();

      const ventasYTD = data.reduce((sum, item) => {
        if (
          item.product_id === productId &&
          item.location_id === locationId &&
          item.customer_id === customerId
        ) {
          const historyEntries = item.history.filter(
            (entry: any) => new Date(entry.postdate).getFullYear() === currentYear
          );
          return sum + historyEntries.reduce((entrySum: number, entry: any) => entrySum + (entry.quantity || 0), 0);
        }
        return sum;
      }, 0);

      return ventasYTD;
    } catch (error) {
      console.error('Error in calculateVentasYTD:', error);
      return 0;
    }
  };

  const calculateVentasLY = async (productId: string, locationId: string, customerId: string) => {
    try {
      const systemConfig = await getSystemConfig('system_date');
      const lastYear = new Date(systemConfig?.currentDate || Date.now()).getFullYear() - 1;

      const ventasLY = data.reduce((sum, item) => {
        if (
          item.product_id === productId &&
          item.location_id === locationId &&
          item.customer_id === customerId
        ) {
          const historyEntries = item.history.filter(
            (entry: any) => new Date(entry.postdate).getFullYear() === lastYear
          );
          return sum + historyEntries.reduce((entrySum: number, entry: any) => entrySum + (entry.quantity || 0), 0);
        }
        return sum;
      }, 0);

      return ventasLY;
    } catch (error) {
      console.error('Error in calculateVentasLY:', error);
      return 0;
    }
  };

  const calculateVentas3Months = async (productId: string, locationId: string, customerId: string) => {
    try {
      const systemConfig = await getSystemConfig('system_date');
      const systemDate = new Date(systemConfig?.currentDate || Date.now());

      const ventas3Months = await fetchVentas3Months(productId, locationId, customerId, systemDate);
      return ventas3Months;
    } catch (error) {
      console.error('Error in calculateVentas3Months:', error);
      return 0;
    }
  };

  const [ventasYTD, setVentasYTD] = useState<number>(0);
  const [ventasLY, setVentasLY] = useState<number>(0);
  const [ventas3Months, setVentas3Months] = useState<number>(0);
  
  const [filterValues, setFilterValues] = useState<{
    productId: string;
    locationId: string;
    customerId: string;
  }>({
    productId:  data.length > 0 ? data[0].product_id : '' ,
   
    locationId: data.length > 0 ? data[0].location_id : '' , 
    customerId: data.length > 0 ? data[0].customer_id : '' , 
  });

  useEffect(() => {
    const fetchVentas = async () => {
      const { productId, locationId, customerId } = filterValues;
      if (productId && locationId && customerId) {
        const ytdResult = await calculateVentasYTD(productId, locationId, customerId);
        const lyResult = await calculateVentasLY(productId, locationId, customerId);
        const threeMonthsResult = await calculateVentas3Months(productId, locationId, customerId);

        setVentasYTD(ytdResult);
        setVentasLY(lyResult);
        setVentas3Months(threeMonthsResult);
      }
    };
    fetchVentas();
  }, [filterValues]);

  return <Card>
      <CardHeader>
        <CardTitle>Tabla Pivote - Colaboración de Pronósticos</CardTitle>
      </CardHeader>
      <CardContent>
        {/* Remove or hide the input fields */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Ventas YTD</p>
                  <div className="flex items-center gap-2">
                    <span className="text-2xl font-bold text-custom-slate">
                      {ventasYTD}
                    </span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Ventas LY</p>
                  <div className="flex items-center gap-2">
                    <span className="text-2xl font-bold text-custom-slate">
                      {ventasLY}
                    </span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Ventas 3 meses</p>
                  <div className="flex items-center gap-2">
                    <span className="text-2xl font-bold text-custom-slate">
                      {ventas3Months}
                    </span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
        <div className="mt-6">
          <CardTitle>Dirección Comercial</CardTitle>
          <Input
            id="monthsToFilter"
            type="number"
            value={monthsToFilter}
            onChange={(e) => {
              const value = Math.max(2, Math.min(12, Number(e.target.value)));
              setMonthsToFilter(value);
            }}
            className="w-20"
          />
          {renderCommercialTable()}
        </div>
        <div className="mt-6">
          <CardTitle>Dirección Comercial Detallada</CardTitle>
          {renderDetailedCommercialTable()}
        </div>
      </CardContent>
      {renderModal()}
    </Card>;
};