/**
 * useICPs Hook
 *
 * Hook for fetching and managing Ideal Customer Profiles (ICPs)
 * Integrates with Product Definer AI agent
 */

import { useState, useEffect, useCallback } from 'react';
import api from '../lib/api';

export interface ICP {
  id: string;
  name: string;
  productId: string;
  demographics: {
    ageRange?: string;
    gender?: string;
    location?: string;
    income?: string;
    education?: string;
    occupation?: string;
  };
  psychographics?: {
    interests?: string[];
    values?: string[];
    lifestyle?: string;
  };
  painPoints: string[];
  goals?: string[];
  preferredChannels: string[];
  buyingBehavior?: string;
  createdBy?: 'ai' | 'manual';
  createdAt: Date;
  updatedAt: Date;
}

interface UseICPsReturn {
  icps: ICP[];
  isLoading: boolean;
  error: string | null;
  refetch: () => void;
  getICPById: (icpId: string) => ICP | undefined;
  getICPsByProduct: (productId: string) => ICP[];
  deleteICP: (icpId: string) => Promise<void>;
}

export const useICPs = (): UseICPsReturn => {
  const [icps, setICPs] = useState<ICP[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch ICPs from API
  const fetchICPs = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const icps = await api.icps.getICPs();

      setICPs(icps);
    } catch (err: any) {
      console.error('Error fetching ICPs:', err);
      setError(err.message || 'Failed to fetch ICPs');
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Get ICP by ID
  const getICPById = useCallback(
    (icpId: string) => {
      return icps.find((icp) => icp.id === icpId);
    },
    [icps]
  );

  // Get ICPs by product
  const getICPsByProduct = useCallback(
    (productId: string) => {
      return icps.filter((icp) => icp.productId === productId);
    },
    [icps]
  );

  // Delete ICP
  const deleteICP = useCallback(async (icpId: string) => {
    try {
      await api.icps.deleteICP(icpId);

      // Update local state
      setICPs((prev) => prev.filter((icp) => icp.id !== icpId));
    } catch (err: any) {
      console.error('Error deleting ICP:', err);
      throw new Error(err.message || 'Failed to delete ICP');
    }
  }, []);

  // Initial fetch
  useEffect(() => {
    fetchICPs();
  }, [fetchICPs]);

  return {
    icps,
    isLoading,
    error,
    refetch: fetchICPs,
    getICPById,
    getICPsByProduct,
    deleteICP,
  };
};

export default useICPs;
