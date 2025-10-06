import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { TrendingUp, TrendingDown, BarChart3, AlertTriangle, CheckCircle, Package, BadgeAlert, Target, Activity, Brain, Shield, RefreshCw, Download, Share2, ArrowUp, ArrowDown, Minus } from "lucide-react";
import { useLocations } from "@/hooks/useLocations";
import { useCustomers } from "@/hooks/useCustomers";

interface MetricsData {
  forecast_accuracy: number;
  model_confidence: number;
  forecast_bias: number;
  uncertainty_quality: number;
  mae: number;
  rmse: number;
  smape: number;
  model_name: string;
  interpretability_score: number;
  model_complexity: string;
  confidence_level: string;
  forecast_explanation: string;
  primary_drivers: string[];
  risk_factors: string[];
  recommended_actions: string[];
  data_pattern_type: string;
  zero_frequency: number;
  volatility_coefficient: number;
  seasonality_strength: number;
  inventory_recommendations: string;
}

interface MetricsDashboardProps {
  selectedProductId?: string;
  selectedLocationId?: string;
  selectedCustomerId?: string;
}

export function MetricsDashboard({ selectedProductId, selectedLocationId, selectedCustomerId }: MetricsDashboardProps) {
  // State management for metrics data and loading status
  const [metricsData, setMetricsData] = useState<MetricsData | null>(null);
  const [loading, setLoading] = useState(true);
  
  // Hooks for location and customer data
  const { locations } = useLocations();
  const { customers } = useCustomers();
  
  // Helper function to convert location code to location ID
  const getLocationId = (locationCode: string): string | undefined => {
    const location = locations.find(l => l.location_code === locationCode);
    return location?.location_id;
  };
  
  // Helper function to convert customer code to customer ID
  const getCustomerId = (customerCode: string): string | undefined => {
    const customer = customers.find(c => c.customer_code === customerCode);
    return customer?.customer_node_id;
  };

  // Fetch metrics data when component mounts or filters change
  useEffect(() => {
    if (selectedProductId && selectedLocationId) {
      fetchMetricsData();
    }
  }, [selectedProductId, selectedLocationId]);
  

  // Show selection prompt if no product is selected
  if (!selectedProductId) {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-center text-center py-8">
              <div className="space-y-2">
                <Package className="h-12 w-12 mx-auto text-muted-foreground" />
                <h3 className="text-lg font-medium">Selecciona Filtros</h3>
                <p className="text-sm text-muted-foreground">
                  Para ver el análisis de métricas, selecciona un producto y un cliente. La ubicación es opcional.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Function to fetch metrics data from database using the view
  const fetchMetricsData = async () => {
    try {
      setLoading(true);
      
      // Build query using the view that combines both tables
      let query = (supabase as any)
        .schema('m8_schema')
        .from('v_forecast_interpretability')
        .select('*')
        .order('created_at', { ascending: false });

      // Apply product filter (required)
      if (selectedProductId) {
        query = query.eq('product_id', selectedProductId);
      }
      
      // Apply location filter if selected
      if (selectedLocationId) {
        const actualLocationId = getLocationId(selectedLocationId);
        if (actualLocationId) {
          query = query.eq('location_code', actualLocationId);
        }
      }

      // Apply customer filter if selected
      if (selectedCustomerId) {
        const actualCustomerId = getCustomerId(selectedCustomerId);
        if (actualCustomerId) {
          query = query.eq('customer_code', actualCustomerId);
        }
      }

      console.log('query', query);

      // Execute query
      const { data: viewData, error: viewError } = await query.limit(1);

     
      // Handle query error
      if (viewError) {
        console.error('Error fetching forecast interpretability view:', viewError);
        throw viewError;
      }

      // Get the first result from the view
      const viewResult = viewData?.[0];

      // Set data if view returns results
      if (viewResult) {
        const combinedData: MetricsData = {
          forecast_accuracy: 100 - viewResult.mape,
          model_confidence: viewResult.interpretability_score,
          forecast_bias: viewResult.forecast_bias,
          uncertainty_quality: viewResult.uncertainty_quality_score,
          mae: viewResult.mae,
          rmse: viewResult.rmse,
          smape: viewResult.smape,
          model_name: viewResult.model_name,
          interpretability_score: viewResult.interpretability_score,
          model_complexity: viewResult.model_complexity,
          confidence_level: viewResult.confidence_level,
          forecast_explanation: viewResult.forecast_explanation,
          primary_drivers: viewResult.primary_drivers,
          risk_factors: viewResult.risk_factors,
          recommended_actions: viewResult.recommended_actions,
          data_pattern_type: viewResult.data_pattern_type,
          zero_frequency: viewResult.zero_frequency,
          volatility_coefficient: viewResult.volatility_coefficient,
          seasonality_strength: viewResult.seasonality_strength,
          inventory_recommendations: String(viewResult.inventory_recommendations),
        };

        setMetricsData(combinedData);
      } else {
        // No data found - show no data message
        setMetricsData(null);
      }
 
    } catch (error) {
      console.error('Error fetching metrics data:', error);
      setMetricsData(null);
    } finally {
      setLoading(false);
    }
  };

  // Helper function to get status icon based on value and threshold
  const getStatusIcon = (value: number, threshold: number = 70) => {
    return value >= threshold ? 
      <TrendingUp className="h-4 w-4 text-emerald-600" /> : 
      <TrendingDown className="h-4 w-4 text-red-500" />;
  };

  // Helper function to get status color based on value and threshold
  const getStatusColor = (value: number, threshold: number = 70) => {
    return value >= threshold ? 'text-emerald-600' : 'text-red-500';
  };

  // Helper function to get performance badge variant
  const getPerformanceBadge = (value: number) => {
    if (value >= 85) return { variant: "default" as const, className: "bg-emerald-100 text-emerald-800 border-emerald-200" };
    if (value >= 70) return { variant: "secondary" as const, className: "bg-blue-100 text-blue-800 border-blue-200" };
    if (value >= 50) return { variant: "outline" as const, className: "bg-yellow-100 text-yellow-800 border-yellow-200" };
    return { variant: "destructive" as const, className: "bg-red-100 text-red-800 border-red-200" };
  };

  // Helper function to get trend indicator
  const getTrendIndicator = (value: number, previousValue: number = 0) => {
    const change = value - previousValue;
    if (change > 0) return { icon: ArrowUp, color: "text-emerald-600", bg: "bg-emerald-50" };
    if (change < 0) return { icon: ArrowDown, color: "text-red-600", bg: "bg-red-50" };
    return { icon: Minus, color: "text-gray-600", bg: "bg-gray-50" };
  };

  // Mock data for trends (in real app, this would come from API)
  const mockTrends = {
    forecast_accuracy: 2.3,
    model_confidence: -1.2,
    forecast_bias: 0.1,
    uncertainty_quality: 3.5
  };

  // Quick actions
  const handleRefresh = () => {
    if (selectedProductId && selectedLocationId) {
      fetchMetricsData();
    }
  };

  const handleExport = () => {
    console.log('Exporting metrics data...');
  };

  const handleShare = () => {
    console.log('Sharing metrics dashboard...');
  };

  // Loading state
  if (loading) {
    return <div className="flex items-center justify-center p-8">Cargando métricas...</div>;
  }

  // No data state - show message when no metrics are found for selected filters
  if (!metricsData) {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-center text-center py-8">
              <div className="space-y-2">
                <BadgeAlert className="h-12 w-12 mx-auto text-[#ff5252]" />
                <h3 className="text-lg font-medium">No hay datos disponibles</h3>
                <p className="text-sm text-muted-foreground">
                  No se encontraron métricas para el producto seleccionado
                  {selectedLocationId && ` en la ubicación ${selectedLocationId}`}
                  {selectedCustomerId && ` para el cliente ${selectedCustomerId}`}.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Dashboard de Métricas</h2>
          <p className="text-sm text-gray-600 mt-1">
            Análisis de rendimiento y calidad del modelo de pronóstico
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
            <Activity className="h-3 w-3 mr-1" />
            Tiempo Real
          </Badge>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={handleRefresh} className="h-8">
              <RefreshCw className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="sm" onClick={handleExport} className="h-8">
              <Download className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="sm" onClick={handleShare} className="h-8">
              <Share2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Summary Section */}
      <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
        <CardContent className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center">
              <div className="text-3xl font-bold text-blue-900">
                {metricsData?.forecast_accuracy?.toFixed(1) || '0.0'}%
              </div>
              <div className="text-sm text-blue-700">Precisión General</div>
              <div className="flex items-center justify-center gap-1 mt-1">
                {(() => {
                  const trend = getTrendIndicator(mockTrends.forecast_accuracy);
                  const TrendIcon = trend.icon;
                  return (
                    <>
                      <TrendIcon className={`h-3 w-3 ${trend.color}`} />
                      <span className={`text-xs ${trend.color}`}>
                        {mockTrends.forecast_accuracy > 0 ? '+' : ''}{mockTrends.forecast_accuracy}%
                      </span>
                    </>
                  );
                })()}
              </div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-emerald-900">
                {(metricsData?.model_confidence || 0).toFixed(0)}%
              </div>
              <div className="text-sm text-emerald-700">Confianza del Modelo</div>
              <div className="flex items-center justify-center gap-1 mt-1">
                {(() => {
                  const trend = getTrendIndicator(mockTrends.model_confidence);
                  const TrendIcon = trend.icon;
                  return (
                    <>
                      <TrendIcon className={`h-3 w-3 ${trend.color}`} />
                      <span className={`text-xs ${trend.color}`}>
                        {mockTrends.model_confidence > 0 ? '+' : ''}{mockTrends.model_confidence}%
                      </span>
                    </>
                  );
                })()}
              </div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-purple-900">
                {metricsData?.model_name || 'N/A'}
              </div>
              <div className="text-sm text-purple-700">Modelo Activo</div>
              <Badge variant="outline" className="mt-1 bg-purple-100 text-purple-800 border-purple-200">
                {metricsData?.confidence_level || 'N/A'}
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="border-l-4 border-l-emerald-500 hover:shadow-md transition-shadow">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Target className="h-5 w-5 text-emerald-600" />
                  <p className="text-sm font-medium text-gray-600">Precisión del Pronóstico</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`text-3xl font-bold ${getStatusColor(metricsData?.forecast_accuracy || 0)}`}>
                    {metricsData?.forecast_accuracy?.toFixed(1) || '0.0'}%
                  </span>
                  {getStatusIcon(metricsData?.forecast_accuracy || 0)}
                </div>
                <div className="flex items-center gap-2">
                  <p className="text-xs text-gray-500">MAPE promedio</p>
                  {(() => {
                    const trend = getTrendIndicator(mockTrends.forecast_accuracy);
                    const TrendIcon = trend.icon;
                    return (
                      <div className={`flex items-center gap-1 px-2 py-1 rounded-full ${trend.bg}`}>
                        <TrendIcon className={`h-3 w-3 ${trend.color}`} />
                        <span className={`text-xs ${trend.color}`}>
                          {mockTrends.forecast_accuracy > 0 ? '+' : ''}{mockTrends.forecast_accuracy}%
                        </span>
                      </div>
                    );
                  })()}
                </div>
              </div>
              {/* Mini Chart */}
              <div className="w-16 h-12 bg-emerald-50 rounded-lg p-2">
                <div className="w-full h-full flex items-end gap-1">
                  {[0.6, 0.8, 0.7, 0.9, 0.85].map((height, i) => (
                    <div
                      key={i}
                      className="bg-emerald-500 rounded-sm flex-1"
                      style={{ height: `${height * 100}%` }}
                    />
                  ))}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-blue-500 hover:shadow-md transition-shadow">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Brain className="h-5 w-5 text-blue-600" />
                  <p className="text-sm font-medium text-gray-600">Confianza del Modelo</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`text-3xl font-bold ${getStatusColor(metricsData?.model_confidence || 0)}`}>
                    {(metricsData?.model_confidence || 0).toFixed(0)}%
                  </span>
                  {getStatusIcon(metricsData?.model_confidence || 0)}
                </div>
                <div className="flex items-center gap-2">
                  <p className="text-xs text-gray-500">Score de interpretabilidad</p>
                  {(() => {
                    const trend = getTrendIndicator(mockTrends.model_confidence);
                    const TrendIcon = trend.icon;
                    return (
                      <div className={`flex items-center gap-1 px-2 py-1 rounded-full ${trend.bg}`}>
                        <TrendIcon className={`h-3 w-3 ${trend.color}`} />
                        <span className={`text-xs ${trend.color}`}>
                          {mockTrends.model_confidence > 0 ? '+' : ''}{mockTrends.model_confidence}%
                        </span>
                      </div>
                    );
                  })()}
                </div>
              </div>
              {/* Mini Chart */}
              <div className="w-16 h-12 bg-blue-50 rounded-lg p-2">
                <div className="w-full h-full flex items-end gap-1">
                  {[0.7, 0.6, 0.8, 0.75, 0.9].map((height, i) => (
                    <div
                      key={i}
                      className="bg-blue-500 rounded-sm flex-1"
                      style={{ height: `${height * 100}%` }}
                    />
                  ))}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-orange-500 hover:shadow-md transition-shadow">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-orange-600" />
                  <p className="text-sm font-medium text-gray-600">Sesgo del Pronóstico</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`text-3xl font-bold ${Math.abs(metricsData?.forecast_bias || 0) < 0.1 ? 'text-emerald-600' : 'text-red-500'}`}>
                    {metricsData?.forecast_bias?.toFixed(2) || '0.00'}
                  </span>
                  {Math.abs(metricsData?.forecast_bias || 0) < 0.1 ? 
                    <CheckCircle className="h-4 w-4 text-emerald-600" /> : 
                    <AlertTriangle className="h-4 w-4 text-red-500" />
                  }
                </div>
                <div className="flex items-center gap-2">
                  <p className="text-xs text-gray-500">Tendencia de sobre/sub estimación</p>
                  {(() => {
                    const trend = getTrendIndicator(mockTrends.forecast_bias);
                    const TrendIcon = trend.icon;
                    return (
                      <div className={`flex items-center gap-1 px-2 py-1 rounded-full ${trend.bg}`}>
                        <TrendIcon className={`h-3 w-3 ${trend.color}`} />
                        <span className={`text-xs ${trend.color}`}>
                          {mockTrends.forecast_bias > 0 ? '+' : ''}{mockTrends.forecast_bias}
                        </span>
                      </div>
                    );
                  })()}
                </div>
              </div>
              {/* Mini Chart */}
              <div className="w-16 h-12 bg-orange-50 rounded-lg p-2">
                <div className="w-full h-full flex items-end gap-1">
                  {[0.3, 0.5, 0.4, 0.6, 0.2].map((height, i) => (
                    <div
                      key={i}
                      className="bg-orange-500 rounded-sm flex-1"
                      style={{ height: `${height * 100}%` }}
                    />
                  ))}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-purple-500 hover:shadow-md transition-shadow">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Shield className="h-5 w-5 text-purple-600" />
                  <p className="text-sm font-medium text-gray-600">Calidad de Incertidumbre</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`text-3xl font-bold ${getStatusColor((metricsData?.uncertainty_quality || 0) * 100)}`}>
                    {((metricsData?.uncertainty_quality || 0) * 100).toFixed(0)}%
                  </span>
                  {getStatusIcon((metricsData?.uncertainty_quality || 0) * 100)}
                </div>
                <div className="flex items-center gap-2">
                  <p className="text-xs text-gray-500">Confiabilidad de intervalos</p>
                  {(() => {
                    const trend = getTrendIndicator(mockTrends.uncertainty_quality);
                    const TrendIcon = trend.icon;
                    return (
                      <div className={`flex items-center gap-1 px-2 py-1 rounded-full ${trend.bg}`}>
                        <TrendIcon className={`h-3 w-3 ${trend.color}`} />
                        <span className={`text-xs ${trend.color}`}>
                          {mockTrends.uncertainty_quality > 0 ? '+' : ''}{mockTrends.uncertainty_quality}%
                        </span>
                      </div>
                    );
                  })()}
                </div>
              </div>
              {/* Mini Chart */}
              <div className="w-16 h-12 bg-purple-50 rounded-lg p-2">
                <div className="w-full h-full flex items-end gap-1">
                  {[0.8, 0.9, 0.85, 0.95, 0.88].map((height, i) => (
                    <div
                      key={i}
                      className="bg-purple-500 rounded-sm flex-1"
                      style={{ height: `${height * 100}%` }}
                    />
                  ))}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Model Performance */}
        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50 border-b">
            <CardTitle className="flex items-center gap-2 text-blue-900">
              <BarChart3 className="h-5 w-5" />
              Rendimiento del Modelo
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6 space-y-6">
            <div className="space-y-4">
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium text-gray-700">MAE (Error Absoluto Medio)</span>
                  <span className="font-bold text-lg text-gray-900">{metricsData?.mae?.toFixed(2) || '0.00'}</span>
                </div>
                <Progress value={Math.min(100 - (metricsData?.mae || 0) * 10, 100)} className="h-3 bg-gray-100">
                  <div className="h-full bg-gradient-to-r from-blue-500 to-blue-600 transition-all rounded-full" 
                       style={{ width: `${Math.min(100 - (metricsData?.mae || 0) * 10, 100)}%` }} />
                </Progress>
              </div>
              
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium text-gray-700">RMSE (Error Cuadrático Medio)</span>
                  <span className="font-bold text-lg text-gray-900">{metricsData?.rmse?.toFixed(2) || '0.00'}</span>
                </div>
                <Progress value={Math.min(100 - (metricsData?.rmse || 0) * 5, 100)} className="h-3 bg-gray-100">
                  <div className="h-full bg-gradient-to-r from-indigo-500 to-indigo-600 transition-all rounded-full" 
                       style={{ width: `${Math.min(100 - (metricsData?.rmse || 0) * 5, 100)}%` }} />
                </Progress>
              </div>
              
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium text-gray-700">SMAPE (Error Porcentual Simétrico)</span>
                  <span className="font-bold text-lg text-gray-900">{metricsData?.smape?.toFixed(2) || '0.00'}</span>
                </div>
                <Progress value={Math.min(100 - (metricsData?.smape || 0), 100)} className="h-3 bg-gray-100">
                  <div className="h-full bg-gradient-to-r from-purple-500 to-purple-600 transition-all rounded-full" 
                       style={{ width: `${Math.min(100 - (metricsData?.smape || 0), 100)}%` }} />
                </Progress>
              </div>
            </div>
            
            <div className="pt-4 border-t border-gray-100">
              <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200">
                <CheckCircle className="h-3 w-3 mr-1" />
                Aceptable para el negocio
              </Badge>
            </div>
          </CardContent>
        </Card>

        {/* Data Characteristics */}
        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader className="bg-gradient-to-r from-emerald-50 to-teal-50 border-b">
            <CardTitle className="flex items-center gap-2 text-emerald-900">
              <Activity className="h-5 w-5" />
              Características de los Datos
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6 space-y-6">
            <div className="space-y-4">
              <div>
                <div className="flex justify-between items-center mb-3">
                  <span className="text-sm font-medium text-gray-700">Patrón de Datos</span>
                  <span className="text-xs text-gray-500">Clasificación</span>
                </div>
                <Badge variant="outline" className="bg-emerald-100 text-emerald-800 border-emerald-300">
                  {metricsData?.data_pattern_type || 'N/A'}
                </Badge>
              </div>
              
              <div className="space-y-4">
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium text-gray-700">Frecuencia de Ceros</span>
                    <span className="font-bold text-lg text-gray-900">{((metricsData?.zero_frequency || 0) * 100).toFixed(2)}%</span>
                  </div>
                  <Progress value={(metricsData?.zero_frequency || 0) * 100} className="h-3 bg-gray-100">
                    <div className="h-full bg-gradient-to-r from-emerald-500 to-emerald-600 transition-all rounded-full" 
                         style={{ width: `${(metricsData?.zero_frequency || 0) * 100}%` }} />
                  </Progress>
                </div>
                
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium text-gray-700">Volatilidad</span>
                    <span className="font-bold text-lg text-gray-900">{((metricsData?.volatility_coefficient || 0) * 100).toFixed(2)}%</span>
                  </div>
                  <Progress value={(metricsData?.volatility_coefficient || 0) * 100} className="h-3 bg-gray-100">
                    <div className="h-full bg-gradient-to-r from-orange-500 to-orange-600 transition-all rounded-full" 
                         style={{ width: `${(metricsData?.volatility_coefficient || 0) * 100}%` }} />
                  </Progress>
                </div>
                
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium text-gray-700">Estacionalidad</span>
                    <span className="font-bold text-lg text-gray-900">{((metricsData?.seasonality_strength || 0) * 100).toFixed(2)}%</span>
                  </div>
                  <Progress value={(metricsData?.seasonality_strength || 0) * 100} className="h-3 bg-gray-100">
                    <div className="h-full bg-gradient-to-r from-teal-500 to-teal-600 transition-all rounded-full" 
                         style={{ width: `${(metricsData?.seasonality_strength || 0) * 100}%` }} />
                  </Progress>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium text-gray-700">Clima</span>
                    <span className="font-bold text-lg text-gray-900">{(.25 * 100).toFixed(2)}%</span>
                  </div>
                  <Progress value={.25 * 100} className="h-3 bg-gray-100">
                    <div className="h-full bg-gradient-to-r from-cyan-500 to-cyan-600 transition-all rounded-full" 
                         style={{ width: `${.25 * 100}%` }} />
                  </Progress>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Model Insights */}
        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader className="bg-gradient-to-r from-orange-50 to-amber-50 border-b">
            <CardTitle className="flex items-center gap-2 text-orange-900">
              <Brain className="h-5 w-5" />
              Insights del Modelo
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6 space-y-6">
            <div className="space-y-4">
              <div>
                <div className="flex justify-between items-center mb-3">
                  <span className="text-sm font-medium text-gray-700">Modelo Utilizado</span>
                </div>
                <Badge variant="secondary" className="bg-orange-100 text-orange-800 border-orange-200">
                  {metricsData?.model_name || 'N/A'}
                </Badge>
              </div>
              
              <div>
                <span className="text-sm font-medium text-gray-700">Complejidad</span>
                <p className="text-sm mt-1 text-gray-600">{metricsData?.model_complexity || 'N/A'}</p>
              </div>
              
              <div>
                <span className="text-sm font-medium text-gray-700">Nivel de Confianza</span>
                <Badge variant="outline" className="ml-2 bg-amber-50 text-amber-700 border-amber-200">
                  {metricsData?.confidence_level || 'N/A'}
                </Badge>
              </div>
              
              <div>
                <span className="text-sm font-medium text-gray-700">Explicación del Pronóstico</span>
                <p className="text-sm mt-2 text-gray-600 leading-relaxed">
                  {metricsData?.forecast_explanation || 'No hay explicación disponible'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Recommendations */}
        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader className="bg-gradient-to-r from-purple-50 to-pink-50 border-b">
            <CardTitle className="flex items-center gap-2 text-purple-900">
              <CheckCircle className="h-5 w-5" />
              Recomendaciones
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6 space-y-6">
            <div className="space-y-4">
              <div>
                <span className="text-sm font-medium text-gray-700">Factores Principales</span>
                <div className="flex flex-wrap gap-2 mt-3">
                  {(metricsData?.primary_drivers || []).map((driver, index) => (
                    <Badge key={index} variant="outline" className="text-xs bg-blue-50 text-blue-700 border-blue-200">
                      {driver}
                    </Badge>
                  ))}
                  {(!metricsData?.primary_drivers || metricsData.primary_drivers.length === 0) && (
                    <span className="text-xs text-gray-500">No hay factores principales disponibles</span>
                  )}
                </div>
              </div>
              
              <div>
                <span className="text-sm font-medium text-gray-700">Factores de Riesgo</span>
                <div className="flex flex-wrap gap-2 mt-3">
                  {(metricsData?.risk_factors || []).map((risk, index) => (
                    <Badge key={index} variant="destructive" className="text-xs bg-red-100 text-red-800 border-red-200">
                      {risk}
                    </Badge>
                  ))}
                  {(!metricsData?.risk_factors || metricsData.risk_factors.length === 0) && (
                    <span className="text-xs text-gray-500">No hay factores de riesgo identificados</span>
                  )}
                </div>
              </div>
              
              <div>
                <span className="text-sm font-medium text-gray-700">Recomendación de Inventario</span>
                <p className="text-sm mt-2 text-gray-600 leading-relaxed">
                 {metricsData?.inventory_recommendations || 'No hay recomendaciones de inventario disponibles'}
                </p>
              </div>
              
              <div>
                <span className="text-sm font-medium text-gray-700">Acciones Recomendadas</span>
                <div className="space-y-3 mt-3">
                  {(metricsData?.recommended_actions || []).map((action, index) => (
                    <div key={index} className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                      <CheckCircle className="h-4 w-4 text-emerald-600 mt-0.5 flex-shrink-0" />
                      <span className="text-sm text-gray-700">{action}</span>
                    </div>
                  ))}
                  {(!metricsData?.recommended_actions || metricsData.recommended_actions.length === 0) && (
                    <span className="text-xs text-gray-500">No hay acciones recomendadas disponibles</span>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
