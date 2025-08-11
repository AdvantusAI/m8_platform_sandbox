import { LineChart, Line, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Legend } from 'recharts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { ChartDataPoint } from '@/services/inventoryProjectionsChartService';

interface InventoryProjectionsChartProps {
  data: ChartDataPoint[];
  loading: boolean;
  error: string | null;
}

const chartConfig = {
  forecasted_demand: {
    label: "Demand",
    color: "hsl(var(--chart-1))",
  },
  projected_ending_inventory: {
    label: "Inventario",
    color: "hsl(var(--chart-2))",
  },
};

export function InventoryProjectionsChart({ data, loading, error }: InventoryProjectionsChartProps) {
  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Inventory Projections</CardTitle>
          <CardDescription>Monthly demand and inventory trends</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-64">
            <div className="text-muted-foreground">Loading chart data...</div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Inventory Projections</CardTitle>
          <CardDescription>Monthly demand and inventory trends</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-64">
            <div className="text-destructive">Error: {error}</div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!data || data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Inventory Projections</CardTitle>
          <CardDescription>Monthly demand and inventory trends</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-64">
            <div className="text-muted-foreground">No data available. Please select filters to view projections.</div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Inventory Projections</CardTitle>
        <CardDescription>Monthly demand and inventory trends</CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig}>
          <ResponsiveContainer width="100%" height={400}>
            <LineChart data={data}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                dataKey="projection_month" 
                tickFormatter={(value) => {
                  try {
                    return new Date(value).toLocaleDateString('es-ES', { 
                      year: 'numeric', 
                      month: 'short' 
                    });
                  } catch {
                    return value;
                  }
                }}
              />
              <YAxis />
              <ChartTooltip 
                content={<ChartTooltipContent />}
                labelFormatter={(value) => {
                  try {
                    return new Date(value).toLocaleDateString('es-ES', { 
                      year: 'numeric', 
                      month: 'long' 
                    });
                  } catch {
                    return value;
                  }
                }}
              />
              <Legend />
              <Line 
                type="monotone" 
                dataKey="forecasted_demand" 
                stroke={chartConfig.forecasted_demand.color}
                strokeWidth={2}
                name={chartConfig.forecasted_demand.label}
              />
              <Line 
                type="monotone" 
                dataKey="projected_ending_inventory" 
                stroke={chartConfig.projected_ending_inventory.color}
                strokeWidth={2}
                name={chartConfig.projected_ending_inventory.label}
              />
            </LineChart>
          </ResponsiveContainer>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}