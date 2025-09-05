
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useLocations } from './useLocations';
import { useCustomers } from './useCustomers';

interface Location {
  location_id: string;
  location_code: string;
  description?: string;
  type_code?: string;
}

interface InterpretabilityData {
  id: number;
  product_id: string;
  location_node_id: string;
  model_name: string;
  interpretability_score: number;
  confidence_level: string;
  forecast_explanation: string;
  primary_drivers: string[];
  risk_factors: string[];
  recommended_actions: string[];
  data_pattern_type: string;
  model_complexity: string;
  segment_classification: string;
  created_at: string;
}


export function useInterpretabilityData(productId?: string, locationId?: string, customerId?: string) {
  const [data, setData] = useState<InterpretabilityData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const { locations } = useLocations();
  const { customers } = useCustomers();
  useEffect(() => {
    fetchData();
  }, [productId, locationId, customerId]);


  const getLocationId = (locationId: string): string | undefined => {
    const location = locations.find(l => l.location_code === locationId);
    console.log('location', location.location_id);
    return location?.location_id;
  };

  const getCustomerId = (customerId: string): string | undefined => {
    const customer = customers.find(c => c.customer_code === customerId);
    console.log('customer', customer.customer_node_id);
    return customer?.customer_node_id;
  };

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);

      let query = (supabase as any)
       .schema('m8_schema')
        .from('forecast_interpretability')        
        .select('*')
        .order('created_at', { ascending: false });

      if (productId) {
        query = query.eq('product_id', productId);
      }
      
      if (locationId) {
        const actualLocationId = getLocationId(locationId);
        if (actualLocationId) {
          query = query.eq('location_node_id', actualLocationId);
        }
      }

      // Apply customer filter if selected
      if (customerId) {
       
        query = query.eq('customer_node_id', getCustomerId(customerId));
      }

      const { data: result, error: fetchError } = await query;

      if (fetchError) {
        throw fetchError;
      }

      setData(result || []);
    } catch (err) {
      console.error('Error fetching interpretability data:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  return { data, loading, error, refetch: fetchData };
}
