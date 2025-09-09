
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useLocations } from '@/hooks/useLocations';
import { useCustomers } from '@/hooks/useCustomers';

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


export function useInterpretabilityData(selectedProductId?: string, selectedLocationId?: string, selectedCustomerId?: string) {
  const [data, setData] = useState<InterpretabilityData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const { locations } = useLocations();
  const { customers } = useCustomers();
  

  useEffect(() => {
    fetchData();
  }, [selectedProductId, selectedLocationId, selectedCustomerId]);


  const getLocationId = (locationId: string): string | undefined => {
    const location = locations.find(l => l.location_code === locationId);
    return location?.location_id;
  };

  const getCustomerId = (customerCode: string): string | undefined => {
    const customer = customers.find(c => c.customer_code === customerCode);
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

      if (selectedProductId) {
        query = query.eq('product_id', selectedProductId);
      }
      
      if (selectedLocationId) {
        const actualLocationId = getLocationId(selectedLocationId);
        if (actualLocationId) {
          query = query.eq('location_node_id', actualLocationId);
        }
      }

      // Apply customer filter if selected
      if (selectedCustomerId) {
        const actualCustomerId = getCustomerId(selectedCustomerId);   
        if (actualCustomerId) {
          query = query.eq('customer_node_id', actualCustomerId);
        }
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
