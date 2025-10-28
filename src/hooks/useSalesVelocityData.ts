import { useState, useCallback } from 'react';
import { toast } from '@/hooks/use-toast';

export interface SalesVelocityData {
  id: string;
  product_id: string;
  channel_partner_id: string;
  location_id: string;
  period: string;
  velocity_units_per_day: number;
  velocity_units_per_week: number;
  normalized_velocity_per_location: number;
  trailing_velocity_l3m: number;
  trailing_velocity_l6m: number;
  active_locations: number;
  sell_out_units: number;
  days_in_month: number;
}

export interface VelocityMetrics {
  id: string;
  product_id: string;
  channel_partner_id: string;
  location_id: string;
  velocity_units_per_day: number;
  velocity_units_per_week: number;
  normalized_velocity_per_location: number;
  trailing_velocity_l3m: number;
  trailing_velocity_l6m: number;
  velocity_rank: number;
  coefficient_of_variation: number;
  recommended_order_qty: number;
  weeks_of_cover: number;
  created_at: string;
  updated_at: string;
}

export interface TopMover {
  product_id: string;
  product_name: string;
  velocity_units_per_week: number;
  velocity_rank: number;
}

export interface VelocityAlert {
  id: string;
  type: 'overstock' | 'replenishment';
  product_id: string;
  product_name: string;
  partner_id: string;
  partner_name: string;
  message: string;
  recommended_action: string;
  severity: 'low' | 'medium' | 'high';
}

