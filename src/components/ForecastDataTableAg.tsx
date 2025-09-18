import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Download } from 'lucide-react';
import { toast } from 'sonner';
import { useLocations } from '@/hooks/useLocations';
import { useCustomers } from '@/hooks/useCustomers';
import { AgGridReact } from 'ag-grid-react';
import { ColDef, GridReadyEvent, GridApi, IStatusPanelComp, IStatusPanelParams } from 'ag-grid-community';
import { defaultGridOptions, agGridContainerStyles } from '@/lib/ag-grid-config';
import { myTheme } from '@/lib/m8-grid-theme.js';

// Custom Status Bar Component for Range Sum
class RangeSumStatusPanel implements IStatusPanelComp {
  private eGui!: HTMLDivElement;
  private params!: IStatusPanelParams;

  init(params: IStatusPanelParams) {
    this.params = params;
    this.eGui = document.createElement('div');
    this.eGui.className = 'ag-status-panel ag-status-panel-range-sum';
    this.eGui.innerHTML = '<span class="ag-status-panel-item">Sum: <span id="range-sum-value">0</span></span>';
    
    // Listen for range selection changes
    this.params.api.addEventListener('rangeSelectionChanged', this.onRangeSelectionChanged.bind(this));
  }

  onRangeSelectionChanged() {
    const ranges = this.params.api.getCellRanges();
    let sum = 0;
    
    if (ranges && ranges.length > 0) {
      ranges.forEach(range => {
        // Get the range bounds and iterate through cells
        const startRow = range.startRow?.rowIndex || 0;
        const endRow = range.endRow?.rowIndex || 0;
        
        for (let rowIndex = Math.min(startRow, endRow); rowIndex <= Math.max(startRow, endRow); rowIndex++) {
          for (const col of range.columns) {
            const rowNode = this.params.api.getDisplayedRowAtIndex(rowIndex);
            if (rowNode) {
              const value = rowNode.data[col.getColId()];
              if (typeof value === 'number' && !isNaN(value)) {
                sum += value;
              }
            }
          }
        }
      });
    }
    
    const sumElement = this.eGui.querySelector('#range-sum-value');
    if (sumElement) {
      sumElement.textContent = new Intl.NumberFormat('en-US').format(sum);
    }
  }

  getGui() {
    return this.eGui;
  }

  destroy() {
    // Clean up event listeners if needed
  }
}

// --- Tipos robustos (aceptan ambos nombres de id) ---
interface Customer {
  customer_code: string;
  customer_node_id?: string;        // posible nombre
}

interface Location {
  location_code: string;
  location_id?: string;        // posible nombre
  location_node_id?: string;   // posible nombre alterno
  description?: string;
  type_code?: string;
}

interface DateRange {
  from: Date | null;
  to: Date | null;
}

interface ProductHierarchyItem {
  category_id: string;
  category_name: string;
  subcategory_id: string;
  subcategory_name: string;
  class_id?: string;
  class_name?: string;
  product_id?: string;
  product_name?: string;
  level: 'category' | 'subcategory' | 'class' | 'product';
}

