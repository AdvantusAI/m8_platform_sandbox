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
import { toast } from '@/hooks/use-toast';

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
  customer_id: string;
  customer_name: string;
  accuracy_score: number;
  forecast_count: number;
  last_forecast_date: string;
  avg_error_percentage: number;
  trend: 'improving' | 'declining' | 'stable';
}

interface CustomerProductCombination {
  customer_id: string;
  customer_name: string;
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
        loadKPISummary()
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
      const response = await fetch(`http://localhost:3001/api/kpi/low-accuracy-products?threshold=${accuracyThreshold}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch low accuracy products');
      }

      const lowAccuracyProducts = await response.json();
      
      setAllProducts(lowAccuracyProducts);
      setLowAccuracyProducts(lowAccuracyProducts);
    } catch (error) {
      console.error('Error loading low accuracy products:', error);
    }
  };

  const loadLowAccuracyCustomers = async () => {
    try {
      const response = await fetch(`http://localhost:3001/api/kpi/low-accuracy-customers?threshold=${accuracyThreshold}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch low accuracy customers');
      }

      const lowAccuracyCustomers = await response.json();
      
      setAllCustomers(lowAccuracyCustomers);
      setLowAccuracyCustomers(lowAccuracyCustomers);
    } catch (error) {
      console.error('Error loading low accuracy customers:', error);
    }
  };

  const loadCustomerProductCombinations = async () => {
    try {
      const response = await fetch(`http://localhost:3001/api/kpi/customer-product-combinations?threshold=${accuracyThreshold}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch customer-product combinations');
      }

      const combinations = await response.json();
      setCustomerProductCombinations(combinations);
    } catch (error) {
      console.error('Error loading customer-product combinations:', error);
    }
  };

  const loadKPISummary = async () => {
    try {
      const response = await fetch(`http://localhost:3001/api/kpi/summary?threshold=${accuracyThreshold}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch KPI summary');
      }

      const summary = await response.json();
      setKpiSummary(summary);
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
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left p-2">Producto ID</th>
                        <th className="text-left p-2">Nombre del Producto</th>
                        <th className="text-left p-2">Categoría</th>
                        <th className="text-center p-2">Precisión</th>
                        <th className="text-center p-2">Error %</th>
                        <th className="text-center p-2">Pronósticos</th>
                        <th className="text-center p-2">Tendencia</th>
                        <th className="text-left p-2">Último Pronóstico</th>
                      </tr>
                    </thead>
                    <tbody>
                      {lowAccuracyProducts.map((product, index) => (
                        <tr key={index} className="border-b hover:bg-muted/50">
                          <td className="p-2 font-mono text-xs">{product.product_id}</td>
                          <td className="p-2 font-medium">{product.product_name}</td>
                          <td className="p-2">
                            <Badge variant="outline">{product.category_name}</Badge>
                          </td>
                          <td className="p-2 text-center">
                            <Badge className={getAccuracyColor(product.accuracy_score)}>
                              {product.accuracy_score}%
                            </Badge>
                          </td>
                          <td className="p-2 text-center text-red-600 font-medium">
                            {product.avg_error_percentage}%
                          </td>
                          <td className="p-2 text-center">{product.forecast_count}</td>
                          <td className="p-2 text-center">
                            <div className="flex items-center justify-center">
                              {getTrendIcon(product.trend)}
                            </div>
                          </td>
                          <td className="p-2 text-xs text-muted-foreground">
                            {new Date(product.last_forecast_date).toLocaleDateString('es-ES')}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {lowAccuracyProducts.length === 0 && (
                    <div className="text-center py-8 text-muted-foreground">
                      No se encontraron productos con baja precisión
                    </div>
                  )}
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
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left p-2">Cliente ID</th>
                        <th className="text-left p-2">Nombre del Cliente</th>
                        <th className="text-center p-2">Precisión</th>
                        <th className="text-center p-2">Error %</th>
                        <th className="text-center p-2">Pronósticos</th>
                        <th className="text-center p-2">Tendencia</th>
                        <th className="text-left p-2">Último Pronóstico</th>
                      </tr>
                    </thead>
                    <tbody>
                      {lowAccuracyCustomers.map((customer, index) => (
                        <tr key={index} className="border-b hover:bg-muted/50">
                          <td className="p-2 font-mono text-xs">{customer.customer_id}</td>
                          <td className="p-2 font-medium">{customer.customer_name}</td>
                          <td className="p-2 text-center">
                            <Badge className={getAccuracyColor(customer.accuracy_score)}>
                              {customer.accuracy_score}%
                            </Badge>
                          </td>
                          <td className="p-2 text-center text-red-600 font-medium">
                            {customer.avg_error_percentage}%
                          </td>
                          <td className="p-2 text-center">{customer.forecast_count}</td>
                          <td className="p-2 text-center">
                            <div className="flex items-center justify-center">
                              {getTrendIcon(customer.trend)}
                            </div>
                          </td>
                          <td className="p-2 text-xs text-muted-foreground">
                            {new Date(customer.last_forecast_date).toLocaleDateString('es-ES')}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {lowAccuracyCustomers.length === 0 && (
                    <div className="text-center py-8 text-muted-foreground">
                      No se encontraron clientes con baja precisión
                    </div>
                  )}
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
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left p-2">Cliente ID</th>
                        <th className="text-left p-2">Nombre del Cliente</th>
                        <th className="text-left p-2">Producto ID</th>
                        <th className="text-left p-2">Nombre del Producto</th>
                        <th className="text-left p-2">Categoría</th>
                        <th className="text-center p-2">Precisión</th>
                        <th className="text-center p-2">Error %</th>
                        <th className="text-center p-2">Sesgo del Pronóstico</th>
                        <th className="text-center p-2">Pronósticos</th>
                        <th className="text-center p-2">Tendencia</th>
                        <th className="text-left p-2">Último Pronóstico</th>
                        <th className="text-center p-2">Acciones</th>
                      </tr>
                    </thead>
                    <tbody>
                      {customerProductCombinations.map((combination, index) => (
                        <tr key={index} className="border-b hover:bg-muted/50">
                          <td className="p-2 font-mono text-xs">{combination.customer_id}</td>
                          <td className="p-2 font-medium">{combination.customer_name}</td>
                          <td className="p-2 font-mono text-xs">{combination.product_id}</td>
                          <td className="p-2 font-medium">{combination.product_name}</td>
                          <td className="p-2">
                            <Badge variant="outline">{combination.category_name}</Badge>
                          </td>
                          <td className="p-2 text-center">
                            <Badge className={getAccuracyColor(combination.accuracy_score)}>
                              {combination.accuracy_score}%
                            </Badge>
                          </td>
                          <td className="p-2 text-center text-red-600 font-medium">
                            {combination.avg_error_percentage}%
                          </td>
                          <td className="p-2 text-center">
                            <Badge variant={combination.forecast_bias > 0 ? "destructive" : combination.forecast_bias < 0 ? "secondary" : "outline"}>
                              {combination.forecast_bias > 0 ? '+' : ''}{combination.forecast_bias}
                            </Badge>
                          </td>
                          <td className="p-2 text-center">{combination.forecast_count}</td>
                          <td className="p-2 text-center">
                            <div className="flex items-center justify-center">
                              {getTrendIcon(combination.trend)}
                            </div>
                          </td>
                          <td className="p-2 text-xs text-muted-foreground">
                            {new Date(combination.last_forecast_date).toLocaleDateString('es-ES')}
                          </td>
                          <td className="p-2 text-center">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                const url = `/demand-forecast?customer_id=${combination.customer_id}&product_id=${combination.product_id}`;
                                window.open(url, '_blank');
                              }}
                              className="h-8 w-8 p-0"
                              title="Ver en Pronóstico de Demanda"
                            >
                              <ExternalLink className="h-3 w-3" />
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {customerProductCombinations.length === 0 && (
                    <div className="text-center py-8 text-muted-foreground">
                      No se encontraron combinaciones cliente-producto con baja precisión
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="trends">
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
        </TabsContent>
      </Tabs>
    </div>
  );
}