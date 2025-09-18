import React, { useMemo } from 'react';
import Highcharts from 'highcharts';
import HighchartsReact from 'highcharts-react-official';

interface ForecastData {
  postdate: string;
  forecast: number | null;
  actual: number | null;
  sales_plan: number | null;
  demand_planner: number | null;
  forecast_ly: number | null;
  upper_bound: number | null;
  lower_bound: number | null;
  commercial_input: number | null;
  fitted_history?: number | null;
}

interface ForecastLineChartProps {
  data: ForecastData[];
  title?: string;
  height?: number;
}

export const ForecastLineChart: React.FC<ForecastLineChartProps> = ({
  data,
  title = "Forecast Data",
  height = 400
}) => {
  const chartOptions = useMemo(() => {
    if (!data || data.length === 0) {
      return {
        title: {
          text: title
        },
        series: []
      };
    }

    // Sort data by date
    const sortedData = [...data].sort((a, b) => 
      new Date(a.postdate).getTime() - new Date(b.postdate).getTime()
    );

    // Prepare series data - use null instead of 0 to hide zero points
    const forecastData = sortedData.map(item => [
      new Date(item.postdate).getTime(),
      item.forecast || null
    ]);

    const actualData = sortedData.map(item => [
      new Date(item.postdate).getTime(),
      item.actual || null
    ]);

    const salesPlanData = sortedData.map(item => [
      new Date(item.postdate).getTime(),
      item.sales_plan || null
    ]);

    const demandPlannerData = sortedData.map(item => [
      new Date(item.postdate).getTime(),
      item.demand_planner || null
    ]);

    const forecastLyData = sortedData.map(item => [
      new Date(item.postdate).getTime(),
      item.forecast_ly || null
    ]);

    const commercialInputData = sortedData.map(item => [
      new Date(item.postdate).getTime(),
      item.commercial_input || null
    ]);

    const fittedHistoryData = sortedData.map(item => [
      new Date(item.postdate).getTime(),
      item.fitted_history || null
    ]);

    // Upper and lower bounds for confidence interval
    const upperBoundData = sortedData.map(item => [
      new Date(item.postdate).getTime(),
      item.upper_bound || null
    ]);

    const lowerBoundData = sortedData.map(item => [
      new Date(item.postdate).getTime(),
      item.lower_bound || null
    ]);

    return {
      chart: {
        type: 'line',
        height: height,
        backgroundColor: '#ffffff',
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
        text: `${sortedData.length} data points`,
        style: {
          fontSize: '12px',
          color: '#6b7280'
        }
      },
      xAxis: {
        type: 'datetime',
        title: {
          text: 'Date',
          style: {
            fontSize: '12px',
            color: '#374151'
          }
        },
        labels: {
          style: {
            fontSize: '11px',
            color: '#6b7280'
          }
        },
        gridLineColor: '#f3f4f6',
        lineColor: '#e5e7eb'
      },
      yAxis: {
        title: {
          text: 'Value',
          style: {
            fontSize: '12px',
            color: '#374151'
          }
        },
        labels: {
          style: {
            fontSize: '11px',
            color: '#6b7280'
          },
          formatter: function() {
            return new Intl.NumberFormat('en-US', {
              notation: 'compact',
              maximumFractionDigits: 1
            }).format(this.value);
          }
        },
        gridLineColor: '#f3f4f6',
        lineColor: '#e5e7eb'
      },
      tooltip: {
        shared: true,
        crosshairs: true,
        backgroundColor: 'rgba(255, 255, 255, 0.95)',
        borderColor: '#e5e7eb',
        borderRadius: 8,
        shadow: {
          color: 'rgba(0, 0, 0, 0.1)',
          offsetX: 0,
          offsetY: 2,
          opacity: 0.1,
          width: 3
        },
        style: {
          fontSize: '12px',
          color: '#374151'
        },
        formatter: function() {
          const date = new Date(this.x).toLocaleDateString('es-ES', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
          });
          
          let tooltip = `<b>${date}</b><br/>`;
          
          this.points.forEach((point: any) => {
            // Only show points that have actual values (not null/undefined)
            if (point.y !== null && point.y !== undefined) {
              const value = new Intl.NumberFormat('en-US', {
                minimumFractionDigits: 0,
                maximumFractionDigits: 0
              }).format(point.y);
              tooltip += `<span style="color:${point.color}">●</span> ${point.series.name}: <b>${value}</b><br/>`;
            }
          });
          
          return tooltip;
        }
      },
      legend: {
        layout: 'horizontal',
        align: 'center',
        verticalAlign: 'bottom',
        itemStyle: {
          fontSize: '11px',
          color: '#374151'
        },
        itemHoverStyle: {
          color: '#1f2937'
        }
      },
      plotOptions: {
        line: {
          marker: {
            radius: 3,
            lineWidth: 1,
            lineColor: '#ffffff',
            enabled: true
          },
          lineWidth: 2,
          connectNulls: false
        },
        series: {
          marker: {
            enabled: true,
            radius: 3
          },
          connectNulls: false
        }
      },
      series: [
        {
          name: 'Forecast (M8.predict)',
          data: forecastData,
          color: '#3b82f6',
          zIndex: 3
        },
        {
          name: 'Actual',
          data: actualData,
          color: '#10b981',
          zIndex: 4
        },
        {
          name: 'Sales Plan',
          data: salesPlanData,
          color: '#f59e0b',
          zIndex: 2
        },
        {
          name: 'Demand Planner',
          data: demandPlannerData,
          color: '#8b5cf6',
          zIndex: 2
        },
        {
          name: 'Forecast LY',
          data: forecastLyData,
          color: '#6b7280',
          zIndex: 1
        },
        {
          name: 'Commercial Input',
          data: commercialInputData,
          color: '#ef4444',
          zIndex: 2
        },
        {
          name: 'Fitted History',
          data: fittedHistoryData,
          color: '#06b6d4',
          zIndex: 1
        },
        {
          name: 'Upper Bound',
          data: upperBoundData,
          color: '#3b82f6',
          type: 'line',
          dashStyle: 'dash',
          opacity: 0.3,
          zIndex: 0,
          showInLegend: false
        },
        {
          name: 'Lower Bound',
          data: lowerBoundData,
          color: '#3b82f6',
          type: 'line',
          dashStyle: 'dash',
          opacity: 0.3,
          zIndex: 0,
          showInLegend: false
        }
      ],
      credits: {
        enabled: false
      },
      responsive: {
        rules: [{
          condition: {
            maxWidth: 500
          },
          chartOptions: {
            legend: {
              layout: 'horizontal',
              align: 'center',
              verticalAlign: 'bottom'
            }
          }
        }]
      }
    };
  }, [data, title, height]);

  return (
    <div className="w-full">
      <HighchartsReact
        highcharts={Highcharts}
        options={chartOptions}
      />
    </div>
  );
};
