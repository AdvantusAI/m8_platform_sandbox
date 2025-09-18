import { supabase } from '@/integrations/supabase/client';

export interface ForecastData {
  customer_node_id: string;
  customer_name?: string;
  product_id: string;
  product_name?: string;
  subcategory_id?: string;
  subcategory_name?: string;
  postdate: string;
  forecast_ly: number;
  forecast: number;
  commercial_input: number;
  fitted_history: number;
  location_code?: string;
}

export interface ForecastFilters {
  product_id?: string;
  location_code?: string;
  customer_code?: string;
}

export const fetchForecastData = async (filters: ForecastFilters = {}): Promise<ForecastData[]> => {
  try {
    let query = (supabase as any)
      .schema('m8_schema')
      .from('forecast_with_fitted_history')
      .select(`
        customer_node_id,
        product_id,
        postdate,
        forecast_ly,
        forecast,
        commercial_input,
        fitted_history
      `);

    // Apply filters
    if (filters.product_id) {
      query = query.eq('product_id', filters.product_id);
    }

    if (filters.location_code) {
      query = query.eq('location_code', filters.location_code);
    }

    if (filters.customer_code) {
      query = query.eq('customer_node_id', filters.customer_code);
    }

    // Order by postdate
    query = query.order('postdate', { ascending: true });

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching forecast data:', error);
      throw error;
    }

    return data || [];
  } catch (error) {
    console.error('Error in fetchForecastData:', error);
    throw error;
  }
};

export const fetchForecastDataWithJoins = async (filters: ForecastFilters = {}): Promise<ForecastData[]> => {
  try {
    let query = (supabase as any)
      .schema('m8_schema')
      .from('forecast_collaboration_view')
      .select(`
        customer_node_id,
        customer_name,
        product_id,
        subcategory_id,
        subcategory_name,
        postdate,
        forecast_ly,
        forecast,
        commercial_input,
        fitted_history
      `);

    // Apply filters
    if (filters.product_id) {
      query = query.eq('product_id', filters.product_id);
    }

    if (filters.customer_code) {
      query = query.eq('customer_node_id', filters.customer_code);
    }

    // Order by postdate
    query = query.order('postdate', { ascending: true });

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching forecast data with joins:', error);
      throw error;
    }

    return data || [];
  } catch (error) {
    console.error('Error in fetchForecastDataWithJoins:', error);
    throw error;
  }
};
