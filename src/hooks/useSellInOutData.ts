import { useState, useCallback } from 'react';
import { toast } from '@/hooks/use-toast';

export interface SellInData {
  id: string;
  product_id: string;
  location_id: string;
  channel_partner_id: string; // Maps to customer_id in the view
  transaction_date: string; // Maps to postdate in the view
  quantity: number; // Maps to value in the view
  unit_price: number; // Not available in view, defaults to 0
  total_value: number; // Not available in view, defaults to 0
  invoice_number?: string; // Not available in view
  payment_terms?: string; // Not available in view
  discount_percentage?: number; // Not available in view
  transaction_metadata?: any; // Not available in view
}

export interface SellOutData {
  id: string;
  product_id: string;
  location_id: string;
  channel_partner_id: string;
  transaction_date: string;
  quantity: number;
  unit_price: number;
  total_value: number;
  end_customer_id?: string;
  inventory_on_hand?: number;
  transaction_metadata?: any;
}

export interface SellThroughMetrics {
  id: string;
  product_id: string;
  location_id?: string;
  channel_partner_id: string;
  calculation_period: string;
  sell_in_units: number;
  sell_out_units: number;
  inventory_units: number;
  sell_through_rate: number;
  days_of_inventory: number;
  performance_category: 'high' | 'medium' | 'low' | 'critical';
  weeks_of_cover?: number;
  potential_stockout: boolean;
  last_updated: string;
  // Legacy compatibility fields
  customer_id?: string;
  period_month?: string;
  eom_inventory_units?: number;
  sell_through_rate_pct?: number;
  any_promo?: boolean;
}

