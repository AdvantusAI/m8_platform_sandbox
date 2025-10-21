import { useState, useEffect } from "react";

interface Product {
  id: string;
  product_id: number;
  product_name: string;
  category_id?: string;
  category_name?: string;
  subcategory_id?: string;
  subcategory_name?: string;
  brand?: string;
  description?: string;
  unit_price?: number;
  currency?: string;
  created_at: string;
  updated_at: string | Date;
  // For compatibility with SellThroughAnalyticsDashboard
  code?: string | number;
  name?: string;
}

export function useProducts() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadProducts = async () => {
      try {
        setLoading(true);
        setError(null);
        const fetchedProducts = await fetchProducts();
        setProducts(fetchedProducts);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch products');
      } finally {
        setLoading(false);
      }
    };
    
    loadProducts();
  }, []);

    const fetchProducts = async (filters?: { category?: string; subcategory?: string; search?: string }): Promise<Product[]> => {
    try {
      let url = 'http://localhost:3001/api/products';
      const params = new URLSearchParams();
      
      if (filters?.category) params.append('category', filters.category);
      if (filters?.subcategory) params.append('subcategory', filters.subcategory);
      if (filters?.search) params.append('search', filters.search);
      
      if (params.toString()) url += `?${params.toString()}`;
      
      const response = await fetch(url);
      if (!response.ok) throw new Error('Failed to fetch products');
      
      const data = await response.json();
      // The API returns an array directly, not wrapped in a products property
      const products = Array.isArray(data) ? data : (data.products || []);
      
      // Map to include compatibility fields for SellThroughAnalyticsDashboard
      return products.map((product: any) => ({
        ...product,
        code: product.product_id, // Map product_id to code
        name: product.product_name, // Map product_name to name
      }));
    } catch (error) {
      console.error('Error fetching products:', error);
      throw error;
    }
  };

  const getProductName = (productId: string | number): string => {
    const product = products.find(p => 
      p.product_id === productId || 
      p.product_id?.toString() === productId?.toString() ||
      p.id === productId?.toString()
    );
    return product?.product_name || `Producto ${productId}`;
  };

  const createProduct = async (productData: Omit<Product, 'id' | 'created_at' | 'updated_at'>) => {
    try {
      const response = await fetch('/api/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(productData),
      });

      if (!response.ok) throw new Error('Failed to create product');
      const newProduct = await response.json();
      setProducts(prev => [...prev, newProduct]);
      return newProduct;
    } catch (error) {
      console.error('Error creating product:', error);
      throw error;
    }
  };

  const updateProduct = async (id: string, updates: Partial<Product>) => {
    try {
      const response = await fetch(`/api/products/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });

      if (!response.ok) throw new Error('Failed to update product');
      const updatedProduct = await response.json();
      setProducts(prev => prev.map(p => p.id === id ? updatedProduct : p));
      return updatedProduct;
    } catch (error) {
      console.error('Error updating product:', error);
      throw error;
    }
  };

  const deleteProduct = async (id: string) => {
    try {
      const response = await fetch(`/api/products/${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) throw new Error('Failed to delete product');
      setProducts(prev => prev.filter(p => p.id !== id));
    } catch (error) {
      console.error('Error deleting product:', error);
      throw error;
    }
  };

  return {
    products,
    loading,
    error,
    getProductName,
    createProduct,
    updateProduct,
    deleteProduct,
    refetch: fetchProducts
  };
}