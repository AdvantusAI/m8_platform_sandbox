import { useState, useEffect } from 'react';
import { toast } from 'sonner';

interface CommercialProfile {
  id?: string;
  user_id: string;
  territory?: string;
  customer_segments?: string[];
  specialization?: string;
  phone?: string;
  region?: string;
  manager_level?: 'junior' | 'senior' | 'director';
  created_at?: string;
  updated_at?: string;
}

interface CustomerAssignment {
  id: string;
  commercial_user_id: string;
  customer_id: string;
  assignment_type: string;
  start_date: string;
  end_date?: string;
  created_at?: string;
  updated_at?: string;
}

interface MarketIntelligence {
  id?: string;
  commercial_user_id?: string;
  customer_id?: string;
  product_id?: string;
  location_id?: string;
  intelligence_type: string;
  impact_assessment: string;
  confidence_level: string;
  time_horizon: string;
  description: string;
  quantitative_impact?: number | null;
  effective_from?: string | null;
  effective_to?: string | null;
  status?: string;
  created_at?: string;
  updated_at?: string;
}

export function useCommercialCollaboration() {
  const [profile, setProfile] = useState<CommercialProfile | null>(null);
  const [assignments, setAssignments] = useState<CustomerAssignment[]>([]);
  const [marketIntelligence, setMarketIntelligence] = useState<MarketIntelligence[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCommercialData();
  }, []);

  const getAuthHeaders = () => {
    const token = localStorage.getItem('auth_token');
    return {
      'Content-Type': 'application/json',
      ...(token && { 'Authorization': `Bearer ${token}` })
    };
  };

  const fetchCommercialData = async () => {
    try {
      setLoading(true);
      
      // Get user from API with auth headers
      const userResponse = await fetch('/api/auth/user', {
        headers: getAuthHeaders()
      });
      
      if (!userResponse.ok) {
        toast.error('Usuario no autenticado');
        return;
      }
      
      const { user } = await userResponse.json();

      // Fetch commercial profile
      try {
        const profileResponse = await fetch(`/api/commercial-profiles/${user.id}`, {
          headers: getAuthHeaders()
        });
        if (profileResponse.ok) {
          const profileData = await profileResponse.json();
          setProfile(profileData);
        }
      } catch (error) {
        console.error('Error fetching profile:', error);
      }

      // Fetch customer assignments
      try {
        const assignmentsResponse = await fetch(`/api/customer-assignments?commercial_user_id=${user.id}`, {
          headers: getAuthHeaders()
        });
        if (assignmentsResponse.ok) {
          const assignmentsData = await assignmentsResponse.json();
          setAssignments(assignmentsData || []);
        }
      } catch (error) {
        console.error('Error fetching assignments:', error);
      }

      // Fetch market intelligence
      try {
        const intelligenceResponse = await fetch(`/api/market-intelligence?commercial_user_id=${user.id}`, {
          headers: getAuthHeaders()
        });
        if (intelligenceResponse.ok) {
          const intelligenceData = await intelligenceResponse.json();
          setMarketIntelligence(intelligenceData || []);
        }
      } catch (error) {
        console.error('Error fetching intelligence:', error);
      }

    } catch (error) {
      console.error('Error fetching commercial data:', error);
      toast.error('Error al cargar datos comerciales');
    } finally {
      setLoading(false);
    }
  };

  const updateProfile = async (profileData: Partial<CommercialProfile>) => {
    try {
      // Validate manager_level if provided
      if (profileData.manager_level && !['junior', 'senior', 'director'].includes(profileData.manager_level)) {
        toast.error('Nivel de gerente inválido. Debe ser: junior, senior o director');
        return false;
      }

      // Get user from API with auth headers
      const userResponse = await fetch('/api/auth/user', {
        headers: getAuthHeaders()
      });
      
      if (!userResponse.ok) {
        toast.error('Usuario no autenticado');
        return false;
      }
      
      const { user } = await userResponse.json();

      const response = await fetch(`/api/commercial-profiles/${user.id}`, {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          user_id: user.id,
          ...profileData,
          updated_at: new Date().toISOString()
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to update profile');
      }

      toast.success('Perfil actualizado exitosamente');
      await fetchCommercialData();
      return true;
    } catch (error) {
      console.error('Error updating profile:', error);
      toast.error('Error al actualizar perfil');
      return false;
    }
  };

  const addMarketIntelligence = async (intelligence: MarketIntelligence) => {
    try {
      // Get user from API with auth headers
      const userResponse = await fetch('/api/auth/user', {
        headers: getAuthHeaders()
      });
      
      if (!userResponse.ok) {
        toast.error('Usuario no autenticado');
        return false;
      }
      
      const { user } = await userResponse.json();

      const response = await fetch('/api/market-intelligence', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          ...intelligence,
          commercial_user_id: user.id,
          created_at: new Date().toISOString()
        })
      });

      if (!response.ok) throw new Error('Failed to add market intelligence');

      toast.success('Inteligencia de mercado agregada');
      await fetchCommercialData();
      return true;
    } catch (error) {
      console.error('Error adding market intelligence:', error);
      toast.error('Error al agregar inteligencia de mercado');
      return false;
    }
  };

  return {
    profile,
    assignments,
    marketIntelligence,
    loading,
    updateProfile,
    addMarketIntelligence,
    refetch: fetchCommercialData
  };
}
