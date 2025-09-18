import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import Highcharts from "highcharts";
import HighchartsReact from "highcharts-react-official";
import { useTheme } from "next-themes";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

interface HistoryForecastData {
  postdate: string;
  history: number | null;
  forecast: number | null;
  product_id: string;
  customer_node_id: string;
  location_node_id: string;
}

export function HistoryForecastChart() {
  const { theme } = useTheme();
  const [data, setData] = useState<HistoryForecastData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Using the existing forecast data function
        const { data: forecastData, error } = await supabase
          .rpc('get_aggregated_forecast_data');

        if (error) {
          console.error('Error fetching forecast data:', error);
          return;
        }

        // Transform forecast data to match our interface
        const transformedData: HistoryForecastData[] = (forecastData || []).map((item: any) => ({
          postdate: item.postdate,
          history: item.actual || 0, // Using actual as history
          forecast: item.forecast || 0,
          product_id: item.product_id,
          customer_node_id: item.customer_id,
          location_node_id: item.location_id,
        }));

        setData(transformedData);
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const isDark = theme === "dark";

  // Process data for chart
  const processedData = () => {
    // Group by postdate and aggregate values
    const groupedData = data.reduce((acc, item) => {
      const date = item.postdate;
      if (!acc[date]) {
        acc[date] = { history: 0, forecast: 0 };
      }
      acc[date].history += item.history || 0;
      acc[date].forecast += item.forecast || 0;
      return acc;
    }, {} as Record<string, { history: number; forecast: number }>);

    // Convert to arrays for Highcharts
    const dates = Object.keys(groupedData).sort();
    const historyData = dates.map(date => groupedData[date].history);
    const forecastData = dates.map(date => groupedData[date].forecast);

    return { dates, historyData, forecastData };
  };

  const { dates, historyData, forecastData } = processedData();

  const options: Highcharts.Options = {
    chart: {
      type: "line",
      backgroundColor: "transparent",
      height: 400,
      spacingTop: 10,
      spacingBottom: 10,
      spacingLeft: 10,
      spacingRight: 10,
    },
    title: {
      text: undefined,
    },
    credits: {
      enabled: false,
    },
    legend: {
      enabled: true,
      itemStyle: {
        color: isDark ? "#94A3B8" : "#64748B",
        fontSize: "12px",
      },
    },
    xAxis: {
      categories: dates,
      labels: {
        style: {
          color: isDark ? "#94A3B8" : "#64748B",
          fontSize: "12px",
        },
        rotation: -45,
      },
      lineColor: isDark ? "#334155" : "#E2E8F0",
      tickColor: isDark ? "#334155" : "#E2E8F0",
      gridLineColor: isDark ? "#334155" : "#E2E8F0",
    },
    yAxis: {
      title: {
        text: "Value",
        style: {
          color: isDark ? "#94A3B8" : "#64748B",
          fontSize: "12px",
        },
      },
      labels: {
        style: {
          color: isDark ? "#94A3B8" : "#64748B",
          fontSize: "12px",
        },
        formatter: function () {
          return this.value.toLocaleString();
        },
      },
      gridLineColor: isDark ? "#334155" : "#E2E8F0",
    },
    tooltip: {
      backgroundColor: isDark ? "#1E293B" : "#FFFFFF",
      borderColor: isDark ? "#334155" : "#E2E8F0",
      style: {
        color: isDark ? "#F8FAFC" : "#1E293B",
        fontSize: "12px",
      },
      shared: true,
      formatter: function () {
        let tooltip = `<b>${this.x}</b><br/>`;
        this.points?.forEach((point) => {
          tooltip += `<span style="color:${point.color}">${point.series.name}</span>: ${point.y?.toLocaleString()}<br/>`;
        });
        return tooltip;
      },
    },
    plotOptions: {
      line: {
        marker: {
          enabled: true,
          radius: 4,
        },
        lineWidth: 2,
      },
    },
    series: [
      {
        name: "History",
        data: historyData,
        color: "hsl(var(--primary))",
        type: "line",
      },
      {
        name: "Forecast",
        data: forecastData,
        color: "hsl(var(--info))",
        type: "line",
        dashStyle: "ShortDash",
      },
    ],
  };

  if (loading) {
    return (
      <Card className="shadow-soft">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-base font-semibold text-foreground">
            History vs Forecast
          </CardTitle>
          <Badge variant="outline" className="text-xs">
            Loading...
          </Badge>
        </CardHeader>
        <CardContent>
          <div className="h-[400px] w-full flex items-center justify-center">
            <div className="text-muted-foreground">Loading chart data...</div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="shadow-soft">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-base font-semibold text-foreground">
          History vs Forecast
        </CardTitle>
        <Badge variant="outline" className="text-xs">
          Trend Analysis
        </Badge>
      </CardHeader>
      <CardContent>
        <div className="h-[400px] w-full">
          <HighchartsReact
            highcharts={Highcharts}
            options={options}
            containerProps={{ style: { height: "100%", width: "100%" } }}
          />
        </div>
      </CardContent>
    </Card>
  );
}