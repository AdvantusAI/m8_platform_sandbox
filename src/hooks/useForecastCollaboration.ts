
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface ForecastCollaboration {
  id: string;
  postdate: string;
  product_id: string;
  location_id: string;
  customer_id: string;
  forecast: number;
  actual: number;
  sales_plan: number;
  demand_planner: number;
  commercial_input?: number;
  commercial_confidence?: string;
  commercial_notes?: string;
  commercial_reviewed_by?: string;
  commercial_reviewed_at?: string;
  market_intelligence?: string;
  promotional_activity?: string;
  competitive_impact?: string;
  collaboration_status: string;
}

interface CollaborationComment {
  id: string;
  forecast_data_id: string;
  user_id: string;
  comment_text: string;
  comment_type: string;
  parent_comment_id?: string;
  created_at: string;
  updated_at: string;
}

export function useForecastCollaboration(productId?: string, locationId?: string, customerId?: string) {
  const [forecastData, setForecastData] = useState<ForecastCollaboration[]>([]);
  const [comments, setComments] = useState<CollaborationComment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Only fetch data when both productId and customerId are selected
    if (productId && customerId) {
      fetchCollaborationData();
    } else {
      // Clear data when filters are not complete
      setForecastData([]);
      setComments([]);
      setLoading(false);
    }
  }, [productId, locationId, customerId]);

  const fetchCollaborationData = async () => {
    try {
      setLoading(true);
      
      let query = supabase
        .from('forecast_data')
        .select('*')
        .order('postdate', { ascending: false });

      if (productId) query = query.eq('product_id', productId);
      if (locationId) query = query.eq('location_id', locationId);
      if (customerId) query = query.eq('customer_id', customerId);

      const { data: forecastData, error } = await query;

      if (error) throw error;

      // Map the data to ensure collaboration_status is present
      const mappedData = (forecastData || []).map(item => ({
        ...item,
        collaboration_status: item.collaboration_status || 'pending_review'
      })) as unknown as ForecastCollaboration[];

      setForecastData(mappedData);

      // Fetch comments for the forecast data
      if (forecastData && forecastData.length > 0) {
        const forecastIds = forecastData.map(f => f.id);
        const { data: commentsData, error: commentsError } = await supabase
          .from('forecast_collaboration_comments')
          .select('*')
          .in('forecast_data_id', forecastIds)
          .order('created_at', { ascending: true });

        if (commentsError) {
          console.error('Error fetching comments:', commentsError);
        } else {
          setComments((commentsData || []) as unknown as CollaborationComment[]);
        }
      }

    } catch (error) {
      console.error('Error fetching collaboration data:', error);
      toast.error('Error al cargar datos de colaboración');
    } finally {
      setLoading(false);
    }
  };
  const fetchFilteredDataByProductIds = async (productIds: string[]) => {
    try {
      const { data, error } = await supabase
        .from('forecast_data')
        .select('*')
        .in('product_id', productIds);

      if (error) throw error;

      setForecastData(data || []);
    } catch (error) {
      console.error('Error fetching filtered data:', error);
      toast.error('Error al cargar datos filtrados');
    }
  };

  const updateForecastCollaboration = async (
    forecastId: string, 
    updates: Partial<ForecastCollaboration>
  ) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        toast.error('Usuario no autenticado');
        return false;
      }

      const { error } = await supabase
        .from('forecast_data')
        .update({
          ...updates,
          commercial_reviewed_by: user.id,
          commercial_reviewed_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', forecastId);

      if (error) throw error;

      toast.success('Colaboración actualizada exitosamente');
      await fetchCollaborationData();
      return true;
    } catch (error) {
      console.error('Error updating forecast collaboration:', error);
      toast.error('Error al actualizar colaboración');
      return false;
    }
  };

  const addComment = async (
    forecastId: string,
    commentText: string,
    commentType: string = 'information'
  ) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        toast.error('Usuario no autenticado');
        return false;
      }

      const { error } = await supabase
        .from('forecast_collaboration_comments')
        .insert({
          forecast_data_id: forecastId,
          user_id: user.id,
          comment_text: commentText,
          comment_type: commentType
        });

      if (error) throw error;

      toast.success('Comentario agregado');
      await fetchCollaborationData();
      return true;
    } catch (error) {
      console.error('Error adding comment:', error);
      toast.error('Error al agregar comentario');
      return false;
    }
  };

  return {
    forecastData,
    comments,
    loading,
    updateForecastCollaboration,
    addComment,
    refetch: fetchCollaborationData,
    fetchFilteredDataByProductIds, // Expose the function for external use
  };
}
