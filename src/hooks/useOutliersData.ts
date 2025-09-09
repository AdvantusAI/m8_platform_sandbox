import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useLocations } from "./useLocations";
import { useCustomers } from "./useCustomers";

interface DemandOutlier {
  id: number; // Changed from string to number (serial)
  product_id: string;
  location_node_id: string | null; // Can be null
  customer_node_id: string | null; // Can be null
  vendor_id: string | null; // Can be null
  capped_value: number;
  original_value: number | null; // Can be null
  expected_value: number | null; // Can be null
  severity: string | null; // Can be null
  detection_method: string;
  explanation: string | null; // Can be null
  avg_deviation: number | null; // Can be null
  demand_outliers: number | null; // Can be null
  score: number | null; // Can be null
  postdate: string;
  percentage_deviation: number | null; // Can be null
  data_quality_score: number | null; // Added missing field
}

export const useOutliersData = (selectedProductId?: string, selectedCustomerId?: string, selectedLocationId?: string) => {
  const { locations } = useLocations();
  const { customers } = useCustomers();

  // Helper function to convert location code to location ID
  const getLocationId = (locationCode: string): string | undefined => {
    const location = locations.find(l => l.location_code === locationCode);
    console.log('Location found:', location?.location_id);
    return location?.location_id;
  };

  // Helper function to convert customer code to customer ID
  const getCustomerId = (customerCode: string): string | undefined => {
    const customer = customers.find(c => c.customer_code === customerCode);
    console.log('Customer found:', customer?.customer_node_id);
    return customer?.customer_node_id;
  };
  return useQuery({
    queryKey: ['outliers', selectedProductId, selectedCustomerId, selectedLocationId],
    queryFn: async (): Promise<DemandOutlier[]> => {
      if (!selectedProductId || !selectedCustomerId) {
        return [];
      }

      const filters: any = {
        product_id: selectedProductId
      };

      // Only add customer filter if we can find the customer ID
      const customerId = getCustomerId(selectedCustomerId);
      if (customerId) {
        filters.customer_node_id = customerId;
      }

      // Only add location filter if we can find the location ID
      if (selectedLocationId) {
        const locationId = getLocationId(selectedLocationId);
        if (locationId) {
          filters.location_node_id = locationId;
        }
      }
      console.log('filters', filters);
      const { data, error } = await (supabase as any)
       .schema('m8_schema')
        .from('demand_outliers')
        .select('*')
        .match(filters);

      console.log('data', data);

      if (error) throw error;

      return data?.map((item: any) => ({
        id: item.id || 0,
        product_id: item.product_id || '',
        location_node_id: item.location_node_id || null,
        customer_node_id: item.customer_node_id || null,
        vendor_id: item.vendor_id || null,
        capped_value: item.capped_value || 0,
        original_value: item.original_value || null,
        expected_value: item.expected_value || null,
        severity: item.severity || null,
        detection_method: item.detection_method || 'IQR',
        explanation: item.explanation || null,
        avg_deviation: item.avg_deviation || null,
        demand_outliers: item.demand_outliers || null,
        score: item.score || null,
        postdate: item.postdate || new Date().toISOString().split('T')[0],
        percentage_deviation: item.percentage_deviation || null,
        data_quality_score: item.data_quality_score || null
      })) || [];
    },
    enabled: !!(selectedProductId && selectedCustomerId)
  });
};