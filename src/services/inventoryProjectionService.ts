import { supabase } from '@/integrations/supabase/client';
import { Database } from '@/integrations/supabase/types';

export type CurrentInventory = Database['public']['Tables']['current_inventory']['Row'];
export type ForecastData = Database['public']['Tables']['forecast_data']['Row'];

export interface InventoryProjection {
  date: string;
  projected_inventory: number;
  forecast_demand: number;
  current_stock: number;
  cumulative_demand: number;
  reorder_point: number;
  safety_stock: number;
  status: 'optimal' | 'warning' | 'critical' | 'stockout';
}

export interface ProjectionParams {
  product_id?: string;
  location_id?: string;
  warehouse_id?: number;
  projection_days?: number;
}

export class InventoryProjectionService {
  /**
   * Calculate inventory projections for multiple SKUs/locations
   */
  static async calculateProjections(params: ProjectionParams = {}): Promise<{
    product_id: string;
    location_id: string;
    warehouse_id: number;
    projections: InventoryProjection[];
  }[]> {
    try {
      // Get current inventory data
      let inventoryQuery = supabase
        .from('current_inventory')
        .select('*');
      
      if (params.product_id) {
        inventoryQuery = inventoryQuery.eq('product_id', params.product_id);
      }
      if (params.warehouse_id) {
        inventoryQuery = inventoryQuery.eq('warehouse_id', params.warehouse_id);
      }

      const { data: inventoryData, error: inventoryError } = await inventoryQuery;
      
      if (inventoryError) throw inventoryError;
      if (!inventoryData?.length) return [];

      // Get forecast data for the same products/locations
      const productIds = inventoryData.map(inv => inv.product_id);
      let forecastQuery = supabase
        .schema('m8_schema')
        .from('forecast_data')
        .select('*')
        .in('product_id', productIds)
        .gte('postdate', new Date().toISOString().split('T')[0]) // Future dates only
        .order('postdate', { ascending: true });

      if (params.location_id) {
        forecastQuery = forecastQuery.eq('location_id', params.location_id);
      }

      const { data: forecastData, error: forecastError } = await forecastQuery;
      
      if (forecastError) throw forecastError;

      // Process projections for each inventory item
      const results = await Promise.all(
        inventoryData.map(async (inventory) => {
          const relevantForecasts = forecastData?.filter(
            f => f.product_id === inventory.product_id &&
                 (params.location_id ? f.location_id === params.location_id : true)
          ) || [];

          const projections = this.calculateInventoryTimeline(
            inventory,
            relevantForecasts,
            params.projection_days || 90
          );

          return {
            product_id: inventory.product_id,
            location_id: relevantForecasts[0]?.location_id || 'default',
            warehouse_id: inventory.warehouse_id,
            projections
          };
        })
      );

      return results;
    } catch (error) {
      console.error('Error calculating projections:', error);
      throw error;
    }
  }

  /**
   * Enhanced projection calculation with Phase 2 features
   */
  private static calculateInventoryTimeline(
    inventory: CurrentInventory,
    forecasts: ForecastData[],
    projectionDays: number
  ): InventoryProjection[] {
    const projections: InventoryProjection[] = [];
    const startDate = new Date();
    let runningInventory = inventory.current_stock;
    let cumulativeDemand = 0;

    // Calculate enhanced safety stock (using simplified method for now)
    const enhancedSafetyStock = this.calculateEnhancedSafetyStock(inventory, forecasts);

    // Create daily projections with enhanced logic
    for (let day = 0; day <= projectionDays; day++) {
      const currentDate = new Date(startDate);
      currentDate.setDate(startDate.getDate() + day);
      const dateStr = currentDate.toISOString().split('T')[0];

      // Get daily demand with seasonal adjustment
      const baseDailyDemand = this.getDailyDemand(forecasts, currentDate);
      const seasonalAdjustment = this.getSeasonalAdjustment(currentDate);
      const adjustedDemand = baseDailyDemand * seasonalAdjustment;
      
      cumulativeDemand += adjustedDemand;
      
      // Calculate projected inventory with potential replenishments
      let projectedInventory = inventory.current_stock - cumulativeDemand;
      
      // Simulate automatic replenishment if below reorder point
      if (projectedInventory <= inventory.reorder_point && day > 0) {
        // Use estimated max capacity (current stock * 2 as fallback)
        const maxCapacity = inventory.current_stock * 2;
        const replenishmentQuantity = maxCapacity - projectedInventory;
        if (replenishmentQuantity > 0) {
          projectedInventory += replenishmentQuantity;
          // Note: In real implementation, this would consider lead times
        }
      }

      // Determine status with enhanced safety stock
      const status = this.determineEnhancedInventoryStatus(
        projectedInventory,
        enhancedSafetyStock,
        inventory.reorder_point
      );

      projections.push({
        date: dateStr,
        projected_inventory: Math.max(0, projectedInventory),
        forecast_demand: adjustedDemand,
        current_stock: inventory.current_stock,
        cumulative_demand: cumulativeDemand,
        reorder_point: inventory.reorder_point,
        safety_stock: enhancedSafetyStock,
        status
      });

      runningInventory = projectedInventory;
    }

    return projections;
  }

