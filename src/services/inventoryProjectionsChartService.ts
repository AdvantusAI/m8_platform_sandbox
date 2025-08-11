import { supabase } from '@/integrations/supabase/client';
import { Database } from '@/integrations/supabase/types';

export type InventoryProjectionRow = Database['public']['Tables']['inventory_projections']['Row'];

export interface ChartDataPoint {
  projection_month: string;
  forecasted_demand: number;
  projected_ending_inventory: number;
}

export interface ChartFilters {
  product_id?: string;
  location_id?: string;
  customer_id?: string;
}

export class InventoryProjectionsChartService {
  /**
   * Fetch inventory projections data for chart
   */
  static async getChartData(filters: ChartFilters = {}): Promise<ChartDataPoint[]> {
    try {
      let query = supabase
        .from('inventory_projections')
        .select(`
          projection_month,
          forecasted_demand,
          projected_ending_inventory,
          product_id,
          location_id
        `)
        .order('projection_month', { ascending: true });

      // Apply filters
      if (filters.product_id) {
        query = query.eq('product_id', filters.product_id);
      }
      if (filters.location_id) {
        query = query.eq('location_id', filters.location_id);
      }
      // Note: customer_id is not available in inventory_projections table
      // Would need to join with other tables to filter by customer

      const { data, error } = await query;

      if (error) {
        throw error;
      }

      return data?.map(row => ({
        projection_month: row.projection_month,
        forecasted_demand: row.forecasted_demand || 0,
        projected_ending_inventory: row.projected_ending_inventory || 0,
      })) || [];
    } catch (error) {
      console.error('Error fetching chart data:', error);
      throw error;
    }
  }
}