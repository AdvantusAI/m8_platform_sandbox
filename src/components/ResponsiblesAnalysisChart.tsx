import React, { useMemo, useState, useEffect } from 'react';
import Highcharts from 'highcharts';
import HighchartsReact from 'highcharts-react-official';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Users, 
  BarChart3, 
  TrendingDown, 
  Target,
  Info,
  Filter,
  Package,
  UserCheck
} from 'lucide-react';

// Import Highcharts modules
import HighchartsMore from 'highcharts/highcharts-more';

// Initialize Highcharts modules
try {
  (HighchartsMore as any)(Highcharts);
} catch (error) {
  console.warn('Highcharts More module could not be loaded:', error);
}

interface ErrorDistributionData {
  category: string;
  client: string;
  responsible: string;
  errors: number[];
  meanError: number;
  medianError: number;
  q1: number;
  q3: number;
  minError: number;
  maxError: number;
  outlierCount: number;
  totalForecasts: number;
}

interface StackedErrorData {
  client: string;
  clientName: string;
  responsible: string;
  categories: {
    [category: string]: {
      errorSum: number;
      forecastCount: number;
      avgError: number;
    };
  };
  totalError: number;
  totalForecasts: number;
}

interface ResponsiblesAnalysisChartProps {
  products: Array<{
    product_id: string;
    product_name: string;
    category_name?: string;
    accuracy_score: number;
    forecast_count: number;
    avg_error_percentage: number;
  }>;
  customers?: Array<{
    customer_node_id: string;
    customer_name: string;
    accuracy_score: number;
    forecast_count: number;
    avg_error_percentage: number;
  }>;
  title?: string;
}

