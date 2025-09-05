import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

interface Customer {
  id: string;
  customer_code: string;
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
        .from('v_customer_node')
        .select(`*
        `)
        .eq('status', 'active')
        .order('customer_code');

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
    return customer?.customer_code || `Cliente ${customerId}`;
  };

  return {
    customers,
    loading,
    error,
    getCustomerName,
    refetch: fetchCustomers
  };
}