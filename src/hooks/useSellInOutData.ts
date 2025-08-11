import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

export interface SellInData {
  id: string;
  product_id: string;
  location_id: string;
  channel_partner_id: string;
  transaction_date: string;
  quantity: number;
  unit_price: number;
  total_value: number;
  invoice_number?: string;
  payment_terms?: string;
  discount_percentage?: number;
  transaction_metadata?: any;
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
  location_id: string;
  channel_partner_id: string;
  calculation_period: string;
  period_type: string;
  sell_through_rate: number;
  days_of_inventory: number;
  performance_category: string;
  inventory_turn_rate?: number;
  velocity_trend?: string;
  created_at: string;
  updated_at: string;
}

export const useSellInOutData = () => {
  const [loading, setLoading] = useState(false);
  const [sellInData, setSellInData] = useState<SellInData[]>([]);
  const [sellOutData, setSellOutData] = useState<SellOutData[]>([]);
  const [sellThroughMetrics, setSellThroughMetrics] = useState<SellThroughMetrics[]>([]);

  const fetchSellInData = useCallback(async (filters: {
    product_id?: string;
    location_id?: string;
    channel_partner_id?: string;
    start_date?: string;
    end_date?: string;
  } = {}) => {
    setLoading(true);
    try {
      let query = supabase.from('sell_in_data').select('*');
      
      if (filters.product_id) query = query.eq('product_id', filters.product_id);
      if (filters.location_id) query = query.eq('location_id', filters.location_id);
      if (filters.channel_partner_id) query = query.eq('channel_partner_id', filters.channel_partner_id);
      if (filters.start_date) query = query.gte('transaction_date', filters.start_date);
      if (filters.end_date) query = query.lte('transaction_date', filters.end_date);

      const { data, error } = await query.order('transaction_date', { ascending: false });
      
      if (error) throw error;
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
  }, []);

  const fetchSellOutData = useCallback(async (filters: {
    product_id?: string;
    location_id?: string;
    channel_partner_id?: string;
    start_date?: string;
    end_date?: string;
  } = {}) => {
    setLoading(true);
    try {
      let query = supabase.from('sell_out_data').select('*');
      
      if (filters.product_id) query = query.eq('product_id', filters.product_id);
      if (filters.location_id) query = query.eq('location_id', filters.location_id);
      if (filters.channel_partner_id) query = query.eq('channel_partner_id', filters.channel_partner_id);
      if (filters.start_date) query = query.gte('transaction_date', filters.start_date);
      if (filters.end_date) query = query.lte('transaction_date', filters.end_date);

      const { data, error } = await query.order('transaction_date', { ascending: false });
      
      if (error) throw error;
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
    channel_partner_id?: string;
    period_start?: string;
    period_end?: string;
  } = {}) => {
    setLoading(true);
    try {
      let query = supabase.from('sell_through_rates').select('*');
      
      if (filters.product_id) query = query.eq('product_id', filters.product_id);
      if (filters.location_id) query = query.eq('location_id', filters.location_id);
      if (filters.channel_partner_id) query = query.eq('channel_partner_id', filters.channel_partner_id);
      if (filters.period_start) query = query.gte('calculation_period', filters.period_start);
      if (filters.period_end) query = query.lte('calculation_period', filters.period_end);

      const { data, error } = await query.order('calculation_period', { ascending: false });
      
      if (error) throw error;
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
      const { error } = await supabase.from('sell_in_data').insert([data]);
      if (error) throw error;
      
      toast({
        title: "Success",
        description: "Sell-in record created successfully",
      });
      
      return true;
    } catch (error) {
      console.error('Error creating sell-in record:', error);
      toast({
        title: "Error",
        description: "Failed to create sell-in record",
        variant: "destructive",
      });
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  const createSellOutRecord = useCallback(async (data: Omit<SellOutData, 'id'>) => {
    setLoading(true);
    try {
      const { error } = await supabase.from('sell_out_data').insert([data]);
      if (error) throw error;
      
      toast({
        title: "Success",
        description: "Sell-out record created successfully",
      });
      
      return true;
    } catch (error) {
      console.error('Error creating sell-out record:', error);
      toast({
        title: "Error",
        description: "Failed to create sell-out record",
        variant: "destructive",
      });
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  const refreshSellThroughRates = useCallback(async (periodStart?: string, periodEnd?: string) => {
    setLoading(true);
    try {
      const { error } = await supabase.rpc('refresh_sell_through_rates', {
        p_period_start: periodStart,
        p_period_end: periodEnd
      });
      
      if (error) throw error;
      
      toast({
        title: "Success",
        description: "Sell-through rates refreshed successfully",
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