import React, { useMemo, useState, useEffect } from 'react';
import Highcharts from 'highcharts';
import HighchartsReact from 'highcharts-react-official';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  TreePine, 
  PieChart, 
  TrendingDown, 
  BarChart3,
  Info
} from 'lucide-react';

// Import Highcharts modules
import HighchartsTreemap from 'highcharts/modules/treemap';
import HighchartsSunburst from 'highcharts/modules/sunburst';

// Initialize Highcharts modules
try {
  (HighchartsTreemap as any)(Highcharts);
  (HighchartsSunburst as any)(Highcharts);
} catch (error) {
  console.warn('Highcharts modules could not be loaded:', error);
}

interface HierarchicalErrorData {
  category_name: string;
  subcategory_name?: string;
  product_id: string;
  product_name: string;
  accuracy_score: number;
  forecast_count: number;
  avg_error_percentage: number;
  wape: number;
}

interface HierarchicalErrorChartProps {
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

interface HierarchyNode {
  id: string;
  name: string;
  parent?: string;
  value: number;
  colorValue?: number;
  level: number;
  children?: HierarchyNode[];
  productCount?: number;
  avgAccuracy?: number;
  totalWape?: number;
}

export default function HierarchicalErrorChart({ 
  products, 
  title = "Análisis Jerárquico de Error" 
}: HierarchicalErrorChartProps) {
  const [chartType, setChartType] = useState<'treemap' | 'sunburst'>('treemap');
  const [viewLevel, setViewLevel] = useState<'category' | 'subcategory' | 'product'>('category');
  const [sunburstAvailable, setSunburstAvailable] = useState(true);

  // Check if sunburst module is available
  useEffect(() => {
    try {
      // Test if sunburst series type is available
      if (!(Highcharts as any).seriesTypes?.sunburst) {
        setSunburstAvailable(false);
        console.warn('Sunburst module not available, falling back to treemap only');
      }
    } catch (error) {
      setSunburstAvailable(false);
      console.warn('Error checking sunburst availability:', error);
    }
  }, []);

  const hierarchicalData = useMemo(() => {
    if (!products || products.length === 0) return { treeData: [], insights: null };

    // Calculate WAPE for each product
    const productsWithWape = products.map(product => ({
      ...product,
      wape: (product.avg_error_percentage * product.forecast_count) / 100
    }));

    // Group by category
    const categoryMap = new Map<string, {
      products: typeof productsWithWape;
      totalWape: number;
      totalForecasts: number;
      avgAccuracy: number;
    }>();

    productsWithWape.forEach(product => {
      const category = product.category_name || 'Sin categoría';
      
      if (!categoryMap.has(category)) {
        categoryMap.set(category, {
          products: [],
          totalWape: 0,
          totalForecasts: 0,
          avgAccuracy: 0
        });
      }
      
      const categoryData = categoryMap.get(category)!;
      categoryData.products.push(product);
      categoryData.totalWape += product.wape;
      categoryData.totalForecasts += product.forecast_count;
    });

    // Calculate category averages
    categoryMap.forEach((categoryData, categoryName) => {
      const totalAccuracy = categoryData.products.reduce((sum, p) => sum + p.accuracy_score, 0);
      categoryData.avgAccuracy = totalAccuracy / categoryData.products.length;
    });

    // Create hierarchical tree structure
    const treeData: HierarchyNode[] = [];
    let totalWape = 0;
    let totalProducts = 0;
    let totalForecasts = 0;

    categoryMap.forEach((categoryData, categoryName) => {
      totalWape += categoryData.totalWape;
      totalProducts += categoryData.products.length;
      totalForecasts += categoryData.totalForecasts;

      const categoryNode: HierarchyNode = {
        id: `category_${categoryName}`,
        name: categoryName,
        value: categoryData.totalWape,
        colorValue: categoryData.avgAccuracy,
        level: 0,
        productCount: categoryData.products.length,
        avgAccuracy: Math.round(categoryData.avgAccuracy),
        totalWape: Math.round(categoryData.totalWape * 100) / 100,
        children: []
      };

      // Add products as children
      categoryData.products.forEach(product => {
        const productNode: HierarchyNode = {
          id: `product_${product.product_id}`,
          name: product.product_name.length > 30 
            ? `${product.product_name.substring(0, 30)}...` 
            : product.product_name,
          parent: categoryNode.id,
          value: product.wape,
          colorValue: product.accuracy_score,
          level: 1,
          productCount: 1,
          avgAccuracy: product.accuracy_score,
          totalWape: Math.round(product.wape * 100) / 100
        };
        categoryNode.children!.push(productNode);
      });

      treeData.push(categoryNode);
    });

    // Sort by WAPE (descending)
    treeData.sort((a, b) => b.value - a.value);

    const insights = {
      totalCategories: categoryMap.size,
      totalProducts,
      totalForecasts,
      totalWape: Math.round(totalWape * 100) / 100,
      topCategory: treeData.length > 0 ? treeData[0] : null,
      categoriesAboveThreshold: treeData.filter(cat => cat.avgAccuracy! < 75).length
    };

    return { treeData, insights };
  }, [products]);

  const getTreemapOptions = (): Highcharts.Options => {
    const data = hierarchicalData.treeData.map(category => ({
      id: category.id,
      name: category.name,
      value: category.value,
      colorValue: category.colorValue,
      custom: {
        productCount: category.productCount,
        avgAccuracy: category.avgAccuracy,
        totalWape: category.totalWape
      }
    }));

    return {
      chart: {
        type: 'treemap',
        backgroundColor: 'transparent',
        style: {
          fontFamily: 'Inter, system-ui, sans-serif'
        }
      },
      title: {
        text: 'Treemap de Error por Categoría',
        style: {
          fontSize: '16px',
          fontWeight: '600',
          color: '#1f2937'
        }
      },
      subtitle: {
        text: 'Tamaño = WAPE total, Color = Precisión promedio',
        style: {
          fontSize: '12px',
          color: '#6b7280'
        }
      },
      colorAxis: {
        min: 0,
        max: 100,
        stops: [
          [0, '#dc2626'], // Red for low accuracy
          [0.5, '#f59e0b'], // Yellow for medium accuracy
          [1, '#059669'] // Green for high accuracy
        ],
        labels: {
          formatter: function() {
            return this.value + '%';
          }
        }
      },
      series: [{
        type: 'treemap',
        name: 'Error por Categoría',
        data: data,
        layoutAlgorithm: 'squarified',
        levels: [{
          level: 1,
          dataLabels: {
            enabled: true,
            align: 'left',
            verticalAlign: 'top',
            style: {
              fontSize: '12px',
              fontWeight: 'bold',
              textOutline: '1px contrast'
            },
            formatter: function() {
              const point = this as any;
              return `<span style="font-size: 11px; font-weight: 600;">${point.name}</span><br/>
                      <span style="font-size: 10px;">WAPE: ${point.custom.totalWape}</span><br/>
                      <span style="font-size: 10px;">Precisión: ${point.custom.avgAccuracy}%</span>`;
            }
          },
          borderWidth: 2,
          borderColor: '#ffffff'
        }]
      }],
      tooltip: {
        useHTML: true,
        formatter: function() {
          const point = this as any;
          return `
            <div style="padding: 8px; font-family: Inter, sans-serif;">
              <div style="font-weight: 600; margin-bottom: 4px; color: #1f2937;">
                ${point.name}
              </div>
              <div style="font-size: 12px; margin-bottom: 2px;">
                <span style="color: #dc2626;">WAPE Total:</span> ${point.custom.totalWape}
              </div>
              <div style="font-size: 12px; margin-bottom: 2px;">
                <span style="color: #059669;">Precisión Promedio:</span> ${point.custom.avgAccuracy}%
              </div>
              <div style="font-size: 12px; margin-bottom: 2px;">
                <span style="color: #6b7280;">Productos:</span> ${point.custom.productCount}
              </div>
              <div style="font-size: 12px; margin-bottom: 2px;">
                <span style="color: #7c3aed;">Contribución:</span> ${((point.value / hierarchicalData.insights?.totalWape) * 100).toFixed(1)}%
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

  const getSunburstOptions = (): Highcharts.Options => {
    // Flatten the tree data for sunburst
    const sunburstData: any[] = [];
    
    hierarchicalData.treeData.forEach(category => {
      // Add category
      sunburstData.push({
        id: category.id,
        parent: '',
        name: category.name,
        value: category.value,
        custom: {
          productCount: category.productCount,
          avgAccuracy: category.avgAccuracy,
          totalWape: category.totalWape,
          level: 'category'
        }
      });

      // Add products (limit to top 5 per category to avoid overcrowding)
      category.children?.slice(0, 5).forEach(product => {
        sunburstData.push({
          id: product.id,
          parent: category.id,
          name: product.name,
          value: product.value,
          custom: {
            productCount: 1,
            avgAccuracy: product.avgAccuracy,
            totalWape: product.totalWape,
            level: 'product'
          }
        });
      });
    });

    return {
      chart: {
        type: 'sunburst',
        backgroundColor: 'transparent',
        style: {
          fontFamily: 'Inter, system-ui, sans-serif'
        }
      },
      title: {
        text: 'Sunburst de Error por Jerarquía',
        style: {
          fontSize: '16px',
          fontWeight: '600',
          color: '#1f2937'
        }
      },
      subtitle: {
        text: 'Categorías → Productos (Tamaño = WAPE)',
        style: {
          fontSize: '12px',
          color: '#6b7280'
        }
      },
      series: [{
        type: 'sunburst',
        name: 'Error Jerárquico',
        data: sunburstData,
        levels: [{
          level: 1,
          dataLabels: {
            rotationMode: 'circular',
            style: {
              fontSize: '10px',
              fontWeight: 'bold',
              textOutline: '1px contrast'
            }
          }
        }, {
          level: 2,
          dataLabels: {
            enabled: false
          }
        }],
        colorByPoint: true,
        colors: ['#dc2626', '#ea580c', '#d97706', '#ca8a04', '#65a30d', '#16a34a', '#059669', '#0d9488', '#0891b2', '#0284c7']
      }],
      tooltip: {
        useHTML: true,
        formatter: function() {
          const point = this as any;
          return `
            <div style="padding: 8px; font-family: Inter, sans-serif;">
              <div style="font-weight: 600; margin-bottom: 4px; color: #1f2937;">
                ${point.name}
              </div>
              <div style="font-size: 12px; margin-bottom: 2px;">
                <span style="color: #dc2626;">WAPE:</span> ${point.custom.totalWape}
              </div>
              <div style="font-size: 12px; margin-bottom: 2px;">
                <span style="color: #059669;">Precisión:</span> ${point.custom.avgAccuracy}%
              </div>
              <div style="font-size: 12px; margin-bottom: 2px;">
                <span style="color: #6b7280;">Nivel:</span> ${point.custom.level === 'category' ? 'Categoría' : 'Producto'}
              </div>
              <div style="font-size: 12px; margin-bottom: 2px;">
                <span style="color: #7c3aed;">Contribución:</span> ${((point.value / hierarchicalData.insights?.totalWape) * 100).toFixed(1)}%
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

  if (!products || products.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TreePine className="h-5 w-5 text-blue-500" />
            {title}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            No hay datos disponibles para generar el análisis jerárquico
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TreePine className="h-5 w-5 text-blue-500" />
          {title}
        </CardTitle>
        {hierarchicalData.insights && (
          <div className="flex flex-wrap gap-2 mt-2">
            <Badge variant="secondary" className="text-xs">
              {hierarchicalData.insights.totalCategories} Categorías
            </Badge>
            <Badge variant="outline" className="text-xs">
              {hierarchicalData.insights.totalProducts} Productos
            </Badge>
            <Badge variant="destructive" className="text-xs">
              WAPE Total: {hierarchicalData.insights.totalWape}
            </Badge>
            {hierarchicalData.insights.topCategory && (
              <Badge variant="default" className="text-xs">
                Top: {hierarchicalData.insights.topCategory.name}
              </Badge>
            )}
          </div>
        )}
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {/* Chart Type Selector */}
          <div className="flex items-center justify-between">
            <Tabs value={chartType} onValueChange={(value) => setChartType(value as 'treemap' | 'sunburst')}>
              <TabsList>
                <TabsTrigger value="treemap" className="flex items-center gap-2">
                  <BarChart3 className="h-4 w-4" />
                  Treemap
                </TabsTrigger>
                <TabsTrigger 
                  value="sunburst" 
                  className="flex items-center gap-2"
                  disabled={!sunburstAvailable}
                >
                  <PieChart className="h-4 w-4" />
                  Sunburst
                  {!sunburstAvailable && <span className="text-xs text-muted-foreground">(No disponible)</span>}
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>

          {/* Insights Panel */}
          {hierarchicalData.insights && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h4 className="font-semibold text-blue-900 mb-2 flex items-center gap-2">
                <Info className="h-4 w-4" />
                Insights del Análisis Jerárquico
              </h4>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div>
                  <span className="text-blue-700 font-medium">Categorías:</span>
                  <div className="text-blue-900 font-semibold">{hierarchicalData.insights.totalCategories}</div>
                </div>
                <div>
                  <span className="text-blue-700 font-medium">Productos:</span>
                  <div className="text-blue-900 font-semibold">{hierarchicalData.insights.totalProducts}</div>
                </div>
                <div>
                  <span className="text-blue-700 font-medium">WAPE Total:</span>
                  <div className="text-blue-900 font-semibold">{hierarchicalData.insights.totalWape}</div>
                </div>
                <div>
                  <span className="text-blue-700 font-medium">Categorías Críticas:</span>
                  <div className="text-blue-900 font-semibold">{hierarchicalData.insights.categoriesAboveThreshold}</div>
                </div>
              </div>
              {hierarchicalData.insights.topCategory && (
                <div className="mt-3 text-sm text-blue-800">
                  <strong>Categoría con Mayor Error:</strong> {hierarchicalData.insights.topCategory.name} 
                  (WAPE: {hierarchicalData.insights.topCategory.totalWape}, 
                  Precisión: {hierarchicalData.insights.topCategory.avgAccuracy}%)
                </div>
              )}
            </div>
          )}

          {/* Chart */}
          <div className="border rounded-lg p-4 bg-white">
            {chartType === 'sunburst' && !sunburstAvailable ? (
              <div className="flex items-center justify-center h-[500px] text-center">
                <div>
                  <PieChart className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Sunburst No Disponible</h3>
                  <p className="text-muted-foreground mb-4">
                    El módulo Sunburst de Highcharts no está disponible. Usa Treemap para el análisis jerárquico.
                  </p>
                  <Button 
                    onClick={() => setChartType('treemap')}
                    variant="outline"
                    className="flex items-center gap-2"
                  >
                    <BarChart3 className="h-4 w-4" />
                    Cambiar a Treemap
                  </Button>
                </div>
              </div>
            ) : (
              <HighchartsReact
                highcharts={Highcharts}
                options={chartType === 'treemap' ? getTreemapOptions() : getSunburstOptions()}
                containerProps={{ style: { height: '500px' } }}
                callback={(chart) => {
                  // Check if sunburst is available by testing chart type
                  if (chartType === 'sunburst') {
                    try {
                      // Test if sunburst series can be created
                      if (!chart.series || chart.series.length === 0) {
                        setSunburstAvailable(false);
                      }
                    } catch (error) {
                      console.warn('Sunburst chart not available:', error);
                      setSunburstAvailable(false);
                    }
                  }
                }}
              />
            )}
          </div>

          {/* Top Categories Table */}
          {hierarchicalData.treeData.length > 0 && (
            <div className="mt-4">
              <h4 className="font-semibold text-gray-900 mb-3">Top Categorías por Error</h4>
              <div className="overflow-x-auto">
                <table className="w-full text-sm border-collapse border border-gray-200">
                  <thead>
                    <tr className="bg-gray-50">
                      <th className="border border-gray-200 px-3 py-2 text-left font-medium text-gray-700">#</th>
                      <th className="border border-gray-200 px-3 py-2 text-left font-medium text-gray-700">Categoría</th>
                      <th className="border border-gray-200 px-3 py-2 text-center font-medium text-gray-700">WAPE</th>
                      <th className="border border-gray-200 px-3 py-2 text-center font-medium text-gray-700">Precisión</th>
                      <th className="border border-gray-200 px-3 py-2 text-center font-medium text-gray-700">Productos</th>
                      <th className="border border-gray-200 px-3 py-2 text-center font-medium text-gray-700">Contribución</th>
                    </tr>
                  </thead>
                  <tbody>
                    {hierarchicalData.treeData.slice(0, 10).map((category, index) => (
                      <tr key={category.id} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                        <td className="border border-gray-200 px-3 py-2 text-center font-medium text-gray-600">
                          {index + 1}
                        </td>
                        <td className="border border-gray-200 px-3 py-2">
                          <div className="font-medium text-gray-900">{category.name}</div>
                        </td>
                        <td className="border border-gray-200 px-3 py-2 text-center font-medium text-red-600">
                          {category.totalWape}
                        </td>
                        <td className="border border-gray-200 px-3 py-2 text-center">
                          <span className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ${
                            category.avgAccuracy! >= 80 ? 'text-green-600 bg-green-50' : 
                            category.avgAccuracy! >= 60 ? 'text-yellow-600 bg-yellow-50' : 
                            'text-red-600 bg-red-50'
                          }`}>
                            {category.avgAccuracy}%
                          </span>
                        </td>
                        <td className="border border-gray-200 px-3 py-2 text-center font-medium text-gray-600">
                          {category.productCount}
                        </td>
                        <td className="border border-gray-200 px-3 py-2 text-center font-medium text-purple-600">
                          {((category.value / hierarchicalData.insights?.totalWape) * 100).toFixed(1)}%
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
