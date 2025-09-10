import React, { useMemo, useState, useEffect } from 'react';
import Highcharts from 'highcharts';
import HighchartsReact from 'highcharts-react-official';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Grid3X3, 
  Calendar, 
  TrendingDown, 
  BarChart3,
  Info,
  Filter,
  Download
} from 'lucide-react';

// Import Highcharts modules
import HighchartsHeatmap from 'highcharts/modules/heatmap';

// Initialize Highcharts modules
try {
  (HighchartsHeatmap as any)(Highcharts);
} catch (error) {
  console.warn('Highcharts Heatmap module could not be loaded:', error);
}

interface WeeklyPrecisionData {
  product_id: string;
  product_name: string;
  category_name?: string;
  week_start: string;
  week_end: string;
  precision: number;
  smape: number;
  forecast_count: number;
  actual_demand: number;
  forecasted_demand: number;
}

interface HeatmapChartProps {
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

interface HeatmapDataPoint {
  x: number; // Week index
  y: number; // SKU index
  value: number; // Precision or SMAPE
  name: string; // Product name
  productId: string;
  category: string;
  weekStart: string;
  weekEnd: string;
  forecastCount: number;
  actualDemand: number;
  forecastedDemand: number;
}

export default function HeatmapChart({ 
  products, 
  title = "Heatmap de Precisión por SKU x Semana" 
}: HeatmapChartProps) {
  const [metricType, setMetricType] = useState<'precision' | 'smape'>('precision');
  const [timeRange, setTimeRange] = useState<'4weeks' | '8weeks' | '12weeks'>('8weeks');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [heatmapData, setHeatmapData] = useState<WeeklyPrecisionData[]>([]);
  const [loading, setLoading] = useState(false);

  // Get unique categories
  const categories = useMemo(() => {
    const uniqueCategories = [...new Set(products.map(p => p.category_name || 'Sin categoría'))];
    return uniqueCategories;
  }, [products]);

  // Generate mock weekly data for demonstration
  const generateMockWeeklyData = useMemo(() => {
    const weeks = parseInt(timeRange.replace('weeks', ''));
    const data: WeeklyPrecisionData[] = [];
    
    // Filter products by category if selected
    const filteredProducts = selectedCategory === 'all' 
      ? products 
      : products.filter(p => (p.category_name || 'Sin categoría') === selectedCategory);

    // Take top 20 products for better visualization
    const topProducts = filteredProducts
      .sort((a, b) => b.forecast_count - a.forecast_count)
      .slice(0, 20);

    topProducts.forEach((product, productIndex) => {
      for (let weekIndex = 0; weekIndex < weeks; weekIndex++) {
        const weekStart = new Date();
        weekStart.setDate(weekStart.getDate() - (weeks - weekIndex) * 7);
        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekEnd.getDate() + 6);

        // Generate realistic precision data with some variation
        const basePrecision = product.accuracy_score;
        const variation = (Math.random() - 0.5) * 20; // ±10% variation
        const precision = Math.max(0, Math.min(100, basePrecision + variation));
        
        // Calculate SMAPE (Symmetric Mean Absolute Percentage Error)
        const smape = Math.max(0, Math.min(200, 200 - precision + (Math.random() - 0.5) * 10));
        
        // Generate demand data
        const baseDemand = 100 + Math.random() * 200;
        const actualDemand = baseDemand + (Math.random() - 0.5) * 50;
        const forecastedDemand = actualDemand * (precision / 100) + (Math.random() - 0.5) * 20;

        data.push({
          product_id: product.product_id,
          product_name: product.product_name,
          category_name: product.category_name,
          week_start: weekStart.toISOString().split('T')[0],
          week_end: weekEnd.toISOString().split('T')[0],
          precision: Math.round(precision),
          smape: Math.round(smape * 100) / 100,
          forecast_count: Math.floor(Math.random() * 10) + 1,
          actual_demand: Math.round(actualDemand),
          forecasted_demand: Math.round(forecastedDemand)
        });
      }
    });

    return data;
  }, [products, timeRange, selectedCategory]);

  useEffect(() => {
    setLoading(true);
    // Simulate data loading
    setTimeout(() => {
      setHeatmapData(generateMockWeeklyData);
      setLoading(false);
    }, 500);
  }, [generateMockWeeklyData]);

