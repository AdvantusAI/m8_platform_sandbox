import React, { useMemo, useEffect } from 'react';
import Highcharts from 'highcharts';
import HighchartsReact from 'highcharts-react-official';

interface ProductSalesData {
  product_id: string;
  product_name: string;
  category_name: string;
  subcategory_name: string;
  class_name?: string;
  total_sales: number;
}

interface ProductSalesTreemapProps {
  data: ProductSalesData[];
  title?: string;
  height?: number;
  selectedLevel: 'category' | 'subcategory' | 'class' | 'product';
}

export const ProductSalesTreemap: React.FC<ProductSalesTreemapProps> = ({
  data,
  title = "Product Sales Distribution",
  height = 500,
  selectedLevel
}) => {
  const [treemapLoaded, setTreemapLoaded] = React.useState(false);

  // Import treemap module
  useEffect(() => {
    const initTreemap = async () => {
      try {
        const treemapModule = await import('highcharts/modules/treemap');
        if (treemapModule.default) {
          treemapModule.default(Highcharts);
        } else if (treemapModule) {
          treemapModule(Highcharts);
        }
        setTreemapLoaded(true);
      } catch (error) {
        console.warn('Failed to load treemap module, falling back to column chart:', error);
        setTreemapLoaded(true); // Still set to true to render fallback
      }
    };
    initTreemap();
  }, []);

  const chartOptions = useMemo(() => {
    if (!data || data.length === 0) {
      return {
        title: {
          text: title
        },
        series: []
      };
    }

    // Always show individual products exploded (not grouped by hierarchy)
    // This shows all distinct product_ids with their aggregated sales
    const groupedData = data.map(item => ({
      name: item.product_name,
      value: item.total_sales,
      product_id: item.product_id,
      category_name: item.category_name,
      subcategory_name: item.subcategory_name,
      class_name: item.class_name
    }));

    // Sort by value (descending)
    groupedData.sort((a, b) => b.value - a.value);

    const chartType = treemapLoaded ? 'treemap' : 'column';
    
    return {
      chart: {
        type: chartType,
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
        text: `${data.length} individual products • Total Sales: ${new Intl.NumberFormat('en-US', {
          notation: 'compact',
          maximumFractionDigits: 1
        }).format(data.reduce((sum, item) => sum + item.total_sales, 0))}`,
        style: {
          fontSize: '12px',
          color: '#6b7280'
        }
      },
      ...(treemapLoaded ? {
        colorAxis: {
          minColor: '#fef3c7',
          maxColor: '#f59e0b',
          stops: [
            [0, '#fef3c7'],
            [0.2, '#fde68a'],
            [0.4, '#fcd34d'],
            [0.6, '#fbbf24'],
            [0.8, '#f59e0b'],
            [1, '#d97706']
          ]
        }
      } : {}),
      legend: {
        enabled: false
      },
      tooltip: {
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
          const value = new Intl.NumberFormat('en-US', {
            minimumFractionDigits: 0,
            maximumFractionDigits: 0
          }).format(this.point.value);
          
          const percentage = ((this.point.value / data.reduce((sum, item) => sum + item.total_sales, 0)) * 100).toFixed(1);
          
          let tooltip = `
            <b>${this.point.name}</b><br/>
            Product ID: <b>${this.point.product_id}</b><br/>
            Sales: <b>${value}</b><br/>
            Share: <b>${percentage}%</b>
          `;
          
          if (this.point.category_name) {
            tooltip += `<br/>Category: ${this.point.category_name}`;
          }
          if (this.point.subcategory_name) {
            tooltip += `<br/>Subcategory: ${this.point.subcategory_name}`;
          }
          if (this.point.class_name) {
            tooltip += `<br/>Class: ${this.point.class_name}`;
          }
          
          return tooltip;
        }
      },
      plotOptions: treemapLoaded ? {
        treemap: {
          layoutAlgorithm: 'squarified',
          allowDrillToNode: true,
          animationLimit: 1000,
          dataLabels: {
            enabled: true,
            style: {
              fontSize: '12px',
              fontWeight: '700',
              color: '#ffffff'
            },
            formatter: function() {
              // Show labels for all rectangles with data
              if (this.point.value > 0) {
                // Show product name and total sales
                const salesValue = new Intl.NumberFormat('en-US', {
                  notation: 'compact',
                  maximumFractionDigits: 1
                }).format(this.point.value);
                return `${this.point.name}<br/><small>${salesValue}</small>`;
              }
              return '';
            }
          },
          levels: [
            {
              level: 1,
              dataLabels: {
                enabled: true,
                style: {
                  fontSize: '12px',
                  fontWeight: '700',
                  color: '#ffffff'
                }
              },
              borderWidth: 2,
              borderColor: '#ffffff'
            }
          ]
        }
      } : {
        column: {
          dataLabels: {
            enabled: true,
            style: {
              fontSize: '11px',
              fontWeight: '600',
              color: '#374151'
            },
            formatter: function() {
              const salesValue = new Intl.NumberFormat('en-US', {
                notation: 'compact',
                maximumFractionDigits: 1
              }).format(this.point.y);
              return `${this.point.name}<br/><small>${salesValue}</small>`;
            }
          }
        }
      },
      series: [
        {
          type: chartType,
          ...(treemapLoaded ? { layoutAlgorithm: 'squarified' } : {}),
          data: treemapLoaded ? groupedData : groupedData.map(item => ({
            name: item.name,
            y: item.value
          })),
          name: 'Product Sales',
          colorByPoint: true
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
            plotOptions: {
              treemap: {
                dataLabels: {
                  style: {
                    fontSize: '9px'
                  }
                }
              }
            }
          }
        }]
      }
    };
  }, [data, title, height, selectedLevel, treemapLoaded]);

  return (
    <div className="w-full">
      <HighchartsReact
        highcharts={Highcharts}
        options={chartOptions}
      />
    </div>
  );
};
