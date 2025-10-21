import { useState, useCallback, useEffect } from 'react';
import { toast } from '@/hooks/use-toast';

export interface Customer {
  id: string;
  customer_id: string;
  customer_name: string;
  customer_logo: string | null;
  level_1: string | null;
  level_1_name: string | null;
  level_2: string | null;
  level_2_name: string | null;
  status?: string;
  created_at: string;
  updated_at: string;
  // For compatibility with channel partners
  partner_name?: string;
}

export const useChannelPartners = () => {
  const [loading, setLoading] = useState(false);
  const [partners, setPartners] = useState<Customer[]>([]);

  const fetchPartners = useCallback(async (filters: {
    level_1?: string;
    level_2?: string;
  } = {}) => {
    setLoading(true);
    try {
      // Build query parameters
      const searchParams = new URLSearchParams();
      if (filters.level_1) searchParams.append('level_1', filters.level_1);
      if (filters.level_2) searchParams.append('level_2', filters.level_2);
      
      const url = `/api/customers${searchParams.toString() ? '?' + searchParams.toString() : ''}`;
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch customers: ${response.statusText}`);
      }
      
      const data = await response.json();
      
      // Transform data to ensure partner_name is available for compatibility
      const transformedData = data.map((customer: Customer) => ({
        ...customer,
        partner_name: customer.customer_name, // Map customer_name to partner_name for compatibility
      }));
      
      setPartners(transformedData || []);
    } catch (error) {
      console.error('Error fetching customers:', error);
      toast({
        title: "Error",
        description: "Failed to fetch customers",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPartners();
  }, [fetchPartners]);

  return {
    loading,
    partners,
    fetchPartners,
    refetch: fetchPartners,
  };
};