import React, { useMemo, useState, useEffect } from 'react';
import Highcharts from 'highcharts';
import HighchartsReact from 'highcharts-react-official';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  BarChart3, 
  TrendingUp, 
  TrendingDown, 
  Target,
  Info,
  Filter,
  Calendar,
  Package
} from 'lucide-react';

// Import Highcharts modules
import HighchartsMore from 'highcharts/highcharts-more';

// Initialize Highcharts modules
try {
  (HighchartsMore as any)(Highcharts);
} catch (error) {
  console.warn('Highcharts More module could not be loaded:', error);
}

interface ForecastActualData {
  product_id: string;
  product_name: string;
  category_name?: string;
  forecast_value: number;
  actual_value: number;
  variance: number;
  variance_percentage: number;
  period: string;
  forecast_accuracy: number;
  bias: number; // Positive = over-forecast, Negative = under-forecast
}

interface DumbbellChartProps {
  products: Array<{
    product_id: string;
    product_name: string;
    category_name?: string;
    accuracy_score: number;
    forecast_count: number;
    avg_error_percentage: number;
  }>;
  title?: string;
}

interface DumbbellDataPoint {
  name: string;
  productId: string;
  category: string;
  forecast: number;
  actual: number;
  variance: number;
  variancePercentage: number;
  accuracy: number;
  bias: number;
  color: string;
}