export default function ResponsiblesAnalysisChart({ 
  products, 
  customers = [],
  title = "Análisis por Responsables/Clusters" 
}: ResponsiblesAnalysisChartProps) {
  const [analysisType, setAnalysisType] = useState<'category' | 'client'>('category');
  const [selectedResponsible, setSelectedResponsible] = useState<string>('all');
  const [boxplotData, setBoxplotData] = useState<ErrorDistributionData[]>([]);
  const [stackedData, setStackedData] = useState<StackedErrorData[]>([]);
  const [loading, setLoading] = useState(false);
  const [boxplotAvailable, setBoxplotAvailable] = useState(true);

  // Check if boxplot module is available
  useEffect(() => {
    try {
      // Test if boxplot series type is available
      if (!(Highcharts as any).seriesTypes?.boxplot) {
        setBoxplotAvailable(false);
        console.warn('Boxplot module not available, falling back to column chart');
      }
    } catch (error) {
      setBoxplotAvailable(false);
      console.warn('Error checking boxplot availability:', error);
    }
  }, []);

  // Generate mock data for boxplot analysis
  const generateBoxplotData = useMemo(() => {
    const data: ErrorDistributionData[] = [];
    
    // Get unique categories and clients
    const categories = [...new Set(products.map(p => p.category_name || 'Sin categoría'))];
    const clients = customers.length > 0 
      ? [...new Set(customers.map(c => c.customer_node_id))]
      : ['Cliente A', 'Cliente B', 'Cliente C', 'Cliente D', 'Cliente E'];
    
    const responsibles = ['Responsable 1', 'Responsable 2', 'Responsable 3', 'Responsable 4'];
    
    const groups = analysisType === 'category' ? categories : clients;
    
    groups.forEach(group => {
      // Generate error distribution for this group
      const errors: number[] = [];
      const forecastCount = Math.floor(Math.random() * 50) + 20; // 20-70 forecasts
      
      // Generate realistic error distribution with some outliers
      for (let i = 0; i < forecastCount; i++) {
        let error;
        if (Math.random() < 0.1) { // 10% outliers
          error = Math.random() * 60 + 40; // 40-100% error
        } else {
          error = Math.random() * 30 + 5; // 5-35% error
        }
        errors.push(error);
      }
      
      // Sort errors for quartile calculation
      errors.sort((a, b) => a - b);
      
      const meanError = errors.reduce((sum, err) => sum + err, 0) / errors.length;
      const medianError = errors[Math.floor(errors.length / 2)];
      const q1 = errors[Math.floor(errors.length * 0.25)];
      const q3 = errors[Math.floor(errors.length * 0.75)];
      const minError = errors[0];
      const maxError = errors[errors.length - 1];
      
      // Count outliers (beyond 1.5 * IQR)
      const iqr = q3 - q1;
      const outlierThreshold = 1.5 * iqr;
      const outlierCount = errors.filter(err => err < q1 - outlierThreshold || err > q3 + outlierThreshold).length;
      
      const responsible = responsibles[Math.floor(Math.random() * responsibles.length)];
      
      data.push({
        category: analysisType === 'category' ? group : 'General',
        client: analysisType === 'client' ? group : 'General',
        responsible,
        errors,
        meanError: Math.round(meanError * 100) / 100,
        medianError: Math.round(medianError * 100) / 100,
        q1: Math.round(q1 * 100) / 100,
        q3: Math.round(q3 * 100) / 100,
        minError: Math.round(minError * 100) / 100,
        maxError: Math.round(maxError * 100) / 100,
        outlierCount,
        totalForecasts: forecastCount
      });
    });
    
    return data;
  }, [products, customers, analysisType]);

  // Generate mock data for stacked column analysis
  const generateStackedData = useMemo(() => {
    const data: StackedErrorData[] = [];
    
    const clients = customers.length > 0 
      ? [...new Set(customers.map(c => c.customer_node_id))]
      : ['Cliente A', 'Cliente B', 'Cliente C', 'Cliente D', 'Cliente E'];
    
    const categories = [...new Set(products.map(p => p.category_name || 'Sin categoría'))];
    const responsibles = ['Responsable 1', 'Responsable 2', 'Responsable 3', 'Responsable 4'];
    
    clients.forEach(client => {
      const categoriesData: { [category: string]: { errorSum: number; forecastCount: number; avgError: number; } } = {};
      let totalError = 0;
      let totalForecasts = 0;
      
      // Get client name from customers data if available
      const clientName = customers.length > 0 
        ? customers.find(c => c.customer_node_id === client)?.customer_name || client
        : client;
      
      categories.forEach(category => {
        const errorSum = Math.random() * 1000 + 100; // 100-1100 error sum
        const forecastCount = Math.floor(Math.random() * 20) + 5; // 5-25 forecasts
        const avgError = errorSum / forecastCount;
        
        categoriesData[category] = {
          errorSum: Math.round(errorSum * 100) / 100,
          forecastCount,
          avgError: Math.round(avgError * 100) / 100
        };
        
        totalError += errorSum;
        totalForecasts += forecastCount;
      });
      
      const responsible = responsibles[Math.floor(Math.random() * responsibles.length)];
      
      data.push({
        client,
        clientName,
        responsible,
        categories: categoriesData,
        totalError: Math.round(totalError * 100) / 100,
        totalForecasts
      });
    });
    
    return data;
  }, [products, customers]);

  useEffect(() => {
    setLoading(true);
    // Simulate data loading
    setTimeout(() => {
      setBoxplotData(generateBoxplotData);
      setStackedData(generateStackedData);
      setLoading(false);
    }, 500);
  }, [generateBoxplotData, generateStackedData]);

  // Get unique responsibles
  const responsibles = useMemo(() => {
    const uniqueResponsibles = [...new Set([
      ...boxplotData.map(d => d.responsible),
      ...stackedData.map(d => d.responsible)
    ])];
    return uniqueResponsibles;
  }, [boxplotData, stackedData]);

  const getBoxplotOptions = (): Highcharts.Options => {
    const filteredData = selectedResponsible === 'all' 
      ? boxplotData 
      : boxplotData.filter(d => d.responsible === selectedResponsible);

    const categories = filteredData.map(d => analysisType === 'category' ? d.category : d.client);
    const data = filteredData.map(d => [
      d.minError,
      d.q1,
      d.medianError,
      d.q3,
      d.maxError
    ]);

    return {
      chart: {
        type: 'boxplot',
        backgroundColor: 'transparent',
        style: {
          fontFamily: 'Inter, system-ui, sans-serif'
        }
      },
      title: {
        text: `Distribución de Error por ${analysisType === 'category' ? 'Categoría' : 'Cliente'}`,
        style: {
          fontSize: '16px',
          fontWeight: '600',
          color: '#1f2937'
        }
      },
      subtitle: {
        text: `Análisis de dispersión y sesgos${selectedResponsible !== 'all' ? ` - ${selectedResponsible}` : ''}`,
        style: {
          fontSize: '12px',
          color: '#6b7280'
        }
      },
      xAxis: {
        categories: categories,
        title: {
          text: analysisType === 'category' ? 'Categorías' : 'Clientes',
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
          text: 'Error (%)',
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
          const point = this.point as any;
          const index = this.x;
          const data = filteredData[index];
          
          return `
            <div style="padding: 8px; font-family: Inter, sans-serif;">
              <div style="font-weight: 600; margin-bottom: 4px; color: #1f2937;">
                ${data.category} - ${data.client}
              </div>
              <div style="font-size: 12px; margin-bottom: 2px;">
                <span style="color: #6b7280;">Responsable:</span> ${data.responsible}
              </div>
              <div style="font-size: 12px; margin-bottom: 2px;">
                <span style="color: #dc2626;">Mínimo:</span> ${data.minError}%
              </div>
              <div style="font-size: 12px; margin-bottom: 2px;">
                <span style="color: #f59e0b;">Q1:</span> ${data.q1}%
              </div>
              <div style="font-size: 12px; margin-bottom: 2px;">
                <span style="color: #7c3aed;">Mediana:</span> ${data.medianError}%
              </div>
              <div style="font-size: 12px; margin-bottom: 2px;">
                <span style="color: #f59e0b;">Q3:</span> ${data.q3}%
              </div>
              <div style="font-size: 12px; margin-bottom: 2px;">
                <span style="color: #dc2626;">Máximo:</span> ${data.maxError}%
              </div>
              <div style="font-size: 12px; margin-bottom: 2px;">
                <span style="color: #059669;">Promedio:</span> ${data.meanError}%
              </div>
              <div style="font-size: 12px; margin-bottom: 2px;">
                <span style="color: #6b7280;">Outliers:</span> ${data.outlierCount}
              </div>
              <div style="font-size: 12px; margin-bottom: 2px;">
                <span style="color: #6b7280;">Total Pronósticos:</span> ${data.totalForecasts}
              </div>
            </div>
          `;
        }
      },
      plotOptions: {
        boxplot: {
          dataLabels: {
            enabled: false
          },
          color: '#dc2626',
          fillColor: '#fef2f2',
          lineWidth: 2,
          medianColor: '#7c3aed',
          medianWidth: 3,
          stemColor: '#dc2626',
          stemDashStyle: 'solid',
          stemWidth: 2,
          whiskerColor: '#dc2626',
          whiskerLength: '50%',
          whiskerWidth: 2
        }
      },
      series: [{
        type: 'boxplot',
        name: 'Distribución de Error',
        data: data
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

  const getStackedColumnOptions = (): Highcharts.Options => {
    const filteredData = selectedResponsible === 'all' 
      ? stackedData 
      : stackedData.filter(d => d.responsible === selectedResponsible);

    const categories = [...new Set(products.map(p => p.category_name || 'Sin categoría'))];
    const clients = filteredData.map(d => d.client);
    
    const series = categories.map(category => ({
      name: category,
      type: 'column',
      data: filteredData.map(clientData => ({
        y: clientData.categories[category]?.errorSum || 0,
        forecastCount: clientData.categories[category]?.forecastCount || 0,
        avgError: clientData.categories[category]?.avgError || 0
      }))
    }));

    return {
      chart: {
        type: 'column',
        backgroundColor: 'transparent',
        style: {
          fontFamily: 'Inter, system-ui, sans-serif'
        }
      },
      title: {
        text: 'Error Desglosado por Categoría dentro de cada Cliente',
        style: {
          fontSize: '16px',
          fontWeight: '600',
          color: '#1f2937'
        }
      },
      subtitle: {
        text: `Análisis de portafolio por cliente${selectedResponsible !== 'all' ? ` - ${selectedResponsible}` : ''}`,
        style: {
          fontSize: '12px',
          color: '#6b7280'
        }
      },
      xAxis: {
        categories: clients,
        title: {
          text: 'Clientes',
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
          text: 'Error Acumulado',
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
          const point = this.point as any;
          const series = this.series as any;
          
          return `
            <div style="padding: 8px; font-family: Inter, sans-serif;">
              <div style="font-weight: 600; margin-bottom: 4px; color: #1f2937;">
                ${series.name} - ${this.x}
              </div>
              <div style="font-size: 12px; margin-bottom: 2px;">
                <span style="color: #dc2626;">Error Acumulado:</span> ${point.y}
              </div>
              <div style="font-size: 12px; margin-bottom: 2px;">
                <span style="color: #6b7280;">Pronósticos:</span> ${point.forecastCount}
              </div>
              <div style="font-size: 12px; margin-bottom: 2px;">
                <span style="color: #7c3aed;">Error Promedio:</span> ${point.avgError}%
              </div>
            </div>
          `;
        }
      },
      plotOptions: {
        column: {
          stacking: 'normal',
          dataLabels: {
            enabled: false
          }
        }
      },
      series: series,
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
  };

  // Calculate insights
  const insights = useMemo(() => {
    if (!boxplotData.length || !stackedData.length) return null;

    const totalBoxplotGroups = boxplotData.length;
    const totalStackedClients = stackedData.length;
    
    const avgMeanError = boxplotData.reduce((sum, d) => sum + d.meanError, 0) / totalBoxplotGroups;
    const totalOutliers = boxplotData.reduce((sum, d) => sum + d.outlierCount, 0);
    
    const worstClient = stackedData.reduce((worst, current) => 
      current.totalError > worst.totalError ? current : worst
    );
    
    const bestClient = stackedData.reduce((best, current) => 
      current.totalError < best.totalError ? current : best
    );

    return {
      totalBoxplotGroups,
      totalStackedClients,
      avgMeanError: Math.round(avgMeanError * 100) / 100,
      totalOutliers,
      worstClient,
      bestClient,
      totalResponsibles: responsibles.length
    };
  }, [boxplotData, stackedData, responsibles]);

  if (!products || products.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5 text-indigo-500" />
            {title}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            No hay datos disponibles para generar el análisis por responsables
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="h-5 w-5 text-indigo-500" />
          {title}
        </CardTitle>
        {insights && (
          <div className="flex flex-wrap gap-2 mt-2">
            <Badge variant="secondary" className="text-xs">
              {insights.totalResponsibles} Responsables
            </Badge>
            <Badge variant="outline" className="text-xs">
              {insights.totalStackedClients} Clientes
            </Badge>
            <Badge variant="default" className="text-xs">
              Error Promedio: {insights.avgMeanError}%
            </Badge>
            <Badge variant="destructive" className="text-xs">
              {insights.totalOutliers} Outliers
            </Badge>
          </div>
        )}
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {/* Controls */}
          <div className="flex flex-wrap items-center gap-4">
            <Tabs value={analysisType} onValueChange={(value) => setAnalysisType(value as 'category' | 'client')}>
              <TabsList>
                <TabsTrigger value="category" className="flex items-center gap-2">
                  <Package className="h-4 w-4" />
                  Por Categoría
                </TabsTrigger>
                <TabsTrigger value="client" className="flex items-center gap-2">
                  <UserCheck className="h-4 w-4" />
                  Por Cliente
                </TabsTrigger>
              </TabsList>
            </Tabs>

            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <select 
                value={selectedResponsible} 
                onChange={(e) => setSelectedResponsible(e.target.value)}
                className="border rounded px-2 py-1 text-sm"
              >
                <option value="all">Todos los responsables</option>
                {responsibles.map(responsible => (
                  <option key={responsible} value={responsible}>{responsible}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Insights Panel */}
          {insights && (
            <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-4">
              <h4 className="font-semibold text-indigo-900 mb-2 flex items-center gap-2">
                <Info className="h-4 w-4" />
                Insights del Análisis por Responsables
              </h4>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div>
                  <span className="text-indigo-700 font-medium">Cliente Crítico:</span>
                  <div className="text-indigo-900 font-semibold">{insights.worstClient.client}</div>
                  <div className="text-indigo-800 text-xs">{insights.worstClient.clientName}</div>
                  <div className="text-indigo-800 text-xs">Error: {insights.worstClient.totalError}</div>
                </div>
                <div>
                  <span className="text-indigo-700 font-medium">Cliente Mejor:</span>
                  <div className="text-indigo-900 font-semibold">{insights.bestClient.client}</div>
                  <div className="text-indigo-800 text-xs">{insights.bestClient.clientName}</div>
                  <div className="text-indigo-800 text-xs">Error: {insights.bestClient.totalError}</div>
                </div>
                <div>
                  <span className="text-indigo-700 font-medium">Error Promedio:</span>
                  <div className="text-indigo-900 font-semibold">{insights.avgMeanError}%</div>
                </div>
                <div>
                  <span className="text-indigo-700 font-medium">Total Outliers:</span>
                  <div className="text-indigo-900 font-semibold">{insights.totalOutliers}</div>
                </div>
              </div>
              <div className="mt-3 text-sm text-indigo-800">
                <strong>Priorización:</strong> Enfocar esfuerzos en {insights.worstClient.client} 
                ({insights.worstClient.clientName}) - Responsable: {insights.worstClient.responsible} - 
                que tiene el mayor error acumulado. Los outliers indican casos extremos que requieren atención especial.
              </div>
            </div>
          )}

          {/* Charts */}
          <Tabs defaultValue="boxplot" className="space-y-4">
            <TabsList>
              <TabsTrigger value="boxplot" className="flex items-center gap-2">
                <BarChart3 className="h-4 w-4" />
                Boxplot de Error
              </TabsTrigger>
              <TabsTrigger value="stacked" className="flex items-center gap-2">
                <TrendingDown className="h-4 w-4" />
                Stacked Column
              </TabsTrigger>
            </TabsList>

            <TabsContent value="boxplot">
              <div className="border rounded-lg p-4 bg-white">
                {!boxplotAvailable && (
                  <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <div className="flex items-center gap-2 text-yellow-800">
                      <Info className="h-4 w-4" />
                      <span className="text-sm font-medium">
                        Usando vista alternativa: El módulo Boxplot no está disponible. 
                        Se muestra una vista de columnas con estadísticas.
                      </span>
                    </div>
                  </div>
                )}
                {loading ? (
                  <div className="flex items-center justify-center h-[500px]">
                    <div className="text-center">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500 mx-auto mb-4"></div>
                      <p className="text-muted-foreground">Generando boxplot...</p>
                    </div>
                  </div>
                ) : (
                  <HighchartsReact
                    highcharts={Highcharts}
                    options={getBoxplotOptions()}
                    containerProps={{ style: { height: '500px' } }}
                  />
                )}
              </div>
            </TabsContent>

            <TabsContent value="stacked">
              <div className="border rounded-lg p-4 bg-white">
                {loading ? (
                  <div className="flex items-center justify-center h-[500px]">
                    <div className="text-center">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500 mx-auto mb-4"></div>
                      <p className="text-muted-foreground">Generando stacked column...</p>
                    </div>
                  </div>
                ) : (
                  <HighchartsReact
                    highcharts={Highcharts}
                    options={getStackedColumnOptions()}
                    containerProps={{ style: { height: '500px' } }}
                  />
                )}
              </div>
            </TabsContent>
          </Tabs>

          {/* Summary Tables */}
          {insights && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Top Clients by Error */}
              <div>
                <h4 className="font-semibold text-gray-900 mb-3">Top Clientes por Error Total</h4>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm border-collapse border border-gray-200">
                    <thead>
                      <tr className="bg-gray-50">
                        <th className="border border-gray-200 px-3 py-2 text-left font-medium text-gray-700">#</th>
                        <th className="border border-gray-200 px-3 py-2 text-left font-medium text-gray-700">Cliente</th>
                        <th className="border border-gray-200 px-3 py-2 text-left font-medium text-gray-700">Responsable</th>
                        <th className="border border-gray-200 px-3 py-2 text-center font-medium text-gray-700">Error Total</th>
                        <th className="border border-gray-200 px-3 py-2 text-center font-medium text-gray-700">Pronósticos</th>
                      </tr>
                    </thead>
                    <tbody>
                      {stackedData
                        .sort((a, b) => b.totalError - a.totalError)
                        .slice(0, 8)
                        .map((client, index) => (
                          <tr key={client.client} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                            <td className="border border-gray-200 px-3 py-2 text-center font-medium text-gray-600">
                              {index + 1}
                            </td>
                            <td className="border border-gray-200 px-3 py-2">
                              <div className="font-medium text-gray-900">{client.client}</div>
                              <div className="text-xs text-gray-500">{client.clientName}</div>
                            </td>
                            <td className="border border-gray-200 px-3 py-2">
                              <span className="inline-flex items-center rounded-md border border-gray-200 bg-white px-2 py-1 text-xs font-medium text-gray-600">
                                {client.responsible}
                              </span>
                            </td>
                            <td className="border border-gray-200 px-3 py-2 text-center font-medium text-red-600">
                              {client.totalError}
                            </td>
                            <td className="border border-gray-200 px-3 py-2 text-center font-medium text-gray-600">
                              {client.totalForecasts}
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Error Distribution Summary */}
              <div>
                <h4 className="font-semibold text-gray-900 mb-3">Resumen de Distribución</h4>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm border-collapse border border-gray-200">
                    <thead>
                      <tr className="bg-gray-50">
                        <th className="border border-gray-200 px-3 py-2 text-left font-medium text-gray-700">Grupo</th>
                        <th className="border border-gray-200 px-3 py-2 text-center font-medium text-gray-700">Error Promedio</th>
                        <th className="border border-gray-200 px-3 py-2 text-center font-medium text-gray-700">Outliers</th>
                        <th className="border border-gray-200 px-3 py-2 text-center font-medium text-gray-700">Pronósticos</th>
                      </tr>
                    </thead>
                    <tbody>
                      {boxplotData
                        .sort((a, b) => b.meanError - a.meanError)
                        .slice(0, 8)
                        .map((group, index) => (
                          <tr key={`${group.category}_${group.client}`} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                            <td className="border border-gray-200 px-3 py-2">
                              <div className="font-medium text-gray-900">
                                {analysisType === 'category' ? group.category : group.client}
                              </div>
                              <div className="text-xs text-gray-500">{group.responsible}</div>
                            </td>
                            <td className="border border-gray-200 px-3 py-2 text-center">
                              <span className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ${
                                group.meanError > 30 ? 'text-red-600 bg-red-50' : 
                                group.meanError > 15 ? 'text-yellow-600 bg-yellow-50' : 
                                'text-green-600 bg-green-50'
                              }`}>
                                {group.meanError}%
                              </span>
                            </td>
                            <td className="border border-gray-200 px-3 py-2 text-center font-medium text-orange-600">
                              {group.outlierCount}
                            </td>
                            <td className="border border-gray-200 px-3 py-2 text-center font-medium text-gray-600">
                              {group.totalForecasts}
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