interface ForecastDataTableProps {
  selectedProduct?: ProductHierarchyItem | null;
  selectedLocationId?: string;  // código de ubicación (p.ej. "CDMX")
  selectedCustomerId?: string;  // código de cliente/proveedor (p.ej. "VEND123")
  selectedDateRange?: DateRange | null;
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
  selectedProduct,
  selectedLocationId,
  selectedCustomerId,
  selectedDateRange,
  onDataUpdate,
}: ForecastDataTableProps) {
  const [forecastData, setForecastData] = useState<ForecastData[]>([]);
  const [loading, setLoading] = useState(false);
  const [editingValues, setEditingValues] = useState<Record<string, number | null>>({});
  const [savingValues, setSavingValues] = useState<Record<string, boolean>>({});
  const [gridApi, setGridApi] = useState<GridApi | null>(null);

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
      const id = c.customer_node_id;
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
    if (selectedProduct && locations.length > 0 && customers.length > 0) {
      fetchForecastData();
    } else {
      // si faltan datos clave, limpiamos
      setForecastData([]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedProduct, selectedLocationId, selectedCustomerId, selectedDateRange, locations, customers]);

  const fetchForecastData = async () => {
    if (!selectedProduct) return;

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
    // First, get the product IDs based on the selected hierarchy level
    let productIds: string[] = [];
    
    if (selectedProduct) {
      switch (selectedProduct.level) {
        case 'product':
          if (selectedProduct.product_id) {
            productIds = [selectedProduct.product_id];
          }
          break;
        case 'class':
          // Get all products in that class
          const { data: classProducts } = await (supabase as any)
            .schema('m8_schema')
            .from('products')
            .select('product_id')
            .eq('class_name', selectedProduct.class_name);
          productIds = classProducts?.map((p: any) => p.product_id) || [];
          break;
        case 'subcategory':
          // Get all products in that subcategory
          const { data: subcategoryProducts } = await (supabase as any)
            .schema('m8_schema')
            .from('products')
            .select('product_id')
            .eq('subcategory_name', selectedProduct.subcategory_name);
          productIds = subcategoryProducts?.map((p: any) => p.product_id) || [];
          break;
        case 'category':
          // Get all products in that category
          const { data: categoryProducts } = await (supabase as any)
            .schema('m8_schema')
            .from('products')
            .select('product_id')
            .eq('category_name', selectedProduct.category_name);
          productIds = categoryProducts?.map((p: any) => p.product_id) || [];
          break;
      }
    }

    // If no products found, return empty data
    if (productIds.length === 0) {
      setForecastData([]);
      return;
    }

    let query = (supabase as any)
      .schema('m8_schema')
      .from('forecast_with_fitted_history')
      .select(
        'product_id,location_node_id,customer_node_id,postdate,forecast,actual,sales_plan,demand_planner,forecast_ly,upper_bound,lower_bound,commercial_input,fitted_history, location_code, customer_code'
      )
      .in('product_id', productIds)
      .order('postdate', { ascending: true });

    // Filtro de ubicación si hay código y podemos resolver el node_id
    if (selectedLocationId) {
      //console.log('Selected location ID:', selectedLocationId);
        query = query.eq('location_code', selectedLocationId );
    }
    // Filtro de cliente si hay código y podemos resolver el node_id
    if (selectedCustomerId) {
      //console.log('Selected customer ID:', selectedCustomerId);
             query = query.eq('customer_code', selectedCustomerId);
    }

    // Filtro de rango de fechas
    if (selectedDateRange?.from) {
      query = query.gte('postdate', selectedDateRange.from.toISOString().split('T')[0]);
    }
    if (selectedDateRange?.to) {
      query = query.lte('postdate', selectedDateRange.to.toISOString().split('T')[0]);
    }

  
    //console.log('Query:', query);
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
    if (!selectedCustomerId || !selectedProduct || selectedProduct.level !== 'product') {
      toast.error('Solo se pueden editar valores para productos específicos.');
      return;
    }

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
        .eq('product_id', selectedProduct.product_id)
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

    const uniqueDates = [...new Set(forecastData.map((i) => i.postdate))].sort((a, b) => {
      // Sort dates properly by converting to Date objects
      return new Date(a).getTime() - new Date(b).getTime();
    });
    
    // Debug: Log the actual date format from database
    const seriesData = [
      { series: 'Historia de ventas', type: 'actual' },
      { series: 'Forecast', type: 'forecast' },
      { series: 'Plan inicial', type: 'sales_plan' },
      { series: 'Demand Planner', type: 'demand_planner' },
      { series: 'Ventas LY', type: 'forecast_ly' },
      { series: 'KAM input', type: 'commercial_input' },
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

  // AG-Grid column definitions
  const columnDefs: ColDef[] = useMemo(() => {
    const baseColumns: ColDef[] = [
      {
        field: 'series',
        headerName: 'Series',
        width: 180,
        pinned: 'left',
        cellStyle: { fontWeight: 'bold', backgroundColor: '#f9fafb' }
      }
    ];

    // Group dates by year
    const yearGroups = uniqueDates.reduce((groups, date) => {
      // Handle different date formats more robustly
      let parsedDate: Date;
      
      // If date is in YYYY-MM-DD format, parse it directly
      if (typeof date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(date)) {
        parsedDate = new Date(date + 'T00:00:00'); // Add time to avoid timezone issues
      } else {
        parsedDate = new Date(date);
      }
      
      const year = parsedDate.getFullYear().toString();
      
      
      if (!groups[year]) {
        groups[year] = [];
      }
      groups[year].push(date);
      return groups;
    }, {} as Record<string, string[]>);

    // Sort dates within each year group and sort years
    Object.keys(yearGroups).forEach(year => {
      yearGroups[year].sort((a, b) => new Date(a).getTime() - new Date(b).getTime());
    });

    // Add dynamic date columns with year grouping
    const dateColumns: ColDef[] = [];
    
    // Sort years to ensure proper order
    const sortedYears = Object.keys(yearGroups).sort((a, b) => parseInt(a) - parseInt(b));
    
    // Debug logging
    
    sortedYears.forEach((year) => {
      const dates = yearGroups[year];
      // Add year header column
      dateColumns.push({
        headerName: year,
        headerClass: 'year-header',
        children: dates.map((date) => ({
          field: date,
          headerName: date,
          width: 120,
          type: 'numericColumn',
          valueFormatter: (params) => {
            if (params.value === null || params.value === undefined) return '-';
            return new Intl.NumberFormat('en-US').format(params.value);
          },
          cellRenderer: (params: any) => {
            if (params.data.series === 'Demand Planner' && selectedCustomerId) {
              const key = `${date}`;
              const isSaving = savingValues[key];
              const currentValue = getDemandPlannerValue(date, params.value);
              
              return (
                <div className="relative h-full w-full">
                  <input
                    type="text"
                    value={currentValue ?? ''}
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
              );
            }
            return formatNumber(params.value);
          }
        }))
      } as any); // Type assertion for grouped headers
    });

    return [...baseColumns, ...dateColumns];
  }, [uniqueDates, selectedCustomerId, savingValues, editingValues]);

  const onGridReady = (params: GridReadyEvent) => {
    setGridApi(params.api);
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


  if (!selectedProduct) {
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
    const getProductDisplayName = () => {
      switch (selectedProduct.level) {
        case 'product':
          return `${selectedProduct.product_id} - ${selectedProduct.product_name}`;
        case 'class':
          return `${selectedProduct.class_name} (Clase)`;
        case 'subcategory':
          return `${selectedProduct.subcategory_name} (Subcategoría)`;
        case 'category':
          return `${selectedProduct.category_name} (Categoría)`;
        default:
          return 'Producto';
      }
    };

    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="text-lg font-medium">Cargando datos de pronóstico...</div>
          <div className="text-sm text-muted-foreground mt-2">
            Filtros: Producto {getProductDisplayName()}
            {selectedLocationId && `, Ubicación ${selectedLocationId}`}
            {selectedCustomerId && `, Proveedor ${selectedCustomerId}`}
            {selectedDateRange && `, Fechas ${selectedDateRange.from?.toLocaleDateString('es-ES')} - ${selectedDateRange.to?.toLocaleDateString('es-ES')}`}
          </div>
        </div>
      </div>
    );
  }

  if (!forecastData.length) {
    const getProductDisplayName = () => {
      switch (selectedProduct.level) {
        case 'product':
          return `${selectedProduct.product_id} - ${selectedProduct.product_name}`;
        case 'class':
          return `${selectedProduct.class_name} (Clase)`;
        case 'subcategory':
          return `${selectedProduct.subcategory_name} (Subcategoría)`;
        case 'category':
          return `${selectedProduct.category_name} (Categoría)`;
        default:
          return 'Producto';
      }
    };

    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="text-lg font-medium text-muted-foreground">No se encontraron datos de pronóstico</div>
          <div className="text-sm text-muted-foreground mt-2">
            Filtros aplicados: Producto {getProductDisplayName()}
            {selectedLocationId && `, Ubicación ${selectedLocationId}`}
            {selectedCustomerId && `, Proveedor ${selectedCustomerId}`}
            {selectedDateRange && `, Fechas ${selectedDateRange.from?.toLocaleDateString('es-ES')} - ${selectedDateRange.to?.toLocaleDateString('es-ES')}`}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full">
      <div className="mb-4 flex justify-between items-start">
        <div>
          <div className="text-sm text-muted-foreground">
            Datos agregados por fecha - Mostrando totales por postdate
            {selectedLocationId && ` para ubicación ${selectedLocationId}`}
            {selectedCustomerId ? ` filtrado por proveedor ${selectedCustomerId}` : ' (todos los proveedores)'}
            {selectedDateRange && ` en rango ${selectedDateRange.from?.toLocaleDateString('es-ES')} - ${selectedDateRange.to?.toLocaleDateString('es-ES')}`}
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

      <div className={agGridContainerStyles}>
        <style>{`
          .ag-header-group-cell {
            background-color: #f3f4f6 !important;
            font-weight: 600 !important;
            text-align: center !important;
            border-bottom: 2px solid #d1d5db !important;
          }
          .year-header {
            background-color: #e5e7eb !important;
            font-weight: 700 !important;
            color: #374151 !important;
          }
        `}</style>
        <AgGridReact
          rowData={tableData}
          columnDefs={columnDefs}
          defaultColDef={{
            ...defaultGridOptions.defaultColDef,
            sortable: false
          }}
          onGridReady={onGridReady}
          theme={myTheme}
          animateRows={true}
          pagination={true}
          paginationPageSize={20}
          rowSelection="single"
          suppressRowClickSelection={true}
          enableRangeSelection={true}
          statusBar={{
            statusPanels: [
              { statusPanel: 'agTotalRowCountComponent', align: 'left' },
              { statusPanel: 'agFilteredRowCountComponent', align: 'left' },
              { statusPanel: 'agSelectedRowCountComponent', align: 'left' },
              { statusPanel: RangeSumStatusPanel, align: 'right' }
            ]
          }}
          getRowClass={(params) => {
            const rowIndex = params.rowIndex;

            if (rowIndex === 3) return 'bg-orange-50';
            return 'bg-white';
          }}
          onCellFocused={defaultGridOptions.onCellFocused}
        />
      </div>
    </div>
  );
}
