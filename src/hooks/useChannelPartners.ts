import { useState, useCallback, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

export interface ChannelPartner {
  id: string;
  partner_code: string;
  partner_name: string;
  partner_type: string;
  region?: string;
  country?: string;
  contact_information?: any;
  performance_metrics?: any;
  status: string;
  created_at: string;
  updated_at: string;
}

export const useChannelPartners = () => {
  const [loading, setLoading] = useState(false);
  const [partners, setPartners] = useState<ChannelPartner[]>([]);

  const fetchPartners = useCallback(async (filters: {
    partner_type?: string;
    region?: string;
    status?: string;
  } = {}) => {
    setLoading(true);
    try {
      let query = supabase.from('channel_partners').select('*');
      
      if (filters.partner_type) query = query.eq('partner_type', filters.partner_type);
      if (filters.region) query = query.eq('region', filters.region);
      if (filters.status) query = query.eq('status', filters.status);

      const { data, error } = await query.order('partner_name');
      
      if (error) throw error;
      setPartners(data || []);
    } catch (error) {
      console.error('Error fetching channel partners:', error);
      toast({
        title: "Error",
        description: "Failed to fetch channel partners",
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