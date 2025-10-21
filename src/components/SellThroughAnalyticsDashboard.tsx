import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';
import { TrendingUp, TrendingDown, RefreshCw, Calendar, Filter } from 'lucide-react';
import { useSellInOutData } from '@/hooks/useSellInOutData';
import { useChannelPartners } from '@/hooks/useChannelPartners';
import { useProducts } from '@/hooks/useProducts';
import { format } from 'date-fns';

export function SellThroughAnalyticsDashboard() {
  const [selectedProduct, setSelectedProduct] = useState<string>('all');
  const [selectedPartner, setSelectedPartner] = useState<string>('all');
  const [selectedPeriod, setSelectedPeriod] = useState<string>('last_3_months');
  
  const { 
    loading, 
    sellThroughMetrics, 
    fetchSellThroughMetrics, 
    refreshSellThroughRates 
  } = useSellInOutData();
  
  const { partners } = useChannelPartners();
  const { products } = useProducts();

  useEffect(() => {
    const filters: any = {};
    if (selectedProduct && selectedProduct !== 'all') filters.product_id = selectedProduct;
    if (selectedPartner && selectedPartner !== 'all') filters.channel_partner_id = selectedPartner;
    
    // Set period filters based on selection
    const now = new Date();
    switch (selectedPeriod) {
      case 'last_month':
        filters.period_start = format(new Date(now.getFullYear(), now.getMonth() - 1, 1), 'yyyy-MM-dd');
        break;
      case 'last_3_months':
        filters.period_start = format(new Date(now.getFullYear(), now.getMonth() - 3, 1), 'yyyy-MM-dd');
        break;
      case 'last_6_months':
        filters.period_start = format(new Date(now.getFullYear(), now.getMonth() - 6, 1), 'yyyy-MM-dd');
        break;
    }
    
    fetchSellThroughMetrics(filters);
  }, [selectedProduct, selectedPartner, selectedPeriod, fetchSellThroughMetrics]);

  const handleRefreshRates = async () => {
    await refreshSellThroughRates();
    // Refetch metrics after refresh
    const filters: any = {};
    if (selectedProduct && selectedProduct !== 'all') filters.product_id = selectedProduct;
    if (selectedPartner && selectedPartner !== 'all') filters.channel_partner_id = selectedPartner;
    fetchSellThroughMetrics(filters);
  };

  // Calculate summary metrics
  const avgSellThroughRate = sellThroughMetrics.length > 0 
    ? sellThroughMetrics.reduce((sum, m) => sum + m.sell_through_rate, 0) / sellThroughMetrics.length 
    : 0;

  const avgDaysOfInventory = sellThroughMetrics.length > 0
    ? sellThroughMetrics.reduce((sum, m) => sum + m.days_of_inventory, 0) / sellThroughMetrics.length
    : 0;

  const performanceDistribution = sellThroughMetrics.reduce((acc, metric) => {
    acc[metric.performance_category] = (acc[metric.performance_category] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  // Prepare chart data
  const chartData = sellThroughMetrics
    .sort((a, b) => new Date(a.calculation_period).getTime() - new Date(b.calculation_period).getTime())
    .map(metric => ({
      period: format(new Date(metric.calculation_period), 'MMM yyyy'),
      sellThroughRate: metric.sell_through_rate,
      daysOfInventory: metric.days_of_inventory,
      partnerName: partners.find(p => p.id === metric.channel_partner_id)?.partner_name || 'Unknown',
    }));

  const getPerformanceBadgeVariant = (category: string) => {
    switch (category) {
      case 'high': return 'default';
      case 'medium': return 'secondary';
      case 'low': return 'outline';
      case 'critical': return 'destructive';
      default: return 'secondary';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold">Sell-Through Analytics</h1>
          <p className="text-muted-foreground">
            Monitor sell-in to sell-out performance across channel partners
          </p>
        </div>
        <Button onClick={handleRefreshRates} disabled={loading}>
          <RefreshCw className="mr-2 h-4 w-4" />
          Refresh Metrics
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filters
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Product</label>
              <Select value={selectedProduct} onValueChange={setSelectedProduct}>
                <SelectTrigger>
                  <SelectValue placeholder="All Products" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Products</SelectItem>
                  {products
                    .filter(product => {
                      const id = product.product_id ?? product.id;
                      return id && String(id).trim() !== '';
                    })
                    .map(product => {
                      const id = String(product.product_id ?? product.id);
                      return (
                        <SelectItem key={id} value={id}>
                          {product.product_name ?? product.name ?? 'Unnamed Product'}
                        </SelectItem>
                      );
                    })}
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium">Channel Partner</label>
              <Select value={selectedPartner} onValueChange={setSelectedPartner}>
                <SelectTrigger>
                  <SelectValue placeholder="All Partners" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Partners</SelectItem>
                  {partners
                    .filter(partner => partner.id && String(partner.id).trim() !== '')
                    .map(partner => (
                    <SelectItem key={partner.id} value={partner.id}>
                      {partner.partner_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium">Period</label>
              <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="last_month">Last Month</SelectItem>
                  <SelectItem value="last_3_months">Last 3 Months</SelectItem>
                  <SelectItem value="last_6_months">Last 6 Months</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Sell-Through Rate</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{avgSellThroughRate.toFixed(1)}%</div>
            <Progress value={avgSellThroughRate} className="mt-2" />
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Days of Inventory</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{avgDaysOfInventory.toFixed(0)}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {avgDaysOfInventory > 30 ? 'High inventory levels' : 'Healthy inventory'}
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">High Performers</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{performanceDistribution.high || 0}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Partners with &gt;90% sell-through
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Critical Issues</CardTitle>
            <TrendingDown className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{performanceDistribution.critical || 0}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Partners with &lt;50% sell-through
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts and Data */}
      <Tabs defaultValue="trends" className="space-y-4">
        <TabsList>
          <TabsTrigger value="trends">Trends</TabsTrigger>
          <TabsTrigger value="performance">Performance Matrix</TabsTrigger>
          <TabsTrigger value="details">Detailed Metrics</TabsTrigger>
        </TabsList>
        
        <TabsContent value="trends" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Sell-Through Rate Trends</CardTitle>
              <CardDescription>Track sell-through performance over time</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="period" />
                    <YAxis />
                    <Tooltip />
                    <Line 
                      type="monotone" 
                      dataKey="sellThroughRate" 
                      stroke="hsl(var(--primary))" 
                      strokeWidth={2}
                      name="Sell-Through Rate (%)"
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle>Days of Inventory</CardTitle>
              <CardDescription>Monitor inventory velocity across periods</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="period" />
                    <YAxis />
                    <Tooltip />
                    <Bar 
                      dataKey="daysOfInventory" 
                      fill="#3b82f6"
                      name="Days of Inventory"
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="performance" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {Object.entries(performanceDistribution).map(([category, count]) => (
              <Card key={category}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium capitalize">
                    {category} Performance
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{count}</div>
                  <Badge variant={getPerformanceBadgeVariant(category)} className="mt-2">
                    {category.toUpperCase()}
                  </Badge>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
        
        <TabsContent value="details" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Detailed Metrics</CardTitle>
              <CardDescription>
                Complete sell-through performance breakdown
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {sellThroughMetrics.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <p>No sell-through metrics data available.</p>
                    <p className="text-sm mt-2">Try adjusting your filters or refreshing the data.</p>
                  </div>
                ) : (
                  sellThroughMetrics.map((metric) => {
                    const partner = partners.find(p => p.id === metric.channel_partner_id);
                    const product = products.find(p => {
                      const productId = String(p.product_id || '');
                      const metricProductId = String(metric.product_id || '');
                      const pId = String(p.id || '');
                      return (
                        productId === metricProductId || 
                        pId === metricProductId
                      );
                    });
                    
                    return (
                      <div key={metric.id} className="flex items-center justify-between p-4 border rounded-lg">
                        <div className="space-y-1">
                          <div className="font-medium">
                            {partner?.partner_name || 'Unknown Partner'}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {product?.product_name || product?.name || `Product ID: ${metric.product_id}`} • {format(new Date(metric.calculation_period), 'MMM yyyy')}
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="text-right">
                            <div className="font-medium">{metric.sell_through_rate.toFixed(1)}%</div>
                            <div className="text-sm text-muted-foreground">
                              {metric.days_of_inventory.toFixed(0)} days inventory
                            </div>
                          </div>
                          <Badge variant={getPerformanceBadgeVariant(metric.performance_category)}>
                            {metric.performance_category}
                          </Badge>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}