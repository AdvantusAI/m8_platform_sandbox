import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";
import { TrendingUp, TrendingDown, BarChart3, AlertTriangle, CheckCircle, Package, BadgeAlert } from "lucide-react";
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
  
  // Effect to fetch metrics data when filters change
  useEffect(() => {
    if (selectedProductId) {
      fetchMetricsData();
    } else {
      setLoading(false);
      setMetricsData(null);
    }
  }, [selectedProductId, selectedLocationId, selectedCustomerId]);

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

  // Function to fetch metrics data from database
  const fetchMetricsData = async () => {
    try {
      setLoading(true);
      
      // Build query for forecast error metricsW
      let errorMetricsQuery = (supabase as any)
        .schema('m8_schema')
        .from('forecast_error_metrics')
        .select('*')
        .order('created_at', { ascending: false });
      
      // Build query for forecast interpretability data
      let interpretabilityQuery = (supabase as any)
       .schema('m8_schema')
        .from('forecast_interpretability')
        .select('*')
        .order('created_at', { ascending: false });

      // Apply product filter (required)
      if (selectedProductId) {
        errorMetricsQuery = errorMetricsQuery.eq('product_id', selectedProductId);
        interpretabilityQuery = interpretabilityQuery.eq('product_id', selectedProductId);
      }
      
      // Apply location filter if selected
      if (selectedLocationId) {
        const actualLocationId = getLocationId(selectedLocationId);
        if (actualLocationId) {
          errorMetricsQuery = errorMetricsQuery.eq('location_node_id', actualLocationId);
          interpretabilityQuery = interpretabilityQuery.eq('location_node_id', actualLocationId);
        }
      }

      // Apply customer filter if selected
      if (selectedCustomerId) {
        const actualCustomerId = getCustomerId(selectedCustomerId);
        if (actualCustomerId) {
          errorMetricsQuery = errorMetricsQuery.eq('customer_node_id', actualCustomerId);
          interpretabilityQuery = interpretabilityQuery.eq('customer_node_id', actualCustomerId);
        }
      }

      // Execute queries
      const { data: errorMetricsData, error: errorMetricsError } = await errorMetricsQuery.limit(1);
      const { data: interpretabilityDataArray, error: interpretabilityError } = await interpretabilityQuery.limit(1);

      // Handle query errors
      if (errorMetricsError) {
        console.error('Error fetching error metrics:', errorMetricsError);
        throw errorMetricsError;
      }
      if (interpretabilityError) {
        console.error('Error fetching interpretability data:', interpretabilityError);
        throw interpretabilityError;
      }

      // Get the first result from each query
      const errorMetrics = errorMetricsData?.[0];
      const interpretabilityData = interpretabilityDataArray?.[0];

      // Only set data if both queries return results
      if (errorMetrics && interpretabilityData) {
        const combinedData: MetricsData = {
          forecast_accuracy: 100 - errorMetrics.mape,
          model_confidence: interpretabilityData.interpretability_score,
          forecast_bias: errorMetrics.forecast_bias,
          uncertainty_quality: errorMetrics.uncertainty_quality_score,
          mae: errorMetrics.mae,
          rmse: errorMetrics.rmse,
          smape: errorMetrics.smape,
          model_name: interpretabilityData.model_name,
          interpretability_score: interpretabilityData.interpretability_score,
          model_complexity: interpretabilityData.model_complexity,
          confidence_level: interpretabilityData.confidence_level,
          forecast_explanation: interpretabilityData.forecast_explanation,
          primary_drivers: interpretabilityData.primary_drivers,
          risk_factors: interpretabilityData.risk_factors,
          recommended_actions: interpretabilityData.recommended_actions,
          data_pattern_type: interpretabilityData.data_pattern_type,
          zero_frequency: errorMetrics.zero_frequency,
          volatility_coefficient: errorMetrics.volatility_coefficient,
          seasonality_strength: errorMetrics.seasonality_strength,
          inventory_recommendations: String(interpretabilityData.inventory_recommendations),
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
      <TrendingUp className="h-4 w-4 text-custom-slate" /> : 
      <TrendingDown className="h-4 w-4 text-red-500" />;
  };

  // Helper function to get status color based on value and threshold
  const getStatusColor = (value: number, threshold: number = 70) => {
    return value >= threshold ? 'text-custom-slate' : 'text-red-500';
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
      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Precisión del Pronóstico</p>
                <div className="flex items-center gap-2">
                  <span className={`text-2xl font-bold ${getStatusColor(metricsData.forecast_accuracy)}`}>
                    {metricsData.forecast_accuracy.toFixed(1)}%
                  </span>
                  {getStatusIcon(metricsData.forecast_accuracy)}
                </div>
                <p className="text-xs text-muted-foreground">MAPE promedio</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Confianza del Modelo</p>
                <div className="flex items-center gap-2">
                  <span className={`text-2xl font-bold ${getStatusColor(metricsData.model_confidence)}`}>
                    {(metricsData.model_confidence).toFixed(0)}%
                  </span>
                  {getStatusIcon(metricsData.model_confidence)}
                </div>
                <p className="text-xs text-muted-foreground">Score de interpretabilidad</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Sesgo del Pronóstico</p>
                <div className="flex items-center gap-2">
                  <span className={`text-2xl font-bold ${Math.abs(metricsData.forecast_bias) < 0.1 ? 'text-custom-slate' : 'text-red-500'}`}>
                    {metricsData.forecast_bias.toFixed(2)}
                  </span>
                  {Math.abs(metricsData.forecast_bias) < 0.1 ? 
                    <CheckCircle className="h-4 w-4 text-custom-slate" /> : 
                    <AlertTriangle className="h-4 w-4 text-red-500" />
                  }
                </div>
                <p className="text-xs text-muted-foreground">Tendencia de sobre/sub estimación</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Calidad de Incertidumbre</p>
                <div className="flex items-center gap-2">
                  <span className={`text-2xl font-bold ${getStatusColor(metricsData.uncertainty_quality * 100)}`}>
                    {(metricsData.uncertainty_quality * 100).toFixed(0)}%
                  </span>
                  {getStatusIcon(metricsData.uncertainty_quality * 100)}
                </div>
                <p className="text-xs text-muted-foreground">Confiabilidad de intervalos</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Model Performance */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Rendimiento del Modelo
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm">MAE (Error Absoluto Medio)</span>
                <span className="font-semibold">{metricsData.mae.toFixed(2)}</span>
              </div>
              <Progress value={Math.min(100 - metricsData.mae * 10, 100)} className="h-2 bg-slate-200">
                <div className="h-full bg-gradient-to-r from-custom-slate-600 to-custom-slate-800 transition-all" 
                     style={{ width: `${Math.min(100 - metricsData.mae * 10, 100)}%` }} />
              </Progress>
              
              <div className="flex justify-between items-center">
                <span className="text-sm">RMSE (Error Cuadrático Medio)</span>
                <span className="font-semibold">{metricsData.rmse.toFixed(2)}</span>
              </div>
              <Progress value={Math.min(100 - metricsData.rmse * 5, 100)} className="h-2 bg-slate-200">
                <div className="h-full bg-gradient-to-r from-custom-slate-600 to-custom-slate-800 transition-all" 
                     style={{ width: `${Math.min(100 - metricsData.rmse * 5, 100)}%` }} />
              </Progress>
              
              <div className="flex justify-between items-center">
                <span className="text-sm">SMAPE (Error Porcentual Simétrico)</span>
                <span className="font-semibold">{metricsData.smape.toFixed(2)}</span>
              </div>
              <Progress value={Math.min(100 - metricsData.smape, 100)} className="h-2 bg-slate-200">
                <div className="h-full bg-gradient-to-r from-custom-slate-600 to-custom-slate-800 transition-all" 
                     style={{ width: `${Math.min(100 - metricsData.smape, 100)}%` }} />
              </Progress>
            </div>
            
            <div className="pt-3 border-t">
              <Badge variant="outline" className="bg-custom-slate-50 text-custom-slate-700 border-custom-slate-200">
                Aceptable para el negocio
              </Badge>
            </div>
          </CardContent>
        </Card>

        {/* Data Characteristics */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Características de los Datos
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm">Patrón de Datos</span>
                <span className="font-semibold">Clasificación</span>
              </div>
              
              <Badge variant="outline" className="mt-2 bg-slate-100 text-slate-700">{metricsData.data_pattern_type}</Badge>
            </div>
            
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm">Frecuencia de Ceros</span>
                <span className="font-semibold">{(metricsData.zero_frequency * 100).toFixed(2)}%</span>
              </div>
              <Progress value={metricsData.zero_frequency * 100} className="h-2 bg-custom-slate-100">
                <div className="h-full bg-gradient-to-r from-custom-slate-500 to-custom-slate-700 transition-all" 
                     style={{ width: `${metricsData.zero_frequency * 100}%` }} />
              </Progress>
              
              <div className="flex justify-between items-center">
                <span className="text-sm">Volatilidad</span>
                <span className="font-semibold">{(metricsData.volatility_coefficient * 100).toFixed(2)}%</span>
              </div>
              <Progress value={metricsData.volatility_coefficient * 100} className="h-2 bg-custom-slate-100">
                <div className="h-full bg-gradient-to-r from-custom-slate-500 to-custom-slate-700 transition-all" 
                     style={{ width: `${metricsData.volatility_coefficient * 100}%` }} />
              </Progress>
              
              <div className="flex justify-between items-center">
                <span className="text-sm">Estacionalidad</span>
                <span className="font-semibold">{(metricsData.seasonality_strength * 100).toFixed(2)}%</span>
              </div>
              <Progress value={metricsData.seasonality_strength * 100} className="h-2 bg-custom-slate-100">
                <div className="h-full bg-gradient-to-r from-custom-slate-500 to-custom-slate-700 transition-all" 
                     style={{ width: `${metricsData.seasonality_strength * 100}%` }} />
              </Progress>

              <div className="flex justify-between items-center">
                <span className="text-sm">Clima</span>
                <span className="font-semibold">{(.25 * 100).toFixed(2)}%</span>
              </div>
              <Progress value={.25 * 100} className="h-2 bg-custom-slate-100">
                <div className="h-full bg-gradient-to-r from-custom-slate-500 to-custom-slate-700 transition-all" 
                     style={{ width: `${.25 * 100}%` }} />
              </Progress>

            </div>
          </CardContent>
        </Card>

        {/* Model Insights */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" />
              Insights del Modelo
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-medium">Modelo Utilizado</span>
              </div>
              <Badge variant="secondary" className="bg-slate-100 text-slate-800">{metricsData.model_name}</Badge>
            </div>
            
            <div>
              <span className="text-sm font-medium">Complejidad</span>
              <p className="text-sm mt-1">{metricsData.model_complexity}</p>
            </div>
            
            <div>
              <span className="text-sm font-medium">Nivel de Confianza</span>
              <Badge variant="outline" className="ml-2 bg-custom-slate-50 text-custom-slate-700 border-custom-slate-200">
                {metricsData.confidence_level}
              </Badge>
            </div>
            
            <div>
              <span className="text-sm font-medium">Explicación del Pronóstico</span>
              <p className="text-sm mt-1 text-muted-foreground">
                {metricsData.forecast_explanation}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Recommendations */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5" />
              Recomendaciones
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <span className="text-sm font-medium">Factores Principales</span>
              <div className="flex flex-wrap gap-2 mt-2">
                {metricsData.primary_drivers.map((driver, index) => (
                  <Badge key={index} variant="outline" className="text-xs bg-custom-slate-50 text-custom-slate-700 border-custom-slate-200">
                    {driver}
                  </Badge>
                ))}
              </div>
            </div>
            
            <div>
              <span className="text-sm font-medium">Factores de Riesgo</span>
              <div className="flex flex-wrap gap-2 mt-2">
                {metricsData.risk_factors.map((risk, index) => (
                  <Badge key={index} variant="destructive" className="text-xs">
                    {risk}
                  </Badge>
                ))}
              </div>
            </div>
            
            <div>
              <span className="text-sm font-medium">Recomendación de Inventario</span>
              <p className="text-sm mt-1 text-muted-foreground">
               { metricsData.inventory_recommendations }
              </p>
            </div>
            
            <div>
              <span className="text-sm font-medium">Acciones Recomendadas</span>
              <div className="space-y-2 mt-2">
                {metricsData.recommended_actions.map((action, index) => (
                  <div key={index} className="flex items-start gap-2">
                    <CheckCircle className="h-4 w-4 text-custom-slate mt-0.5" />
                    <span className="text-sm">{action}</span>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
