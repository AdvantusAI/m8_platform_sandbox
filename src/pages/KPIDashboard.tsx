import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { 
  BarChart3,
  TrendingDown,
  AlertTriangle,
  Users,
  Package,
  Target,
  Activity,
  RefreshCw,
  ArrowDown,
  ArrowUp,
  ExternalLink
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { AgGridReact } from 'ag-grid-react';
import { ColDef, ICellRendererParams } from 'ag-grid-community';
import { myTheme } from '@/styles/ag-grid-theme-m8.js';


interface LowAccuracyProduct {
  product_id: string;
  product_name: string;
  accuracy_score: number;
  forecast_count: number;
  last_forecast_date: string;
  category_name?: string;
  avg_error_percentage: number;
  trend: 'improving' | 'declining' | 'stable';
}

interface LowAccuracyCustomer {
  customer_node_id: string;
  customer_name: string;
  node_name: string;
  accuracy_score: number;
  forecast_count: number;
  last_forecast_date: string;
  avg_error_percentage: number;
  trend: 'improving' | 'declining' | 'stable';
}

interface CustomerProductCombination {
  customer_node_id: string;
  customer_name: string;
  node_name: string;
  product_id: string;
  product_name: string;
  category_name?: string;
  accuracy_score: number;
  forecast_count: number;
  last_forecast_date: string;
  avg_error_percentage: number;
  trend: 'improving' | 'declining' | 'stable';
  forecast_bias: number;
  customer_code: string;
  location_code: string;
}

interface ForecastActualData {
  customer_node_id: string;
  customer_name: string;
  node_name: string;
  product_id: string;
  product_name: string;
  category_name?: string;
  forecast_value: number;
  actual_value: number;
  absolute_error: number;
  accuracy_score: number;
  forecast_date: string;
  period: string;
  customer_code: string;
  location_code: string;
}


interface KPISummary {
  total_products: number;
  low_accuracy_products: number;
  total_customers: number;
  low_accuracy_customers: number;
  overall_accuracy: number;
  accuracy_trend: 'improving' | 'declining' | 'stable';
}

export default function KPIDashboard() {
  const [lowAccuracyProducts, setLowAccuracyProducts] = useState<LowAccuracyProduct[]>([]);
  const [lowAccuracyCustomers, setLowAccuracyCustomers] = useState<LowAccuracyCustomer[]>([]);
  const [allProducts, setAllProducts] = useState<LowAccuracyProduct[]>([]);
  const [allCustomers, setAllCustomers] = useState<LowAccuracyCustomer[]>([]);
  const [customerProductCombinations, setCustomerProductCombinations] = useState<CustomerProductCombination[]>([]);
  const [kpiSummary, setKpiSummary] = useState<KPISummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [accuracyThreshold, setAccuracyThreshold] = useState(75);
  

  useEffect(() => {
    loadKPIData();
  }, [accuracyThreshold]);

  const loadKPIData = async () => {
    setLoading(true);
    try {
      await Promise.all([
        loadLowAccuracyProducts(),
        loadLowAccuracyCustomers(),
        loadCustomerProductCombinations(),
        loadKPISummary(),
      ]);
     
    } catch (error) {
      console.error('Error loading KPI data:', error);
      toast({
        title: "Error al cargar datos",
        description: "Hubo un problema al cargar los datos de KPI.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const loadLowAccuracyProducts = async () => {
    try {
      //////console.log('Loading low accuracy products with threshold:', accuracyThreshold);
      
      // First, get all forecast data
      const { data: forecastData, error: forecastError } = await (supabase as any)
       .schema('m8_schema')
        .from('v_forecast_interpretability')
        .select('product_id, interpretability_score, confidence_level, created_at')
        .not('product_id', 'is', null)
        .order('created_at', { ascending: false })
        .limit(500);

      if (forecastError) throw forecastError;
      
      //////console.log('Forecast data received:', forecastData?.length || 0, 'records');

      // Get product details separately
      const uniqueProductIds = [...new Set(forecastData?.map(d => d.product_id))];
      //////console.log('Unique product IDs:', uniqueProductIds.length);
      
      const { data: productData, error: productError } = await (supabase as any)
        .schema('m8_schema')
        .from('products')
        .select('product_id, product_name, category_name')
        .in('product_id', uniqueProductIds);

      if (productError) {
        console.warn('Product data fetch error:', productError);
      }
      
      //////console.log('Product data received:', productData?.length || 0, 'records');

      // Create product lookup map
      const productLookup = new Map();
      productData?.forEach(product => {
        productLookup.set(product.product_id, product);
      });

      // Transform and aggregate data by product
      const productMap = new Map();
      forecastData?.forEach(item => {
        const productId = item.product_id;
        if (!productMap.has(productId)) {
          const productInfo = productLookup.get(productId);
          productMap.set(productId, {
            product_id: productId,
            product_name: productInfo?.product_name || `Product ${productId}`,
            category_name: productInfo?.category_name || 'Sin categoría',
            accuracy_scores: [],
            forecast_count: 0,
            last_forecast_date: item.created_at
          });
        }
        
        const product = productMap.get(productId);
        product.accuracy_scores.push(item.interpretability_score);
        product.forecast_count++;
        
        if (new Date(item.created_at) > new Date(product.last_forecast_date)) {
          product.last_forecast_date = item.created_at;
        }
      });

      // Calculate averages and trends for all products
      const allProductsData = Array.from(productMap.values()).map(product => {
        const avgAccuracy = product.accuracy_scores.reduce((sum: number, score: number) => sum + score, 0) / product.accuracy_scores.length;
        const errorPercentage = 100 - avgAccuracy;
        
        // Simple trend calculation (you can make this more sophisticated)
        const trend: 'improving' | 'declining' | 'stable' = avgAccuracy < 60 ? 'declining' : avgAccuracy > 80 ? 'improving' : 'stable';
        
        return {
          product_id: product.product_id,
          product_name: product.product_name,
          category_name: product.category_name,
          accuracy_score: Math.round(avgAccuracy),
          forecast_count: product.forecast_count,
          last_forecast_date: product.last_forecast_date,
          avg_error_percentage: Math.round(errorPercentage),
          trend
        };
      });

      // Filter for low accuracy products only
      const lowAccuracyProducts = allProductsData
        .filter(product => product.accuracy_score < accuracyThreshold)
        .sort((a, b) => a.accuracy_score - b.accuracy_score);

      //////console.log('All products:', allProductsData.length);
      //////console.log('Low accuracy products after filtering:', lowAccuracyProducts.length);
      
      setAllProducts(allProductsData);
      setLowAccuracyProducts(lowAccuracyProducts);
    } catch (error) {
      console.error('Error loading low accuracy products:', error);
    }
  };

  const loadLowAccuracyCustomers = async () => {
    try {
      //////console.log('Loading low accuracy customers with threshold:', accuracyThreshold);
      
      // Get all forecast data for customers with new fields
      const { data: forecastData, error: forecastError } = await (supabase as any)
       .schema('m8_schema')
        .from('v_forecast_interpretability')
        .select('customer_node_id, customer_name,  interpretability_score, confidence_level, created_at, customer_code,location_code')
        .not('customer_node_id', 'is', null)
        .order('created_at', { ascending: false })
        .limit(500);

      if (forecastError) throw forecastError;
      
      //////console.log('Customer forecast data received:', forecastData?.length || 0, 'records');

      // Transform and aggregate data by customer
      const customerMap = new Map();
      forecastData?.forEach(item => {
        const customerId = item.customer_node_id;
        if (!customerMap.has(customerId)) {
          customerMap.set(customerId, {
            customer_node_id: customerId,
            customer_name: item.customer_name || `Customer ${customerId}`,
            node_name: item.location_name || item.customer_name || `Customer ${customerId}`,
            accuracy_scores: [],
            forecast_count: 0,
            last_forecast_date: item.created_at
          });
        }
        
        const customer = customerMap.get(customerId);
        customer.accuracy_scores.push(item.interpretability_score);
        customer.forecast_count++;
        
        if (new Date(item.created_at) > new Date(customer.last_forecast_date)) {
          customer.last_forecast_date = item.created_at;
        }
      });

      // Calculate averages and trends for all customers
      const allCustomersData = Array.from(customerMap.values()).map(customer => {
        const avgAccuracy = customer.accuracy_scores.reduce((sum: number, score: number) => sum + score, 0) / customer.accuracy_scores.length;
        const errorPercentage = 100 - avgAccuracy;
        
        const trend: 'improving' | 'declining' | 'stable' = avgAccuracy < 60 ? 'declining' : avgAccuracy > 80 ? 'improving' : 'stable';
        
        return {
          customer_node_id: customer.customer_node_id,
          customer_name: customer.customer_name,
          node_name: customer.node_name,
          accuracy_score: Math.round(avgAccuracy),
          forecast_count: customer.forecast_count,
          last_forecast_date: customer.last_forecast_date,
          avg_error_percentage: Math.round(errorPercentage),
          trend
        };
      });

      // Filter for low accuracy customers only
      const lowAccuracyCustomers = allCustomersData
        .filter(customer => customer.accuracy_score < accuracyThreshold)
        .sort((a, b) => a.accuracy_score - b.accuracy_score);

      //////console.log('All customers:', allCustomersData.length);
      //////console.log('Low accuracy customers after filtering:', lowAccuracyCustomers.length);
      
      setAllCustomers(allCustomersData);
      setLowAccuracyCustomers(lowAccuracyCustomers);
    } catch (error) {
      console.error('Error loading low accuracy customers:', error);
    }
  };

  const loadCustomerProductCombinations = async () => {
    try {
      //////console.log('Loading customer-product combinations with threshold:', accuracyThreshold);
      
      // Get forecast data with both customer and product IDs, including new fields
      const { data: forecastData, error: forecastError } = await (supabase as any)
       .schema('m8_schema')
        .from('v_forecast_interpretability')
        .select('customer_node_id, customer_name, location_name, product_id, interpretability_score, confidence_level, created_at, customer_code,location_code')
        .not('customer_node_id', 'is', null)
        .not('product_id', 'is', null)
        .order('created_at', { ascending: false })
        .limit(1000);

      if (forecastError) throw forecastError;

      // Get unique product IDs for lookup
      const uniqueProductIds = [...new Set(forecastData?.map(d => d.product_id))];
      
      // Get product details only (customer data comes from the view now)
      const { data: productData, error: productError } = await (supabase as any)
        .schema('m8_schema')
        .from('products')
        .select('product_id, product_name, category_name')
        .in('product_id', uniqueProductIds);

      if (productError) {
        console.warn('Product data fetch error:', productError);
      }

      // Create product lookup map
      const productLookup = new Map();
      productData?.forEach(product => {
        productLookup.set(product.product_id, product);
      });

      // Aggregate by customer-product combination
      const combinationMap = new Map();
      forecastData?.forEach(item => {
        const key = `${item.customer_node_id}_${item.product_id}`;
        
        if (!combinationMap.has(key)) {
          const productInfo = productLookup.get(item.product_id);
          
          combinationMap.set(key, {
            customer_code: item.customer_code,
            location_code: item.location_code,
            customer_node_id: item.customer_node_id,
            customer_name: item.customer_name || `Customer ${item.customer_node_id}`,
            node_name: item.location_name || item.customer_name || `Customer ${item.customer_node_id}`,
            product_id: item.product_id,
            product_name: productInfo?.product_name || `Product ${item.product_id}`,
            category_name: productInfo?.category_name || 'Sin categoría',
            accuracy_scores: [],
            forecast_bias_values: [],
            forecast_count: 0,
            last_forecast_date: item.created_at
          });
        }
        
        const combination = combinationMap.get(key);
        combination.accuracy_scores.push(item.interpretability_score);
        combination.forecast_bias_values.push(0); // Default to 0 since forecast_bias field may not exist
        combination.forecast_count++;
        
        if (new Date(item.created_at) > new Date(combination.last_forecast_date)) {
          combination.last_forecast_date = item.created_at;
        }
      });

      // Calculate averages and filter by threshold
      const lowAccuracyCombinations = Array.from(combinationMap.values())
        .map(combination => {
          const avgAccuracy = combination.accuracy_scores.reduce((sum: number, score: number) => sum + score, 0) / combination.accuracy_scores.length;
          const errorPercentage = 100 - avgAccuracy;
          const avgForecastBias = combination.forecast_bias_values.length > 0 
            ? combination.forecast_bias_values.reduce((sum: number, bias: number) => sum + bias, 0) / combination.forecast_bias_values.length 
            : 0;
          const trend: 'improving' | 'declining' | 'stable' = avgAccuracy < 60 ? 'declining' : avgAccuracy > 80 ? 'improving' : 'stable';
          
          return {
            customer_node_id: combination.customer_node_id,
            customer_code: combination.customer_code,
            location_code: combination.location_code,
            customer_name: combination.customer_name,
            node_name: combination.node_name,
            product_id: combination.product_id,
            product_name: combination.product_name,
            category_name: combination.category_name,
            accuracy_score: Math.round(avgAccuracy),
            forecast_count: combination.forecast_count,
            last_forecast_date: combination.last_forecast_date,
            avg_error_percentage: Math.round(errorPercentage),
            trend,
            forecast_bias: Math.round(avgForecastBias * 100) / 100
          };
        })
        .filter(combination => combination.accuracy_score < accuracyThreshold)
        .sort((a, b) => a.accuracy_score - b.accuracy_score);

      setCustomerProductCombinations(lowAccuracyCombinations);
    } catch (error) {
      console.error('Error loading customer-product combinations:', error);
    }
  };

  const loadKPISummary = async () => {
    try {
      // Get summary data from the new view
      const { data: allData, error } = await (supabase as any)
       .schema('m8_schema')
        .from('v_forecast_interpretability')
        .select('interpretability_score, product_id, customer_node_id, customer_code,location_code, customer_name')
        .order('created_at', { ascending: false })
        .limit(1000);

      if (error) throw error;

      const uniqueProducts = new Set(allData?.map(d => d.product_id).filter(Boolean));
      const uniqueCustomers = new Set(allData?.map(d => d.customer_node_id).filter(Boolean));
      
      const lowAccuracyProducts = allData?.filter(d => d.interpretability_score < accuracyThreshold && d.product_id && d.customer_name && d.node_name );
      const lowAccuracyCustomers = allData?.filter(d => d.interpretability_score < accuracyThreshold && d.customer_node_id && d.customer_name && d.node_name );
      
      const overallAccuracy = allData?.reduce((sum, d) => sum + d.interpretability_score, 0) / (allData?.length || 1);
      
      setKpiSummary({
        total_products: uniqueProducts.size,
        low_accuracy_products: new Set(lowAccuracyProducts?.map(d => d.product_id)).size,
        total_customers: uniqueCustomers.size,
        low_accuracy_customers: new Set(lowAccuracyCustomers?.map(d => d.customer_node_id)).size,
        overall_accuracy: Math.round(overallAccuracy || 0),
        accuracy_trend: overallAccuracy > 75 ? 'improving' : overallAccuracy < 60 ? 'declining' : 'stable'
      });
    } catch (error) {
      console.error('Error loading KPI summary:', error);
    }
  };

  
  const getAccuracyColor = (score: number) => {
    if (score >= 80) return 'text-green-600 bg-green-50';
    if (score >= 60) return 'text-yellow-600 bg-yellow-50';
    return 'text-red-600 bg-red-50';
  };

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'improving': return <ArrowUp className="h-4 w-4 text-green-500" />;
      case 'declining': return <ArrowDown className="h-4 w-4 text-red-500" />;
      default: return <Activity className="h-4 w-4 text-gray-500" />;
    }
  };

  // React Component Cell Renderers
  const CategoryCellRenderer = (params: ICellRendererParams) => {
    return (
      <span className="inline-flex items-center rounded-md border border-gray-200 bg-white px-2 py-1 text-xs font-medium text-gray-600">
        {params.value || 'Sin categoría'}
      </span>
    );
  };

  const AccuracyCellRenderer = (params: ICellRendererParams) => {
    const score = params.value;
    const colorClass = score >= 80 ? 'text-green-600 bg-green-50' : 
                      score >= 60 ? 'text-yellow-600 bg-yellow-50' : 
                      'text-red-600 bg-red-50';
    
    return (
      <span className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ${colorClass}`}>
        {score}%
      </span>
    );
  };

  const DataPointsCellRenderer = (params: ICellRendererParams) => {
    const dataPoints = params.value;
    
    // If data points is less than 10, use the accuracy cell renderer style
    if (dataPoints < 10) {
      const colorClass = 'text-red-600 bg-red-50'; // Red for insufficient data
      return (
        <span className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ${colorClass}`}>
          {dataPoints}
        </span>
      );
    }
    
    // Otherwise, display normally
    return (
      <span className="text-center">
        {dataPoints}
      </span>
    );
  };

  const TrendCellRenderer = (params: ICellRendererParams) => {
    const trend = params.value;
    const icon = trend === 'improving' ? '↗️' : trend === 'declining' ? '↘️' : '➡️';
    
    return (
      <div className="flex items-center justify-center">
        {icon}
      </div>
    );
  };

  // Column definitions for ag-Grid
  const productColumns: ColDef[] = [
    { 
      field: 'product_id', 
      headerName: 'Producto ID', 
      width: 240,
      cellClass: 'font-medium'
    },
    { 
      field: 'product_name', 
      headerName: 'Nombre del Producto', 
      width: 480,
      cellClass: 'font-medium'
    },
    { 
      field: 'category_name', 
      headerName: 'Categoría', 
      width: 480,
      cellRenderer: 'font-medium'
    },
    { 
      field: 'accuracy_score', 
      headerName: 'Precisión', 
      width: 200,
      cellRenderer: AccuracyCellRenderer
    },
    { 
      field: 'avg_error_percentage', 
      headerName: 'Error %', 
      width: 200,
      cellClass: 'text-red-600 font-medium text-center'
    },
    { 
      field: 'forecast_count', 
      headerName: 'Data points', 
      width: 200,
      cellRenderer: DataPointsCellRenderer
    },
    { 
      field: 'trend', 
      headerName: 'Tendencia', 
      width: 180,
      cellRenderer: TrendCellRenderer
    },
    { 
      field: 'last_forecast_date', 
      headerName: 'Último Pronóstico', 
      width: 220,
      cellRenderer: (params: any) => {
        return new Date(params.value).toLocaleDateString('es-ES');
      },
      cellClass: 'font-medium'
    }
  ];

  const customerColumns: ColDef[] = [
    { 
      field: 'node_name', 
      headerName: 'Cliente', 
      width: 280,
      cellClass: 'font-medium',
      cellRenderer: (params: ICellRendererParams) => {
        const customerName = params.data.node_name;
        const customerId = params.data.customer_node_id;
        return (
          <div>
            <div className="font-medium text-gray-900">{customerName}</div>
            <div className="text-xs text-gray-500 font-mono">{customerId}</div>
          </div>
        );
      }
    },
    { 
      field: 'accuracy_score', 
      headerName: 'Precisión', 
      width: 220,
      cellRenderer: AccuracyCellRenderer
    },
    { 
      field: 'avg_error_percentage', 
      headerName: 'Error %', 
      width: 220,
      cellClass: 'text-red-600 font-medium text-center'
    },
    { 
      field: 'forecast_count', 
      headerName: 'Pronósticos', 
      width: 220,
      cellRenderer: DataPointsCellRenderer
    },
    { 
      field: 'trend', 
      headerName: 'Tendencia', 
      width: 220,
      cellRenderer: TrendCellRenderer
    },
    { 
      field: 'last_forecast_date', 
      headerName: 'Último Pronóstico', 
      width: 220,
      cellRenderer: (params: any) => {
        return new Date(params.value).toLocaleDateString('es-ES');
      },
      cellClass: 'text-xs text-muted-foreground'
    }
  ];

  const combinationColumns: ColDef[] = [
    { 
      field: 'customer_name', 
      headerName: 'Cliente', 
      width: 220,
      cellClass: 'font-medium'
    },
    { 
      field: 'customer_code',
      headerName: 'Código del Cliente', 
      width: 120,
      cellClass: 'font-medium'
    },
    { 
      field: 'product_id', 
      headerName: 'Producto ID', 
      width: 120,
      cellClass: 'font-medium'
    },
    { 
      field: 'product_name', 
      headerName: 'Nombre del Producto', 
      width: 400,
      cellClass: 'font-medium'
    },
    { 
      field: 'category_name', 
      headerName: 'Categoría', 
      width: 300,
      cellRenderer: 'font-medium'
    },
    { 
      field: 'accuracy_score', 
      headerName: 'Precisión', 
      width: 120,
      cellRenderer: AccuracyCellRenderer
    },
    { 
      field: 'avg_error_percentage', 
      headerName: 'Error %', 
      width: 120,
      cellClass: 'text-red-600 font-medium text-center'
    },
    { 
      field: 'forecast_bias', 
      headerName: 'Sesgo del Pronóstico', 
      width: 180,
      cellClass: 'text-red-600 font-medium text-center'
    },
    { 
      field: 'forecast_count', 
      headerName: 'Data points', 
      width: 120,
      cellRenderer: DataPointsCellRenderer
    },
    { 
      field: 'trend', 
      headerName: 'Tendencia', 
      width: 120,
      cellRenderer: TrendCellRenderer
    },
    { 
      field: 'last_forecast_date', 
      headerName: 'Último Pronóstico', 
      width: 180,
      cellRenderer: (params: any) => {
        return new Date(params.value).toLocaleDateString('es-ES');
      },
      cellClass: 'text-xs text-muted-foreground'
    },
    { 
      field: 'actions', 
      headerName: 'Acciones', 
      width: 120,
      cellRenderer: (params: ICellRendererParams) => {
        const data = params.data;
        return (
          <Button
            size="sm"
            variant="outline"
            className="h-8 w-8 p-0"
            onClick={() => window.open(`/demand-forecast?customer_code=${data.customer_code}&product_id=${data.product_id}`, '_blank')}
            title="Ver en Pronóstico de Demanda"
          >
            <ExternalLink className="h-3 w-3" />
          </Button>
        );
      }
    }
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Dashboard de KPIs</h1>
          <p className="text-muted-foreground">
            Monitoreo de precisión de pronósticos por producto y cliente
          </p>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">Umbral de Precisión:</span>
            <select 
              value={accuracyThreshold} 
              onChange={(e) => setAccuracyThreshold(Number(e.target.value))}
              className="border rounded px-2 py-1 text-sm"
            >
              <option value={60}>60%</option>
              <option value={70}>70%</option>
              <option value={75}>75%</option>
              <option value={80}>80%</option>
              <option value={85} selected={true}>85%</option>
            </select>
          </div>
          <Button onClick={loadKPIData} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Actualizar
          </Button>
        </div>
      </div>

      {/* KPI Summary Cards */}
      {kpiSummary && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Precisión General</p>
                  <p className="text-2xl font-bold">{kpiSummary.overall_accuracy}%</p>
                </div>
                <div className="flex items-center gap-2">
                  {getTrendIcon(kpiSummary.accuracy_trend)}
                  <Target className="h-8 w-8 text-blue-500" />
                </div>
              </div>
              <Progress value={kpiSummary.overall_accuracy} className="mt-2" />
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Productos Baja Precisión</p>
                  <p className="text-2xl font-bold text-red-600">{kpiSummary.low_accuracy_products}</p>
                  <p className="text-xs text-muted-foreground">de {kpiSummary.total_products} total</p>
                </div>
                <Package className="h-8 w-8 text-red-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Clientes Baja Precisión</p>
                  <p className="text-2xl font-bold text-orange-600">{kpiSummary.low_accuracy_customers}</p>
                  <p className="text-xs text-muted-foreground">de {kpiSummary.total_customers} total</p>
                </div>
                <Users className="h-8 w-8 text-orange-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Elementos Críticos</p>
                  <p className="text-2xl font-bold text-red-600">
                    {kpiSummary.low_accuracy_products + kpiSummary.low_accuracy_customers}
                  </p>
                  <p className="text-xs text-muted-foreground">Requieren atención</p>
                </div>
                <AlertTriangle className="h-8 w-8 text-red-500" />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Main Content Tabs */}
      <Tabs defaultValue="products" className="space-y-4">
        <TabsList>
          <TabsTrigger value="products">Productos Baja Precisión</TabsTrigger>
          <TabsTrigger value="customers">Clientes Baja Precisión</TabsTrigger>
          <TabsTrigger value="combinations">Clientes-Productos</TabsTrigger>
         
                 </TabsList>

        <TabsContent value="products">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="h-5 w-5" />
                Productos con Precisión Inferior a {accuracyThreshold}%
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
                  <p>Cargando datos...</p>
                </div>
              ) : (
                <div style={{ height: '800px', width: '100%' }}>
                  <AgGridReact
                    rowData={lowAccuracyProducts}
                    columnDefs={productColumns}
                    theme={myTheme}
                    defaultColDef={{
                      sortable: true,
                      resizable: true,
                    }}
                    pagination={true}
                    paginationPageSize={15}
                    suppressRowClickSelection={true}
                    rowSelection="multiple"
                    animateRows={true}
                    noRowsOverlayComponent={() => (
                      <div className="text-center py-8 text-muted-foreground">
                        No se encontraron productos con baja precisión
                      </div>
                    )}
                  />
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="customers">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Clientes con Precisión Inferior a {accuracyThreshold}%
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
                  <p>Cargando datos...</p>
                </div>
              ) : (
                <div style={{ height: '500px', width: '100%' }}>
                  <AgGridReact
                    rowData={lowAccuracyCustomers}
                    columnDefs={customerColumns}
                    theme={myTheme}
                    defaultColDef={{
                      sortable: true,
                      resizable: true,
                    }}
                    pagination={true}
                    paginationPageSize={20}
                    suppressRowClickSelection={true}
                    rowSelection="multiple"
                    animateRows={true}
                    noRowsOverlayComponent={() => (
                      <div className="text-center py-8 text-muted-foreground">
                        No se encontraron clientes con baja precisión
                      </div>
                    )}
                  />
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="combinations">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="h-5 w-5" />
                Combinaciones Cliente-Producto con Precisión Inferior a {accuracyThreshold}% ({customerProductCombinations.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
                  <p>Cargando datos...</p>
                </div>
              ) : (
                <div style={{ height: '500px', width: '100%' }}>
                  <AgGridReact
                    rowData={customerProductCombinations}
                    columnDefs={combinationColumns}
                    theme={myTheme}
                    defaultColDef={{
                      sortable: true,
                      resizable: true,
                    }}
                    pagination={true}
                    paginationPageSize={20}
                    suppressRowClickSelection={true}
                    rowSelection="multiple"
                    animateRows={true}
                    noRowsOverlayComponent={() => (
                      <div className="text-center py-8 text-muted-foreground">
                        No se encontraron combinaciones cliente-producto con baja precisión
                      </div>
                    )}
                  />
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

      </Tabs>
    </div>
  );
}