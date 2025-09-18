import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { MetricCard } from '@/components/MetricCard';
import { HighChartCard } from '@/components/HighChartCard';
import { HistoryForecastChart } from '@/components/HistoryForecastChart';
import { 
  TrendingUp, 
  Package, 
  AlertTriangle, 
  CheckCircle, 
  Calendar,
  BarChart3,
  Truck,
  Target,
  DollarSign,
  Users
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';

const LaunchedProducts = () => {
  const [selectedProduct, setSelectedProduct] = useState<string>('all');
  const [timeRange, setTimeRange] = useState<string>('90d');

  // Datos de ejemplo - en implementación real vendría de API
  const launchedProducts = [
    {
      id: 'prod_1',
      name: 'Mezcla Premium de Café',
      launchDate: '2024-01-15',
      category: 'Bebidas',
      status: 'Activo',
      daysInMarket: 45
    },
    {
      id: 'prod_2', 
      name: 'Barra Orgánica de Snack',
      launchDate: '2024-02-01',
      category: 'Snacks',
      status: 'Activo',
      daysInMarket: 29
    },
    {
      id: 'prod_3',
      name: 'Bebida Energética Zero',
      launchDate: '2023-12-01',
      category: 'Bebidas', 
      status: 'En Riesgo',
      daysInMarket: 75
    }
  ];

  const supplyMetrics = [
    { name: 'Semana 1', stockout: 2, fillRate: 98, leadTime: 5 },
    { name: 'Semana 2', stockout: 1, fillRate: 99, leadTime: 4 },
    { name: 'Semana 3', stockout: 3, fillRate: 97, leadTime: 6 },
    { name: 'Semana 4', stockout: 0, fillRate: 100, leadTime: 4 },
    { name: 'Semana 5', stockout: 1, fillRate: 99, leadTime: 5 },
    { name: 'Semana 6', stockout: 2, fillRate: 98, leadTime: 5 }
  ];

  const categoryPerformance = [
    { name: 'Semana 1', actual: 85, forecast: 80, marketShare: 12 },
    { name: 'Semana 2', actual: 92, forecast: 85, marketShare: 13 },
    { name: 'Semana 3', actual: 88, forecast: 90, marketShare: 12.5 },
    { name: 'Semana 4', actual: 95, forecast: 92, marketShare: 14 },
    { name: 'Semana 5', actual: 102, forecast: 95, marketShare: 15 },
    { name: 'Semana 6', actual: 98, forecast: 98, marketShare: 14.5 }
  ];

  const cannibalizationData = [
    { name: 'Producto Legacy A', impact: -15 },
    { name: 'Producto Legacy B', impact: -8 },
    { name: 'Competidor X', impact: -5 },
    { name: 'Nuevos Ingresos', impact: 45 }
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Seguimiento NPI</h1>
          <p className="text-muted-foreground">
            Rastrea el rendimiento de productos lanzados desde perspectivas de suministro y categoría
          </p>
        </div>
        <div className="flex items-center gap-4">
          <Select value={selectedProduct} onValueChange={setSelectedProduct}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Seleccionar producto" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos los Productos</SelectItem>
              {launchedProducts.map((product) => (
                <SelectItem key={product.id} value={product.id}>
                  {product.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={timeRange} onValueChange={setTimeRange}>
            <SelectTrigger className="w-[120px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="30d">30 Días</SelectItem>
              <SelectItem value="90d">90 Días</SelectItem>
              <SelectItem value="6m">6 Meses</SelectItem>
              <SelectItem value="1y">1 Año</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Resumen de Productos Lanzados */}
      <Card className="shadow-soft">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Estado de Productos Lanzados
          </CardTitle>
          <CardDescription>
            Resumen de productos actualmente en el mercado
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            {launchedProducts.map((product) => (
              <div key={product.id} className="border rounded-lg p-4">
                <div className="flex items-start justify-between mb-2">
                  <h4 className="font-semibold">{product.name}</h4>
                  <Badge variant={product.status === 'Activo' ? 'default' : 'destructive'}>
                    {product.status}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground mb-1">{product.category}</p>
                <div className="flex items-center gap-2 text-sm">
                  <Calendar className="h-4 w-4" />
                  <span>{product.daysInMarket} días en el mercado</span>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Sección de Rendimiento de Suministro */}
      <div className="space-y-4">
        <h2 className="text-2xl font-bold text-foreground">Rendimiento de Suministro</h2>
        
        <div className="grid gap-4 md:grid-cols-4">
          <MetricCard
            title="Tasa de Llenado"
            value="98.5%"
            change={1.2}
            changeLabel="vs período anterior"
            icon={CheckCircle}
            variant="success"
            subtitle="Nivel de servicio"
          />
          <MetricCard
            title="Eventos de Agotamiento"
            value="9"
            change={-25}
            changeLabel="vs período anterior"
            icon={AlertTriangle}
            variant="warning"
            subtitle="Este período"
          />
          <MetricCard
            title="Tiempo de Entrega Promedio"
            value="4.8 días"
            change={-0.5}
            changeLabel="vs objetivo"
            icon={Truck}
            variant="success"
            subtitle="Respuesta de suministro"
          />
          <MetricCard
            title="Inventario DDH"
            value="18.2 días"
            change={-2.1}
            changeLabel="vs objetivo"
            icon={Package}
            variant="default"
            subtitle="Días en mano"
          />
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <HighChartCard
            title="Tendencia de Tasa de Llenado"
            data={supplyMetrics}
            dataKey="fillRate"
            color="hsl(var(--success))"
            type="line"
          />
          <HighChartCard
            title="Rendimiento de Tiempo de Entrega"
            data={supplyMetrics}
            dataKey="leadTime"
            color="hsl(var(--primary))"
            type="area"
          />
        </div>
      </div>

      {/* Sección de Rendimiento de Categoría */}
      <div className="space-y-4">
        <h2 className="text-2xl font-bold text-foreground">Rendimiento de Categoría</h2>
        
        <div className="grid gap-4 md:grid-cols-4">
          <MetricCard
            title="Ventas vs Pronóstico"
            value="102%"
            change={5.2}
            changeLabel="vs pronóstico"
            icon={Target}
            variant="success"
            subtitle="Tasa de logro"
          />
          <MetricCard
            title="Participación de Mercado"
            value="14.5%"
            change={2.8}
            changeLabel="vs lanzamiento"
            icon={BarChart3}
            variant="success"
            subtitle="Posición en categoría"
          />
          <MetricCard
            title="Impacto en Ingresos"
            value="$1.2M"
            change={18.5}
            changeLabel="vs objetivo"
            icon={DollarSign}
            variant="success"
            subtitle="Contribución neta"
          />
          <MetricCard
            title="Adquisición de Clientes"
            value="2,450"
            change={12.3}
            changeLabel="nuevos clientes"
            icon={Users}
            variant="default"
            subtitle="Este período"
          />
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <HighChartCard
            title="Ventas vs Pronóstico"
            data={categoryPerformance}
            dataKey="actual"
            color="hsl(var(--primary))"
            type="line"
            badge="vs Pronóstico"
          />
          <HighChartCard
            title="Evolución de Participación de Mercado"
            data={categoryPerformance}
            dataKey="marketShare"
            color="hsl(var(--success))"
            type="area"
          />
        </div>
      </div>

      {/* Análisis de Canibalización */}
      <Card className="shadow-soft">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Análisis de Impacto de Canibalización
          </CardTitle>
          <CardDescription>
            Impacto en ingresos del portafolio existente y nuevo crecimiento
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {cannibalizationData.map((item, index) => (
              <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                <span className="font-medium">{item.name}</span>
                <div className="flex items-center gap-2">
                  <span className={`font-semibold ${item.impact > 0 ? 'text-success' : 'text-destructive'}`}>
                    {item.impact > 0 ? '+' : ''}{item.impact}%
                  </span>
                  <Badge variant={item.impact > 0 ? 'default' : 'destructive'}>
                    {item.impact > 0 ? 'Crecimiento' : 'Impacto'}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Pronóstico Integrado vs Reales */}
      <Card className="shadow-soft">
        <CardHeader>
          <CardTitle>Rendimiento Histórico vs Pronóstico</CardTitle>
          <CardDescription>
            Compara el rendimiento real de ventas contra los pronósticos originales de lanzamiento
          </CardDescription>
        </CardHeader>
        <CardContent>
          <HistoryForecastChart />
        </CardContent>
      </Card>
    </div>
  );
};

export default LaunchedProducts;