  const heatmapChartData = useMemo(() => {
    if (!heatmapData.length) return { data: [], xCategories: [], yCategories: [] };

    // Get unique weeks and products
    const uniqueWeeks = [...new Set(heatmapData.map(d => d.week_start))].sort();
    const uniqueProducts = [...new Set(heatmapData.map(d => d.product_id))];
    
    // Create lookup map for faster access
    const dataMap = new Map();
    heatmapData.forEach(item => {
      const key = `${item.product_id}_${item.week_start}`;
      dataMap.set(key, item);
    });

    // Generate heatmap data points
    const data: HeatmapDataPoint[] = [];
    
    uniqueProducts.forEach((productId, yIndex) => {
      const productData = heatmapData.find(d => d.product_id === productId);
      if (!productData) return;

      uniqueWeeks.forEach((weekStart, xIndex) => {
        const key = `${productId}_${weekStart}`;
        const item = dataMap.get(key);
        
        if (item) {
          data.push({
            x: xIndex,
            y: yIndex,
            value: metricType === 'precision' ? item.precision : item.smape,
            name: item.product_name,
            productId: item.product_id,
            category: item.category_name || 'Sin categoría',
            weekStart: item.week_start,
            weekEnd: item.week_end,
            forecastCount: item.forecast_count,
            actualDemand: item.actual_demand,
            forecastedDemand: item.forecasted_demand
          });
        }
      });
    });

    // Create category arrays for axes
    const xCategories = uniqueWeeks.map(week => {
      const date = new Date(week);
      return date.toLocaleDateString('es-ES', { month: 'short', day: 'numeric' });
    });
    
    const yCategories = uniqueProducts.map(productId => {
      const product = heatmapData.find(d => d.product_id === productId);
      return product ? product.product_name.substring(0, 20) + (product.product_name.length > 20 ? '...' : '') : productId;
    });

    return { data, xCategories, yCategories };
  }, [heatmapData, metricType]);

