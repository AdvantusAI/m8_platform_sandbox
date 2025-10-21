import { useState, useEffect } from "react";
import { toast } from "sonner";

interface CustomerAssignment {
  id: string;
  commercial_user_id: string;
  customer_id: string;
  assignment_type: string;
  start_date: string;
  end_date?: string;
  created_at: string;
}

interface ProductAssignment {
  id: string;
  user_id: string;
  customer_id: string;
  product_id: string;
  assignment_type: string;
  start_date: string;
  end_date?: string;
  created_at: string;
  updated_at: string;
}

export function useUserAssignments() {
  const [customerAssignments, setCustomerAssignments] = useState<CustomerAssignment[]>([]);
  const [productAssignments, setProductAssignments] = useState<ProductAssignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchAssignments();
  }, []);

  const fetchAssignments = async () => {
    try {
      setLoading(true);
      
      // Fetch customer assignments
      const customerResponse = await fetch('/api/customer-assignments');
      if (!customerResponse.ok) throw new Error('Failed to fetch customer assignments');
      const customerData = await customerResponse.json();

      // Fetch product assignments
      const productResponse = await fetch('/api/product-assignments');
      if (!productResponse.ok) throw new Error('Failed to fetch product assignments');
      const productData = await productResponse.json();

      setCustomerAssignments(customerData || []);
      setProductAssignments(productData || []);
    } catch (err) {
      console.error('Error fetching assignments:', err);
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const createCustomerAssignment = async (assignment: Omit<CustomerAssignment, 'id' | 'created_at'>) => {
    try {
      const response = await fetch('/api/customer-assignments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(assignment),
      });

      if (!response.ok) throw new Error('Failed to create customer assignment');
      const data = await response.json();

      setCustomerAssignments(prev => [data, ...prev]);
      toast.success('Asignación de cliente creada exitosamente');
      return data;
    } catch (err) {
      console.error('Error creating customer assignment:', err);
      toast.error('Error al crear la asignación de cliente');
      throw err;
    }
  };

  const createProductAssignment = async (assignment: Omit<ProductAssignment, 'id' | 'created_at' | 'updated_at'>) => {
    try {
      const response = await fetch('/api/product-assignments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(assignment),
      });

      if (!response.ok) throw new Error('Failed to create product assignment');
      const data = await response.json();

      setProductAssignments(prev => [data, ...prev]);
      toast.success('Asignación de producto creada exitosamente');
      return data;
    } catch (err) {
      console.error('Error creating product assignment:', err);
      toast.error('Error al crear la asignación de producto');
      throw err;
    }
  };

  const updateCustomerAssignment = async (id: string, updates: Partial<CustomerAssignment>) => {
    try {
      const response = await fetch(`/api/customer-assignments/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });

      if (!response.ok) throw new Error('Failed to update customer assignment');
      const data = await response.json();

      setCustomerAssignments(prev => 
        prev.map(assignment => assignment.id === id ? data : assignment)
      );
      toast.success('Asignación de cliente actualizada exitosamente');
      return data;
    } catch (err) {
      console.error('Error updating customer assignment:', err);
      toast.error('Error al actualizar la asignación de cliente');
      throw err;
    }
  };

  const updateProductAssignment = async (id: string, updates: Partial<ProductAssignment>) => {
    try {
      const response = await fetch(`/api/product-assignments/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });

      if (!response.ok) throw new Error('Failed to update product assignment');
      const data = await response.json();

      setProductAssignments(prev => 
        prev.map(assignment => assignment.id === id ? data : assignment)
      );
      toast.success('Asignación de producto actualizada exitosamente');
      return data;
    } catch (err) {
      console.error('Error updating product assignment:', err);
      toast.error('Error al actualizar la asignación de producto');
      throw err;
    }
  };

  const deleteCustomerAssignment = async (id: string) => {
    try {
      const response = await fetch(`/api/customer-assignments/${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) throw new Error('Failed to delete customer assignment');

      setCustomerAssignments(prev => prev.filter(assignment => assignment.id !== id));
      toast.success('Asignación de cliente eliminada exitosamente');
    } catch (err) {
      console.error('Error deleting customer assignment:', err);
      toast.error('Error al eliminar la asignación de cliente');
      throw err;
    }
  };

  const deleteProductAssignment = async (id: string) => {
    try {
      const response = await fetch(`/api/product-assignments/${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) throw new Error('Failed to delete product assignment');

      setProductAssignments(prev => prev.filter(assignment => assignment.id !== id));
      toast.success('Asignación de producto eliminada exitosamente');
    } catch (err) {
      console.error('Error deleting product assignment:', err);
      toast.error('Error al eliminar la asignación de producto');
      throw err;
    }
  };

  return {
    customerAssignments,
    productAssignments,
    loading,
    error,
    createCustomerAssignment,
    createProductAssignment,
    updateCustomerAssignment,
    updateProductAssignment,
    deleteCustomerAssignment,
    deleteProductAssignment,
    refetch: fetchAssignments
  };
}