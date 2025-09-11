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
import 'ag-grid-community/styles/ag-grid.css';
import 'ag-grid-community/styles/ag-theme-alpine.css';
import ParetoErrorChart from '@/components/ParetoErrorChart';
import HierarchicalErrorChart from '@/components/HierarchicalErrorChart';
import HeatmapChart from '@/components/HeatmapChart';
import DumbbellChart from '@/components/DumbbellChart';
import ResponsiblesAnalysisChart from '@/components/ResponsiblesAnalysisChart';
import { format } from "date-fns";
import { Link } from "react-router-dom";
import NewNPIModal from "@/components/NewNPIModal";

// Add interfaces for data types
interface ForecastData {
  customer_node_id: string;
  product_id: string;
  forecast: number;
  actual: number;
  postdate: string;
}

interface KPIData {
  totalProducts: number;
  activeNPIs: number;
  completedMilestones: number;
  upcomingDeadlines: number;
  forecastAccuracy: number;
  paretoData: any[];
}

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
}

interface HeatmapData {
  customer_product_key: string;
  customer_name: string;
  product_name: string;
  accuracy_score: number;
  absolute_error: number;
}

interface DumbbellData {
  customer_product_key: string;
  customer_name: string;
  product_name: string;
  forecast_value: number;
  actual_value: number;
  absolute_error: number;
  accuracy_score: number;
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
  
  // New state for heatmap, dumbbell and pareto data
  const [heatmapData, setHeatmapData] = useState<HeatmapData[]>([]);
  const [dumbbellData, setDumbbellData] = useState<DumbbellData[]>([]);
  const [paretoData, setParetoData] = useState<DumbbellData[]>([]);

  const { npiProducts, loading: productsLoading } = useNPIProducts();
  const { milestones, loading: milestonesLoading } = useNPIMilestones();
  const { scenarios, loading: scenariosLoading } = useNPIScenarios();
  const [showNewNPIModal, setShowNewNPIModal] = useState(false);
  const [kpiData, setKpiData] = useState<KPIData | null>(null);
  const [kpiLoading, setKpiLoading] = useState(true);

  useEffect(() => {
    loadKPIData();
  }, [accuracyThreshold]);

  // Load KPI data
  useEffect(() => {
    loadKPIData();
  }, []);

