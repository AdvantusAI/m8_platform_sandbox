import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useLocations } from "./useLocations";
import { useCustomers } from "./useCustomers";

interface DemandOutlier {
  id: string;
  product_id: string;
  location_node_id: string;
  customer_node_id: string;
  vendor_id: string;
  capped_value: number;
  original_value: number;
  expected_value: number;
  severity: string;
  detection_method: string;
  explanation: string;
  avg_deviation: number;
  demand_outliers: number;
  score: number;
  postdate: string;
  percentage_deviation?: number; // Optional, if not present in the data
}

export const useOutliersData = (selectedProductId?: string, selectedCustomerId?: string, selectedLocationId?: string) => {
  const { locations } = useLocations();
  const { customers } = useCustomers();

  // Helper function to convert location code to location ID
  const getLocationId = (locationCode: string): string | undefined => {
    const location = locations.find(l => l.location_code === locationCode);
    console.log(location.location_id);
    return location?.location_id;
  };

  // Helper function to convert customer code to customer ID
  const getCustomerId = (customerCode: string): string | undefined => {
    const customer = customers.find(c => c.customer_code === customerCode);
    //console.log('customer', customer?.customer_node_id);
    return customer?.customer_code;
  };
  return useQuery({
    queryKey: ['outliers', selectedProductId, selectedCustomerId, selectedLocationId],
    queryFn: async (): Promise<DemandOutlier[]> => {
      if (!selectedProductId || !selectedCustomerId) {
        return [];
      }

      const filters: any = {
        product_id: selectedProductId,
        customer_node_id: getCustomerId(selectedCustomerId)
      };
    

      if (selectedLocationId) {
        const location = getLocationId(selectedLocationId);
        filters.location_node_id = getLocationId(location);
      }
      console.log('filters', filters);
      const { data, error } = await (supabase as any)
       .schema('m8_schema')
        .from('demand_outliers')
        .select('*')
        .match(filters);

      if (error) throw error;

      return data?.map((item: any) => ({
        id: String(item.id || ''),
        product_id: item.product_id || '',
        location_node_id: item.location_node_id || '',
        customer_node_id: item.customer_node_id || '',
        vendor_id: item.customer_node_id || '',
        capped_value: item.capped_value || 0,
        original_value: item.original_value || 0,
        expected_value: item.expected_value || 0,
        severity: item.severity || '',
        detection_method: item.detection_method || '',
        explanation: item.explanation || '',
        avg_deviation: item.avg_deviation || 0,
        demand_outliers: item.demand_outliers || 0,
        score: item.score || 0,
        postdate: item.postdate || new Date().toISOString().split('T')[0],
        percentage_deviation: item.percentage_deviation  || 0
      })) || [];
    },
    enabled: !!(selectedProductId && selectedCustomerId)
  });
};