export const useSellInOutData = () => {
  const [loading, setLoading] = useState(false);
  const [sellInData, setSellInData] = useState<SellInData[]>([]);
  const [sellOutData, setSellOutData] = useState<SellOutData[]>([]);
  const [sellThroughMetrics, setSellThroughMetrics] = useState<SellThroughMetrics[]>([]);

  const fetchSellInData = useCallback(async (filters: {
    product_id?: string;
    location_id?: string;
    customer_id?: string;
    start_date?: string;
    end_date?: string;
  } = {}) => {
    setLoading(true);
    try {
      // Build query parameters
      const searchParams = new URLSearchParams();
      
      if (filters.product_id) searchParams.append('product_id', filters.product_id);
      if (filters.location_id) searchParams.append('location_id', filters.location_id);
      if (filters.customer_id) searchParams.append('customer_id', filters.customer_id);
      if (filters.start_date) searchParams.append('start_date', filters.start_date);
      if (filters.end_date) searchParams.append('end_date', filters.end_date);

      const url = `/api/sell-in-data${searchParams.toString() ? '?' + searchParams.toString() : ''}`;
      console.log('Fetching sell-in data from:', url);
      
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch sell-in data: ${response.statusText}`);
      }
      
      const data = await response.json();
      console.log('Received sell-in data:', data.length);
      
      setSellInData(data || []);
    } catch (error) {
      console.error('Error fetching sell-in data:', error);
      toast({
        title: "Error",
        description: "Failed to fetch sell-in data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, []);  const fetchSellOutData = useCallback(async (filters: {
    product_id?: string;
    location_id?: string;
    channel_partner_id?: string;
    start_date?: string;
    end_date?: string;
  } = {}) => {
    setLoading(true);
    try {
      // Build query parameters
      const searchParams = new URLSearchParams();
      
      if (filters.product_id) searchParams.append('product_id', filters.product_id);
      if (filters.location_id) searchParams.append('location_id', filters.location_id);
      if (filters.channel_partner_id) searchParams.append('channel_partner_id', filters.channel_partner_id);
      if (filters.start_date) searchParams.append('start_date', filters.start_date);
      if (filters.end_date) searchParams.append('end_date', filters.end_date);

      const url = `/api/sell-out-data${searchParams.toString() ? '?' + searchParams.toString() : ''}`;
      console.log('Fetching sell-out data from:', url);
      
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch sell-out data: ${response.statusText}`);
      }
      
      const data = await response.json();
      console.log('Received sell-out data:', data.length);
      
      setSellOutData(data || []);
    } catch (error) {
      console.error('Error fetching sell-out data:', error);
      toast({
        title: "Error",
        description: "Failed to fetch sell-out data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchSellThroughMetrics = useCallback(async (filters: {
    product_id?: string;
    location_id?: string;
    customer_id?: string;
    channel_partner_id?: string;
    period_start?: string;
    period_end?: string;
  } = {}) => {
    setLoading(true);
    try {
      // Build query parameters
      const searchParams = new URLSearchParams();
      
      if (filters.product_id) searchParams.append('product_id', filters.product_id);
      if (filters.channel_partner_id) searchParams.append('channel_partner_id', filters.channel_partner_id);
      if (filters.customer_id) searchParams.append('channel_partner_id', filters.customer_id); // Map customer_id to channel_partner_id
      if (filters.period_start) searchParams.append('period_start', filters.period_start);
      if (filters.period_end) searchParams.append('period_end', filters.period_end);

      const url = `/api/sell-through-metrics${searchParams.toString() ? '?' + searchParams.toString() : ''}`;
      console.log('Fetching sell-through metrics from:', url);
      
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch sell-through metrics: ${response.statusText}`);
      }
      
      const data = await response.json();
      console.log('Received sell-through metrics:', data.length);
      
      setSellThroughMetrics(data || []);
    } catch (error) {
      console.error('Error fetching sell-through metrics:', error);
      toast({
        title: "Error",
        description: "Failed to fetch sell-through metrics",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, []);

  const createSellInRecord = useCallback(async (data: Omit<SellInData, 'id'>) => {
    setLoading(true);
    try {
      console.log('Creating sell-in record with data:', data);
      
      const response = await fetch('/api/sell-in-data', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });
      
      if (!response.ok) {
        throw new Error(`Failed to create sell-in record: ${response.statusText}`);
      }
      
      const result = await response.json();
      console.log('Sell-in record created:', result);
      
      // Update local state with the new record
      setSellInData(prev => [...prev, result]);
      
      toast({
        title: "Success",
        description: "Sell-in record created successfully",
      });
      
      return result;
    } catch (error) {
      console.error('Error creating sell-in record:', error);
      toast({
        title: "Error",
        description: "Failed to create sell-in record",
        variant: "destructive",
      });
      throw error;
    } finally {
      setLoading(false);
    }
  }, []);

  const createSellOutRecord = useCallback(async (data: Omit<SellOutData, 'id'>) => {
    setLoading(true);
    try {
      console.log('Creating sell-out record with data:', data);
      
      const response = await fetch('/api/sell-out-data', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });
      
      if (!response.ok) {
        throw new Error(`Failed to create sell-out record: ${response.statusText}`);
      }
      
      const result = await response.json();
      console.log('Sell-out record created:', result);
      
      // Update local state with the new record
      setSellOutData(prev => [...prev, result]);
      
      toast({
        title: "Success",
        description: "Sell-out record created successfully",
      });
      
      return result;
    } catch (error) {
      console.error('Error creating sell-out record:', error);
      toast({
        title: "Error",
        description: "Failed to create sell-out record",
        variant: "destructive",
      });
      throw error;
    } finally {
      setLoading(false);
    }
  }, []);

  const refreshSellThroughRates = useCallback(async (periodStart?: string, periodEnd?: string) => {
    setLoading(true);
    try {
      console.log('Refreshing sell-through rates...');
      
      const response = await fetch('/api/sell-through-metrics/refresh', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          period_start: periodStart,
          period_end: periodEnd,
        }),
      });
      
      if (!response.ok) {
        throw new Error(`Failed to refresh sell-through rates: ${response.statusText}`);
      }
      
      const result = await response.json();
      console.log('Refresh result:', result);
      
      toast({
        title: "Success",
        description: result.message || "Sell-through rates refreshed successfully",
      });
      
      return true;
    } catch (error) {
      console.error('Error refreshing sell-through rates:', error);
      toast({
        title: "Error",
        description: "Failed to refresh sell-through rates",
        variant: "destructive",
      });
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    loading,
    sellInData,
    sellOutData,
    sellThroughMetrics,
    fetchSellInData,
    fetchSellOutData,
    fetchSellThroughMetrics,
    createSellInRecord,
    createSellOutRecord,
    refreshSellThroughRates,
  };
};