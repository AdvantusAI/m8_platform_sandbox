import { useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FilterDropdown, ProductHierarchyItem, LocationItem, CustomerItem, DateRange } from "@/components/filters/FilterDropdown";
import { ForecastDataTable } from "@/components/ForecastDataTableAg";
import { ForecastLineChart } from "@/components/ForecastLineChart";
import { ProductSalesTreemap } from "@/components/ProductSalesTreemap";
import { supabase } from "@/integrations/supabase/client";

import {
  Package,
  Truck,
  Clock,
  AlertTriangle,
  TrendingUp,
  ShoppingCart,
  Users,
  DollarSign,
  Calendar,
  BarChart3,
  TreePine,
} from "lucide-react";

/**
 * DemandWorkbench Component
 *
 * A comprehensive demand workbench with filtering and data visualization.
 * Displays forecast data in a ForecastDataTable with filtering capabilities.
 */
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

interface ProductSalesData {
  product_id: string;
  product_name: string;
  category_name: string;
  subcategory_name: string;
  class_name?: string;
  total_sales: number;
}

const DemandWorkbench = () => {
  const [selectedProduct, setSelectedProduct] = useState<ProductHierarchyItem | null>(null);
  const [selectedLocation, setSelectedLocation] = useState<LocationItem | null>(null);
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerItem | null>(null);
  const [selectedDateRange, setSelectedDateRange] = useState<DateRange | null>(null);
  const [showTable, setShowTable] = useState(false);
  const [forecastData, setForecastData] = useState<ForecastData[]>([]);
  const [showChart, setShowChart] = useState(false);
  const [productSalesData, setProductSalesData] = useState<ProductSalesData[]>([]);
  const [loadingSalesData, setLoadingSalesData] = useState(false);

  const handleProductFilterChange = (selection: ProductHierarchyItem | null) => {
    setSelectedProduct(selection);
  };

  const handleLocationFilterChange = (location: LocationItem | null) => {
    setSelectedLocation(location);
  };

  const handleCustomerFilterChange = (customer: CustomerItem | null) => {
    setSelectedCustomer(customer);
  };

  const handleDateRangeChange = (dateRange: DateRange | null) => {
    setSelectedDateRange(dateRange);
  };

  const handleDataUpdate = useCallback((data: ForecastData[]) => {
    setForecastData(data);
  }, []);

  const fetchProductSalesData = useCallback(async () => {
    if (!selectedProduct || selectedProduct.level === 'product') {
      setProductSalesData([]);
      return;
    }

    try {
      setLoadingSalesData(true);
      
      // Get product IDs based on selected hierarchy level
      let productIds: string[] = [];
      
      switch (selectedProduct.level) {
        case 'class':
          const { data: classProducts } = await (supabase as any)
            .schema('m8_schema')
            .from('products')
            .select('product_id')
            .eq('class_name', selectedProduct.class_name);
          productIds = classProducts?.map((p: any) => p.product_id) || [];
          break;
        case 'subcategory':
          const { data: subcategoryProducts } = await (supabase as any)
            .schema('m8_schema')
            .from('products')
            .select('product_id')
            .eq('subcategory_name', selectedProduct.subcategory_name);
          productIds = subcategoryProducts?.map((p: any) => p.product_id) || [];
          break;
        case 'category':
          const { data: categoryProducts } = await (supabase as any)
            .schema('m8_schema')
            .from('products')
            .select('product_id')
            .eq('category_name', selectedProduct.category_name);
          productIds = categoryProducts?.map((p: any) => p.product_id) || [];
          break;
      }

      if (productIds.length === 0) {
        setProductSalesData([]);
        return;
      }

      // Fetch sales data from forecast_with_fitted_history
      let query = (supabase as any)
        .schema('m8_schema')
        .from('forecast_with_fitted_history')
        .select(`
          product_id,
          products!inner(
            product_name,
            category_name,
            subcategory_name,
            class_name
          ),
          actual
        `)
        .in('product_id', productIds)
        .not('actual', 'is', null);

      // Apply location filter if selected
      if (selectedLocation?.location_code) {
        query = query.eq('location_code', selectedLocation.location_code);
      }

      // Apply customer filter if selected
      if (selectedCustomer?.customer_code) {
        query = query.eq('customer_code', selectedCustomer.customer_code);
      }

      // Apply date range filter if selected
      if (selectedDateRange?.from) {
        query = query.gte('postdate', selectedDateRange.from.toISOString().split('T')[0]);
      }
      if (selectedDateRange?.to) {
        query = query.lte('postdate', selectedDateRange.to.toISOString().split('T')[0]);
      }

      const { data: salesData, error } = await query;

      if (error) {
        console.error('Error fetching product sales data:', error);
        setProductSalesData([]);
        return;
      }

      // Aggregate sales by product
      const aggregatedSales = new Map<string, ProductSalesData>();
      
      salesData?.forEach((item: any) => {
        const productId = item.product_id;
        const product = item.products;
        
        if (!aggregatedSales.has(productId)) {
          aggregatedSales.set(productId, {
            product_id: productId,
            product_name: product.product_name,
            category_name: product.category_name,
            subcategory_name: product.subcategory_name,
            class_name: product.class_name,
            total_sales: 0
          });
        }
        
        const existing = aggregatedSales.get(productId)!;
        existing.total_sales += item.actual || 0;
      });

      const result = Array.from(aggregatedSales.values()).filter(item => item.total_sales > 0);
      console.log('Product sales data result:', result);
      setProductSalesData(result);

    } catch (error) {
      console.error('Error fetching product sales data:', error);
      setProductSalesData([]);
    } finally {
      setLoadingSalesData(false);
    }
  }, [selectedProduct, selectedLocation, selectedCustomer, selectedDateRange]);

  const handleSearch = () => {
    console.log('Search triggered with selectedProduct:', selectedProduct);
    setShowTable(true);
    setShowChart(true);
    fetchProductSalesData();
  };

  return (
    <div className="space-y-6">
      {/* Header */}

      {/* Filters Section */}
      <div className="space-y-4">
        <div className="flex justify-start">
          <FilterDropdown 
            onProductFilterChange={handleProductFilterChange}
            onLocationFilterChange={handleLocationFilterChange}
            onCustomerFilterChange={handleCustomerFilterChange}
            onDateRangeChange={handleDateRangeChange}
            onSearch={handleSearch}
          />
        </div>

        {/* Selected Filters Display */}
        {(selectedProduct || selectedLocation || selectedCustomer || selectedDateRange) && (
          <Card>
            <CardContent className="p-4">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-sm font-medium text-muted-foreground">Filtros activos:</span>
                
                {selectedProduct && (
                  <div className="flex items-center gap-2 px-3 py-1 bg-blue-50 text-blue-700 border border-blue-200 rounded-full text-sm">
                    <Package className="h-3 w-3" />
                    {selectedProduct.level === 'product' && `${selectedProduct.product_id} - ${selectedProduct.product_name}`}
                    {selectedProduct.level === 'class' && `${selectedProduct.class_name} (Clase)`}
                    {selectedProduct.level === 'subcategory' && `${selectedProduct.subcategory_name} (Subcategoría)`}
                    {selectedProduct.level === 'category' && `${selectedProduct.category_name} (Categoría)`}
                  </div>
                )}
                
                {selectedLocation && (
                  <div className="flex items-center gap-2 px-3 py-1 bg-green-50 text-green-700 border border-green-200 rounded-full text-sm">
                    <Truck className="h-3 w-3" />
                    {selectedLocation.description} ({selectedLocation.location_code})
                  </div>
                )}
                
                {selectedCustomer && (
                  <div className="flex items-center gap-2 px-3 py-1 bg-orange-50 text-orange-700 border border-orange-200 rounded-full text-sm">
                    <Users className="h-3 w-3" />
                    {selectedCustomer.description} ({selectedCustomer.customer_code})
                  </div>
                )}
                
                {selectedDateRange && (
                  <div className="flex items-center gap-2 px-3 py-1 bg-blue-50 text-blue-700 border border-blue-200 rounded-full text-sm">
                    <Calendar className="h-3 w-3" />
                    {selectedDateRange.from?.toLocaleDateString('es-ES')} - {selectedDateRange.to?.toLocaleDateString('es-ES')}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Forecast Data Table - Only show when search is performed */}
      {!showTable && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 px-8">
            <div className="relative mb-6">
              {/* Animated background circle */}
              <div className="absolute inset-0 bg-gradient-to-br from-blue-50 to-purple-50 rounded-full w-20 h-20 animate-pulse"></div>
              {/* Main icon with gradient */}
              <div className="relative bg-gradient-to-br from-blue-500 to-purple-600 rounded-full p-4 shadow-lg">
                <TrendingUp className="h-8 w-8 text-white" />
              </div>
              {/* Floating elements for visual interest */}
              <div className="absolute -top-2 -right-2 w-4 h-4 bg-green-400 rounded-full animate-bounce"></div>
              <div className="absolute -bottom-1 -left-1 w-3 h-3 bg-orange-400 rounded-full animate-bounce" style={{ animationDelay: '0.5s' }}></div>
            </div>
            
            <div className="text-center space-y-3 max-w-md">
              <h3 className="text-xl font-semibold text-gray-900">
                ¡Listo para analizar!
              </h3>
              <p className="text-gray-600 leading-relaxed">
                Selecciona los filtros que necesites y haz clic en <span className="font-medium text-purple-600">"Aplicar"</span> para ver los datos de pronóstico
              </p>
              
              {/* Quick tips */}
              <div className="flex flex-wrap justify-center gap-2 mt-4">
                <div className="flex items-center gap-1 px-3 py-1 bg-blue-50 text-blue-700 rounded-full text-xs">
                  <Package className="h-3 w-3" />
                  Producto
                </div>
                <div className="flex items-center gap-1 px-3 py-1 bg-green-50 text-green-700 rounded-full text-xs">
                  <Truck className="h-3 w-3" />
                  Ubicación
                </div>
                <div className="flex items-center gap-1 px-3 py-1 bg-orange-50 text-orange-700 rounded-full text-xs">
                  <Users className="h-3 w-3" />
                  Cliente
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
      
      {/* Charts Section */}
      {showChart && forecastData.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Debug info */}
          {console.log('Rendering charts section:', {
            showChart,
            forecastDataLength: forecastData.length,
            selectedProduct,
            productSalesDataLength: productSalesData.length,
            loadingSalesData
          })}
          {/* Forecast Line Chart */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                Tendencias de Pronóstico
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ForecastLineChart
                data={forecastData}
                title="Tendencias de Datos de Pronóstico"
                height={500}
              />
            </CardContent>
          </Card>

          {/* Product Sales Treemap - Always show for debugging */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TreePine className="h-5 w-5" />
                Distribución de Ventas por Producto
                {loadingSalesData && (
                  <div className="w-4 h-4 border-2 border-blue-200 border-t-blue-600 rounded-full animate-spin ml-2"></div>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {/* Debug information */}
              <div className="mb-4 p-3 bg-gray-100 rounded text-xs">
                <p>Producto Seleccionado: {selectedProduct ? `${selectedProduct.level} - ${selectedProduct.category_name || selectedProduct.subcategory_name || selectedProduct.class_name || selectedProduct.product_name}` : 'Ninguno'}</p>
                <p>Nivel de Producto: {selectedProduct?.level || 'Ninguno'}</p>
                <p>Conteo de Datos de Ventas: {productSalesData.length}</p>
                <p>Cargando: {loadingSalesData ? 'Sí' : 'No'}</p>
                <p>Mostrar para niveles agregados: {selectedProduct && selectedProduct.level !== 'product' ? 'Sí' : 'No'}</p>
              </div>
              
              {selectedProduct && selectedProduct.level !== 'product' ? (
                productSalesData.length > 0 ? (
                  <ProductSalesTreemap
                    data={productSalesData}
                    title="Ventas de Productos por Volumen"
                    height={500}
                    selectedLevel={selectedProduct.level}
                  />
                ) : !loadingSalesData ? (
                  <div className="flex items-center justify-center h-[500px] text-gray-500">
                    <div className="text-center">
                      <TreePine className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                      <p className="text-sm">No hay datos de ventas disponibles para los filtros seleccionados</p>
                      <p className="text-xs text-gray-400 mt-2">
                        Asegúrate de haber seleccionado un producto de nivel categoría, subcategoría o clase
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-center h-[500px]">
                    <div className="text-center">
                      <div className="w-8 h-8 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto mb-4"></div>
                      <p className="text-sm text-gray-600">Cargando datos de ventas...</p>
                    </div>
                  </div>
                )
              ) : (
                <div className="flex items-center justify-center h-[500px] text-gray-500">
                  <div className="text-center">
                    <TreePine className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                    <p className="text-sm">Selecciona un producto de nivel categoría, subcategoría o clase para ver el mapa de árbol</p>
                    <p className="text-xs text-gray-400 mt-2">
                      El mapa de árbol solo se muestra para niveles de producto agregados, no para productos individuales
                    </p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Forecast Data Table - Moved below charts */}
      {showTable && selectedProduct && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Tabla de Datos de Pronóstico
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ForecastDataTable
              selectedProduct={selectedProduct}
              selectedLocationId={selectedLocation?.location_code}
              selectedCustomerId={selectedCustomer?.customer_code}
              selectedDateRange={selectedDateRange}
              onDataUpdate={handleDataUpdate}
            />
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default DemandWorkbench;