  const getHeatmapOptions = (): Highcharts.Options => {
    const { data, xCategories, yCategories } = heatmapChartData;

    return {
      chart: {
        type: 'heatmap',
        backgroundColor: 'transparent',
        style: {
          fontFamily: 'Inter, system-ui, sans-serif'
        }
      },
      title: {
        text: `${metricType === 'precision' ? 'Precisión' : 'SMAPE'} por SKU x Semana`,
        style: {
          fontSize: '16px',
          fontWeight: '600',
          color: '#1f2937'
        }
      },
      subtitle: {
        text: `Últimas ${timeRange.replace('weeks', ' semanas')} - ${selectedCategory === 'all' ? 'Todas las categorías' : selectedCategory}`,
        style: {
          fontSize: '12px',
          color: '#6b7280'
        }
      },
      xAxis: {
        categories: xCategories,
        title: {
          text: 'Semanas',
          style: {
            fontSize: '12px',
            fontWeight: '500',
            color: '#374151'
          }
        },
        labels: {
          style: {
            fontSize: '10px',
            color: '#6b7280'
          }
        }
      },
      yAxis: {
        categories: yCategories,
        title: {
          text: 'SKUs',
          style: {
            fontSize: '12px',
            fontWeight: '500',
            color: '#374151'
          }
        },
        labels: {
          style: {
            fontSize: '10px',
            color: '#6b7280'
          }
        }
      },
      colorAxis: {
        min: metricType === 'precision' ? 0 : 0,
        max: metricType === 'precision' ? 100 : 200,
        stops: metricType === 'precision' ? [
          [0, '#dc2626'], // Red for low precision
          [0.5, '#f59e0b'], // Yellow for medium precision
          [1, '#059669'] // Green for high precision
        ] : [
          [0, '#059669'], // Green for low SMAPE (good)
          [0.5, '#f59e0b'], // Yellow for medium SMAPE
          [1, '#dc2626'] // Red for high SMAPE (bad)
        ],
        labels: {
          formatter: function() {
            return this.value + (metricType === 'precision' ? '%' : '');
          }
        }
      },
      series: [{
        type: 'heatmap',
        name: metricType === 'precision' ? 'Precisión (%)' : 'SMAPE',
        data: data,
        dataLabels: {
          enabled: true,
          color: '#000000',
          style: {
            fontSize: '9px',
            fontWeight: 'bold',
            textOutline: '1px contrast'
          },
          formatter: function() {
            const point = this.point as any;
            return Math.round(point.value) + (metricType === 'precision' ? '%' : '');
          }
        }
      }],
      tooltip: {
        useHTML: true,
        formatter: function() {
          const point = this.point as any;
          return `
            <div style="padding: 8px; font-family: Inter, sans-serif;">
              <div style="font-weight: 600; margin-bottom: 4px; color: #1f2937;">
                ${point.name}
              </div>
              <div style="font-size: 12px; margin-bottom: 2px;">
                <span style="color: #6b7280;">SKU:</span> ${point.productId}
              </div>
              <div style="font-size: 12px; margin-bottom: 2px;">
                <span style="color: #6b7280;">Categoría:</span> ${point.category}
              </div>
              <div style="font-size: 12px; margin-bottom: 2px;">
                <span style="color: #6b7280;">Semana:</span> ${point.weekStart} - ${point.weekEnd}
              </div>
              <div style="font-size: 12px; margin-bottom: 2px;">
                <span style="color: ${metricType === 'precision' ? '#059669' : '#dc2626'};">${metricType === 'precision' ? 'Precisión' : 'SMAPE'}:</span> ${point.value.toFixed(1)}${metricType === 'precision' ? '%' : ''}
              </div>
              <div style="font-size: 12px; margin-bottom: 2px;">
                <span style="color: #6b7280;">Pronósticos:</span> ${point.forecastCount}
              </div>
              <div style="font-size: 12px; margin-bottom: 2px;">
                <span style="color: #6b7280;">Demanda Real:</span> ${point.actualDemand}
              </div>
              <div style="font-size: 12px; margin-bottom: 2px;">
                <span style="color: #6b7280;">Demanda Pronosticada:</span> ${point.forecastedDemand}
              </div>
            </div>
          `;
        }
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
    if (!heatmapData.length) return null;

    const precisionValues = heatmapData.map(d => d.precision);
    const smapeValues = heatmapData.map(d => d.smape);
    
    const avgPrecision = precisionValues.reduce((sum, val) => sum + val, 0) / precisionValues.length;
    const avgSmape = smapeValues.reduce((sum, val) => sum + val, 0) / smapeValues.length;
    
    const lowPrecisionCount = precisionValues.filter(p => p < 70).length;
    const highSmapeCount = smapeValues.filter(s => s > 30).length;
    
    const totalDataPoints = heatmapData.length;
    const lowPrecisionPercentage = (lowPrecisionCount / totalDataPoints) * 100;
    const highSmapePercentage = (highSmapeCount / totalDataPoints) * 100;

    return {
      avgPrecision: Math.round(avgPrecision),
      avgSmape: Math.round(avgSmape * 100) / 100,
      lowPrecisionCount,
      highSmapeCount,
      lowPrecisionPercentage: Math.round(lowPrecisionPercentage),
      highSmapePercentage: Math.round(highSmapePercentage),
      totalDataPoints,
      uniqueProducts: new Set(heatmapData.map(d => d.product_id)).size,
      uniqueWeeks: new Set(heatmapData.map(d => d.week_start)).size
    };
  }, [heatmapData]);

  if (!products || products.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Grid3X3 className="h-5 w-5 text-orange-500" />
            {title}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            No hay datos disponibles para generar el heatmap
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Grid3X3 className="h-5 w-5 text-orange-500" />
          {title}
        </CardTitle>
        {insights && (
          <div className="flex flex-wrap gap-2 mt-2">
            <Badge variant="secondary" className="text-xs">
              {insights.uniqueProducts} SKUs
            </Badge>
            <Badge variant="outline" className="text-xs">
              {insights.uniqueWeeks} Semanas
            </Badge>
            <Badge variant="default" className="text-xs">
              {insights.totalDataPoints} Puntos de Datos
            </Badge>
            <Badge variant={insights.avgPrecision >= 80 ? "default" : insights.avgPrecision >= 60 ? "secondary" : "destructive"} className="text-xs">
              Precisión Promedio: {insights.avgPrecision}%
            </Badge>
          </div>
        )}
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {/* Controls */}
          <div className="flex flex-wrap items-center gap-4">
            <Tabs value={metricType} onValueChange={(value) => setMetricType(value as 'precision' | 'smape')}>
              <TabsList>
                <TabsTrigger value="precision" className="flex items-center gap-2">
                  <BarChart3 className="h-4 w-4" />
                  Precisión
                </TabsTrigger>
                <TabsTrigger value="smape" className="flex items-center gap-2">
                  <TrendingDown className="h-4 w-4" />
                  SMAPE
                </TabsTrigger>
              </TabsList>
            </Tabs>

            <Tabs value={timeRange} onValueChange={(value) => setTimeRange(value as '4weeks' | '8weeks' | '12weeks')}>
              <TabsList>
                <TabsTrigger value="4weeks">4 Semanas</TabsTrigger>
                <TabsTrigger value="8weeks">8 Semanas</TabsTrigger>
                <TabsTrigger value="12weeks">12 Semanas</TabsTrigger>
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
            <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
              <h4 className="font-semibold text-orange-900 mb-2 flex items-center gap-2">
                <Info className="h-4 w-4" />
                Insights del Heatmap
              </h4>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div>
                  <span className="text-orange-700 font-medium">Precisión Promedio:</span>
                  <div className="text-orange-900 font-semibold">{insights.avgPrecision}%</div>
                </div>
                <div>
                  <span className="text-orange-700 font-medium">SMAPE Promedio:</span>
                  <div className="text-orange-900 font-semibold">{insights.avgSmape}</div>
                </div>
                <div>
                  <span className="text-orange-700 font-medium">Hotspots de Baja Precisión:</span>
                  <div className="text-orange-900 font-semibold">{insights.lowPrecisionCount} ({insights.lowPrecisionPercentage}%)</div>
                </div>
                <div>
                  <span className="text-orange-700 font-medium">Hotspots de Alto SMAPE:</span>
                  <div className="text-orange-900 font-semibold">{insights.highSmapeCount} ({insights.highSmapePercentage}%)</div>
                </div>
              </div>
              <div className="mt-3 text-sm text-orange-800">
                <strong>Interpretación:</strong> Los hotspots rojos indican períodos/SKUs con baja precisión o alto error. 
                Los hotspots persistentes (múltiples semanas) requieren atención prioritaria.
              </div>
            </div>
          )}

