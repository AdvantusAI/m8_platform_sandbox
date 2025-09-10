import React, { useMemo } from 'react';
import Highcharts from 'highcharts';
import HighchartsReact from 'highcharts-react-official';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { TrendingDown } from 'lucide-react';

// Import Highcharts modules
import HighchartsExporting from 'highcharts/modules/exporting';

// Initialize Highcharts modules
try {
  (HighchartsExporting as any)(Highcharts);
} catch (error) {
  console.warn('HighchartsExporting module could not be loaded:', error);
}

interface ParetoData {
  product_id: string;
  product_name: string;
  category_name?: string;
  accuracy_score: number;
  forecast_count: number;
  avg_error_percentage: number;
  wape: number; // Weighted Absolute Percentage Error
}

interface ParetoErrorChartProps {
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

export default function ParetoErrorChart({ products, title = "Pareto de Error (Top-N SKUs)" }: ParetoErrorChartProps) {
  const paretoData = useMemo(() => {
    if (!products || products.length === 0) return { chartData: [], cumulativeData: [], insights: null };

    // Calculate WAPE (Weighted Absolute Percentage Error) for each product
    // WAPE = Σ|Actual - Forecast| / Σ|Actual| * 100
    // For this implementation, we'll use the error percentage weighted by forecast count
    const productsWithWape = products.map(product => ({
      ...product,
      wape: (product.avg_error_percentage * product.forecast_count) / 100 // Simplified WAPE calculation
    }));

    // Sort by WAPE in descending order (highest error first)
    const sortedProducts = productsWithWape.sort((a, b) => b.wape - a.wape);

    // Take top 20 products or all if less than 20
    const topProducts = sortedProducts.slice(0, Math.min(20, sortedProducts.length));

    // Calculate total WAPE for percentage calculation
    const totalWape = sortedProducts.reduce((sum, product) => sum + product.wape, 0);

    // Prepare chart data
    const chartData = topProducts.map((product, index) => ({
      name: product.product_name.length > 20 
        ? `${product.product_name.substring(0, 20)}...` 
        : product.product_name,
      fullName: product.product_name,
      y: product.wape,
      errorPercentage: product.avg_error_percentage,
      accuracyScore: product.accuracy_score,
      forecastCount: product.forecast_count,
      category: product.category_name || 'Sin categoría',
      productId: product.product_id,
      percentage: totalWape > 0 ? (product.wape / totalWape) * 100 : 0
    }));

    // Calculate cumulative percentages
    let cumulativeSum = 0;
    const cumulativeData = chartData.map((item, index) => {
      cumulativeSum += item.percentage;
      return {
        x: index,
        y: cumulativeSum
      };
    });

    // Calculate 80/20 rule insights
    const totalProducts = sortedProducts.length;
    const productsFor80Percent = cumulativeData.findIndex(item => item.y >= 80);
    const productsFor80PercentCount = productsFor80Percent !== -1 ? productsFor80Percent + 1 : totalProducts;
    const percentageOfProducts = totalProducts > 0 ? (productsFor80PercentCount / totalProducts) * 100 : 0;

    const insights = {
      totalProducts,
      topProductsCount: topProducts.length,
      productsFor80Percent: productsFor80PercentCount,
      percentageOfProducts: Math.round(percentageOfProducts),
      totalWape: Math.round(totalWape * 100) / 100,
      topProductError: topProducts.length > 0 ? Math.round(topProducts[0].wape * 100) / 100 : 0
    };

    return { chartData, cumulativeData, insights };
  }, [products]);

  const chartOptions: Highcharts.Options = {
    chart: {
      type: 'column',
      backgroundColor: 'transparent',
      style: {
        fontFamily: 'Inter, system-ui, sans-serif'
      }
    },
    title: {
      text: title,
      style: {
        fontSize: '16px',
        fontWeight: '600',
        color: '#1f2937'
      }
    },
    subtitle: {
      text: 'Análisis de contribución al error total por producto',
      style: {
        fontSize: '12px',
        color: '#6b7280'
      }
    },
    xAxis: {
      categories: paretoData.chartData.map(item => item.name),
      labels: {
        rotation: -45,
        style: {
          fontSize: '10px',
          color: '#374151'
        }
      },
      title: {
        text: 'Productos (SKUs)',
        style: {
          fontSize: '12px',
          fontWeight: '500',
          color: '#374151'
        }
      }
    },
    yAxis: [
      {
        title: {
          text: 'WAPE (Error Absoluto Agregado)',
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
      {
        title: {
          text: 'Porcentaje Acumulado (%)',
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
          },
          formatter: function() {
            return this.value + '%';
          }
        },
        opposite: true,
        max: 100,
        gridLineColor: '#f3f4f6'
      }
    ],
    tooltip: {
      shared: true,
      useHTML: true,
      formatter: function() {
        const point = this.points?.[0];
        const cumulativePoint = this.points?.[1];
        
        if (!point || !cumulativePoint) return '';
        
        const data = point.options as any;
        
        return `
          <div style="padding: 8px; font-family: Inter, sans-serif;">
            <div style="font-weight: 600; margin-bottom: 4px; color: #1f2937;">
              ${data.fullName}
            </div>
            <div style="font-size: 12px; margin-bottom: 2px;">
              <span style="color: #dc2626;">WAPE:</span> ${data.y.toFixed(2)}
            </div>
            <div style="font-size: 12px; margin-bottom: 2px;">
              <span style="color: #dc2626;">Error %:</span> ${data.errorPercentage}%
            </div>
            <div style="font-size: 12px; margin-bottom: 2px;">
              <span style="color: #059669;">Precisión:</span> ${data.accuracyScore}%
            </div>
            <div style="font-size: 12px; margin-bottom: 2px;">
              <span style="color: #6b7280;">Pronósticos:</span> ${data.forecastCount}
            </div>
            <div style="font-size: 12px; margin-bottom: 2px;">
              <span style="color: #6b7280;">Categoría:</span> ${data.category}
            </div>
            <div style="font-size: 12px; margin-bottom: 2px;">
              <span style="color: #7c3aed;">Contribución:</span> ${data.percentage.toFixed(1)}%
            </div>
            <div style="font-size: 12px; border-top: 1px solid #e5e7eb; padding-top: 4px; margin-top: 4px;">
              <span style="color: #7c3aed;">Acumulado:</span> ${cumulativePoint.y.toFixed(1)}%
            </div>
          </div>
        `;
      }
    },
    plotOptions: {
      column: {
        dataLabels: {
          enabled: false
        },
        color: {
          linearGradient: {
            x1: 0,
            y1: 0,
            x2: 0,
            y2: 1
          },
          stops: [
            [0, '#dc2626'],
            [1, '#fca5a5']
          ]
        },
        borderColor: '#dc2626',
        borderWidth: 1
      },
      spline: {
        dataLabels: {
          enabled: false
        },
        color: '#7c3aed',
        lineWidth: 3,
        marker: {
          enabled: true,
          radius: 4,
          fillColor: '#7c3aed',
          lineColor: '#ffffff',
          lineWidth: 2
        }
      }
    },
    series: [
      {
        type: 'column',
        name: 'WAPE por Producto',
        data: paretoData.chartData.map(item => ({
          y: item.y,
          fullName: item.fullName,
          errorPercentage: item.errorPercentage,
          accuracyScore: item.accuracyScore,
          forecastCount: item.forecastCount,
          category: item.category,
          productId: item.productId,
          percentage: item.percentage
        })),
        yAxis: 0
      },
      {
        type: 'spline',
        name: 'Porcentaje Acumulado',
        data: paretoData.cumulativeData,
        yAxis: 1
      }
    ],
    legend: {
      enabled: true,
      align: 'center',
      verticalAlign: 'bottom',
      itemStyle: {
        fontSize: '12px',
        color: '#374151'
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

  if (!products || products.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingDown className="h-5 w-5 text-red-500" />
            {title}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            No hay datos disponibles para generar el análisis Pareto
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingDown className="h-5 w-5 text-red-500" />
          {title}
        </CardTitle>
        {paretoData.insights && (
          <div className="flex flex-wrap gap-2 mt-2">
            <Badge variant="destructive" className="text-xs">
              Top {paretoData.insights.topProductsCount} SKUs
            </Badge>
            <Badge variant="secondary" className="text-xs">
              {paretoData.insights.productsFor80Percent} productos = 80% del error
            </Badge>
            <Badge variant="outline" className="text-xs">
              {paretoData.insights.percentageOfProducts}% de SKUs
            </Badge>
          </div>
        )}
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Insights Panel */}
          {paretoData.insights && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h4 className="font-semibold text-blue-900 mb-2">Insights del Principio 80/20</h4>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div>
                  <span className="text-blue-700 font-medium">Total SKUs:</span>
                  <div className="text-blue-900 font-semibold">{paretoData.insights.totalProducts}</div>
                </div>
                <div>
                  <span className="text-blue-700 font-medium">SKUs Críticos:</span>
                  <div className="text-blue-900 font-semibold">{paretoData.insights.productsFor80Percent}</div>
                </div>
                <div>
                  <span className="text-blue-700 font-medium">% de SKUs:</span>
                  <div className="text-blue-900 font-semibold">{paretoData.insights.percentageOfProducts}%</div>
                </div>
                <div>
                  <span className="text-blue-700 font-medium">WAPE Total:</span>
                  <div className="text-blue-900 font-semibold">{paretoData.insights.totalWape}</div>
                </div>
              </div>
              <div className="mt-3 text-sm text-blue-800">
                <strong>Priorización:</strong> Los {paretoData.insights.productsFor80Percent} SKUs con mayor error 
                ({paretoData.insights.percentageOfProducts}% del total) explican aproximadamente el 80% del error total. 
                Enfocar esfuerzos en estos productos tendrá el mayor impacto en la mejora de precisión.
              </div>
            </div>
          )}

          {/* Chart */}
          <div className="border rounded-lg p-4 bg-white">
            <HighchartsReact
              highcharts={Highcharts}
              options={chartOptions}
              containerProps={{ style: { height: '500px' } }}
            />
          </div>

          {/* Top Products Table */}
          {paretoData.chartData.length > 0 && (
            <div className="mt-4">
              <h4 className="font-semibold text-gray-900 mb-3">Top {Math.min(10, paretoData.chartData.length)} Productos con Mayor Error</h4>
              <div className="overflow-x-auto">
                <table className="w-full text-sm border-collapse border border-gray-200">
                  <thead>
                    <tr className="bg-gray-50">
                      <th className="border border-gray-200 px-3 py-2 text-left font-medium text-gray-700">#</th>
                      <th className="border border-gray-200 px-3 py-2 text-left font-medium text-gray-700">Producto</th>
                      <th className="border border-gray-200 px-3 py-2 text-left font-medium text-gray-700">Categoría</th>
                      <th className="border border-gray-200 px-3 py-2 text-center font-medium text-gray-700">WAPE</th>
                      <th className="border border-gray-200 px-3 py-2 text-center font-medium text-gray-700">Error %</th>
                      <th className="border border-gray-200 px-3 py-2 text-center font-medium text-gray-700">Precisión</th>
                      <th className="border border-gray-200 px-3 py-2 text-center font-medium text-gray-700">Contribución</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paretoData.chartData.slice(0, 10).map((product, index) => (
                      <tr key={product.productId} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                        <td className="border border-gray-200 px-3 py-2 text-center font-medium text-gray-600">
                          {index + 1}
                        </td>
                        <td className="border border-gray-200 px-3 py-2">
                          <div className="font-medium text-gray-900">{product.fullName}</div>
                          <div className="text-xs text-gray-500 font-mono">{product.productId}</div>
                        </td>
                        <td className="border border-gray-200 px-3 py-2">
                          <span className="inline-flex items-center rounded-md border border-gray-200 bg-white px-2 py-1 text-xs font-medium text-gray-600">
                            {product.category}
                          </span>
                        </td>
                        <td className="border border-gray-200 px-3 py-2 text-center font-medium text-red-600">
                          {product.y.toFixed(2)}
                        </td>
                        <td className="border border-gray-200 px-3 py-2 text-center font-medium text-red-600">
                          {product.errorPercentage}%
                        </td>
                        <td className="border border-gray-200 px-3 py-2 text-center">
                          <span className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ${
                            product.accuracyScore >= 80 ? 'text-green-600 bg-green-50' : 
                            product.accuracyScore >= 60 ? 'text-yellow-600 bg-yellow-50' : 
                            'text-red-600 bg-red-50'
                          }`}>
                            {product.accuracyScore}%
                          </span>
                        </td>
                        <td className="border border-gray-200 px-3 py-2 text-center font-medium text-purple-600">
                          {product.percentage.toFixed(1)}%
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
