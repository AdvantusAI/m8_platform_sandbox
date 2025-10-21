// MongoDB-based inventory projections service

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
   * Fetch inventory projections data for chart from MongoDB API
   */
  static async getChartData(filters: ChartFilters = {}): Promise<ChartDataPoint[]> {
    try {
      // Build query parameters
      const queryParams = new URLSearchParams();
      
      if (filters.product_id) {
        queryParams.append('product_id', filters.product_id);
      }
      if (filters.location_id) {
        queryParams.append('location_id', filters.location_id);
      }
      // Note: customer_id filtering would need to be handled differently
      // as inventory projections are typically not customer-specific

      const url = `http://localhost:3001/api/inventory-projections${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
      
      console.log('Fetching inventory projections from:', url);
      
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch inventory projections: ${response.statusText}`);
      }
      
      const data = await response.json();
      
      return data.map((row: any) => ({
        projection_month: row.projection_month,
        forecasted_demand: row.forecasted_demand || 0,
        projected_ending_inventory: row.projected_ending_inventory || 0,
      }));
    } catch (error) {
      console.error('Error fetching chart data:', error);
      throw error;
    }
  }
}