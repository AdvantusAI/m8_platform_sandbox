
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Package, Truck, MapPin, X, Filter, Calendar, Users } from "lucide-react";
import { ForecastDataTable } from "@/components/ForecastDataTable";
import { ForecastChart } from "@/components/ForecastChart";
import { MetricsDashboard } from "@/components/MetricsDashboard";
import { DynamicUpcomingChallenges } from "@/components/DynamicUpcomingChallenges";
import { DynamicActionItems } from "@/components/DynamicActionItems";
import { FilterDropdown, ProductHierarchyItem, LocationItem, CustomerItem, DateRange } from "@/components/filters/FilterDropdown";
import { useState, useEffect, useCallback } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { useInterpretabilityData } from "@/hooks/useInterpretabilityData";
import { useProducts } from "@/hooks/useProducts";
import { useLocations } from "@/hooks/useLocations";
import { useCustomers } from "@/hooks/useCustomers";
import OutliersTab from "@/components/OutliersTab";

// Import the ForecastData interface from ForecastDataTable
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
  fitted_history: number | null;
}

// Type definition for filter storage
interface FilterStorage {
  productId: string;
  locationId: string;
  customerId: string;
}

/**
 * DemandForecast Component
 * 
 * Main component for demand forecasting functionality. Provides:
 * - Filter management (Product, Location, Customer)
 * - Chart visualization of forecast data
 * - Data table with editing capabilities
 * - Metrics dashboard
 * - Outliers analysis
 * - Collaboration features
 */
