import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

interface Customer {
  id: string;
  node_name: string;
  description: string | null;
  node_code: string;
  status: string;
  created_at: string;
  updated_at: string;
}

export function useCustomers() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchCustomers();
  }, []);

  const fetchCustomers = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .schema('m8_schema')
        .from('supply_network_nodes')
        .select(`
          id,
          node_name,
          description,
          node_code,
          status,
          created_at,
          updated_at,
          node_type_id,
          supply_network_node_types!inner(type_code)
        `)
        .eq('supply_network_node_types.type_code', 'CUSTOMERS')
        .eq('status', 'active')
        .order('node_name');

      if (error) throw error;
      setCustomers(data || []);
    } catch (err) {
      console.error('Error fetching customers:', err);
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const getCustomerName = (customerId: string): string => {
    const customer = customers.find(c => c.id === customerId);
    return customer?.node_name || `Cliente ${customerId}`;
  };

  return {
    customers,
    loading,
    error,
    getCustomerName,
    refetch: fetchCustomers
  };
}