import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import HighchartsReact from 'highcharts-react-official';
import Highcharts from 'highcharts';

const transitionData = [
  {
    name: 'Legacy Product Phase Out',
    data: [750, 720, 690, 650, 600, 550, 480, 420, 350, 280, 200, 120, 60, 0, 0, 0, 0, 0],
    color: '#8B5A2B', // Brown
  },
  {
    name: 'New Product Ramp Up',
    data: [0, 0, 0, 0, 20, 50, 100, 180, 280, 400, 520, 650, 720, 780, 800, 810, 790, 780],
    color: '#8B7DB8', // Purple
  }
];

const weekLabels = [
  'W1-2024', 'W2-2024', 'W3-2024', 'W4-2024', 'W5-2024', 'W6-2024', 
  'W7-2024', 'W8-2024', 'W9-2024', 'W10-2024', 'W11-2024', 'W12-2024',
  'W13-2024', 'W14-2024', 'W15-2024', 'W16-2024', 'W17-2024', 'W18-2024'
];

const phaseData = [
  { phase: 'Phase Out Split', weeks: ['W1-2024', 'W6-2024'], percentage: '100% → 0%' },
  { phase: 'Phase In Forecast', weeks: ['W5-2024', 'W14-2024'], percentage: '0% → 100%' },
  { phase: 'Final Forecast', weeks: ['W15-2024', 'W18-2024'], percentage: '100%' },
];

export function SupplyTransitionChart() {
  const options: Highcharts.Options = {
    chart: {
      type: 'column',
      height: 400,
      backgroundColor: 'transparent',
    },
    title: {
      text: 'Transition Final Forecast Graph',
      align: 'left',
      style: {
        fontSize: '16px',
        fontWeight: '600',
        color: 'hsl(var(--foreground))'
      }
    },
    xAxis: {
      categories: weekLabels,
      labels: {
        rotation: -45,
        style: {
          color: 'hsl(var(--muted-foreground))'
        }
      },
      lineColor: 'hsl(var(--border))',
    },
    yAxis: {
      title: {
        text: 'Units',
        style: {
          color: 'hsl(var(--foreground))'
        }
      },
      labels: {
        style: {
          color: 'hsl(var(--muted-foreground))'
        }
      },
      gridLineColor: 'hsl(var(--border))',
    },
    tooltip: {
      shared: true,
      backgroundColor: 'hsl(var(--background))',
      borderColor: 'hsl(var(--border))',
      style: {
        color: 'hsl(var(--foreground))'
      },
      formatter: function() {
        let tooltip = `<b>${this.x}</b><br/>`;
        this.points?.forEach(point => {
          tooltip += `${point.series.name}: <b>${point.y}</b> units<br/>`;
        });
        return tooltip;
      }
    },
    legend: {
      align: 'left',
      verticalAlign: 'top',
      itemStyle: {
        color: 'hsl(var(--foreground))'
      }
    },
    plotOptions: {
      column: {
        stacking: 'normal',
        borderWidth: 0,
      }
    },
    series: transitionData.map(item => ({
      name: item.name,
      data: item.data,
      color: item.color,
      type: 'column'
    })),
    credits: {
      enabled: false
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Supply Transition Planning</CardTitle>
            <CardDescription>
              Product transition forecast showing phase-out and ramp-up schedules
            </CardDescription>
          </div>
          <Badge variant="outline">Active Transition</Badge>
        </div>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="chart" className="space-y-4">
          <TabsList>
            <TabsTrigger value="chart">Transition Graph</TabsTrigger>
            <TabsTrigger value="phases">Transition Phases</TabsTrigger>
          </TabsList>
          
          <TabsContent value="chart">
            <div className="w-full">
              <HighchartsReact
                highcharts={Highcharts}
                options={options}
              />
            </div>
          </TabsContent>
          
          <TabsContent value="phases" className="space-y-4">
            <div className="grid gap-4">
              {phaseData.map((phase, index) => (
                <Card key={index} className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-medium">{phase.phase}</h4>
                      <p className="text-sm text-muted-foreground">
                        {phase.weeks[0]} - {phase.weeks[1]}
                      </p>
                    </div>
                    <Badge variant="secondary">{phase.percentage}</Badge>
                  </div>
                </Card>
              ))}
            </div>
            
            <div className="mt-6 p-4 bg-muted/50 rounded-lg">
              <h4 className="font-medium mb-2">Transition Summary</h4>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">Legacy Product:</span>
                  <p className="font-medium">Ultra-Thin Laptop Pro</p>
                </div>
                <div>
                  <span className="text-muted-foreground">New Product:</span>
                  <p className="font-medium">Ultra-Thin Laptop X1</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Transition Duration:</span>
                  <p className="font-medium">18 weeks</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Peak Overlap:</span>
                  <p className="font-medium">W8-W10 2024</p>
                </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}