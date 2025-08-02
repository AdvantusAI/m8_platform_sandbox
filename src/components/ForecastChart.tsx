
import React from 'react';
import Chart from 'react-apexcharts';
import { ApexOptions } from 'apexcharts';

interface ForecastData {
  postdate: string;
  forecast: number | null;
  actual: number | null;
  sales_plan: number | null;
  demand_planner: number | null;
  forecast_ly: number | null;
  upper_bound: number | null;
  lower_bound: number | null;
  fitted_history: number | null;
}

interface ForecastChartProps {
  data: ForecastData[];
}

export function ForecastChart({ data }: ForecastChartProps) {


  if (!data.length) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="text-lg font-medium text-muted-foreground">
            No hay datos para mostrar en el gráfico
          </div>
        </div>
      </div>
    );
  }

  // Prepare data for the chart
  const sortedData = [...data].sort((a, b) => new Date(a.postdate).getTime() - new Date(b.postdate).getTime());
  const categories = sortedData.map(item => item.postdate);

  // Find the last date where actual data exists (forecast start should be after actual ends)
  const findForecastStartDate = () => {
    // Find the last index where actual data exists
    let lastActualIndex = -1;
    for (let i = sortedData.length - 1; i >= 0; i--) {
      if (sortedData[i].actual !== null && sortedData[i].actual !== 0) {
        lastActualIndex = i;
        break;
      }
    }
    
    // If we found actual data, return the next date after the last actual data
    if (lastActualIndex >= 0 && lastActualIndex < sortedData.length - 1) {
      return sortedData[lastActualIndex + 1].postdate;
    }
    
    return null;
  };

  const forecastStartDate = findForecastStartDate();
 

  // Helper function to filter out null and zero values
  const filterValidValues = (data: (number | null)[], categories: string[]) => {
    return data.map((value, index) => {
      if (value === null || value === 0) {
        return null;
      }
      return { x: categories[index], y: value };
    }).filter(point => point !== null);
  };

  // Calculate trend line using linear regression on actual data
  const calculateTrendLine = () => {
    const actualData = sortedData
      .map((item, index) => ({ x: index, y: item.actual, date: item.postdate }))
      .filter(point => point.y !== null && point.y !== 0);

    if (actualData.length < 2) return [];

    // Linear regression calculation
    const n = actualData.length;
    const sumX = actualData.reduce((sum, point) => sum + point.x, 0);
    const sumY = actualData.reduce((sum, point) => sum + point.y!, 0);
    const sumXY = actualData.reduce((sum, point) => sum + point.x * point.y!, 0);
    const sumXX = actualData.reduce((sum, point) => sum + point.x * point.x, 0);

    const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
    const intercept = (sumY - slope * sumX) / n;

    // Generate trend line points across all dates
    return sortedData.map((item, index) => ({
      x: item.postdate,
      y: slope * index + intercept
    }));
  };

  const series = [
    {
      name: 'Historia de ventas',
      data: filterValidValues(sortedData.map(item => item.actual), categories),
    },
    {
      name: 'Forecast',
      data: filterValidValues(sortedData.map(item => item.forecast), categories),
    },
    {
      name: 'Objetivo de ventas',
      data: filterValidValues(sortedData.map(item => item.sales_plan), categories),
    },
    {
      name: 'Demand Planner',
      data: filterValidValues(sortedData.map(item => item.demand_planner), categories),
    },
    {
      name: 'Historia Ajustada',
      data: filterValidValues(sortedData.map(item => item.fitted_history), categories),
    },
    {
      name: 'Tendencia',
      data: calculateTrendLine(),
    }
    
    
  ];

 
  // Create a unique key based on data length and first/last dates to force complete remount
  const chartKey = `chart-${data.length}-${categories[0]}-${categories[categories.length - 1]}-${Date.now()}`;

  const options: ApexOptions = {
    chart: {
      height: 350,
      type: 'line',
      toolbar: {
        show: false,
      },
      zoom: {
        enabled: true,
      },
      animations: {
        enabled: false, // Disable animations to prevent interference
      },
      redrawOnParentResize: true,
      redrawOnWindowResize: true,
    },
    colors: ['#3B82F6', '#EF4444', '#10B981', '#F59E0B', '#8B5CF6', '#DC2626'],
    stroke: {
      width: [3, 3, 2, 2, 2, 2],
      curve: 'smooth',
      dashArray: [0, 0, 0, 0, 5, 8],
    },
    fill: {
      opacity: [1, 1, 1, 1, 1, 0.8],
    },
    markers: {
      size: [4, 4, 3, 3, 3, 0],
      strokeWidth: 2,
      strokeOpacity: 0.9,
      fillOpacity: 1,
      hover: {
        size: 6
      }
    },
    xaxis: {
      type: 'datetime',
      labels: {
        format: 'yyyy-MM-dd',
        style: {
          colors: '#374151'
        }
      },
      axisBorder: {
        show: true,
        color: '#E5E7EB'
      },
      axisTicks: {
        show: true,
        color: '#E5E7EB'
      }
    },
    yaxis: {
      title: {
        text: 'Cantidad',
        style: {
          color: '#374151',
          fontSize: '12px',
          fontWeight: 600
        }
      },
      labels: {
        formatter: function (val: number) {
          return new Intl.NumberFormat('en-US').format(val);
        },
        style: {
          colors: '#374151'
        }
      },
      axisBorder: {
        show: true,
        color: '#E5E7EB'
      }
    },
    tooltip: {
      enabled: true,
      shared: true,
      intersect: false,
      theme: 'light',
      followCursor: true,
      y: {
        formatter: function (val: number) {
          return new Intl.NumberFormat('en-US').format(val);
        },
      },
      x: {
        format: 'dd MMM yyyy'
      }
    },
    legend: {
      show: true,
      position: 'bottom',
      horizontalAlign: 'center',
      floating: false,
      fontSize: '12px',
      fontWeight: 500,
      offsetY: 10,
      labels: {
        colors: '#374151',
        useSeriesColors: false
      },
      markers: {
        strokeWidth: 0,
        offsetX: 0,
        offsetY: 0
      },
      itemMargin: {
        horizontal: 15,
        vertical: 5
      }
    },
    grid: {
      show: true,
      borderColor: '#E5E7EB',
      strokeDashArray: 1,
      position: 'back',
      xaxis: {
        lines: {
          show: false
        }
      },
      yaxis: {
        lines: {
          show: true
        }
      },
      padding: {
        top: 0,
        right: 0,
        bottom: 0,
        left: 0
      }
    },
  };

  return (
    <div className="w-full">
      <Chart
        key={chartKey}
        options={options}
        series={series}
        type="line"
        height={350}
      />
    </div>
  );
}
