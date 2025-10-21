  import React, { useState } from 'react';
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
        const success = await updateForecastCollaboration(id, { collaboration_status: 'approved' });
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
        const filteredIds = memoizedFilteredData.map(item => item.id);
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

    const [monthsToFilter, setMonthsToFilter] = useState<number>(5); // Define state for number of months
    const [appliedMonthsToFilter, setAppliedMonthsToFilter] = useState<number>(1); // State for applied filter

    // Filter dates for last 2 months and next 5 months
    const getFilteredDates = () => {
      const today = new Date();
      const twoMonthsAgo = new Date(today.getFullYear(), today.getMonth() - 2, 1);
      const fiveMonthsFromNow = new Date(today.getFullYear(), today.getMonth() + appliedMonthsToFilter, 31); // Use applied filter
      return data.filter(item => {
        const itemDate = new Date(item.postdate);
        return itemDate >= twoMonthsAgo && itemDate <= fiveMonthsFromNow;
      }).map(item => item.postdate);
    };

    // Get unique dates and sort them (filtered)
    const uniqueDates = [...new Set(getFilteredDates())].sort(); // Ensure all filtered dates are included

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

    const [searchQuery, setSearchQuery] = useState<{ key: string; value: string }>({ key: '', value: '' });
    const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' } | null>(null);

    const handleSort = (key: string) => {
      setSortConfig((prev) => {
        if (prev?.key === key) {
          return { key, direction: prev.direction === 'asc' ? 'desc' : 'asc' };
        }
        return { key, direction: 'asc' };
      });
    };

    const handleSearch = (key: string, value: string) => {
      setSearchQuery({ key, value: value.toLowerCase() });
    };

    const memoizedFilteredData = React.useMemo(() => {
      if (!searchQuery.key || !searchQuery.value) return data;
      const searchValues = searchQuery.value.split(',').map((v) => v.trim());
      return data.filter((item) => {
        const itemValue = item[searchQuery.key]?.toString().toLowerCase() || '';
        return searchValues.some((searchValue) => itemValue.includes(searchValue));
      });
    }, [data, searchQuery]);

    const [productIdSearchQuery, setProductIdSearchQuery] = useState<string>('');
    const [filteredData, setFilteredData] = useState<any[]>(data);

    const sortedData = React.useMemo(() => {
      if (!sortConfig) return filteredData;
      const sorted = [...filteredData].sort((a, b) => {
        const aValue = a[sortConfig.key];
        const bValue = b[sortConfig.key];
        if (typeof aValue === 'number' && typeof bValue === 'number') {
          return sortConfig.direction === 'asc' ? aValue - bValue : bValue - aValue;
        }
        const aStr = aValue?.toString().toLowerCase() || '';
        const bStr = bValue?.toString().toLowerCase() || '';
        return sortConfig.direction === 'asc' ? aStr.localeCompare(bStr) : bStr.localeCompare(aStr);
      });
      return sorted;
    }, [filteredData, sortConfig]);

    // Fetch filtered data from the database
    const fetchFilteredDataByProductIds = async (ids: string[]) => {
      try {
        const response = await fetch(`/api/forecast-data?product_ids=${ids.join(',')}`);
        const result = await response.json();
        setFilteredData(result);
      } catch (error) {
        console.error('Error fetching filtered data:', error);
        setFilteredData([]);
      }
    };

    // Handle product ID search input change
    const handleProductIdSearchChange = (value: string) => {
      setProductIdSearchQuery(value);
      const productIdValues = value.split(',').map((id) => id.trim());
      fetchFilteredDataByProductIds(productIdValues);
    };

    const renderCommercialPivotTable = () => (
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-48 font-semibold sticky left-0 bg-slate-100 dark:bg-slate-800 z-10 border-r">
              Métrica
            </TableHead>
            {uniqueDates.map(date => (
              <TableHead key={date} className="text-center min-w-32">
                {formatDate(date)}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {/* Venta YTD Row */}
          <TableRow>
            <TableCell className="font-medium bg-slate-100 dark:bg-slate-800 sticky left-0 z-10 border-r">
              Venta YTD
            </TableCell>
            {uniqueDates.map(date => {
              const dayData = getDataForDate(date);
              return <TableCell key={date} className="text-center">
                {dayData.sales_ytd || '-'}
              </TableCell>;
            })}
          </TableRow>

          {/* Venta LY Row */}
          <TableRow>
            <TableCell className="font-medium bg-slate-100 dark:bg-slate-800 sticky left-0 z-10 border-r">
              Venta LY
            </TableCell>
            {uniqueDates.map(date => {
              const dayData = getDataForDate(date);
              return <TableCell key={date} className="text-center">
                {dayData.sales_ly || '-'}
              </TableCell>;
            })}
          </TableRow>

          {/* Venta 3 meses Row */}
          <TableRow>
            <TableCell className="font-medium bg-slate-100 dark:bg-slate-800 sticky left-0 z-10 border-r">
              Venta 3 meses
            </TableCell>
            {uniqueDates.map(date => {
              const dayData = getDataForDate(date);
              return <TableCell key={date} className="text-center">
                {dayData.sales_3_months || '-'}
              </TableCell>;
            })}
          </TableRow>

          {/* Plan KAM Row */}
          <TableRow>
            <TableCell className="font-medium bg-slate-100 dark:bg-slate-800 sticky left-0 z-10 border-r">
              Plan KAM
            </TableCell>
            {uniqueDates.map(date => {
              const dayData = getDataForDate(date);
              return <TableCell key={date} className="text-center">
                {dayData.commercial_input || '-'}
              </TableCell>;
            })}
          </TableRow>

          {/* Estado Row */}
          <TableRow>
            <TableCell className="font-medium bg-slate-100 dark:bg-slate-800 sticky left-0 z-10 border-r">
              Estado
            </TableCell>
            {uniqueDates.map(date => {
              const dayData = getDataForDate(date);
              return <TableCell key={date} className="text-center">
                <Badge variant={getStatusBadge(dayData.collaboration_status)}>
                  {dayData.collaboration_status || '-'}
                </Badge>
              </TableCell>;
            })}
          </TableRow>

          {/* Confianza Comercial Row */}
          <TableRow>
            <TableCell className="font-medium bg-slate-100 dark:bg-slate-800 sticky left-0 z-10 border-r">
              Confianza Comercial
            </TableCell>
            {uniqueDates.map(date => {
              const dayData = getDataForDate(date);
              return <TableCell key={date} className="text-center">
                {dayData.commercial_confidence || '-'}
              </TableCell>;
            })}
          </TableRow>

          {/* Notas Comerciales Row */}
          <TableRow>
            <TableCell className="font-medium bg-slate-100 dark:bg-slate-800 sticky left-0 z-10 border-r">
              Notas Comerciales
            </TableCell>
            {uniqueDates.map(date => {
              const dayData = getDataForDate(date);
              return <TableCell key={date} className="text-center">
                {dayData.commercial_notes || '-'}
              </TableCell>;
            })}
          </TableRow>
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

    return <Card>
      <CardHeader>
        <CardTitle>Dirección Comercial - Tabla Pivote</CardTitle>
        <div className="flex items-center gap-4">
          <Button onClick={handleApproveAll} className="ml-4">
            Aprobar Todo
          </Button>
          <div className="flex items-center gap-2">
            <label htmlFor="monthsToFilter" className="text-sm font-medium">
              Meses a mostrar:
            </label>
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
            <Button onClick={() => setAppliedMonthsToFilter(monthsToFilter)} variant="default">
              Aplicar
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="relative overflow-x-auto">
          {renderCommercialPivotTable()}
        </div>
      </CardContent>
      {renderModal()}
    </Card>;
  };