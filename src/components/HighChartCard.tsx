import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import Highcharts from "highcharts";
import HighchartsReact from "highcharts-react-official";
import { useTheme } from "next-themes";
import { useColorTheme } from "@/hooks/useColorTheme";

interface HighChartCardProps {
  title: string;
  data: Array<{ [key: string]: any }>;
  dataKey: string;
  xAxisKey?: string;
  color?: string;
  type?: "line" | "area";
  badge?: string;
  badgeVariant?: "default" | "secondary" | "destructive" | "outline";
}

export function HighChartCard({
  title,
  data,
  dataKey,
  xAxisKey = "name",
  color = "hsl(var(--primary))",
  type = "line",
  badge,
  badgeVariant = "outline",
}: HighChartCardProps) {
  const { theme } = useTheme();
  const { colorTheme } = useColorTheme();

  // Convert HSL color to hex for HighCharts
  const getColorFromHSL = (hslColor: string) => {
    if (hslColor.startsWith("hsl(var(--")) {
      // Map CSS variables to actual colors
      const colorMap: Record<string, string> = {
        "hsl(var(--primary))": getComputedStyle(document.documentElement).getPropertyValue('--primary'),
        "hsl(var(--info))": getComputedStyle(document.documentElement).getPropertyValue('--info'),
        "hsl(var(--success))": getComputedStyle(document.documentElement).getPropertyValue('--success'),
      };
      
      const hslValue = colorMap[hslColor];
      if (hslValue) {
        const [h, s, l] = hslValue.split(' ').map(v => parseFloat(v.replace('%', '')));
        return `hsl(${h}, ${s}%, ${l}%)`;
      }
    }
    return hslColor;
  };

  const chartColor = getColorFromHSL(color);
  const isDark = theme === "dark";

  // Prepare data for HighCharts
  const chartData = data.map(item => [item[xAxisKey], item[dataKey]]);
  const categories = data.map(item => item[xAxisKey]);

  const options: Highcharts.Options = {
    chart: {
      type: type === "area" ? "areaspline" : "line",
      backgroundColor: "transparent",
      height: 200,
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
      enabled: false,
    },
    xAxis: {
      categories: categories,
      labels: {
        style: {
          color: isDark ? "#94A3B8" : "#64748B",
          fontSize: "12px",
        },
      },
      lineColor: isDark ? "#334155" : "#E2E8F0",
      tickColor: isDark ? "#334155" : "#E2E8F0",
      gridLineColor: isDark ? "#334155" : "#E2E8F0",
    },
    yAxis: {
      title: {
        text: undefined,
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
      formatter: function () {
        return `<b>${this.x}</b><br/>${dataKey}: ${this.y?.toLocaleString()}`;
      },
    },
    plotOptions: {
      series: {
        marker: {
          enabled: false,
          states: {
            hover: {
              enabled: true,
              radius: 4,
            },
          },
        },
      },
      areaspline: {
        fillColor: {
          linearGradient: {
            x1: 0,
            y1: 0,
            x2: 0,
            y2: 1,
          },
          stops: [
            [0, `${chartColor}33`], // 20% opacity
            [1, `${chartColor}00`], // 0% opacity
          ],
        },
      },
    },
    series: [
      {
        name: dataKey,
        data: chartData.map(item => item[1]),
        color: chartColor,
        lineWidth: type === "line" ? 3 : 2,
        type: type === "area" ? "areaspline" : "line",
      },
    ],
  };

  return (
    <Card className="shadow-soft">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-base font-semibold text-foreground">
          {title}
        </CardTitle>
        {badge && (
          <Badge variant={badgeVariant} className="text-xs">
            {badge}
          </Badge>
        )}
      </CardHeader>
      <CardContent>
        <div className="h-[200px] w-full">
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