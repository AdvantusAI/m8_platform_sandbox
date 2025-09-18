import React from 'react';
import Chart from 'react-apexcharts';
import { ApexOptions } from 'apexcharts';
import { Scenario } from '../types';

interface ForecastChartProps {
  scenarios: Scenario[];
}

const scenarioColors = {
  'base': '#3b82f6', // blue
  'optimistic': '#10b981', // green
  'pessimistic': '#f59e0b', // amber
};

export function ForecastChart({ scenarios }: ForecastChartProps) {
  const series = scenarios
    .filter(scenario => scenario.forecast)
    .map(scenario => ({
      name: scenario.name,
      data: scenario.forecast?.map(point => ({
        x: new Date(point.date).getTime(),
        y: point.value,
      })) || [],
      color: scenarioColors[scenario.id as keyof typeof scenarioColors] || '#6b7280',
    }));

  const options: ApexOptions = {
    chart: {
      type: 'line',
      height: 350,
      zoom: {
        enabled: true,
      },
      toolbar: {
        show: true,
      },
    },
    dataLabels: {
      enabled: false,
    },
    stroke: {
      curve: 'smooth',
      width: 3,
    },
    title: {
      text: 'Weekly Demand Forecast',
      align: 'left',
    },
    grid: {
      row: {
        colors: ['#f3f3f3', 'transparent'],
        opacity: 0.5,
      },
    },
    xaxis: {
      type: 'datetime',
      title: {
        text: 'Week',
      },
    },
    yaxis: {
      title: {
        text: 'Units',
      },
      labels: {
        formatter: (value: number) => {
          return new Intl.NumberFormat('en-US').format(value);
        },
      },
    },
    tooltip: {
      shared: true,
      intersect: false,
      x: {
        format: 'MMM dd, yyyy',
      },
      y: {
        formatter: (value: number) => {
          return new Intl.NumberFormat('en-US').format(value) + ' units';
        },
      },
    },
    legend: {
      position: 'top',
      horizontalAlign: 'right',
    },
    responsive: [
      {
        breakpoint: 768,
        options: {
          chart: {
            height: 300,
          },
          legend: {
            position: 'bottom',
          },
        },
      },
    ],
  };

  if (series.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-muted-foreground">
        No forecast data available
      </div>
    );
  }

  return (
    <div className="w-full">
      <Chart options={options} series={series} type="line" height={350} />
    </div>
  );
}