export default function DemandForecast() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  
  // ===== LOCAL STORAGE HELPERS =====
  /**
   * Retrieves stored filters from localStorage
   * @returns Object containing stored filter values or empty object if none exist
   */
  const getStoredFilters = (): Partial<FilterStorage> => {
    try {
      const stored = localStorage.getItem('demandForecastFilters');
      return stored ? JSON.parse(stored) : {};
    } catch {
      return {};
    }
  };

  /**
   * Saves current filter state to localStorage for persistence
   * @param filters - Object containing filter values to store
   */
  const saveFiltersToStorage = (filters: FilterStorage): void => {
    try {
      localStorage.setItem('demandForecastFilters', JSON.stringify(filters));
    } catch (error) {
      console.warn('Failed to save filters to localStorage:', error);
    }
  };

  // ===== STATE MANAGEMENT =====
  // Initialize state with localStorage values, fallback to URL params
  const storedFilters = getStoredFilters();
  
  // Filter state using FilterDropdown types
  const [selectedProduct, setSelectedProduct] = useState<ProductHierarchyItem | null>(null);
  const [selectedLocation, setSelectedLocation] = useState<LocationItem | null>(null);
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerItem | null>(null);
  const [selectedDateRange, setSelectedDateRange] = useState<DateRange | null>(null);
  
  // Chart data state for forecast visualization
  const [chartData, setChartData] = useState<ForecastData[]>([]);
  
  // ===== HOOKS =====
  // Data hooks for interpretability and name resolution
  const { data: interpretabilityData } = useInterpretabilityData(
    selectedProduct?.product_id || '', 
    selectedLocation?.location_code || '', 
    selectedCustomer?.customer_code || ''
  );
  const { getProductName } = useProducts();
  const { getLocationName, loading: locationsLoading } = useLocations();
  const { getCustomerName, loading: customersLoading } =  useCustomers();

  // ===== FILTER HANDLERS =====
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

  const handleSearch = useCallback(() => {
    console.log('Search triggered with filters:', {
      selectedProduct,
      selectedLocation,
      selectedCustomer,
      selectedDateRange
    });
  }, [selectedProduct, selectedLocation, selectedCustomer, selectedDateRange]);

  /**
   * Updates chart data when forecast data changes
   * @param data - New forecast data array
   */
  const handleForecastDataUpdate = (data: ForecastData[]): void => {
    setChartData(data);
  };

  // ===== COLLABORATION METRICS CALCULATION =====
  /**
   * Calculates dynamic collaboration metrics based on interpretability data
   * @returns Object containing calculated metrics or default values
   */
  const calculateCollaborationMetrics = () => {
    if (!interpretabilityData.length) {
      return {
        forecastAccuracy: 85,
        responseTime: "3.2 días",
        compliance: 82,
        marketAlignment: 78
      };
    }

    const avgAccuracy = interpretabilityData.reduce((sum, item) => sum + (item.interpretability_score || 0), 0) / interpretabilityData.length;
    const highConfidenceCount = interpretabilityData.filter(item => item.confidence_level === 'Alta').length;
    const confidenceRatio = (highConfidenceCount / interpretabilityData.length) * 100;

    return {
      forecastAccuracy: Math.round(avgAccuracy),
      responseTime: avgAccuracy > 80 ? "2.1 días" : "3.5 días",
      compliance: Math.round(confidenceRatio),
      marketAlignment: Math.round((avgAccuracy + confidenceRatio) / 2)
    };
  };

  const collaborationMetrics = calculateCollaborationMetrics();

  // ===== RENDER =====
  return (
    <div className="space-y-6">
      {/* ===== FILTER SECTION ===== */}
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

      {/* ===== TAB INTERFACE ===== */}
      <Tabs defaultValue="plan-demanda" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="plan-demanda">Plan de la demanda</TabsTrigger>
          <TabsTrigger value="metricas">Métricas</TabsTrigger>
          <TabsTrigger value="outliers">Outliers</TabsTrigger>
        </TabsList>

        {/* ===== PLAN DE DEMANDA TAB ===== */}
        <TabsContent value="plan-demanda" className="space-y-6 mt-6">
          {/* Chart Card */}
          <Card>
            <CardHeader>
              <CardTitle>Gráfico de Pronósticos</CardTitle>
              <p className="text-sm text-muted-foreground">
                Visualización de datos de pronóstico vs. valores reales
                {!selectedProduct ? 
                  " - Selecciona producto para ver datos" : 
                  `${selectedLocation ? ` - Ubicación: ${selectedLocation.location_code}` : ' - Todas las ubicaciones'}${selectedCustomer ? ` - Cliente: ${selectedCustomer.customer_code}` : " - Todos los clientes"}`
                }
              </p>
            </CardHeader>
            <CardContent>
              <ForecastChart data={chartData} />
            </CardContent>
          </Card>

          {/* Forecast Data Table */}
          <Card>
            <CardHeader>
              <CardTitle>Tabla de Datos de Pronóstico</CardTitle>
              <p className="text-sm text-muted-foreground">
                Datos detallados con capacidad de edición para Demand Planner
                {!selectedProduct ? 
                  " - Selecciona producto para ver datos" : 
                  `${selectedLocation ? ` - Ubicación: ${selectedLocation.location_code}` : ' - Todas las ubicaciones'}${selectedCustomer ? ` - Cliente: ${selectedCustomer.customer_code}` : " - Todos los clientes"}`
                }
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
            
              <ForecastDataTable 
                selectedProductId={selectedProduct?.product_id || ''}
                selectedLocationId={selectedLocation?.location_code || ''}
                selectedCustomerId={selectedCustomer?.customer_code || ''}
                onDataUpdate={handleForecastDataUpdate}
              />
            </CardContent>
          </Card>
        </TabsContent>

        {/* ===== MÉTRICAS TAB ===== */}
        <TabsContent value="metricas" className="space-y-6 mt-6">
          <MetricsDashboard 
            selectedProductId={selectedProduct?.product_id || ''}
            selectedLocationId={selectedLocation?.location_code || ''}
            selectedCustomerId={selectedCustomer?.customer_code || ''}
          />
        </TabsContent>

        {/* ===== OUTLIERS TAB ===== */}
        <TabsContent value="outliers" className="space-y-6 mt-6">
          <OutliersTab 
            selectedProductId={selectedProduct?.product_id || ''}
            selectedCustomerId={selectedCustomer?.customer_code || ''}
            selectedLocationId={selectedLocation?.location_code || ''}
          />
        </TabsContent>
      </Tabs>

    </div>
  );
}
