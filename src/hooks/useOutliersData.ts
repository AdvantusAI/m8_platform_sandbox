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
  const { locations, loading: locationsLoading } = useLocations();
  const { customers, loading: customersLoading } = useCustomers();

 
  // Helper function to convert customer code to customer node ID
  const getCustomerNodeId = (customerCode: string): string | undefined => {
    
    // Try both string and number comparison
    const customer = customers.find(c => 
      c.customer_code === customerCode || 
      c.customer_code === String(customerCode) ||
      String(c.customer_code) === customerCode
    );
    // Use customer_id instead of customer_node_id based on actual data structure
    return customer?.customer_id || customer?.customer_node_id;
  };

  // Helper function to convert location code to location node ID
  const getLocationNodeId = (locationCode: string): string | undefined => {
    const location = locations.find(l => l.location_code === locationCode);
    return location?.location_id; // location_id is the node ID
  };
  return useQuery({
    queryKey: ['outliers', selectedProductId, selectedCustomerId, selectedLocationId],
    queryFn: async (): Promise<DemandOutlier[]> => {
      if (!selectedProductId || !selectedCustomerId) {
        return [];
      }
      
      const customerNodeId = getCustomerNodeId(selectedCustomerId);
      if (!customerNodeId) {
        console.warn('Customer node ID not found for customer code:', selectedCustomerId);
        console.warn('Available customer codes:', customers.map(c => c.customer_code));
        return [];
      }

      const filters: any = {
        product_id: selectedProductId,
        customer_node_id: customerNodeId
      };
    
      if (selectedLocationId) {
        const locationNodeId = getLocationNodeId(selectedLocationId);
        if (locationNodeId) {
          filters.location_node_id = locationNodeId;
        } else {
          console.warn('Location node ID not found for location code:', selectedLocationId);
        }
      }


      
      const { data, error } = await (supabase as any)
       .schema('m8_schema')
        .from('demand_outliers')
        .select('*')
        .match(filters);

      
      if (error) {
        console.error('Error fetching outliers data:', error);
        throw error;
      }
     
      console.log('Raw outliers data:', data);
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
    enabled: !!(selectedProductId && selectedCustomerId && !customersLoading && !locationsLoading)
  });
};