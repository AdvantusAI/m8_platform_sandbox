import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
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
  product_id: string;
  location_id: string;
  customer_id: string;
  period_month: string;
  sell_in_units: number;
  sell_out_units: number;
  eom_inventory_units: number;
  sell_through_rate_pct: number | null;
  weeks_of_cover: number | null;
  potential_stockout: boolean;
  any_promo: boolean;
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
      let query = (supabase as any)
        .schema('m8_schema')
        .from('v_time_series_data')
        .select('*');
      
      if (filters.product_id) query = query.eq('product_id', filters.product_id);
      if (filters.location_id) query = query.eq('location_id', filters.location_id);
      if (filters.customer_id) query = query.eq('customer_id', filters.customer_id);
      if (filters.start_date) query = query.gte('postdate', filters.start_date);
      if (filters.end_date) query = query.lte('postdate', filters.end_date);

      const { data, error } = await query.order('postdate', { ascending: false });
      
      if (error) throw error;
      
      // Transform the data to match the SellInData interface
      const transformedData = (data || []).map((item: any) => ({
        id: `${item.product_id}_${item.location_id}_${item.customer_id}_${item.postdate}`,
        product_id: item.product_id,
        location_id: item.location_id,
        channel_partner_id: item.customer_id, // Map customer_id to channel_partner_id for compatibility
        transaction_date: item.postdate,
        quantity: item.quantity,
        unit_price: 0, // Default value since not available in view
        total_value: 0, // Default value since not available in view
        invoice_number: undefined,
        payment_terms: undefined,
        discount_percentage: undefined,
        transaction_metadata: undefined
      }));
      
      setSellInData(transformedData);
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
      let query = (supabase as any)
        .schema('m8_schema')
        .from('sell_out_data')
        .select('*');
      
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
    category_id?: string;
    subcategory_id?: string;
    location_id?: string;
    customer_id?: string;
    period_start?: string;
    period_end?: string;
  } = {}) => {
    setLoading(true);
    try {
      // Debug: Log the incoming filters
      console.log('=== Supabase Query Debug ===');
      console.log('Incoming filters:', filters);
      
      let query = (supabase as any)
        .schema('m8_schema')
        .from('v_sell_through_monthly')
        .select('*');

      if (filters.product_id) {
        query = query.eq('product_id', filters.product_id);
        console.log('Added product_id filter:', filters.product_id);
      }
      if (filters.category_id) {
        query = query.eq('category_id', filters.category_id);
        console.log('Added category_id filter:', filters.category_id);
      }
      if (filters.subcategory_id) {
        query = query.eq('subcategory_id', filters.subcategory_id);
        console.log('Added subcategory_id filter:', filters.subcategory_id);
      }
      if (filters.location_id) {
        query = query.eq('location_id', filters.location_id);
        console.log('Added location_id filter:', filters.location_id);
      }
      if (filters.customer_id) {
        query = query.eq('customer_id', filters.customer_id);
        console.log('Added customer_id filter:', filters.customer_id);
      }
      if (filters.period_start) {
        query = query.gte('period_month', filters.period_start);
        console.log('Added period_start filter:', filters.period_start);
      }
      if (filters.period_end) {
        query = query.lte('period_month', filters.period_end);
        console.log('Added period_end filter:', filters.period_end);
      }

      console.log('Final query built, executing...');
      const { data, error } = await query.order('period_month', { ascending: false });
      
      console.log('Query result - data length:', data?.length || 0);
      console.log('Query result - error:', error);
      console.log('First few records:', data?.slice(0, 3));
      console.log('===========================');
      
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

  const clearSellThroughMetrics = useCallback(() => {
    setSellThroughMetrics([]);
  }, []);

  const createSellInRecord = useCallback(async (data: Omit<SellInData, 'id'>) => {
    setLoading(true);
    try {
      // Since we're now using a view, we need to insert into the underlying time_series_data table
      // First, we need to get or create the time_series record
      let { data: timeSeriesData, error: timeSeriesError } = await (supabase as any)
        .schema('m8_schema')
        .from('time_series')
        .select('id')
        .eq('product_id', data.product_id)
        .eq('location_id', data.location_id)
        .eq('customer_id', data.channel_partner_id)
        .single();

      if (timeSeriesError && timeSeriesError.code !== 'PGRST116') {
        throw timeSeriesError;
      }

      let seriesId: string;
      if (!timeSeriesData) {
        // Create new time series record
        const { data: newTimeSeries, error: createError } = await (supabase as any)
          .schema('m8_schema')
          .from('time_series')
          .insert([{
            product_id: data.product_id,
            location_id: data.location_id,
            customer_id: data.channel_partner_id
          }])
          .select('id')
          .single();

        if (createError) throw createError;
        seriesId = newTimeSeries.id;
      } else {
        seriesId = timeSeriesData.id;
      }

      // Insert the time series data
      const { error: insertError } = await (supabase as any)
        .schema('m8_schema')
        .from('time_series_data')
        .insert([{
          series_id: seriesId,
          period_date: data.transaction_date,
          value: data.quantity
        }]);

      if (insertError) throw insertError;
      
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
      const { error } = await (supabase as any)
        .schema('m8_schema')
        .from('sell_out_data')
        .insert([data]);
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
      // Since we're now using a view, we don't need to refresh it
      // The view automatically calculates the metrics based on the underlying data
      toast({
        title: "Info",
        description: "Sell-through metrics are automatically calculated from the view",
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
    clearSellThroughMetrics,
    createSellInRecord,
    createSellOutRecord,
    refreshSellThroughRates,
  };
};