  /**
   * Get daily demand from forecast data
   */
  private static getDailyDemand(forecasts: ForecastData[], date: Date): number {
    if (!forecasts.length) return 0;

    // Find exact match first
    const dateStr = date.toISOString().split('T')[0];
    const exactMatch = forecasts.find(f => f.postdate === dateStr);
    if (exactMatch && exactMatch.forecast) {
      return exactMatch.forecast;
    }

    // If no exact match, find closest forecast or interpolate
    const sortedForecasts = forecasts
      .filter(f => f.forecast !== null)
      .sort((a, b) => new Date(a.postdate).getTime() - new Date(b.postdate).getTime());

    if (!sortedForecasts.length) return 0;

    // Use the closest forecast value
    const closest = sortedForecasts.reduce((prev, curr) => {
      const prevDiff = Math.abs(new Date(prev.postdate).getTime() - date.getTime());
      const currDiff = Math.abs(new Date(curr.postdate).getTime() - date.getTime());
      return currDiff < prevDiff ? curr : prev;
    });

    return closest.forecast || 0;
  }

  /**
   * Calculate enhanced safety stock with seasonal considerations
   */
  private static calculateEnhancedSafetyStock(
    inventory: CurrentInventory,
    forecasts: ForecastData[]
  ): number {
    if (!forecasts.length) return inventory.safety_stock;

    // Calculate demand variability
    const demands = forecasts.map(f => f.forecast || 0);
    const avgDemand = demands.reduce((sum, d) => sum + d, 0) / demands.length;
    const variance = demands.reduce((sum, d) => sum + Math.pow(d - avgDemand, 2), 0) / demands.length;
    const stdDev = Math.sqrt(variance);

    // Enhanced safety stock calculation
    const leadTime = 14; // Default 14 days (property doesn't exist in schema)
    const serviceLevel = 1.65; // Z-score for 95% service level
    const enhancedSafetyStock = serviceLevel * stdDev * Math.sqrt(leadTime / 7); // Weekly adjustment

    return Math.max(enhancedSafetyStock, inventory.safety_stock);
  }

  /**
   * Get seasonal adjustment factor
   */
  private static getSeasonalAdjustment(date: Date): number {
    const month = date.getMonth() + 1;
    // Simplified seasonal factors (would be calculated from historical data in real implementation)
    const seasonalFactors: { [key: number]: number } = {
      1: 0.9,  // January - post-holiday low
      2: 0.95, // February
      3: 1.0,  // March - baseline
      4: 1.05, // April
      5: 1.1,  // May
      6: 1.15, // June - summer high
      7: 1.2,  // July - peak summer
      8: 1.15, // August
      9: 1.05, // September
      10: 1.1, // October
      11: 1.25, // November - pre-holiday
      12: 1.3  // December - holiday peak
    };

    return seasonalFactors[month] || 1.0;
  }

  /**
   * Enhanced inventory status determination
   */
  private static determineEnhancedInventoryStatus(
    projectedInventory: number,
    enhancedSafetyStock: number,
    reorderPoint: number
  ): 'optimal' | 'warning' | 'critical' | 'stockout' {
    if (projectedInventory <= 0) return 'stockout';
    if (projectedInventory <= enhancedSafetyStock * 0.5) return 'critical';
    if (projectedInventory <= enhancedSafetyStock) return 'warning';
    return 'optimal';
  }

  /**
   * Get summary statistics for projections
   */
  static getProjectionSummary(projections: InventoryProjection[]) {
    if (!projections.length) return null;

    const stockoutDays = projections.filter(p => p.status === 'stockout').length;
    const criticalDays = projections.filter(p => p.status === 'critical').length;
    const warningDays = projections.filter(p => p.status === 'warning').length;
    const minInventory = Math.min(...projections.map(p => p.projected_inventory));
    const totalDemand = projections[projections.length - 1]?.cumulative_demand || 0;

    return {
      stockoutDays,
      criticalDays,
      warningDays,
      minInventory,
      totalDemand,
      riskLevel: stockoutDays > 0 ? 'high' : criticalDays > 7 ? 'medium' : 'low'
    };
  }
}