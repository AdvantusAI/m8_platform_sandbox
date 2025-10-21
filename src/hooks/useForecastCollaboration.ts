
import { useState, useEffect } from 'react';
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



export function useForecastCollaboration(
  productId?: string, 
  locationId?: string, 
  customerId?: string,
  selectionType?: 'category' | 'subcategory' | 'product'
) {
  const [forecastData, setForecastData] = useState<ForecastCollaboration[]>([]);
  const [comments, setComments] = useState<CollaborationComment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    console.log('useForecastCollaboration useEffect triggered:', {
      productId,
      locationId,
      customerId,
      selectionType
    });
    
    // Fetch data when we have a primary filter (product, category, or subcategory)
    // Location and customer filters are optional and work in combination
    if (productId || selectionType === 'category' || selectionType === 'subcategory') {
      console.log('Calling fetchCollaborationData...');
      fetchCollaborationData();
    } else {
      console.log('No primary filter selected, clearing data');
      // Clear data when no primary filter is selected
      setForecastData([]);
      setComments([]);
      setLoading(false);
    }
  }, [productId, locationId, customerId, selectionType]);

  const fetchCollaborationData = async () => {
    try {
      setLoading(true);
      console.log('fetchCollaborationData called with:', {
        productId,
        locationId,
        customerId,
        selectionType
      });
      
   
      
      let forecastData: Array<{
        postdate: string;
        product_id: string;
        location_id?: string; // Legacy field
        customer_id?: string; // Legacy field
        location_node_id?: string; // New UUID field
        customer_node_id?: string; // New UUID field
        forecast: number | null;
        actual: number | null;
        sales_plan: number | null;
        demand_planner: number | null;
        commercial_input: number | null;
        commercial_notes: string | null;
        collaboration_status: string | null;
        products: {
          category_id: string | null;
          category_name: string | null;
          subcategory_id: string | null;
          subcategory_name: string | null;
        } | null;
      }> = [];
      
      // Build query parameters for location and customer filtering
      const queryParams = new URLSearchParams();
      if (locationId) {
        queryParams.append('location_node_id', locationId);
      }
      if (customerId) {
        queryParams.append('customer_node_id', customerId);
      }
      const queryString = queryParams.toString();
      const urlSuffix = queryString ? `?${queryString}` : '';

      // Determine the selection type and build appropriate API call
      if (productId && selectionType === 'category') {
        const response = await fetch(`http://localhost:3001/api/forecast-data/category/${productId}${urlSuffix}`);
        if (!response.ok) throw new Error('Failed to fetch category data');
        forecastData = await response.json();
        
      } else if (productId && selectionType === 'subcategory') {
        const response = await fetch(`http://localhost:3001/api/forecast-data/subcategory/${productId}${urlSuffix}`);
        if (!response.ok) throw new Error('Failed to fetch subcategory data');
        forecastData = await response.json();
        
      } else if (productId && selectionType === 'product') {
        const response = await fetch(`http://localhost:3001/api/forecast-data/product/${productId}${urlSuffix}`);
        if (!response.ok) throw new Error('Failed to fetch product data');
        forecastData = await response.json();
        
      } else if (!productId && (locationId || customerId)) {
        // Use general endpoint when only location/customer filters are applied
        const response = await fetch(`http://localhost:3001/api/forecast-data${urlSuffix}`);
        if (!response.ok) throw new Error('Failed to fetch filtered data');
        forecastData = await response.json();
      }

     

      // Aggregate data by postdate
      const aggregatedData = new Map<string, {
        postdate: string;
        product_id: string;
        location_id: string;
        customer_id: string;
        forecast: number;
        actual: number;
        sales_plan: number;
        demand_planner: number;
        commercial_input: number;
        commercial_notes: string;
        collaboration_status: string;
      }>();
      
      forecastData.forEach(item => {
        const postdate = item.postdate;
        if (!aggregatedData.has(postdate)) {
          aggregatedData.set(postdate, {
            postdate,
            product_id: item.product_id,
            location_id: item.location_node_id || item.location_id || '', // Use new field name with fallback
            customer_id: item.customer_node_id || item.customer_id || '', // Use new field name with fallback
            forecast: 0,
            actual: 0,
            sales_plan: 0,
            demand_planner: 0,
            commercial_input: 0,
            commercial_notes: item.commercial_notes || '',
            collaboration_status: item.collaboration_status || 'pending_review'
          });
        }
        
        const existing = aggregatedData.get(postdate);
        existing.forecast += (item.forecast || 0);
        existing.actual += (item.actual || 0);
        existing.sales_plan += (item.sales_plan || 0);
        existing.demand_planner += (item.demand_planner || 0);
        existing.commercial_input += (item.commercial_input || 0);
      });

      // Convert to array and map to expected format
      const processedData = Array.from(aggregatedData.values()).map(item => ({
        id: `agg_${item.postdate}_${item.product_id}`,
        postdate: item.postdate,
        product_id: item.product_id,
        location_id: item.location_id,
        customer_id: item.customer_id,
        forecast: item.forecast,
        actual: item.actual,
        sales_plan: item.sales_plan,
        demand_planner: item.demand_planner,
        commercial_input: item.commercial_input,
        commercial_notes: item.commercial_notes,
        collaboration_status: item.collaboration_status
      })) as unknown as ForecastCollaboration[];

    
      setForecastData(processedData);

      // Fetch comments if we have specific forecast data
      if (processedData.length > 0 && selectionType === 'product') {
        await fetchComments(processedData[0].id);
      } else {
        setComments([]);
      }

    } catch (error) {
      console.error('Error fetching collaboration data:', error);
      toast.error('Error al cargar datos de colaboración');
    } finally {
      setLoading(false);
    }
  };

  const fetchComments = async (forecastId: string) => {
    try {
      const response = await fetch(`http://localhost:3001/api/forecast-collaboration-comments/${forecastId}`);
      if (!response.ok) throw new Error('Failed to fetch comments');
      const commentsData = await response.json();
      setComments(commentsData || []);
    } catch (error) {
      console.error('Error fetching comments:', error);
      setComments([]);
    }
  };

  const fetchFilteredDataByProductIds = async (productIds: string[]) => {
    try {
      const response = await fetch(`http://localhost:3001/api/forecast-data/by-products`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ productIds }),
      });

      if (!response.ok) throw new Error('Failed to fetch filtered data');
      const data = await response.json();

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
      // For now, we'll skip user authentication since it's not implemented in MongoDB API
      // In a full implementation, you'd want to get the current user from your auth system
      
      const response = await fetch(`http://localhost:3001/api/forecast-data/${forecastId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...updates,
          commercial_reviewed_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }),
      });

      if (!response.ok) throw new Error('Failed to update forecast collaboration');

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
      // For now, we'll skip user authentication since it's not implemented in MongoDB API
      // In a full implementation, you'd want to get the current user from your auth system
      
      const response = await fetch(`http://localhost:3001/api/forecast-collaboration-comments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          forecast_data_id: forecastId,
          comment_text: commentText,
          comment_type: commentType,
          created_at: new Date().toISOString()
        }),
      });

      if (!response.ok) throw new Error('Failed to add comment');

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