export const useSalesVelocityData = () => {
  const [loading, setLoading] = useState(false);
  const [velocityData, setVelocityData] = useState<SalesVelocityData[]>([]);
  const [velocityMetrics, setVelocityMetrics] = useState<VelocityMetrics[]>([]);
  const [topMovers, setTopMovers] = useState<TopMover[]>([]);
  const [alerts, setAlerts] = useState<VelocityAlert[]>([]);

  const fetchVelocityData = useCallback(async (filters: {
    product_id?: string;
    customer_id?: string;
    location_id?: string;
    period_start?: string;
    period_end?: string;
  } = {}) => {
    setLoading(true);
    try {
      // Build query parameters for MongoDB API
      const params = new URLSearchParams();
      if (filters.product_id) params.append('product_id', filters.product_id);
      if (filters.customer_id) params.append('channel_partner_id', filters.customer_id);
      if (filters.location_id) params.append('location_id', filters.location_id);
      if (filters.period_start) params.append('period_start', filters.period_start);
      if (filters.period_end) params.append('period_end', filters.period_end);

      const response = await fetch(`http://localhost:3001/api/sell-through-metrics?${params.toString()}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch velocity data');
      }

      const data = await response.json();

      // Transform sell-through metrics data to velocity data format
      const velocityData: SalesVelocityData[] = data.map((record: any) => ({
        id: record.id || record._id?.toString(),
        product_id: record.product_id,
        channel_partner_id: record.channel_partner_id, // This should match the id field in customer collection (UUID)
        location_id: record.location_id,
        period: record.calculation_period,
        velocity_units_per_day: (record.sell_out_units || 0) / 30, // Approximate daily velocity
        velocity_units_per_week: (record.sell_out_units || 0) / 4, // Approximate weekly velocity
        normalized_velocity_per_location: record.sell_out_units || 0,
        trailing_velocity_l3m: 0, // Would need historical calculation
        trailing_velocity_l6m: 0, // Would need historical calculation
        active_locations: 1, // Assuming 1 location per record
        sell_out_units: record.sell_out_units || 0,
        days_in_month: 30, // Default assumption
      }));
      
      setVelocityData(velocityData);
    } catch (error) {
      console.error('Error fetching velocity data:', error);
      toast({
        title: "Error",
        description: "Failed to fetch velocity data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchVelocityMetrics = useCallback(async (filters: {
    product_id?: string;
    customer_id?: string;
    location_id?: string;
    period_start?: string;
    period_end?: string;
  } = {}) => {
    setLoading(true);
    try {
      // Build query parameters for MongoDB API
      const params = new URLSearchParams();
      if (filters.product_id) params.append('product_id', filters.product_id);
      if (filters.customer_id) params.append('channel_partner_id', filters.customer_id);
      if (filters.location_id) params.append('location_id', filters.location_id);
      if (filters.period_start) params.append('period_start', filters.period_start);
      if (filters.period_end) params.append('period_end', filters.period_end);

      const response = await fetch(`http://localhost:3001/api/sell-through-metrics?${params.toString()}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch velocity metrics');
      }

      const data = await response.json();

      // Transform sell-through metrics data to velocity metrics format
      const metrics: VelocityMetrics[] = data.map((record: any, index: number) => ({
        id: record.id || record._id?.toString(),
        product_id: record.product_id,
        channel_partner_id: record.channel_partner_id, // This should match the id field in customer collection (UUID)
        location_id: record.location_id,
        velocity_units_per_day: (record.sell_out_units || 0) / 30, // Approximate daily velocity
        velocity_units_per_week: (record.sell_out_units || 0) / 4, // Approximate weekly velocity
        normalized_velocity_per_location: record.sell_out_units || 0,
        trailing_velocity_l3m: 0, // Would need historical calculation
        trailing_velocity_l6m: 0, // Would need historical calculation
        velocity_rank: index + 1, // Simple ranking based on order
        coefficient_of_variation: 0.15, // Placeholder - would need calculation
        recommended_order_qty: Math.round(((record.sell_out_units || 0) / 4) * 2), // Simple calculation
        weeks_of_cover: record.inventory_units ? Math.round((record.inventory_units / ((record.sell_out_units || 1) / 4))) : 0,
        created_at: record.created_at || new Date().toISOString(),
        updated_at: record.updated_at || new Date().toISOString(),
      }));

      setVelocityMetrics(metrics);

      // Fetch customer and product data for proper names
      const [customersResponse, productsResponse] = await Promise.all([
        fetch('http://localhost:3001/api/customers'),
        fetch('http://localhost:3001/api/products')
      ]);

      const customers = customersResponse.ok ? await customersResponse.json() : [];
      const products = productsResponse.ok ? await productsResponse.json() : [];

      // Generate top movers with actual product names
      const topMoversData: TopMover[] = metrics
        .sort((a, b) => b.velocity_units_per_week - a.velocity_units_per_week)
        .slice(0, 5)
        .map(metric => {
          const product = products.find((p: any) => p.product_id === metric.product_id);
          return {
            product_id: metric.product_id,
            product_name: product?.product_name || `Product ${metric.product_id}`,
            velocity_units_per_week: metric.velocity_units_per_week,
            velocity_rank: metric.velocity_rank,
          };
        });

      setTopMovers(topMoversData);

      // Generate alerts with actual customer and product names
      const alertsData: VelocityAlert[] = [];
      
      console.log('Debug - Customers data:', customers);
      console.log('Debug - Sample customer:', customers[0]);
      
      metrics.forEach(metric => {
        console.log('Debug - Looking for channel_partner_id:', metric.channel_partner_id);
        
        // channel_partner_id should match the id field in customer collection
        const customer = customers.find((c: any) => {
          console.log('Debug - Checking customer id:', c.id, 'type:', typeof c.id);
          
          // Try multiple extraction methods
          let customerId = c.id;
          
          // Method 1: Direct match
          if (customerId === metric.channel_partner_id) {
            console.log('Debug - Direct match found');
            return true;
          }
          
          // Method 2: Extract from UUID('...') format
          if (typeof customerId === 'string' && customerId.includes('UUID(')) {
            const match = customerId.match(/UUID\('([^']+)'\)/);
            if (match) {
              customerId = match[1];
              console.log('Debug - Extracted UUID:', customerId);
              const isMatch = customerId === metric.channel_partner_id;
              console.log('Debug - UUID match:', customerId, '===', metric.channel_partner_id, '=', isMatch);
              return isMatch;
            }
          }
          
          // Method 3: Try string conversion
          const customerIdStr = String(customerId);
          const isStringMatch = customerIdStr === metric.channel_partner_id;
          console.log('Debug - String match:', customerIdStr, '===', metric.channel_partner_id, '=', isStringMatch);
          
          return isStringMatch;
        });
        
        console.log('Debug - Found customer:', customer?.customer_name);
        
        const product = products.find((p: any) => p.product_id === metric.product_id);
        
        const customerName = customer?.customer_name || `Unknown Customer`;
        const productName = product?.product_name || `Product ${metric.product_id}`;
        
        // Overstock alert: low velocity + high weeks of cover
        if (metric.velocity_units_per_week < 20 && metric.weeks_of_cover > 8) {
          alertsData.push({
            id: `overstock_${metric.id}`,
            type: 'overstock',
            product_id: metric.product_id,
            product_name: productName,
            partner_id: metric.channel_partner_id,
            partner_name: customerName,
            message: `Low velocity (${metric.velocity_units_per_week.toFixed(1)} units/week) with ${metric.weeks_of_cover.toFixed(1)} weeks of cover`,
            recommended_action: 'Consider promotional activities or inventory redistribution',
            severity: metric.weeks_of_cover > 12 ? 'high' : 'medium',
          });
        }
        
        // Replenishment alert: high velocity + low weeks of cover
        if (metric.velocity_units_per_week > 50 && metric.weeks_of_cover < 3) {
          alertsData.push({
            id: `replenishment_${metric.id}`,
            type: 'replenishment',
            product_id: metric.product_id,
            product_name: productName,
            partner_id: metric.channel_partner_id,
            partner_name: customerName,
            message: `High velocity (${metric.velocity_units_per_week.toFixed(1)} units/week) with only ${metric.weeks_of_cover.toFixed(1)} weeks of cover`,
            recommended_action: `Order ${metric.recommended_order_qty} units immediately`,
            severity: metric.weeks_of_cover < 1.5 ? 'high' : 'medium',
          });
        }
      });

      setAlerts(alertsData);
      
    } catch (error) {
      console.error('Error fetching velocity metrics:', error);
      toast({
        title: "Error",
        description: "Failed to fetch velocity metrics",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, []);

  const exportVelocityReport = useCallback(async (filters: {
    product_id?: string;
    channel_partner_id?: string;
    location_id?: string;
  } = {}) => {
    try {
      // Simulate CSV export
      const csvData = velocityMetrics.map(metric => ({
        'Product ID': metric.product_id,
        'Channel Partner ID': metric.channel_partner_id,
        'Location ID': metric.location_id,
        'Velocity (Units/Week)': metric.velocity_units_per_week.toFixed(2),
        'Velocity (Units/Day)': metric.velocity_units_per_day.toFixed(2),
        'Trailing 3M Velocity': metric.trailing_velocity_l3m.toFixed(2),
        'Trailing 6M Velocity': metric.trailing_velocity_l6m.toFixed(2),
        'Velocity Rank': metric.velocity_rank,
        'Coefficient of Variation': metric.coefficient_of_variation.toFixed(3),
        'Weeks of Cover': metric.weeks_of_cover.toFixed(1),
        'Recommended Order Qty': metric.recommended_order_qty,
      }));

      const csvContent = [
        Object.keys(csvData[0] || {}).join(','),
        ...csvData.map(row => Object.values(row).join(','))
      ].join('\n');

      const blob = new Blob([csvContent], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `velocity-report-${new Date().toISOString().split('T')[0]}.csv`;
      a.click();
      window.URL.revokeObjectURL(url);

      toast({
        title: "Success",
        description: "Velocity report exported successfully",
      });
    } catch (error) {
      console.error('Error exporting velocity report:', error);
      toast({
        title: "Error",
        description: "Failed to export velocity report",
        variant: "destructive",
      });
    }
  }, [velocityMetrics]);

  return {
    loading,
    velocityData,
    velocityMetrics,
    topMovers,
    alerts,
    fetchVelocityData,
    fetchVelocityMetrics,
    exportVelocityReport,
  };
};