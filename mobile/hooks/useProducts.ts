/**
 * useProducts Hook
 *
 * Hook for fetching and managing products
 * Integrates with Product Definer AI agent
 */

import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';

const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3001';

export interface Product {
  id: string;
  name: string;
  description: string;
  pricing?: {
    model: string;
    amount: number;
    currency: string;
  };
  usps: string[];
  targetAudience?: string;
  features?: string[];
  createdBy?: 'ai' | 'manual';
  createdAt: Date;
  updatedAt: Date;
}

interface UseProductsReturn {
  products: Product[];
  isLoading: boolean;
  error: string | null;
  refetch: () => void;
  getProductById: (productId: string) => Product | undefined;
  deleteProduct: (productId: string) => Promise<void>;
}

export const useProducts = (): UseProductsReturn => {
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch products from API
  const fetchProducts = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const response = await axios.get<Product[]>(`${API_BASE_URL}/api/v1/products`, {
        headers: {
          'Content-Type': 'application/json',
        },
      });

      setProducts(response.data);
    } catch (err: any) {
      console.error('Error fetching products:', err);
      setError(err.message || 'Failed to fetch products');
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Get product by ID
  const getProductById = useCallback(
    (productId: string) => {
      return products.find((p) => p.id === productId);
    },
    [products]
  );

  // Delete product
  const deleteProduct = useCallback(async (productId: string) => {
    try {
      await axios.delete(`${API_BASE_URL}/api/v1/products/${productId}`);

      // Update local state
      setProducts((prev) => prev.filter((p) => p.id !== productId));
    } catch (err: any) {
      console.error('Error deleting product:', err);
      throw new Error(err.message || 'Failed to delete product');
    }
  }, []);

  // Initial fetch
  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  return {
    products,
    isLoading,
    error,
    refetch: fetchProducts,
    getProductById,
    deleteProduct,
  };
};

export default useProducts;