  const loadKPIData = async () => {
    setLoading(true);
    try {
      setKpiLoading(true);
      
      // Load forecast data with correct column name
      const { data: forecastData, error: forecastError } = await supabase
        .from('forecast_data')
        .select('customer_node_id, product_id, forecast, actual, postdate')
        .not('customer_node_id', 'is', null)
        .not('product_id', 'is', null)
        .not('forecast', 'is', null)
        .not('actual', 'is', null)
        .order('postdate', { ascending: false })
        .limit(2000);

      if (forecastError) {
        console.error('Error loading forecast data:', forecastError);
        return;
      }

      // Calculate KPI metrics
      const totalProducts = npiProducts?.length || 0;
      const activeNPIs = npiProducts?.filter(p => p.npi_status !== 'discontinued').length || 0;
      const completedMilestones = milestones?.filter(m => m.milestone_status === 'completed').length || 0;
      const upcomingDeadlines = milestones?.filter(m => 
        m.milestone_status === 'not_started' && 
        new Date(m.milestone_date) > new Date()
      ).length || 0;

      // Calculate forecast accuracy
      let forecastAccuracy = 0;
      if (forecastData && forecastData.length > 0) {
        const accuracySum = forecastData.reduce((sum, item) => {
          const accuracy = item.actual > 0 ? Math.min(item.forecast / item.actual, item.actual / item.forecast) : 0;
          return sum + accuracy;
        }, 0);
        forecastAccuracy = (accuracySum / forecastData.length) * 100;
      }

      setKpiData({
        totalProducts,
        activeNPIs,
        completedMilestones,
        upcomingDeadlines,
        forecastAccuracy,
        paretoData: forecastData || []
      });

      await Promise.all([
        loadLowAccuracyProducts(),
        loadLowAccuracyCustomers(),
        loadCustomerProductCombinations(),
        loadKPISummary(),
        loadHeatmapData(),
        loadDumbbellData(),
        loadParetoData()
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
      setKpiLoading(false);
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
        .select('customer_node_id, customer_name, location_name, interpretability_score, confidence_level, created_at')
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
        .select('customer_node_id, customer_name, location_name, product_id, interpretability_score, confidence_level, created_at')
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
        .select('interpretability_score, product_id, customer_node_id')
        .order('created_at', { ascending: false })
        .limit(1000);

      if (error) throw error;

      const uniqueProducts = new Set(allData?.map(d => d.product_id).filter(Boolean));
      const uniqueCustomers = new Set(allData?.map(d => d.customer_node_id).filter(Boolean));
      
      const lowAccuracyProducts = allData?.filter(d => d.interpretability_score < accuracyThreshold && d.product_id);
      const lowAccuracyCustomers = allData?.filter(d => d.interpretability_score < accuracyThreshold && d.customer_node_id);
      
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

  const loadHeatmapData = async () => {
    try {
      // Get forecast vs actual data from forecast_data table
      const { data: forecastData, error: forecastError } = await (supabase as any)
        .schema('m8_schema')
        .from('forecast_data')
        .select('customer_node_id, product_id, forecast, actual, forecast_date')
        .not('customer_node_id', 'is', null)
        .not('product_id', 'is', null)
        .not('forecast', 'is', null)
        .not('actual', 'is', null)
        .order('forecast_date', { ascending: false })
        .limit(2000);

      if (forecastError) throw forecastError;

      // Get unique IDs for lookups
      const uniqueCustomerIds = [...new Set(forecastData?.map(d => d.customer_node_id))];
      const uniqueProductIds = [...new Set(forecastData?.map(d => d.product_id))];
      
      // Get customer and product details
      const [customerResult, productResult] = await Promise.all([
        (supabase as any)
          .schema('m8_schema')
          .from('supply_network_nodes')
          .select('id, node_name')
          .in('id', uniqueCustomerIds),
        (supabase as any)
          .schema('m8_schema')
          .from('products')
          .select('product_id, product_name, category_name')
          .in('product_id', uniqueProductIds)
      ]);

      // Create lookup maps
      const customerLookup = new Map();
      customerResult.data?.forEach(customer => {
        customerLookup.set(customer.id, customer.node_name);
      });

      const productLookup = new Map();
      productResult.data?.forEach(product => {
        productLookup.set(product.product_id, product);
      });

      // Aggregate by customer-product combination
      const combinationMap = new Map();
      forecastData?.forEach(item => {
        const key = `${item.customer_node_id}_${item.product_id}`;
        const absoluteError = Math.abs(item.actual - item.forecast);
        const accuracy = item.actual === 0 ? 0 : Math.max(0, 100 - (absoluteError / Math.abs(item.actual)) * 100);
        
        if (!combinationMap.has(key)) {
          const customerName = customerLookup.get(item.customer_node_id) || `Customer ${item.customer_node_id}`;
          const productInfo = productLookup.get(item.product_id);
          
          combinationMap.set(key, {
            customer_product_key: key,
            customer_name: customerName,
            product_name: productInfo?.product_name || `Product ${item.product_id}`,
            accuracy_scores: [],
            absolute_errors: []
          });
        }
        
        const combination = combinationMap.get(key);
        combination.accuracy_scores.push(accuracy);
        combination.absolute_errors.push(absoluteError);
      });

      // Calculate averages and filter by threshold (<75%)
      const heatmapResult = Array.from(combinationMap.values())
        .map(combination => {
          const avgAccuracy = combination.accuracy_scores.reduce((sum: number, score: number) => sum + score, 0) / combination.accuracy_scores.length;
          const avgAbsoluteError = combination.absolute_errors.reduce((sum: number, error: number) => sum + error, 0) / combination.absolute_errors.length;
          
          return {
            customer_product_key: combination.customer_product_key,
            customer_name: combination.customer_name,
            product_name: combination.product_name,
            accuracy_score: Math.round(avgAccuracy * 100) / 100,
            absolute_error: Math.round(avgAbsoluteError * 100) / 100
          };
        })
        .filter(item => item.accuracy_score < 75) // Filter <75%
        .sort((a, b) => a.accuracy_score - b.accuracy_score); // Sort by worst first

      setHeatmapData(heatmapResult);
    } catch (error) {
      console.error('Error loading heatmap data:', error);
    }
  };

  const loadDumbbellData = async () => {
    try {
      // Get most recent forecast vs actual data for dumbbell chart
      const { data: forecastData, error: forecastError } = await (supabase as any)
        .schema('m8_schema')
        .from('forecast_data')
        .select('customer_node_id, product_id, forecast, actual, forecast_date')
        .not('customer_node_id', 'is', null)
        .not('product_id', 'is', null)
        .not('forecast', 'is', null)
        .not('actual', 'is', null)
        .order('forecast_date', { ascending: false })
        .limit(1000);

      if (forecastError) throw forecastError;

      // Get unique IDs for lookups
      const uniqueCustomerIds = [...new Set(forecastData?.map(d => d.customer_node_id))];
      const uniqueProductIds = [...new Set(forecastData?.map(d => d.product_id))];
      
      // Get customer and product details
      const [customerResult, productResult] = await Promise.all([
        (supabase as any)
          .schema('m8_schema')
          .from('supply_network_nodes')
          .select('id, node_name')
          .in('id', uniqueCustomerIds),
        (supabase as any)
          .schema('m8_schema')
          .from('products')
          .select('product_id, product_name')
          .in('product_id', uniqueProductIds)
      ]);

      // Create lookup maps
      const customerLookup = new Map();
      customerResult.data?.forEach(customer => {
        customerLookup.set(customer.id, customer.node_name);
      });

      const productLookup = new Map();
      productResult.data?.forEach(product => {
        productLookup.set(product.product_id, product.product_name);
      });

      // Get latest period data for each customer-product combination
      const latestDataMap = new Map();
      forecastData?.forEach(item => {
        const key = `${item.customer_node_id}_${item.product_id}`;
        
        if (!latestDataMap.has(key) || new Date(item.forecast_date) > new Date(latestDataMap.get(key).forecast_date)) {
          latestDataMap.set(key, item);
        }
      });

      // Process for dumbbell chart - Top-N worst pairs
      const dumbbellResult = Array.from(latestDataMap.values())
        .map(item => {
          const absoluteError = Math.abs(item.actual - item.forecast);
          const accuracy = item.actual === 0 ? 0 : Math.max(0, 100 - (absoluteError / Math.abs(item.actual)) * 100);
          const customerName = customerLookup.get(item.customer_node_id) || `Customer ${item.customer_node_id}`;
          const productName = productLookup.get(item.product_id) || `Product ${item.product_id}`;
          
          return {
            customer_product_key: `${item.customer_node_id}_${item.product_id}`,
            customer_name: customerName,
            product_name: productName,
            forecast_value: item.forecast,
            actual_value: item.actual,
            absolute_error: absoluteError,
            accuracy_score: Math.round(accuracy * 100) / 100
          };
        })
        .sort((a, b) => b.absolute_error - a.absolute_error) // Sort by highest error first
        .slice(0, 20); // Top-N worst pairs

      setDumbbellData(dumbbellResult);
    } catch (error) {
      console.error('Error loading dumbbell data:', error);
    }
  };

  const loadParetoData = async () => {
    try {
      // Use the same data as dumbbell but aggregate total absolute error by customer-product pair
      const { data: forecastData, error: forecastError } = await (supabase as any)
        .schema('m8_schema')
        .from('forecast_data')
        .select('customer_node_id, product_id, forecast, actual, forecast_date')
        .not('customer_node_id', 'is', null)
        .not('product_id', 'is', null)
        .not('forecast', 'is', null)
        .not('actual', 'is', null)
        .order('forecast_date', { ascending: false })
        .limit(2000);

      if (forecastError) throw forecastError;

      // Get unique IDs for lookups
      const uniqueCustomerIds = [...new Set(forecastData?.map(d => d.customer_node_id))];
      const uniqueProductIds = [...new Set(forecastData?.map(d => d.product_id))];
      
      // Get customer and product details
      const [customerResult, productResult] = await Promise.all([
        (supabase as any)
          .schema('m8_schema')
          .from('supply_network_nodes')
          .select('id, node_name')
          .in('id', uniqueCustomerIds),
        (supabase as any)
          .schema('m8_schema')
          .from('products')
          .select('product_id, product_name')
          .in('product_id', uniqueProductIds)
      ]);

      // Create lookup maps
      const customerLookup = new Map();
      customerResult.data?.forEach(customer => {
        customerLookup.set(customer.id, customer.node_name);
      });

      const productLookup = new Map();
      productResult.data?.forEach(product => {
        productLookup.set(product.product_id, product.product_name);
      });

      // Aggregate total absolute error by customer-product combination
      const combinationMap = new Map();
      forecastData?.forEach(item => {
        const key = `${item.customer_node_id}_${item.product_id}`;
        const absoluteError = Math.abs(item.actual - item.forecast);
        
        if (!combinationMap.has(key)) {
          const customerName = customerLookup.get(item.customer_node_id) || `Customer ${item.customer_node_id}`;
          const productName = productLookup.get(item.product_id) || `Product ${item.product_id}`;
          
          combinationMap.set(key, {
            customer_product_key: key,
            customer_name: customerName,
            product_name: productName,
            total_absolute_error: 0,
            forecast_count: 0,
            latest_forecast: item.forecast,
            latest_actual: item.actual
          });
        }
        
        const combination = combinationMap.get(key);
        combination.total_absolute_error += absoluteError;
        combination.forecast_count++;
      });

      // Process for Pareto chart
      const paretoResult = Array.from(combinationMap.values())
        .map(combination => {
          const avgAccuracy = combination.latest_actual === 0 ? 0 : 
            Math.max(0, 100 - (Math.abs(combination.latest_actual - combination.latest_forecast) / Math.abs(combination.latest_actual)) * 100);
          
          return {
            customer_product_key: combination.customer_product_key,
            customer_name: combination.customer_name,
            product_name: combination.product_name,
            forecast_value: combination.latest_forecast,
            actual_value: combination.latest_actual,
            absolute_error: Math.round(combination.total_absolute_error * 100) / 100,
            accuracy_score: Math.round(avgAccuracy * 100) / 100
          };
        })
        .sort((a, b) => b.absolute_error - a.absolute_error); // Sort by highest total error first

      setParetoData(paretoResult);
    } catch (error) {
      console.error('Error loading pareto data:', error);
    }
  };

  const upcomingMilestones = milestones?.filter(m => 
    m.milestone_status === 'not_started' && 
    new Date(m.milestone_date) > new Date()
  ).slice(0, 5) || [];

  const overdueMilestones = milestones?.filter(m => 
    m.milestone_status === 'not_started' && 
    new Date(m.milestone_date) <= new Date()
  ) || [];

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
      width: 280,
      cellRenderer: CategoryCellRenderer
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
      field: 'forecast_count', 
      headerName: 'Pronósticos', 
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
    }
  ];

  const combinationColumns: ColDef[] = [
    { 
      field: 'node_name', 
      headerName: 'Cliente', 
      width: 200,
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
      field: 'product_id', 
      headerName: 'Producto ID', 
      width: 120,
      cellClass: 'font-medium'
    },
    { 
      field: 'product_name', 
      headerName: 'Nombre del Producto', 
      width: 200,
      cellClass: 'font-medium'
    },
    { 
      field: 'category_name', 
      headerName: 'Categoría', 
      width: 150,
      cellRenderer: CategoryCellRenderer
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
      cellRenderer: (params: any) => {
        const bias = params.value;
        const variant = bias > 0 ? 'destructive' : bias < 0 ? 'secondary' : 'outline';
        const colorClass = bias > 0 ? 'bg-red-100 text-red-800' : bias < 0 ? 'bg-gray-100 text-gray-800' : 'bg-white text-gray-600 border';
        return `<span class="inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ${colorClass}">${bias > 0 ? '+' : ''}${bias}</span>`;
      }
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
      cellRenderer: (params: any) => {
        const data = params.data;
        return `<button class="inline-flex items-center justify-center rounded-md border border-gray-200 bg-white px-2 py-1 text-xs font-medium text-gray-600 hover:bg-gray-50 h-8 w-8" onclick="window.open('/demand-forecast?customer_node_id=${data.customer_node_id}&product_id=${data.product_id}', '_blank')" title="Ver en Pronóstico de Demanda">🔗</button>`;
      }
    }
  ];

  if (productsLoading || milestonesLoading || scenariosLoading || kpiLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Cargando Panel NPI...</p>
        </div>
      </div>
    );
  }

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
              <option value={85}>85%</option>
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
         <TabsTrigger value="hierarchy">Jerarquía de Error</TabsTrigger>
          <TabsTrigger value="trends">Análisis de Tendencias</TabsTrigger>
         
        
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
                <div className="ag-theme-alpine" style={{ height: '800px', width: '100%' }}>
                  <AgGridReact
                    rowData={lowAccuracyProducts}
                    columnDefs={productColumns}
                    theme="legacy"
                    defaultColDef={{
                      sortable: true,
                      filter: true,
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
                <div className="ag-theme-alpine" style={{ height: '500px', width: '100%' }}>
                  <AgGridReact
                    rowData={lowAccuracyCustomers}
                    columnDefs={customerColumns}
                    theme="legacy"
                    defaultColDef={{
                      sortable: true,
                      filter: true,
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
                <div className="ag-theme-alpine" style={{ height: '500px', width: '100%' }}>
                  <AgGridReact
                    rowData={customerProductCombinations}
                    columnDefs={combinationColumns}
                    theme="legacy"
                    defaultColDef={{
                      sortable: true,
                      filter: true,
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

        <TabsContent value="hierarchy">
          <HierarchicalErrorChart 
            products={allProducts}
            title="Treemap / Sunburst de Error por Jerarquía"
          />
        </TabsContent>

        <TabsContent value="heatmap">
          <HeatmapChart 
            products={allProducts}
            title="Heatmap de Precisión por SKU x Semana"
          />
        </TabsContent>



        <TabsContent value="trends">
          <div className="space-y-6">
            {/* Pareto Error Chart */}
            <ParetoErrorChart 
              products={allProducts}
              title="Pareto de Error (Top-N SKUs)"
            />

            {/* Distribution Analysis */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5" />
                  Análisis de Tendencias de Precisión
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <h4 className="font-medium mb-4">Distribución de Precisión - Productos</h4>
                      <div className="space-y-2">
                        {(() => {
                          const totalProducts = allProducts.length;
                          const highAccuracy = allProducts.filter(p => p.accuracy_score >= 80).length;
                          const mediumAccuracy = allProducts.filter(p => p.accuracy_score >= 60 && p.accuracy_score < 80).length;
                          const lowAccuracy = allProducts.filter(p => p.accuracy_score < 60).length;
                          
                          const highPercent = totalProducts > 0 ? Math.round((highAccuracy / totalProducts) * 100) : 0;
                          const mediumPercent = totalProducts > 0 ? Math.round((mediumAccuracy / totalProducts) * 100) : 0;
                          const lowPercent = totalProducts > 0 ? Math.round((lowAccuracy / totalProducts) * 100) : 0;
                          
                          return (
                            <>
                              <div className="flex justify-between items-center text-sm">
                                <span>Alta (≥80%)</span>
                                <div className="flex items-center gap-2">
                                  <span className="text-green-600 font-medium">{highAccuracy}</span>
                                  <span className="text-green-600 text-xs bg-green-50 px-2 py-1 rounded">
                                    {highPercent}%
                                  </span>
                                </div>
                              </div>
                              <div className="flex justify-between items-center text-sm">
                                <span>Media (60-79%)</span>
                                <div className="flex items-center gap-2">
                                  <span className="text-yellow-600 font-medium">{mediumAccuracy}</span>
                                  <span className="text-yellow-600 text-xs bg-yellow-50 px-2 py-1 rounded">
                                    {mediumPercent}%
                                  </span>
                                </div>
                              </div>
                              <div className="flex justify-between items-center text-sm">
                                <span>Baja (&lt;60%)</span>
                                <div className="flex items-center gap-2">
                                  <span className="text-red-600 font-medium">{lowAccuracy}</span>
                                  <span className="text-red-600 text-xs bg-red-50 px-2 py-1 rounded">
                                    {lowPercent}%
                                  </span>
                                </div>
                              </div>
                              <div className="flex justify-between items-center text-xs text-muted-foreground pt-2 border-t">
                                <span>Total</span>
                                <span>{totalProducts} productos</span>
                              </div>
                            </>
                          );
                        })()}
                      </div>
                    </div>
                    
                    <div>
                      <h4 className="font-medium mb-4">Distribución de Precisión - Clientes</h4>
                      <div className="space-y-2">
                        {(() => {
                          const totalCustomers = allCustomers.length;
                          const highAccuracy = allCustomers.filter(c => c.accuracy_score >= 80).length;
                          const mediumAccuracy = allCustomers.filter(c => c.accuracy_score >= 60 && c.accuracy_score < 80).length;
                          const lowAccuracy = allCustomers.filter(c => c.accuracy_score < 60).length;
                          
                          const highPercent = totalCustomers > 0 ? Math.round((highAccuracy / totalCustomers) * 100) : 0;
                          const mediumPercent = totalCustomers > 0 ? Math.round((mediumAccuracy / totalCustomers) * 100) : 0;
                          const lowPercent = totalCustomers > 0 ? Math.round((lowAccuracy / totalCustomers) * 100) : 0;
                          
                          return (
                            <>
                              <div className="flex justify-between items-center text-sm">
                                <span>Alta (≥80%)</span>
                                <div className="flex items-center gap-2">
                                  <span className="text-green-600 font-medium">{highAccuracy}</span>
                                  <span className="text-green-600 text-xs bg-green-50 px-2 py-1 rounded">
                                    {highPercent}%
                                  </span>
                                </div>
                              </div>
                              <div className="flex justify-between items-center text-sm">
                                <span>Media (60-79%)</span>
                                <div className="flex items-center gap-2">
                                  <span className="text-yellow-600 font-medium">{mediumAccuracy}</span>
                                  <span className="text-yellow-600 text-xs bg-yellow-50 px-2 py-1 rounded">
                                    {mediumPercent}%
                                  </span>
                                </div>
                              </div>
                              <div className="flex justify-between items-center text-sm">
                                <span>Baja (&lt;60%)</span>
                                <div className="flex items-center gap-2">
                                  <span className="text-red-600 font-medium">{lowAccuracy}</span>
                                  <span className="text-red-600 text-xs bg-red-50 px-2 py-1 rounded">
                                    {lowPercent}%
                                  </span>
                                </div>
                              </div>
                              <div className="flex justify-between items-center text-xs text-muted-foreground pt-2 border-t">
                                <span>Total</span>
                                <span>{totalCustomers} clientes</span>
                              </div>
                            </>
                          );
                        })()}
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}