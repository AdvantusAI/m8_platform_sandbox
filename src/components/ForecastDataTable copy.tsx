import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';

interface ForecastDataTableProps {
  selectedProductId?: string;
  selectedLocationId?: string;
  selectedCustomerId?: string;
  onDataUpdate?: (data: ForecastData[]) => void;
}
interface ForecastData {
  postdate: string;
  forecast: number | null;
  actual: number | null;
  sales_plan: number | null;
  demand_planner: number | null;
  forecast_ly: number | null;
  upper_bound: number | null;
  lower_bound: number | null;
}
export function ForecastDataTable({
  selectedProductId,
  selectedLocationId,
  selectedCustomerId,
  onDataUpdate
}: ForecastDataTableProps) {
  const [forecastData, setForecastData] = useState<ForecastData[]>([]);
  const [loading, setLoading] = useState(false);
  const [editingValues, setEditingValues] = useState<{[key: string]: number | null}>({});
  const [savingValues, setSavingValues] = useState<{[key: string]: boolean}>({});
  const [showEditDialog, setShowEditDialog] = useState<string | null>(null);
  const [editData, setEditData] = useState<ForecastData | null>(null);
  const [showMyInputDialog, setShowMyInputDialog] = useState<string | null>(null);
  const [myInputData, setMyInputData] = useState<ForecastData | null>(null);

  useEffect(() => {
    // Only fetch data if product is selected (location is now optional)
    if (selectedProductId) {
      fetchForecastData();
    } else {
      // Clear data if product is not selected
      setForecastData([]);
    }
  }, [selectedProductId, selectedLocationId, selectedCustomerId]);

  useEffect(() => {
    if (onDataUpdate) {
      onDataUpdate(forecastData);
    }
  }, [forecastData, onDataUpdate]);

  const fetchForecastData = async () => {
    try {
      setLoading(true);
     
      // Use manual aggregation approach since the database aggregation is causing issues
      await fetchAndAggregateManually();
    } catch (error) {
      console.error('Error fetching forecast data:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchAndAggregateManually = async () => {
    console.log('Fetching forecast data for manual aggregation...');
    console.log('Selected Product ID:', selectedProductId);
    try {
      let query = supabase
        .from('forecast_data')
        .select('postdate, forecast, actual, sales_plan, demand_planner, forecast_ly, upper_bound, lower_bound')
        .eq('product_id', selectedProductId!)
        .order('postdate');
      
      // Apply location filter only if selected
      if (selectedLocationId) {
        query = query.eq('location_id', selectedLocationId);
      }
      
      // Apply vendor filter only if selected - use customer_id field for vendor filtering
      if (selectedCustomerId) {
        query = query.eq('customer_id', selectedCustomerId);
      }
      // Execute the query
      
      
      
      
      const { data, error } = await query;
      
      if (error) {
        console.error('Error fetching forecast data for manual aggregation:', error);
        return;
      }
      
      
      
      // Group and aggregate by postdate
      const aggregatedData = new Map<string, ForecastData>();
      
      (data || []).forEach(item => {
        const postdate = item.postdate;
        
        if (!aggregatedData.has(postdate)) {
          aggregatedData.set(postdate, {
            postdate,
            forecast: 0,
            actual: 0,
            sales_plan: 0,
            demand_planner: 0,
            forecast_ly: 0,
            upper_bound: 0,
            lower_bound: 0
          });
        }
        
        const existing = aggregatedData.get(postdate)!;
        
        // Sum the numerical values
        existing.forecast = (existing.forecast || 0) + (item.forecast || 0);
        existing.actual = (existing.actual || 0) + (item.actual || 0);
        existing.sales_plan = (existing.sales_plan || 0) + (item.sales_plan || 0);
        existing.demand_planner = (existing.demand_planner || 0) + (item.demand_planner || 0);
        existing.forecast_ly = (existing.forecast_ly || 0) + (item.forecast_ly || 0);
        
        // For bounds, we'll average them (this could be adjusted based on business logic)
        const count = (data || []).filter(d => d.postdate === postdate).length;
        existing.upper_bound = ((existing.upper_bound || 0) + (item.upper_bound || 0)) / count;
        existing.lower_bound = ((existing.lower_bound || 0) + (item.lower_bound || 0)) / count;
      });
      
      // Convert to array and sort by postdate
      const result = Array.from(aggregatedData.values()).sort((a, b) => 
        new Date(a.postdate).getTime() - new Date(b.postdate).getTime()
      );

      
      setForecastData(result);
      
    } catch (error) {
      console.error('Error in manual aggregation:', error);
    }
  };

  const handleDemandPlannerChange = async (date: string, value: string) => {
    // Only allow editing if a vendor is selected
    if (!selectedCustomerId) {
      return;
    }

    // Only allow numbers and decimal points
    if (value !== '' && !/^\d*\.?\d*$/.test(value)) {
      return;
    }

    const numericValue = value === '' ? null : parseFloat(value);
    const key = `${date}`;
    
    setEditingValues(prev => ({
      ...prev,
      [key]: numericValue
    }));
  };

  const saveDemandPlannerValue = async (date: string) => {
    if (!selectedCustomerId || !selectedProductId) {
      return;
    }

    const key = `${date}`;
    const newValue = editingValues[key];
    
    if (newValue === undefined) {
      return;
    }

    setSavingValues(prev => ({ ...prev, [key]: true }));

    try {
      // Build the update query with filters
      let query = supabase
        .from('forecast_data')
        .update({ demand_planner: newValue })
        .eq('postdate', date)
        .eq('product_id', selectedProductId)
        .eq('customer_id', selectedCustomerId);

      // Apply location filter if selected
      if (selectedLocationId) {
        query = query.eq('location_id', selectedLocationId);
      }

      const { error } = await query;

      if (error) {
        throw error;
      }

      // Update local state to reflect the change
      setForecastData(prev => prev.map(item => 
        item.postdate === date 
          ? { ...item, demand_planner: newValue }
          : item
      ));

      // Clear the editing value since it's now saved
      setEditingValues(prev => {
        const newState = { ...prev };
        delete newState[key];
        return newState;
      });

      toast.success('Valor guardado exitosamente');
    } catch (error) {
      console.error('Error saving demand planner value:', error);
      toast.error('Error al guardar el valor');
    } finally {
      setSavingValues(prev => ({ ...prev, [key]: false }));
    }
  };

  const handleKeyPress = (event: React.KeyboardEvent<HTMLInputElement>, date: string) => {
    if (event.key === 'Enter') {
      saveDemandPlannerValue(date);
      event.currentTarget.blur();
    }
  };

  const handleBlur = (date: string) => {
    const key = `${date}`;
    if (editingValues.hasOwnProperty(key)) {
      saveDemandPlannerValue(date);
    }
  };

  const getDemandPlannerValue = (date: string, originalValue: number | null) => {
    const key = `${date}`;
    return editingValues.hasOwnProperty(key) ? editingValues[key] : originalValue;
  };

  const handleEditDialogOpen = (data: ForecastData) => {
    setEditData(data);
    setShowEditDialog(data.postdate);
  };

  const handleEditDialogSave = async () => {
    if (!editData || !selectedProductId || !selectedCustomerId) return;

    try {
      const { postdate, ...updatedValues } = editData;
      let query = supabase
        .from('forecast_data')
        .update(updatedValues)
        .eq('postdate', postdate)
        .eq('product_id', selectedProductId)
        .eq('customer_id', selectedCustomerId);

      if (selectedLocationId) {
        query = query.eq('location_id', selectedLocationId);
      }

      const { error } = await query;
      if (error) throw error;

      setForecastData(prev =>
        prev.map(item =>
          item.postdate === postdate ? { ...item, ...updatedValues } : item
        )
      );
      toast.success('Registro actualizado exitosamente');
    } catch (error) {
      console.error('Error updating forecast data:', error);
      toast.error('Error al actualizar el registro');
    } finally {
      setShowEditDialog(null);
      setEditData(null);
    }
  };

  const handleEditDialogCancel = () => {
    setShowEditDialog(null);
    setEditData(null);
  };

  const handleMyInputDialogOpen = (data: ForecastData) => {
    setMyInputData({ ...data }); // Ensure a copy of the data is used
    setShowMyInputDialog(data.postdate);
  };

  const handleMyInputDialogSave = async () => {
    if (!myInputData || !selectedProductId || !selectedCustomerId) return;

    try {
      const { postdate, ...updatedValues } = myInputData;
      let query = supabase
        .from('forecast_data')
        .update(updatedValues)
        .eq('postdate', postdate)
        .eq('product_id', selectedProductId)
        .eq('customer_id', selectedCustomerId);

      if (selectedLocationId) {
        query = query.eq('location_id', selectedLocationId);
      }

      const { error } = await query;
      if (error) throw error;

      setForecastData(prev =>
        prev.map(item =>
          item.postdate === postdate ? { ...item, ...updatedValues } : item
        )
      );
      toast.success('Datos actualizados correctamente');
    } catch (error) {
      console.error('Error al actualizar los datos:', error);
      toast.error('Error al actualizar los datos');
    } finally {
      setShowMyInputDialog(null);
      setMyInputData(null);
    }
  };

  const handleMyInputDialogCancel = () => {
    setShowMyInputDialog(null);
    setMyInputData(null);
  };

  const {
    tableData,
    uniqueDates
  } = useMemo(() => {
    if (!forecastData.length) return {
      tableData: [],
      uniqueDates: []
    };
    
    const uniqueDates = [...new Set(forecastData.map(item => item.postdate))].sort();
    const seriesData = [{
      series: 'Actual',
      type: 'actual'
    }, {
      series: 'Forecast',
      type: 'forecast'
    }, {
      series: 'Sales Plan',
      type: 'sales_plan'
    }, {
      series: 'Demand Planner',
      type: 'demand_planner'
    }, {
      series: 'Forecast LY',
      type: 'forecast_ly'
    }];
    
    const tableData = seriesData.map(row => {
      const rowData = {
        ...row
      };
      uniqueDates.forEach(date => {
        const dataPoint = forecastData.find(item => item.postdate === date);
        if (dataPoint) {
          rowData[date] = dataPoint[row.type as keyof ForecastData];
        } else {
          rowData[date] = null;
        }
      });
      return rowData;
    });
    
    return {
      tableData,
      uniqueDates
    };
  }, [forecastData]);

  const formatNumber = (value: number | null) => {
    if (value === null || value === undefined) return '-';
    return new Intl.NumberFormat('en-US').format(value);
  };
  
  const getYearGroups = () => {
    const yearGroups: {
      [year: string]: string[];
    } = {};
    uniqueDates.forEach(date => {
      const year = new Date(date).getFullYear().toString();
      if (!yearGroups[year]) {
        yearGroups[year] = [];
      }
      yearGroups[year].push(date);
    });
    return yearGroups;
  };
  
  if (!selectedProductId) {
    return <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="text-lg font-medium text-muted-foreground">
            Selecciona producto para ver los datos
          </div>
          <div className="text-sm text-muted-foreground mt-2">
            El producto es obligatorio para cargar la información
          </div>
        </div>
      </div>;
  }
  
  if (loading) {
    return <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="text-lg font-medium">Cargando datos de pronóstico...</div>
          <div className="text-sm text-muted-foreground mt-2">
            Filtros: Producto {selectedProductId}
            {selectedLocationId && `, Ubicación ${selectedLocationId}`}
            {selectedCustomerId && `, Proveedor ${selectedCustomerId}`}
          </div>
        </div>
      </div>;
  }
  
  if (!forecastData.length) {
    return <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="text-lg font-medium text-muted-foreground">No se encontraron datos de pronóstico</div>
          <div className="text-sm text-muted-foreground mt-2">
            Filtros aplicados: Producto {selectedProductId}
            {selectedLocationId && `, Ubicación ${selectedLocationId}`}
            {selectedCustomerId && `, Proveedor ${selectedCustomerId}`}
          </div>
        </div>
      </div>;
  }
  
  const yearGroups = getYearGroups();
  return <div className="w-full">
      <div className="mb-4">
        <div className="text-sm text-muted-foreground">
          Datos agregados por fecha - Mostrando totales por postdate
          {selectedLocationId && ` para ubicación ${selectedLocationId}`}
          {selectedCustomerId ? ` filtrado por proveedor ${selectedCustomerId}` : ' (todos los proveedores)'}
        </div>
        {!selectedCustomerId && (
          <div className="text-sm text-orange-600 mt-1">
            ⚠️ Selecciona un proveedor para editar los valores del Demand Planner
          </div>
        )}
        {selectedCustomerId && (
          <div className="text-sm text-blue-600 mt-1">
            💡 Presiona Enter o haz clic fuera del campo para guardar los cambios
          </div>
        )}
      </div>
      
      <ScrollArea className="w-full">
        <div className="relative">
          <table className="w-full min-w-fit border-collapse border">
            <thead>
              {/* Year headers */}
              <tr className="border-b">
                <th className="text-left py-2 px-3 bg-gray-50 font-medium min-w-[168px] sticky left-0 z-10 border-r">Series</th>
                {Object.entries(yearGroups).map(([year, dates]) => <th key={year} className="text-center py-2 px-3 bg-gray-50 font-medium border-r" colSpan={dates.length}>
                    {year}
                  </th>)}
              </tr>
              {/* Date headers */}
              <tr className="border-b">
                <th className="text-left py-2 px-3 bg-gray-50 font-medium sticky left-0 z-10 border-r"></th>
                {uniqueDates.map(date => (
                  <th key={date} className="text-center py-1 px-3 bg-gray-50 text-xs min-w-28 border-r">
                    {date}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {tableData.map((row, rowIndex) => <tr key={row.series} className={`border-b hover:bg-muted/50 ${rowIndex === 0 ? 'bg-blue-50' : rowIndex === 3 ? 'bg-orange-50' : rowIndex % 2 === 0 ? 'bg-blue-25' : 'bg-white'}`}>
                  <td className="font-medium bg-gray-50 sticky left-0 z-10 whitespace-nowrap border-r">
                    {row.series}
                  </td>
                  {uniqueDates.map(date => {
                    const key = `${date}`;
                    const isSaving = savingValues[key];
                    
                    return (
                      <td key={date} className="py-2 px-4 text-right text-sm min-w-28 border-r">
                        {row.series === 'Demand Planner' ? (
                          selectedCustomerId ? (
                            <div className="relative">
                              <Input
                                type="text"
                                value={getDemandPlannerValue(date, row[date] as number) || ''}
                                onChange={(e) => handleDemandPlannerChange(date, e.target.value)}
                                onKeyPress={(e) => handleKeyPress(e, date)}
                                onBlur={() => handleBlur(date)}
                                className="h-8 w-full text-right text-sm border-none bg-transparent p-2 focus:bg-white focus:border-input"
                                placeholder="0"
                                title="Presiona Enter o haz clic fuera para guardar"
                                disabled={isSaving}
                              />
                              {isSaving && (
                                <div className="absolute inset-0 flex items-center justify-center bg-white/50">
                                  <div className="w-3 h-3 border border-gray-300 border-t-blue-600 rounded-full animate-spin"></div>
                                </div>
                              )}
                            </div>
                          ) : (
                            <div className="h-8 w-full text-right text-sm p-2 text-gray-400 bg-gray-50 rounded">
                              {formatNumber(row[date] as number)}
                            </div>
                          )
                        ) : (
                          formatNumber(row[date] as number)
                        )}
                      </td>
                    );
                  })}
                </tr>)}
            </tbody>
          </table>
        </div>
        <ScrollBar orientation="horizontal" />
      </ScrollArea>
      
      {/* Edit Dialog */}
      {showEditDialog && editData && (
        <Dialog open onOpenChange={() => setShowEditDialog(null)}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Editar Registro</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              {Object.keys(editData).map((key) => (
                <div key={key}>
                  <label className="block text-sm font-medium text-muted-foreground">
                    {key}
                  </label>
                  <Input
                    type="text"
                    value={editData[key as keyof ForecastData] || ''}
                    onChange={(e) =>
                      setEditData((prev) => ({
                        ...prev!,
                        [key]: e.target.value,
                      }))
                    }
                  />
                </div>
              ))}
            </div>
            <div className="flex justify-end space-x-2 mt-4">
              <Button variant="outline" onClick={handleEditDialogCancel}>
                Cancelar
              </Button>
              <Button onClick={handleEditDialogSave}>Guardar</Button>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* My Input Dialog */}
      {showMyInputDialog && myInputData && (
        <Dialog open onOpenChange={() => setShowMyInputDialog(null)}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Editar Mi Input</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              {Object.keys(myInputData).map((key) => (
                <div key={key}>
                  <label className="block text-sm font-medium text-muted-foreground">
                    {key}
                  </label>
                  <Input
                    type="text"
                    value={myInputData[key as keyof ForecastData] || ''}
                    onChange={(e) =>
                      setMyInputData((prev) => ({
                        ...prev!,
                        [key]: e.target.value,
                      }))
                    }
                  />
                </div>
              ))}
            </div>
            <div className="flex justify-end space-x-2 mt-4">
              <Button variant="outline" onClick={handleMyInputDialogCancel}>
                Cancelar
              </Button>
              <Button onClick={handleMyInputDialogSave}>Guardar</Button>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>;
}
