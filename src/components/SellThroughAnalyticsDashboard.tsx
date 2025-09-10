import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, ComposedChart, Label } from 'recharts';
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
    clearSellThroughMetrics,
    refreshSellThroughRates 
  } = useSellInOutData();
  
  const { partners } = useChannelPartners();
  const { products } = useProducts();

  // Debug: Log the raw data
  ////console.log('Raw sellThroughMetrics:', sellThroughMetrics);

  useEffect(() => {
    // Only fetch data if at least one filter is selected
    if (selectedProduct === 'all' && selectedPartner === 'all') {
      // Clear the data when no filters are selected
      clearSellThroughMetrics();
      return;
    }
    
    const filters: any = {};
    
    // Handle product filtering by category_id, subcategory_id, or product_id
    if (selectedProduct && selectedProduct !== 'all') {
      // Check if it's a category filter (starts with 'cat_')
      if (selectedProduct.startsWith('cat_')) {
        filters.category_id = selectedProduct.replace('cat_', '');
      }
      // Check if it's a subcategory filter (starts with 'subcat_')
      else if (selectedProduct.startsWith('subcat_')) {
        filters.subcategory_id = selectedProduct.replace('subcat_', '');
      }
      // Otherwise treat as product_id
      else {
        filters.product_id = selectedProduct;
      }
    }
    
    if (selectedPartner && selectedPartner !== 'all') filters.customer_node_id = selectedPartner;
    
    // Temporarily remove period filters to see all data
    // TODO: Add back period filtering when needed
    // const now = new Date();
    // switch (selectedPeriod) {
    //   case 'last_month':
    //     filters.period_start = format(new Date(now.getFullYear(), now.getMonth() - 1, 1), 'yyyy-MM-dd');
    //     break;
    //   case 'last_3_months':
    //     filters.period_start = format(new Date(now.getFullYear(), now.getMonth() - 3, 1), 'yyyy-MM-dd');
    //     break;
    //   case 'last_6_months':
    //     filters.period_start = format(new Date(now.getFullYear(), now.getMonth() - 6, 1), 'yyyy-MM-dd');
    //     break;
    // }
    
    // Debug: Log the filter values being sent
    ////console.log('=== Filter Debug ===');
    ////console.log('selectedProduct:', selectedProduct);
    ////console.log('selectedPartner:', selectedPartner);
    ////console.log('Final filters object:', filters);
    ////console.log('===================');
    
    fetchSellThroughMetrics(filters);
  }, [selectedProduct, selectedPartner, selectedPeriod, fetchSellThroughMetrics, clearSellThroughMetrics]);

  const handleRefreshRates = async () => {
    await refreshSellThroughRates();
    // Refetch metrics after refresh
    const filters: any = {};
    
    // Handle product filtering by category_id, subcategory_id, or product_id
    if (selectedProduct && selectedProduct !== 'all') {
      // Check if it's a category filter (starts with 'cat_')
      if (selectedProduct.startsWith('cat_')) {
        filters.category_id = selectedProduct.replace('cat_', '');
      }
      // Check if it's a subcategory filter (starts with 'subcat_')
      else if (selectedProduct.startsWith('subcat_')) {
        filters.subcategory_id = selectedProduct.replace('subcat_', '');
      }
      // Otherwise treat as product_id
      else {
        filters.product_id = selectedProduct;
      }
    }
    
    if (selectedPartner && selectedPartner !== 'all') filters.customer_node_id = selectedPartner;
    fetchSellThroughMetrics(filters);
  };

  // Calculate summary metrics
  const avgSellThroughRate = sellThroughMetrics.length > 0 
    ? sellThroughMetrics.reduce((sum, m) => sum + (m.sell_through_rate_pct || 0), 0) / sellThroughMetrics.length 
    : 0;

  const avgWeeksOfCover = sellThroughMetrics.length > 0
    ? sellThroughMetrics.reduce((sum, m) => sum + (m.weeks_of_cover || 0), 0) / sellThroughMetrics.length
    : 0;

  // Calculate performance distribution based on sell-through rate
  const performanceDistribution = sellThroughMetrics.reduce((acc, metric) => {
    const rate = metric.sell_through_rate_pct || 0;
    let category = 'medium';
    if (rate >= 90) category = 'high';
    else if (rate >= 70) category = 'medium';
    else if (rate >= 50) category = 'low';
    else category = 'critical';
    
    acc[category] = (acc[category] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  // Prepare chart data for weeks of cover, aggregated by month
  const chartData = sellThroughMetrics
    .reduce((acc, metric) => {
      const monthKey = format(new Date(metric.period_month), 'yyyy-MM');
      const existingMonth = acc.find(item => item.monthKey === monthKey);
      
      if (existingMonth) {
        // Aggregate data for existing month
        existingMonth.weeksOfCoverSum += metric.weeks_of_cover || 0;
        existingMonth.totalRecords += 1;
      } else {
        // Create new month entry
        acc.push({
          monthKey,
          period: format(new Date(metric.period_month), 'MMM yyyy'),
          weeksOfCoverSum: metric.weeks_of_cover || 0,
          totalRecords: 1,
          periodMonth: metric.period_month,
        });
      }
      
      return acc;
    }, [] as Array<{
      monthKey: string;
      period: string;
      weeksOfCoverSum: number;
      totalRecords: number;
      periodMonth: string;
    }>)
    .map(monthData => ({
      period: monthData.period,
      weeksOfCover: monthData.totalRecords > 0 ? monthData.weeksOfCoverSum / monthData.totalRecords : 0,
    }))
    .sort((a, b) => new Date(a.period).getTime() - new Date(b.period).getTime());

  // Prepare sell-through data for the main chart from real data, aggregated by month
  const sellThroughChartData = sellThroughMetrics
    .map(metric => {
      const date = new Date(metric.period_month);
      return {
        date: format(date, 'MMM yyyy'),
        sellInUnits: metric.sell_in_units || 0,
        sellOutUnits: metric.sell_out_units || 0,
        sellThroughRate: metric.sell_through_rate_pct || 0,
        periodMonth: metric.period_month,
        monthKey: format(date, 'yyyy-MM'),
      };
    })
    .reduce((acc, item) => {
      const existingMonth = acc.find(month => month.monthKey === item.monthKey);
      
      if (existingMonth) {
        // Aggregate data for existing month
        existingMonth.sellInUnits += item.sellInUnits;
        existingMonth.sellOutUnits += item.sellOutUnits;
        existingMonth.sellThroughRateSum += item.sellThroughRate;
        existingMonth.totalRecords += 1;
      } else {
        // Create new month entry
        acc.push({
          ...item,
          sellThroughRateSum: item.sellThroughRate,
          totalRecords: 1,
        });
      }
      
      return acc;
    }, [] as Array<{
      date: string;
      sellInUnits: number;
      sellOutUnits: number;
      sellThroughRate: number;
      periodMonth: string;
      monthKey: string;
      sellThroughRateSum: number;
      totalRecords: number;
    }>)
    .map(monthData => ({
      date: monthData.date,
      sellInUnits: monthData.sellInUnits,
      sellOutUnits: monthData.sellOutUnits,
      sellThroughRate: monthData.totalRecords > 0 ? monthData.sellThroughRateSum / monthData.totalRecords : 0,
      periodMonth: monthData.periodMonth,
    }))
    .sort((a, b) => new Date(a.periodMonth).getTime() - new Date(b.periodMonth).getTime());

  // Debug: Log the data to see what's happening
  ////console.log('Original sellThroughMetrics:', sellThroughMetrics.length, 'records');
  ////console.log('Aggregated sellThroughChartData:', sellThroughChartData.length, 'months');
  ////console.log('Chart data:', sellThroughChartData);

  const getPerformanceBadgeVariant = (category: string) => {
    switch (category) {
      case 'high': return 'default';
      case 'medium': return 'secondary';
      case 'low': return 'outline';
      case 'critical': return 'destructive';
      default: return 'secondary';
    }
  };

  // Check if any filters are selected
  const hasFilters = selectedProduct !== 'all' || selectedPartner !== 'all';
  
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

      {/* Show blank screen with message when no filters are selected */}
      {!hasFilters ? (
        <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
          <div className="text-center space-y-2">
            <h2 className="text-2xl font-semibold text-muted-foreground">
              Selecciona filtros para ver datos
            </h2>
            <p className="text-muted-foreground">
              Por favor selecciona al menos un filtro para visualizar los datos de análisis
            </p>
          </div>
        </div>
      ) : (
        <>
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
                <CardTitle className="text-sm font-medium">Avg Weeks of Cover</CardTitle>
                <Calendar className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{avgWeeksOfCover.toFixed(0)}</div>
                <p className="text-xs text-muted-foreground mt-1">
                  {avgWeeksOfCover > 4 ? 'High inventory levels' : 'Healthy inventory'}
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
                  <CardTitle>Sell Through</CardTitle>
                  <CardDescription>
                    Monthly sell-through performance
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-96">
                    <ResponsiveContainer width="100%" height="100%">
                      <ComposedChart data={sellThroughChartData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="date" />
                        <YAxis yAxisId="left" />
                        <YAxis yAxisId="right" orientation="right" />
                        <Tooltip 
                          content={({ active, payload, label }) => {
                            if (active && payload && payload.length) {
                              const data = payload[0].payload;
                              return (
                                <div className="bg-white p-3 border rounded-lg shadow-lg">
                                  <p className="font-medium">{label}</p>
                                  <p>Sell Through Rate: {data.sellThroughRate.toFixed(1)}%</p>
                                  <p>Sell In Units: {data.sellInUnits.toLocaleString()}</p>
                                  <p>Sell Out Units: {data.sellOutUnits.toLocaleString()}</p>
                                </div>
                              );
                            }
                            return null;
                          }}
                        />
                        <Bar 
                          yAxisId="right"
                          dataKey="sellOutUnits" 
                          fill="hsl(var(--secondary))"
                          name="Sell Out Units"
                        >
                          {sellThroughChartData.map((entry, index) => (
                            <Label
                              key={`label-${index}`}
                              content={({ x, y, width }) => {
                                if (typeof x === 'number' && typeof y === 'number' && typeof width === 'number') {
                                  return (
                                    <text
                                      x={x + width / 2}
                                      y={y - 10}
                                      textAnchor="middle"
                                      fill="hsl(var(--foreground))"
                                      fontSize="12"
                                      fontWeight="500"
                                    >
                                      {entry.sellThroughRate.toFixed(1)}%
                                    </text>
                                  );
                                }
                                return null;
                              }}
                            />
                          ))}
                        </Bar>
                        <Line 
                          yAxisId="left"
                          type="monotone" 
                          dataKey="sellInUnits" 
                          stroke="hsl(var(--primary))" 
                          strokeWidth={2}
                          name="Sell In Units"
                          dot={{ fill: 'hsl(var(--primary))', strokeWidth: 2, r: 4 }}
                        />
                      </ComposedChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader>
                  <CardTitle>Weeks of Cover</CardTitle>
                  <CardDescription>
                    Monitor inventory velocity across periods
                  </CardDescription>
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
                          dataKey="weeksOfCover" 
                          fill="hsl(var(--secondary))"
                          name="Weeks of Cover"
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
                    {sellThroughMetrics.map((metric, index) => {
                      const partner = partners.find(p => p.id === metric.customer_node_id);
                      const product = products.find(p => p.id === metric.product_id);
                      
                      // Calculate performance category based on sell-through rate
                      const rate = metric.sell_through_rate_pct || 0;
                      let category = 'medium';
                      if (rate >= 90) category = 'high';
                      else if (rate >= 70) category = 'medium';
                      else if (rate >= 50) category = 'low';
                      else category = 'critical';
                      
                      return (
                        <div key={`${metric.product_id}_${metric.customer_node_id}_${metric.period_month}_${index}`} className="flex items-center justify-between p-4 border rounded-lg">
                          <div className="space-y-1">
                            <div className="font-medium">
                              {partner?.customer_name || 'Unknown Partner'}
                            </div>
                            <div className="text-sm text-muted-foreground">
                              {product?.name || metric.product_id} • {format(new Date(metric.period_month), 'MMM yyyy')}
                            </div>
                          </div>
                          <div className="flex items-center gap-4">
                            <div className="text-right">
                              <div className="font-medium">{(metric.sell_through_rate_pct || 0).toFixed(1)}%</div>
                              <div className="text-sm text-muted-foreground">
                                {(metric.weeks_of_cover || 0).toFixed(0)} weeks cover
                              </div>
                            </div>
                            <Badge variant={getPerformanceBadgeVariant(category)}>
                              {category}
                            </Badge>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </>
      )}
    </div>
  );
}