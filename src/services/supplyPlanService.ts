import { supabase } from '@/integrations/supabase/client';

export interface SupplyPlanRow {
  product_id: string;
  location_id?: string;
  postdate: string;
  forecast?: number;
  actual?: number;
  total_demand?: number;
  planned_arrivals?: number;
  planned_orders?: number;
  projected_on_hand?: number;
  safety_stock?: number;
  [key: string]: any;
}

export interface PivotSupplyPlanData {
  product_id: string;
  location_id?: string;
  metrics: {
    forecast: { [date: string]: number };
    actual: { [date: string]: number };
    total_demand: { [date: string]: number };
    planned_arrivals: { [date: string]: number };
    planned_orders: { [date: string]: number };
    projected_on_hand: { [date: string]: number };
    safety_stock: { [date: string]: number };
  };
  dates: string[];
}

export class SupplyPlanService {
  /**
   * Get supply plan data for a specific product
   */
  static async getSupplyPlanData(productId: string, locationId?: string): Promise<PivotSupplyPlanData | null> {
    try {
      let query = supabase
        .schema('m8_schema')
        .from('v_meio_supply_plan')
        .select('*')
        .eq('product_id', productId);

      if (locationId) {
        query = query.eq('location_id', locationId);
      }

      query = query.order('postdate');

      const { data, error } = await query;

      if (error) {
        console.error('Error fetching supply plan data:', error);
        throw new Error(`Database error: ${error.message}`);
      }

      if (!data || data.length === 0) {
        console.log(`No supply plan data found for product ${productId}${locationId ? ` at location ${locationId}` : ''}`);
        return null;
      }

      return this.pivotSupplyPlanData(data, productId, locationId);
    } catch (error) {
      console.error('Error in getSupplyPlanData:', error);
      throw error;
    }
  }

  /**
   * Get available products that have supply plan data
   */
  static async getAvailableProducts(): Promise<Array<{product_id: string, location_id?: string}>> {
    try {
      const { data, error } = await supabase
        .schema('m8_schema')
        .from('v_meio_supply_plan')
        .select('product_id, location_id')
        .order('product_id');

      if (error) {
        console.error('Error fetching available products:', error);
        throw new Error(`Database error: ${error.message}`);
      }

      // Get unique product-location combinations
      const uniqueProducts = data.reduce((acc: Array<{product_id: string, location_id?: string}>, row: any) => {
        const existing = acc.find(p => p.product_id === row.product_id && p.location_id === row.location_id);
        if (!existing) {
          acc.push({ product_id: row.product_id, location_id: row.location_id });
        }
        return acc;
      }, []);

      return uniqueProducts;
    } catch (error) {
      console.error('Error in getAvailableProducts:', error);
      throw error;
    }
  }

  /**
   * Pivot the supply plan data - transform columns to rows and dates to columns
   */
  private static pivotSupplyPlanData(
    data: SupplyPlanRow[], 
    productId: string, 
    locationId?: string
  ): PivotSupplyPlanData {
    const metrics = {
      forecast: {} as { [date: string]: number },
      actual: {} as { [date: string]: number },
      total_demand: {} as { [date: string]: number },
      planned_arrivals: {} as { [date: string]: number },
      planned_orders: {} as { [date: string]: number },
      projected_on_hand: {} as { [date: string]: number },
      safety_stock: {} as { [date: string]: number }
    };

    const dates: string[] = [];

    data.forEach(row => {
      const dateKey = row.postdate;
      if (!dates.includes(dateKey)) {
        dates.push(dateKey);
      }

      metrics.forecast[dateKey] = row.forecast ?? 0;
      metrics.actual[dateKey] = row.actual ?? 0;
      metrics.total_demand[dateKey] = row.total_demand ?? 0;
      metrics.planned_arrivals[dateKey] = row.planned_arrivals ?? 0;
      metrics.planned_orders[dateKey] = row.planned_orders ?? 0;
      metrics.projected_on_hand[dateKey] = row.projected_on_hand ?? 0;
      metrics.safety_stock[dateKey] = row.safety_stock ?? 0;
    });

    // Sort dates
    dates.sort((a, b) => new Date(a).getTime() - new Date(b).getTime());

    return {
      product_id: productId,
      location_id: locationId,
      metrics,
      dates
    };
  }


  /**
   * Export supply plan data to Excel format
   */
  static exportToExcel(data: PivotSupplyPlanData): void {
    const exportData: any[] = [];
    
    const metricNames = {
      forecast: 'Forecast',
      actual: 'Actual',
      total_demand: 'Total Demand',
      planned_arrivals: 'Planned Arrivals',
      planned_orders: 'Planned Orders',
      projected_on_hand: 'Projected On Hand',
      safety_stock: 'Safety Stock'
    };

    Object.entries(metricNames).forEach(([key, name]) => {
      const row: any = { Metric: name };
      data.dates.forEach(date => {
        row[date] = data.metrics[key as keyof typeof data.metrics][date] || 0;
      });
      exportData.push(row);
    });

    console.log('Export data prepared:', exportData);
    // TODO: Implement actual Excel export using xlsx library
  }
}