export default function DumbbellChart({ 
  products, 
  title = "Pronóstico vs Real por SKU" 
}: DumbbellChartProps) {
  const [timePeriod, setTimePeriod] = useState<'lastweek' | 'lastmonth' | 'lastquarter'>('lastmonth');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'variance' | 'accuracy' | 'bias'>('variance');
  const [dumbbellData, setDumbbellData] = useState<ForecastActualData[]>([]);
  const [loading, setLoading] = useState(false);
  const [columnRangeAvailable, setColumnRangeAvailable] = useState(true);

  // Check if columnrange module is available
  useEffect(() => {
    try {
      // Test if columnrange series type is available
      if (!(Highcharts as any).seriesTypes?.columnrange) {
        setColumnRangeAvailable(false);
        console.warn('Columnrange module not available, falling back to column chart');
      }
    } catch (error) {
      setColumnRangeAvailable(false);
      console.warn('Error checking columnrange availability:', error);
    }
  }, []);

  // Get unique categories
  const categories = useMemo(() => {
    const uniqueCategories = [...new Set(products.map(p => p.category_name || 'Sin categoría'))];
    return uniqueCategories;
  }, [products]);

  // Generate mock forecast vs actual data
  const generateMockData = useMemo(() => {
    const data: ForecastActualData[] = [];
    
    // Filter products by category if selected
    const filteredProducts = selectedCategory === 'all' 
      ? products 
      : products.filter(p => (p.category_name || 'Sin categoría') === selectedCategory);

    // Take top 25 products for better visualization
    const topProducts = filteredProducts
      .sort((a, b) => b.forecast_count - a.forecast_count)
      .slice(0, 25);

    topProducts.forEach((product) => {
      // Generate realistic forecast and actual values
      const baseDemand = 50 + Math.random() * 200; // Base demand between 50-250
      
      // Generate forecast with some bias
      const forecastBias = (Math.random() - 0.5) * 0.4; // ±20% bias
      const forecastValue = baseDemand * (1 + forecastBias);
      
      // Generate actual with some variation from forecast
      const actualVariation = (Math.random() - 0.5) * 0.3; // ±15% variation
      const actualValue = forecastValue * (1 + actualVariation);
      
      // Calculate metrics
      const variance = actualValue - forecastValue;
      const variancePercentage = (variance / forecastValue) * 100;
      const accuracy = Math.max(0, Math.min(100, 100 - Math.abs(variancePercentage)));
      const bias = forecastBias * 100; // Convert to percentage
      
      // Determine period label
      const periodLabel = timePeriod === 'lastweek' ? 'Última Semana' :
                         timePeriod === 'lastmonth' ? 'Último Mes' : 'Último Trimestre';

      data.push({
        product_id: product.product_id,
        product_name: product.product_name,
        category_name: product.category_name,
        forecast_value: Math.round(forecastValue),
        actual_value: Math.round(actualValue),
        variance: Math.round(variance),
        variance_percentage: Math.round(variancePercentage * 100) / 100,
        period: periodLabel,
        forecast_accuracy: Math.round(accuracy),
        bias: Math.round(bias * 100) / 100
      });
    });

    return data;
  }, [products, timePeriod, selectedCategory]);

  useEffect(() => {
    setLoading(true);
    // Simulate data loading
    setTimeout(() => {
      setDumbbellData(generateMockData);
      setLoading(false);
    }, 500);
  }, [generateMockData]);

  const chartData = useMemo(() => {
    if (!dumbbellData.length) return { data: [], categories: [] };

    // Sort data based on selected criteria
    const sortedData = [...dumbbellData].sort((a, b) => {
      switch (sortBy) {
        case 'variance':
          return Math.abs(b.variance_percentage) - Math.abs(a.variance_percentage);
        case 'accuracy':
          return a.forecast_accuracy - b.forecast_accuracy;
        case 'bias':
          return Math.abs(b.bias) - Math.abs(a.bias);
        default:
          return 0;
      }
    });

    // Prepare data for dumbbell chart
    const data: DumbbellDataPoint[] = sortedData.map(item => {
      // Determine color based on variance
      let color = '#059669'; // Green for good accuracy
      if (Math.abs(item.variance_percentage) > 20) {
        color = '#dc2626'; // Red for high variance
      } else if (Math.abs(item.variance_percentage) > 10) {
        color = '#f59e0b'; // Yellow for medium variance
      }

      return {
        name: item.product_name.length > 25 
          ? `${item.product_name.substring(0, 25)}...` 
          : item.product_name,
        productId: item.product_id,
        category: item.category_name || 'Sin categoría',
        forecast: item.forecast_value,
        actual: item.actual_value,
        variance: item.variance,
        variancePercentage: item.variance_percentage,
        accuracy: item.forecast_accuracy,
        bias: item.bias,
        color
      };
    });

    return { data, categories: data.map(d => d.name) };
  }, [dumbbellData, sortBy]);

  const getFallbackOptions = (): Highcharts.Options => {
    const { data, categories } = chartData;

    return {
      chart: {
        type: 'column',
        backgroundColor: 'transparent',
        style: {
          fontFamily: 'Inter, system-ui, sans-serif'
        }
      },
      title: {
        text: `Pronóstico vs Real por SKU (Vista Alternativa) - ${timePeriod === 'lastweek' ? 'Última Semana' : timePeriod === 'lastmonth' ? 'Último Mes' : 'Último Trimestre'}`,
        style: {
          fontSize: '16px',
          fontWeight: '600',
          color: '#1f2937'
        }
      },
      subtitle: {
        text: `Ordenado por ${sortBy === 'variance' ? 'Varianza' : sortBy === 'accuracy' ? 'Precisión' : 'Sesgo'} - ${selectedCategory === 'all' ? 'Todas las categorías' : selectedCategory}`,
        style: {
          fontSize: '12px',
          color: '#6b7280'
        }
      },
      xAxis: {
        categories: categories,
        title: {
          text: 'SKUs',
          style: {
            fontSize: '12px',
            fontWeight: '500',
            color: '#374151'
          }
        },
        labels: {
          rotation: -45,
          style: {
            fontSize: '10px',
            color: '#6b7280'
          }
        }
      },
      yAxis: {
        title: {
          text: 'Demanda',
          style: {
            fontSize: '12px',
            fontWeight: '500',
            color: '#374151'
          }
        },
        labels: {
          style: {
            fontSize: '11px',
            color: '#6b7280'
          }
        },
        gridLineColor: '#f3f4f6'
      },
      tooltip: {
        useHTML: true,
        formatter: function() {
          const point = this as any;
          const data = point.options as any;
          
          return `
            <div style="padding: 8px; font-family: Inter, sans-serif;">
              <div style="font-weight: 600; margin-bottom: 4px; color: #1f2937;">
                ${data.name}
              </div>
              <div style="font-size: 12px; margin-bottom: 2px;">
                <span style="color: #6b7280;">SKU:</span> ${data.productId}
              </div>
              <div style="font-size: 12px; margin-bottom: 2px;">
                <span style="color: #6b7280;">Categoría:</span> ${data.category}
              </div>
              <div style="font-size: 12px; margin-bottom: 2px;">
                <span style="color: #3b82f6;">Pronóstico:</span> ${data.forecast}
              </div>
              <div style="font-size: 12px; margin-bottom: 2px;">
                <span style="color: #059669;">Real:</span> ${data.actual}
              </div>
              <div style="font-size: 12px; margin-bottom: 2px;">
                <span style="color: ${data.variance >= 0 ? '#dc2626' : '#059669'};">Varianza:</span> ${data.variance >= 0 ? '+' : ''}${data.variance} (${data.variancePercentage >= 0 ? '+' : ''}${data.variancePercentage}%)
              </div>
              <div style="font-size: 12px; margin-bottom: 2px;">
                <span style="color: #7c3aed;">Precisión:</span> ${data.accuracy}%
              </div>
              <div style="font-size: 12px; margin-bottom: 2px;">
                <span style="color: #f59e0b;">Sesgo:</span> ${data.bias >= 0 ? '+' : ''}${data.bias}%
              </div>
              <div style="font-size: 11px; margin-top: 4px; padding-top: 4px; border-top: 1px solid #e5e7eb; color: #6b7280;">
                ${data.variance > 0 ? 'Sobre-pronóstico' : data.variance < 0 ? 'Sub-pronóstico' : 'Pronóstico exacto'}
              </div>
            </div>
          `;
        }
      },
      plotOptions: {
        columnrange: {
          dataLabels: {
            enabled: false
          },
          colorByPoint: true,
          colors: chartData.data.map(d => d.color)
        }
      },
      series: [
        {
          type: 'column',
          name: 'Pronóstico',
          data: chartData.data.map(item => ({
            y: item.forecast,
            name: item.name,
            productId: item.productId,
            category: item.category,
            forecast: item.forecast,
            actual: item.actual,
            variance: item.variance,
            variancePercentage: item.variancePercentage,
            accuracy: item.accuracy,
            bias: item.bias,
            color: '#3b82f6'
          }))
        },
        {
          type: 'column',
          name: 'Real',
          data: chartData.data.map(item => ({
            y: item.actual,
            name: item.name,
            productId: item.productId,
            category: item.category,
            forecast: item.forecast,
            actual: item.actual,
            variance: item.variance,
            variancePercentage: item.variancePercentage,
            accuracy: item.accuracy,
            bias: item.bias,
            color: '#059669'
          }))
        }
      ],
      legend: {
        enabled: false
      },
      credits: {
        enabled: false
      },
      exporting: {
        enabled: true,
        buttons: {
          contextButton: {
            menuItems: ['downloadPNG', 'downloadJPEG', 'downloadPDF', 'downloadSVG']
          }
        }
      }
    };
  };

  const getDumbbellOptions = (): Highcharts.Options => {
    const { data, categories } = chartData;

    return {
      chart: {
        type: 'columnrange',
        backgroundColor: 'transparent',
        style: {
          fontFamily: 'Inter, system-ui, sans-serif'
        }
      },
      title: {
        text: `Pronóstico vs Real por SKU - ${timePeriod === 'lastweek' ? 'Última Semana' : timePeriod === 'lastmonth' ? 'Último Mes' : 'Último Trimestre'}`,
        style: {
          fontSize: '16px',
          fontWeight: '600',
          color: '#1f2937'
        }
      },
      subtitle: {
        text: `Ordenado por ${sortBy === 'variance' ? 'Varianza' : sortBy === 'accuracy' ? 'Precisión' : 'Sesgo'} - ${selectedCategory === 'all' ? 'Todas las categorías' : selectedCategory}`,
        style: {
          fontSize: '12px',
          color: '#6b7280'
        }
      },
      xAxis: {
        categories: categories,
        title: {
          text: 'SKUs',
          style: {
            fontSize: '12px',
            fontWeight: '500',
            color: '#374151'
          }
        },
        labels: {
          rotation: -45,
          style: {
            fontSize: '10px',
            color: '#6b7280'
          }
        }
      },
      yAxis: {
        title: {
          text: 'Demanda',
          style: {
            fontSize: '12px',
            fontWeight: '500',
            color: '#374151'
          }
        },
        labels: {
          style: {
            fontSize: '11px',
            color: '#6b7280'
          }
        },
        gridLineColor: '#f3f4f6'
      },
      tooltip: {
        useHTML: true,
        formatter: function() {
          const point = this as any;
          const data = point.options as any;
          
          return `
            <div style="padding: 8px; font-family: Inter, sans-serif;">
              <div style="font-weight: 600; margin-bottom: 4px; color: #1f2937;">
                ${data.name}
              </div>
              <div style="font-size: 12px; margin-bottom: 2px;">
                <span style="color: #6b7280;">SKU:</span> ${data.productId}
              </div>
              <div style="font-size: 12px; margin-bottom: 2px;">
                <span style="color: #6b7280;">Categoría:</span> ${data.category}
              </div>
              <div style="font-size: 12px; margin-bottom: 2px;">
                <span style="color: #3b82f6;">Pronóstico:</span> ${data.forecast}
              </div>
              <div style="font-size: 12px; margin-bottom: 2px;">
                <span style="color: #059669;">Real:</span> ${data.actual}
              </div>
              <div style="font-size: 12px; margin-bottom: 2px;">
                <span style="color: ${data.variance >= 0 ? '#dc2626' : '#059669'};">Varianza:</span> ${data.variance >= 0 ? '+' : ''}${data.variance} (${data.variancePercentage >= 0 ? '+' : ''}${data.variancePercentage}%)
              </div>
              <div style="font-size: 12px; margin-bottom: 2px;">
                <span style="color: #7c3aed;">Precisión:</span> ${data.accuracy}%
              </div>
              <div style="font-size: 12px; margin-bottom: 2px;">
                <span style="color: #f59e0b;">Sesgo:</span> ${data.bias >= 0 ? '+' : ''}${data.bias}%
              </div>
              <div style="font-size: 11px; margin-top: 4px; padding-top: 4px; border-top: 1px solid #e5e7eb; color: #6b7280;">
                ${data.variance > 0 ? 'Sobre-pronóstico' : data.variance < 0 ? 'Sub-pronóstico' : 'Pronóstico exacto'}
              </div>
            </div>
          `;
        }
      },
      plotOptions: {
        columnrange: {
          dataLabels: {
            enabled: false
          },
          colorByPoint: true,
          colors: chartData.data.map(d => d.color)
        }
      },
      series: [{
        type: 'columnrange',
        name: 'Pronóstico vs Real',
        data: chartData.data.map(item => ({
          low: Math.min(item.forecast, item.actual),
          high: Math.max(item.forecast, item.actual),
          name: item.name,
          productId: item.productId,
          category: item.category,
          forecast: item.forecast,
          actual: item.actual,
          variance: item.variance,
          variancePercentage: item.variancePercentage,
          accuracy: item.accuracy,
          bias: item.bias
        }))
      }],
      legend: {
        enabled: false
      },
      credits: {
        enabled: false
      },
      exporting: {
        enabled: true,
        buttons: {
          contextButton: {
            menuItems: ['downloadPNG', 'downloadJPEG', 'downloadPDF', 'downloadSVG']
          }
        }
      }
    };
  };

  // Calculate insights
  const insights = useMemo(() => {
    if (!dumbbellData.length) return null;

    const totalItems = dumbbellData.length;
    const overForecast = dumbbellData.filter(d => d.variance > 0).length;
    const underForecast = dumbbellData.filter(d => d.variance < 0).length;
    const exactForecast = dumbbellData.filter(d => d.variance === 0).length;
    
    const avgAccuracy = dumbbellData.reduce((sum, d) => sum + d.forecast_accuracy, 0) / totalItems;
    const avgBias = dumbbellData.reduce((sum, d) => sum + d.bias, 0) / totalItems;
    
    const highVariance = dumbbellData.filter(d => Math.abs(d.variance_percentage) > 20).length;
    const mediumVariance = dumbbellData.filter(d => Math.abs(d.variance_percentage) > 10 && Math.abs(d.variance_percentage) <= 20).length;
    const lowVariance = dumbbellData.filter(d => Math.abs(d.variance_percentage) <= 10).length;

    return {
      totalItems,
      overForecast,
      underForecast,
      exactForecast,
      overForecastPercentage: Math.round((overForecast / totalItems) * 100),
      underForecastPercentage: Math.round((underForecast / totalItems) * 100),
      exactForecastPercentage: Math.round((exactForecast / totalItems) * 100),
      avgAccuracy: Math.round(avgAccuracy),
      avgBias: Math.round(avgBias * 100) / 100,
      highVariance,
      mediumVariance,
      lowVariance,
      highVariancePercentage: Math.round((highVariance / totalItems) * 100),
      mediumVariancePercentage: Math.round((mediumVariance / totalItems) * 100),
      lowVariancePercentage: Math.round((lowVariance / totalItems) * 100)
    };
  }, [dumbbellData]);

  if (!products || products.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-purple-500" />
            {title}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            No hay datos disponibles para generar el análisis dumbbell
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BarChart3 className="h-5 w-5 text-purple-500" />
          {title}
        </CardTitle>
        {insights && (
          <div className="flex flex-wrap gap-2 mt-2">
            <Badge variant="secondary" className="text-xs">
              {insights.totalItems} SKUs
            </Badge>
            <Badge variant="default" className="text-xs">
              Precisión Promedio: {insights.avgAccuracy}%
            </Badge>
            <Badge variant={insights.avgBias > 0 ? "destructive" : "default"} className="text-xs">
              Sesgo Promedio: {insights.avgBias >= 0 ? '+' : ''}{insights.avgBias}%
            </Badge>
            <Badge variant="outline" className="text-xs">
              {insights.overForecast} Sobre-pronóstico
            </Badge>
            <Badge variant="outline" className="text-xs">
              {insights.underForecast} Sub-pronóstico
            </Badge>
          </div>
        )}
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {/* Controls */}
          <div className="flex flex-wrap items-center gap-4">
            <Tabs value={timePeriod} onValueChange={(value) => setTimePeriod(value as 'lastweek' | 'lastmonth' | 'lastquarter')}>
              <TabsList>
                <TabsTrigger value="lastweek" className="flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  Última Semana
                </TabsTrigger>
                <TabsTrigger value="lastmonth" className="flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  Último Mes
                </TabsTrigger>
                <TabsTrigger value="lastquarter" className="flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  Último Trimestre
                </TabsTrigger>
              </TabsList>
            </Tabs>

            <Tabs value={sortBy} onValueChange={(value) => setSortBy(value as 'variance' | 'accuracy' | 'bias')}>
              <TabsList>
                <TabsTrigger value="variance" className="flex items-center gap-2">
                  <TrendingUp className="h-4 w-4" />
                  Varianza
                </TabsTrigger>
                <TabsTrigger value="accuracy" className="flex items-center gap-2">
                  <Target className="h-4 w-4" />
                  Precisión
                </TabsTrigger>
                <TabsTrigger value="bias" className="flex items-center gap-2">
                  <TrendingDown className="h-4 w-4" />
                  Sesgo
                </TabsTrigger>
              </TabsList>
            </Tabs>

            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <select 
                value={selectedCategory} 
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="border rounded px-2 py-1 text-sm"
              >
                <option value="all">Todas las categorías</option>
                {categories.map(category => (
                  <option key={category} value={category}>{category}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Insights Panel */}
          {insights && (
            <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
              <h4 className="font-semibold text-purple-900 mb-2 flex items-center gap-2">
                <Info className="h-4 w-4" />
                Insights del Análisis Pronóstico vs Real
              </h4>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div>
                  <span className="text-purple-700 font-medium">Sobre-pronóstico:</span>
                  <div className="text-purple-900 font-semibold">{insights.overForecast} ({insights.overForecastPercentage}%)</div>
                </div>
                <div>
                  <span className="text-purple-700 font-medium">Sub-pronóstico:</span>
                  <div className="text-purple-900 font-semibold">{insights.underForecast} ({insights.underForecastPercentage}%)</div>
                </div>
                <div>
                  <span className="text-purple-700 font-medium">Alta Varianza:</span>
                  <div className="text-purple-900 font-semibold">{insights.highVariance} ({insights.highVariancePercentage}%)</div>
                </div>
                <div>
                  <span className="text-purple-700 font-medium">Sesgo Promedio:</span>
                  <div className="text-purple-900 font-semibold">{insights.avgBias >= 0 ? '+' : ''}{insights.avgBias}%</div>
                </div>
              </div>
              <div className="mt-3 text-sm text-purple-800">
                <strong>Interpretación:</strong> Las barras muestran el rango entre pronóstico y real. 
                Barras rojas indican alta varianza, amarillas varianza media, y verdes baja varianza. 
                Sesgo positivo = sobre-pronóstico, sesgo negativo = sub-pronóstico.
              </div>
            </div>
          )}

          {/* Chart */}
          <div className="border rounded-lg p-4 bg-white">
            {!columnRangeAvailable && (
              <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                <div className="flex items-center gap-2 text-yellow-800">
                  <Info className="h-4 w-4" />
                  <span className="text-sm font-medium">
                    Usando vista alternativa: El módulo ColumnRange no está disponible. 
                    Se muestra una comparación lado a lado de Pronóstico vs Real.
                  </span>
                </div>
              </div>
            )}
            {loading ? (
              <div className="flex items-center justify-center h-[500px]">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500 mx-auto mb-4"></div>
                  <p className="text-muted-foreground">Generando análisis dumbbell...</p>
                </div>
              </div>
            ) : (
              <HighchartsReact
                highcharts={Highcharts}
                options={columnRangeAvailable ? getDumbbellOptions() : getFallbackOptions()}
                containerProps={{ style: { height: '500px' } }}
                callback={(chart) => {
                  // Check if columnrange is available by testing chart type
                  if (!columnRangeAvailable) {
                    try {
                      // Test if columnrange series can be created
                      if (!chart.series || chart.series.length === 0) {
                        setColumnRangeAvailable(false);
                      }
                    } catch (error) {
                      console.warn('Columnrange chart not available:', error);
                      setColumnRangeAvailable(false);
                    }
                  }
                }}
              />
            )}
          </div>

          {/* Top Variances Table */}
          {insights && dumbbellData.length > 0 && (
            <div className="mt-4">
              <h4 className="font-semibold text-gray-900 mb-3">
                Top SKUs por {sortBy === 'variance' ? 'Varianza' : sortBy === 'accuracy' ? 'Precisión' : 'Sesgo'}
              </h4>
              <div className="overflow-x-auto">
                <table className="w-full text-sm border-collapse border border-gray-200">
                  <thead>
                    <tr className="bg-gray-50">
                      <th className="border border-gray-200 px-3 py-2 text-left font-medium text-gray-700">#</th>
                      <th className="border border-gray-200 px-3 py-2 text-left font-medium text-gray-700">SKU</th>
                      <th className="border border-gray-200 px-3 py-2 text-left font-medium text-gray-700">Categoría</th>
                      <th className="border border-gray-200 px-3 py-2 text-center font-medium text-gray-700">Pronóstico</th>
                      <th className="border border-gray-200 px-3 py-2 text-center font-medium text-gray-700">Real</th>
                      <th className="border border-gray-200 px-3 py-2 text-center font-medium text-gray-700">Varianza</th>
                      <th className="border border-gray-200 px-3 py-2 text-center font-medium text-gray-700">Precisión</th>
                      <th className="border border-gray-200 px-3 py-2 text-center font-medium text-gray-700">Sesgo</th>
                    </tr>
                  </thead>
                  <tbody>
                    {chartData.data.slice(0, 15).map((item, index) => (
                      <tr key={item.productId} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                        <td className="border border-gray-200 px-3 py-2 text-center font-medium text-gray-600">
                          {index + 1}
                        </td>
                        <td className="border border-gray-200 px-3 py-2">
                          <div className="font-medium text-gray-900">{item.name}</div>
                          <div className="text-xs text-gray-500 font-mono">{item.productId}</div>
                        </td>
                        <td className="border border-gray-200 px-3 py-2">
                          <span className="inline-flex items-center rounded-md border border-gray-200 bg-white px-2 py-1 text-xs font-medium text-gray-600">
                            {item.category}
                          </span>
                        </td>
                        <td className="border border-gray-200 px-3 py-2 text-center font-medium text-blue-600">
                          {item.forecast}
                        </td>
                        <td className="border border-gray-200 px-3 py-2 text-center font-medium text-green-600">
                          {item.actual}
                        </td>
                        <td className="border border-gray-200 px-3 py-2 text-center">
                          <span className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ${
                            Math.abs(item.variancePercentage) > 20 ? 'text-red-600 bg-red-50' : 
                            Math.abs(item.variancePercentage) > 10 ? 'text-yellow-600 bg-yellow-50' : 
                            'text-green-600 bg-green-50'
                          }`}>
                            {item.variance >= 0 ? '+' : ''}{item.variance} ({item.variancePercentage >= 0 ? '+' : ''}{item.variancePercentage}%)
                          </span>
                        </td>
                        <td className="border border-gray-200 px-3 py-2 text-center">
                          <span className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ${
                            item.accuracy >= 80 ? 'text-green-600 bg-green-50' : 
                            item.accuracy >= 60 ? 'text-yellow-600 bg-yellow-50' : 
                            'text-red-600 bg-red-50'
                          }`}>
                            {item.accuracy}%
                          </span>
                        </td>
                        <td className="border border-gray-200 px-3 py-2 text-center">
                          <span className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ${
                            Math.abs(item.bias) > 10 ? 'text-red-600 bg-red-50' : 
                            Math.abs(item.bias) > 5 ? 'text-yellow-600 bg-yellow-50' : 
                            'text-green-600 bg-green-50'
                          }`}>
                            {item.bias >= 0 ? '+' : ''}{item.bias}%
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
