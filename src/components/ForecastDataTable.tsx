import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Download } from 'lucide-react';
import { toast } from 'sonner';
import { useLocations } from '@/hooks/useLocations';
import { useCustomers } from '@/hooks/useCustomers';

// --- Tipos robustos (aceptan ambos nombres de id) ---
interface Customer {
  customer_code: string;
  customer_node_id?: string;        // posible nombre
  customer_node_id?: string;   // posible nombre alterno
}

interface Location {
  location_code: string;
  location_id?: string;        // posible nombre
  location_node_id?: string;   // posible nombre alterno
  description?: string;
  type_code?: string;
}

interface ForecastDataTableProps {
  selectedProductId?: string;
  selectedLocationId?: string;  // código de ubicación (p.ej. "CDMX")
  selectedCustomerId?: string;  // código de cliente/proveedor (p.ej. "VEND123")
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
  commercial_input: number | null;
  fitted_history?: number | null;
}

export function ForecastDataTable({
  selectedProductId,
  selectedLocationId,
  selectedCustomerId,
  onDataUpdate,
}: ForecastDataTableProps) {
  const [forecastData, setForecastData] = useState<ForecastData[]>([]);
  const [loading, setLoading] = useState(false);
  const [editingValues, setEditingValues] = useState<Record<string, number | null>>({});
  const [savingValues, setSavingValues] = useState<Record<string, boolean>>({});

  // Hooks de datos (fallback a arrays vacíos para evitar "undefined.length")
  const { locations = [] } = useLocations() as { locations: Location[] };
  const { customers = [] } = useCustomers() as { customers: Customer[] };

  // Mapas: código -> node_id (compatibles con ambos nombres de id)
  const locationCodeToNodeId = useMemo(() => {
    const m = new Map<string, string>();
    for (const l of locations) {
      const id = l.location_node_id ?? l.location_id;
      if (l.location_code && id) m.set(l.location_code, id);
    }
    return m;
  }, [locations]);

  const customerCodeToNodeId = useMemo(() => {
    const m = new Map<string, string>();
    for (const c of customers) {
      const id = c.customer_node_id ?? c.customer_node_id;
      if (c.customer_code && id) m.set(c.customer_code, id);
    }
    return m;
  }, [customers]);

  const getLocationNodeIdFromCode = useCallback(
    (code?: string) => (code ? locationCodeToNodeId.get(code) : undefined),
    [locationCodeToNodeId]
  );

  const getCustomerNodeIdFromCode = useCallback(
    (code?: string) => (code ? customerCodeToNodeId.get(code) : undefined),
    [customerCodeToNodeId]
  );

  useEffect(() => {
    // Solo intentamos cargar cuando hay producto y catálogos listos
    if (selectedProductId && locations.length > 0 && customers.length > 0) {
      fetchForecastData();
    } else {
      // si faltan datos clave, limpiamos
      setForecastData([]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedProductId, selectedLocationId, selectedCustomerId, locations, customers]);

  const fetchForecastData = async () => {
    if (!selectedProductId) return;

    try {
      setLoading(true);
      await fetchAndAggregateManually();
    } catch (error) {
      console.error('Error fetching forecast data:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchAndAggregateManually = async () => {
    let query = (supabase as any)
      .schema('m8_schema')
      .from('forecast_with_fitted_history')
      .select(
        'product_id,location_node_id,customer_node_id,postdate,forecast,actual,sales_plan,demand_planner,forecast_ly,upper_bound,lower_bound,commercial_input,fitted_history'
      )
      .eq('product_id', selectedProductId!)
      .order('postdate', { ascending: true });

    // Filtro de ubicación si hay código y podemos resolver el node_id
    if (selectedLocationId) {
      const locNodeId = getLocationNodeIdFromCode(selectedLocationId);
      if (locNodeId) {
        query = query.eq('location_node_id', locNodeId);
      } else {
        console.warn('Location node_id not found for code:', selectedLocationId);
      }
    }

    // Filtro de cliente/proveedor si hay código y podemos resolver el node_id
    if (selectedCustomerId) {
      const custNodeId = getCustomerNodeIdFromCode(selectedCustomerId);
      if (custNodeId) {
        query = query.eq('customer_node_id', custNodeId);
      } else {
        // AVISO: mostramos el código, no "undefined"
        console.warn('Customer node_id not found for code:', selectedCustomerId);
      }
    }

    const { data, error } = await query;
    if (error) {
      console.error('Error fetching forecast data for manual aggregation:', error);
      return;
    }

    // Agrupar por postdate sumando campos numéricos
    const aggregated = new Map<string, ForecastData>();
    for (const item of data || []) {
      const key = item.postdate as string;
      const base: ForecastData =
        aggregated.get(key) ?? {
          postdate: key,
          forecast: 0,
          actual: 0,
          sales_plan: 0,
          demand_planner: 0,
          forecast_ly: 0,
          upper_bound: 0,
          lower_bound: 0,
          commercial_input: 0,
          fitted_history: 0,
        };

      base.forecast = (base.forecast || 0) + (item.forecast || 0);
      base.actual = (base.actual || 0) + (item.actual || 0);
      base.sales_plan = (base.sales_plan || 0) + (item.sales_plan || 0);
      base.demand_planner = (base.demand_planner || 0) + (item.demand_planner || 0);
      base.forecast_ly = (base.forecast_ly || 0) + (item.forecast_ly || 0);
      base.commercial_input = (base.commercial_input || 0) + (item.commercial_input || 0);
      base.fitted_history = (base.fitted_history || 0) + (item.fitted_history || 0);

      aggregated.set(key, base);
    }

    const result = Array.from(aggregated.values()).sort(
      (a, b) => new Date(a.postdate).getTime() - new Date(b.postdate).getTime()
    );
    setForecastData(result);
    onDataUpdate?.(result);
  };

  const handleDemandPlannerChange = async (date: string, value: string) => {
    if (!selectedCustomerId) return; // solo editable si hay proveedor seleccionado
    if (value !== '' && !/^\d*\.?\d*$/.test(value)) return; // números/decimales

    const numericValue = value === '' ? null : parseFloat(value);
    const key = `${date}`;
    setEditingValues((prev) => ({ ...prev, [key]: numericValue }));
  };

  const saveDemandPlannerValue = async (date: string) => {
    if (!selectedCustomerId || !selectedProductId) return;

    const key = `${date}`;
    const newValue = editingValues[key];
    if (newValue === undefined) return;

    const custNodeId = getCustomerNodeIdFromCode(selectedCustomerId);
    if (!custNodeId) {
      console.warn('Cannot save: customer node_id not found for code:', selectedCustomerId);
      toast.error('Proveedor seleccionado inválido.');
      return;
    }

    setSavingValues((prev) => ({ ...prev, [key]: true }));
    try {
      let query = (supabase as any)
        .schema('m8_schema')
        .from('forecast_data')
        .update({ demand_planner: newValue })
        .eq('postdate', date)
        .eq('product_id', selectedProductId)
        .eq('customer_node_id', custNodeId);

      if (selectedLocationId) {
        const locNodeId = getLocationNodeIdFromCode(selectedLocationId);
        if (locNodeId) query = query.eq('location_node_id', locNodeId);
      }

      const { error } = await query;
      if (error) throw error;

      setForecastData((prev) =>
        prev.map((item) => (item.postdate === date ? { ...item, demand_planner: newValue } : item))
      );

      setEditingValues((prev) => {
        const n = { ...prev };
        delete n[key];
        return n;
      });

      toast.success('Valor guardado exitosamente');
    } catch (error) {
      console.error('Error saving demand planner value:', error);
      toast.error('Error al guardar el valor');
    } finally {
      setSavingValues((prev) => ({ ...prev, [key]: false }));
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
    if (Object.prototype.hasOwnProperty.call(editingValues, key)) {
      saveDemandPlannerValue(date);
    }
  };

  const getDemandPlannerValue = (date: string, originalValue: number | null) => {
    const key = `${date}`;
    return Object.prototype.hasOwnProperty.call(editingValues, key)
      ? editingValues[key]
      : originalValue;
  };

  const { tableData, uniqueDates } = useMemo(() => {
    if (!forecastData.length)
      return {
        tableData: [] as Array<Record<string, any>>, // eslint-disable-line @typescript-eslint/no-explicit-any
        uniqueDates: [] as string[],
      };

    const uniqueDates = [...new Set(forecastData.map((i) => i.postdate))].sort();
    const seriesData = [
      { series: 'Actual', type: 'actual' },
      { series: 'Forecast', type: 'forecast' },
      { series: 'Objetivo de ventas', type: 'sales_plan' },
      { series: 'Demand Planner', type: 'demand_planner' },
      { series: 'Forecast LY', type: 'forecast_ly' },
      { series: 'Plan Comercial', type: 'commercial_input' },
      { series: 'Historia ajustada', type: 'fitted_history' },
    ] as const;

    const tableData = seriesData.map((row) => {
      const rowData: Record<string, any> = { ...row }; // eslint-disable-line @typescript-eslint/no-explicit-any
      uniqueDates.forEach((date) => {
        const d = forecastData.find((it) => it.postdate === date);
        rowData[date] = d ? (d as any)[row.type] ?? null : null; // eslint-disable-line @typescript-eslint/no-explicit-any
      });
      return rowData;
    });

    return { tableData, uniqueDates };
  }, [forecastData]);

  const formatNumber = (value: number | null) => {
    if (value === null || value === undefined) return '-';
    return new Intl.NumberFormat('en-US').format(value);
  };

  const downloadCSV = () => {
    if (!forecastData.length) {
      toast.error('No hay datos para exportar');
      return;
    }

    const headers = ['Serie', ...uniqueDates];
    const rows = [headers.join(',')];

    tableData.forEach((row: Record<string, any>) => { // eslint-disable-line @typescript-eslint/no-explicit-any
      const r = [row.series, ...uniqueDates.map((d) => (row[d] ?? '').toString())];
      rows.push(r.join(','));
    });

    const csvContent = rows.join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `datos_pronostico_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast.success('Archivo CSV descargado exitosamente');
  };

  const getYearGroups = () => {
    const groups: Record<string, string[]> = {};
    uniqueDates.forEach((d) => {
      const y = new Date(d).getFullYear().toString();
      groups[y] = groups[y] || [];
      groups[y].push(d);
    });
    return groups;
  };

  if (!selectedProductId) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="text-lg font-medium text-muted-foreground">Selecciona producto para ver los datos</div>
          <div className="text-sm text-muted-foreground mt-2">El producto es obligatorio para cargar la información</div>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="text-lg font-medium">Cargando datos de pronóstico...</div>
          <div className="text-sm text-muted-foreground mt-2">
            Filtros: Producto {selectedProductId}
            {selectedLocationId && `, Ubicación ${selectedLocationId}`}
            {selectedCustomerId && `, Proveedor ${selectedCustomerId}`}
          </div>
        </div>
      </div>
    );
  }

  if (!forecastData.length) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="text-lg font-medium text-muted-foreground">No se encontraron datos de pronóstico</div>
          <div className="text-sm text-muted-foreground mt-2">
            Filtros aplicados: Producto {selectedProductId}
            {selectedLocationId && `, Ubicación ${selectedLocationId}`}
            {selectedCustomerId && `, Proveedor ${selectedCustomerId}`}
          </div>
        </div>
      </div>
    );
  }

  const yearGroups = getYearGroups();

  return (
    <div className="w-full">
      <div className="mb-4 flex justify-between items-start">
        <div>
          <div className="text-sm text-muted-foreground">
            Datos agregados por fecha - Mostrando totales por postdate
            {selectedLocationId && ` para ubicación ${selectedLocationId}`}
            {selectedCustomerId ? ` filtrado por proveedor ${selectedCustomerId}` : ' (todos los proveedores)'}
          </div>
          {!selectedCustomerId && (
            <div className="text-sm text-orange-600 mt-1">⚠️ Selecciona un proveedor para editar los valores del Demand Planner</div>
          )}
          {selectedCustomerId && (
            <div className="text-sm text-blue-600 mt-1">💡 Presiona Enter o haz clic fuera del campo para guardar los cambios</div>
          )}
        </div>

        <Button variant="outline" size="sm" onClick={downloadCSV} className="flex items-center gap-2">
          <Download className="h-4 w-4" />
          Descargar CSV
        </Button>
      </div>

      <ScrollArea className="w-full">
        <div className="relative">
          <table className="w-full min-w-fit border-collapse border">
            <thead>
              {/* Encabezados de año */}
              <tr className="border-b">
                <th className="text-left py-2 px-3 bg-gray-50 font-medium min-w-[168px] sticky left-0 z-10 border-r">
                  Series
                </th>
                {Object.entries(yearGroups).map(([year, dates]) => (
                  <th key={year} className="text-center py-2 px-3 bg-gray-50 font-medium border-r" colSpan={dates.length}>
                    {year}
                  </th>
                ))}
              </tr>
              {/* Encabezados de fecha */}
              <tr className="border-b">
                <th className="text-left py-2 px-3 bg-gray-50 font-medium sticky left-0 z-10 border-r"></th>
                {uniqueDates.map((date) => (
                  <th key={date} className="text-center py-1 px-3 bg-gray-50 text-xs min-w-28 border-r">
                    {date}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {tableData.map((row: Record<string, any>, rowIndex: number) => (
                <tr
                  key={row.series}
                  className={`border-b hover:bg-muted/50 ${
                    rowIndex === 0
                      ? 'bg-blue-50'
                      : rowIndex === 3
                      ? 'bg-orange-50'
                      : rowIndex % 2 === 0
                      ? 'bg-blue-50'
                      : rowIndex === 5
                      ? 'bg-green-50'
                      : 'bg-white'
                  }`}
                >
                  <td className="font-medium bg-gray-50 sticky left-0 z-10 whitespace-nowrap border-r">{row.series}</td>
                  {uniqueDates.map((date) => {
                    const key = `${date}`;
                    const isSaving = savingValues[key];

                    return (
                      <td key={date} className={`py-2 px-4 text-right text-sm min-w-28 border-r`}>
                        {row.series === 'Demand Planner' ? (
                          selectedCustomerId ? (
                            <div className="relative">
                              <Input
                                type="text"
                                value={getDemandPlannerValue(date, row[date] as number) ?? ''}
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
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <ScrollBar orientation="horizontal" />
      </ScrollArea>
    </div>
  );
}
