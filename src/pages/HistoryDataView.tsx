import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { AgGridReact } from 'ag-grid-react';
import { ColDef, GridApi, GridReadyEvent, CellFocusedEvent } from 'ag-grid-community';
import { myTheme } from '../styles/ag-grid-theme-m8.js';
import { Search, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { configureAGGridLicense, agGridContainerStyles } from '../lib/ag-grid-config';
import { useProducts } from '@/hooks/useProducts';


// Configure AG Grid license
configureAGGridLicense();

interface HistoryData {
  product_id: string | null;
  location_node_id: string | null;
  location_name: string | null;
  customer_node_id: string | null;
  customer_node: string | null;
  postdate: string | null;
  quantity: number | null;
  product_name?: string;
}


const HistoryDataView: React.FC = () => {
  const [inventory, setInventory] = useState<HistoryData[]>([]);
  const [loading, setLoading] = useState(true);
  const { getProductName } = useProducts();
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchInventory();
  }, []);

  const fetchInventory = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .schema('m8_schema')
        .from('v_sales_transactions')
        .select('*')
        .order('postdate', { ascending: false });

      if (error) throw error;

      setInventory((data as unknown as HistoryData[]) || []);
    } catch (error) {
      console.error('Error fetching sales transactions:', error);
      toast.error('Error al cargar las transacciones de ventas');
    } finally {
      setLoading(false);
    }
  };



  const columnDefs: ColDef[] = [
    { 
      field: 'product_id', 
      headerName: 'ID Producto', 
      sortable: true, 
      filter: true, 
      flex: 1, 
      minWidth: 120,
      enablePivot: true,
      rowGroup: true,
      hide: true,
      chartDataType: 'category'
    },
    { 
      headerName: 'Producto', 
      field: 'producto',
      tooltipField: 'producto', // Shows on hover
      cellStyle: {
        overflow: 'hidden',
        whiteSpace: 'nowrap',
        textOverflow: 'ellipsis',
      },
      sortable: true, 
      filter: true, 
      flex: 1.5, 
      minWidth: 180,
      valueGetter: (params) => getProductName(params.data?.product_id || ''),
      chartDataType: 'category'
    },
    { 
      field: 'location_name',
      headerName: 'Nombre Ubicación', 
      sortable: true, 
      filter: true, 
      flex: 1.5, 
      minWidth: 180,
      valueFormatter: (params) => params.value || 'N/A',
      cellStyle: {
        overflow: 'hidden',
        whiteSpace: 'nowrap',
        textOverflow: 'ellipsis',
      },
      chartDataType: 'category'
    },
    { 
      field: 'customer_node',
      headerName: 'Nombre Cliente', 
      sortable: true, 
      filter: true, 
      flex: 1.5, 
      minWidth: 180,
      valueFormatter: (params) => params.value || 'N/A',
      cellStyle: {
        overflow: 'hidden',
        whiteSpace: 'nowrap',
        textOverflow: 'ellipsis',
      },
      chartDataType: 'category'
    },
    { 
      field: 'quantity', 
      headerName: 'Cantidad', 
      sortable: true, 
      filter: true, 
      flex: 1, 
      minWidth: 100,
      valueFormatter: (params) => params.value != null ? params.value.toLocaleString() : '',
      aggFunc: 'sum',
      enableValue: true,
      cellStyle: { textAlign: 'right' },
      headerClass: 'ag-right-aligned-header',
      chartDataType: 'series',
      cellRenderer: (params: any) => {
        if (params.node.group) {
          // This is a group footer row
          return params.value != null ? params.value.toLocaleString() : '';
        }
        // Regular data row
        return params.value != null ? params.value.toLocaleString() : '';
      }
    },
    { 
      field: 'postdate', 
      headerName: 'Fecha', 
      sortable: true, 
      filter: true, 
      flex: 1.2, 
      minWidth: 120,
      valueFormatter: (params) => params.value ? new Date(params.value).toLocaleDateString('es-ES') : '',
      enablePivot: true,
      chartDataType: 'time'
    }
  ];

  const filteredInventoryForGrid = useMemo(() => {
    if (!searchTerm) return inventory;
    
    return inventory.filter(item =>
      (item.product_id && item.product_id.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (item.location_node_id && item.location_node_id.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (item.customer_node_id && item.customer_node_id.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (item.location_name && item.location_name.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (item.customer_node && item.customer_node.toLowerCase().includes(searchTerm.toLowerCase()))
    );
  }, [inventory, searchTerm]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
        <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Transacciones de Ventas</h1>
          <p className="text-muted-foreground">Consulta las transacciones de ventas con capacidades de análisis pivot</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Search className="h-4 w-4" />
            <Input
              placeholder="Buscar por producto, ubicación o cliente..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-80"
            />
          </div>
        </div>
       
      </div>


      <Card>
        <CardContent className="p-0">
        <div style={{ height: '80vh', margin: '0 auto' }}>
         

          
            <AgGridReact
              theme={myTheme}
              enableBrowserTooltips={true}
              rowData={filteredInventoryForGrid}
              columnDefs={columnDefs}
              pagination={true}
              paginationPageSize={20}
              suppressMenuHide={true}
              enableCellTextSelection={true}
              ensureDomOrder={true}
              animateRows={true}
              rowSelection={'single'}
              suppressRowClickSelection={true}
              enableRangeSelection={true}
              suppressCopyRowsToClipboard={false}
              enableCharts={false}
              enableRangeHandle={true}
              enableFillHandle={true}
              groupDisplayType="groupRows"
              groupDefaultExpanded={-1}
              getRowClass={(params) => {
                const classes = [];
                if (params.node.group) {
                  classes.push('ag-row-group');
                } else if (params.node.rowIndex % 2 === 0) {
                  classes.push('ag-row-even');
                } else {
                  classes.push('ag-row-odd');
                }
                if (params.node.isSelected()) {
                  classes.push('ag-row-selected');
                }
                if (
                  params.api.getFocusedCell() &&
                  params.api.getFocusedCell()!.rowIndex === params.node.rowIndex
                ) {
                  classes.push('ag-row-focused');
                }
                return classes;
              }}
              defaultColDef={{
                sortable: true,
                filter: true,
                resizable: true,
                floatingFilter: false,
              }}
              suppressAggFuncInHeader={false}
              onCellFocused={(params) => {
                params.api.refreshCells({ force: true });
              }}
              rowGroupPanelShow={'always'}
              pivotPanelShow={'always'}
              pivotMode={false}
              suppressRowGroupHidesColumns={true}
              suppressMakeColumnVisibleAfterUnGroup={true}
              statusBar={{
                statusPanels: [
                  { statusPanel: 'agTotalRowCountComponent', align: 'left' },
                  { statusPanel: 'agFilteredRowCountComponent', align: 'left' },
                  { statusPanel: 'agSelectedRowCountComponent', align: 'left' },
                  { statusPanel: 'agAggregationComponent', align: 'right' }
                ]
              }}
              groupIncludeFooter={true}
              groupIncludeTotalFooter={true}
              groupDisplayType="groupRows"
              groupDefaultExpanded={-1}
              autoGroupColumnDef={{
                headerName: 'Producto',
                minWidth: 200,
                cellRendererParams: {
                  suppressCount: false,
                  checkbox: false,
                },
                cellStyle: { fontWeight: 'bold' }
              }}
              sideBar={{
                toolPanels: [
                  {
                    id: 'columns',
                    labelDefault: 'Columns',
                    labelKey: 'columns',
                    iconKey: 'columns',
                    toolPanel: 'agColumnsToolPanel',
                    toolPanelParams: {
                      suppressRowGroups: false,
                      suppressValues: false,
                      suppressPivots: false,
                      suppressPivotMode: false,
                      suppressColumnFilter: false,
                      suppressColumnSelectAll: false,
                      suppressColumnExpandAll: false
                    }
                  },
                  {
                    id: 'filters',
                    labelDefault: 'Filters',
                    labelKey: 'filters',
                    iconKey: 'filter',
                    toolPanel: 'agFiltersToolPanel',
                  },
                ]
              }}
              onGridReady={(params) => {
                params.api.sizeColumnsToFit();
                // Set the default row group to show subtotals
                params.api.setRowGroupColumns(['product_id']);
              }}
            />
            </div>
    
        </CardContent>
      </Card>

      
    </div>
  );
};

export default HistoryDataView;