          {/* Chart */}
          <div className="border rounded-lg p-4 bg-white">
            {loading ? (
              <div className="flex items-center justify-center h-[500px]">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500 mx-auto mb-4"></div>
                  <p className="text-muted-foreground">Generando heatmap...</p>
                </div>
              </div>
            ) : (
              <HighchartsReact
                highcharts={Highcharts}
                options={getHeatmapOptions()}
                containerProps={{ style: { height: '500px' } }}
              />
            )}
          </div>

          {/* Hotspots Table */}
          {insights && heatmapData.length > 0 && (
            <div className="mt-4">
              <h4 className="font-semibold text-gray-900 mb-3">
                Top Hotspots de {metricType === 'precision' ? 'Baja Precisión' : 'Alto SMAPE'}
              </h4>
              <div className="overflow-x-auto">
                <table className="w-full text-sm border-collapse border border-gray-200">
                  <thead>
                    <tr className="bg-gray-50">
                      <th className="border border-gray-200 px-3 py-2 text-left font-medium text-gray-700">#</th>
                      <th className="border border-gray-200 px-3 py-2 text-left font-medium text-gray-700">SKU</th>
                      <th className="border border-gray-200 px-3 py-2 text-left font-medium text-gray-700">Categoría</th>
                      <th className="border border-gray-200 px-3 py-2 text-center font-medium text-gray-700">Semana</th>
                      <th className="border border-gray-200 px-3 py-2 text-center font-medium text-gray-700">
                        {metricType === 'precision' ? 'Precisión' : 'SMAPE'}
                      </th>
                      <th className="border border-gray-200 px-3 py-2 text-center font-medium text-gray-700">Pronósticos</th>
                      <th className="border border-gray-200 px-3 py-2 text-center font-medium text-gray-700">Demanda Real</th>
                    </tr>
                  </thead>
                  <tbody>
                    {heatmapData
                      .sort((a, b) => {
                        if (metricType === 'precision') {
                          return a.precision - b.precision; // Lowest precision first
                        } else {
                          return b.smape - a.smape; // Highest SMAPE first
                        }
                      })
                      .slice(0, 10)
                      .map((item, index) => (
                        <tr key={`${item.product_id}_${item.week_start}`} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                          <td className="border border-gray-200 px-3 py-2 text-center font-medium text-gray-600">
                            {index + 1}
                          </td>
                          <td className="border border-gray-200 px-3 py-2">
                            <div className="font-medium text-gray-900">{item.product_name}</div>
                            <div className="text-xs text-gray-500 font-mono">{item.product_id}</div>
                          </td>
                          <td className="border border-gray-200 px-3 py-2">
                            <span className="inline-flex items-center rounded-md border border-gray-200 bg-white px-2 py-1 text-xs font-medium text-gray-600">
                              {item.category_name || 'Sin categoría'}
                            </span>
                          </td>
                          <td className="border border-gray-200 px-3 py-2 text-center text-xs text-muted-foreground">
                            {new Date(item.week_start).toLocaleDateString('es-ES', { month: 'short', day: 'numeric' })}
                          </td>
                          <td className="border border-gray-200 px-3 py-2 text-center">
                            <span className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ${
                              metricType === 'precision' 
                                ? (item.precision >= 80 ? 'text-green-600 bg-green-50' : 
                                   item.precision >= 60 ? 'text-yellow-600 bg-yellow-50' : 
                                   'text-red-600 bg-red-50')
                                : (item.smape <= 20 ? 'text-green-600 bg-green-50' : 
                                   item.smape <= 40 ? 'text-yellow-600 bg-yellow-50' : 
                                   'text-red-600 bg-red-50')
                            }`}>
                              {metricType === 'precision' ? `${item.precision}%` : item.smape.toFixed(1)}
                            </span>
                          </td>
                          <td className="border border-gray-200 px-3 py-2 text-center font-medium text-gray-600">
                            {item.forecast_count}
                          </td>
                          <td className="border border-gray-200 px-3 py-2 text-center font-medium text-gray-600">
                            {item.actual_demand}
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
