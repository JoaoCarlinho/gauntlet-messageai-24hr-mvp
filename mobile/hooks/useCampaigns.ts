/**
 * useCampaigns Hook
 *
 * Hook for fetching and managing marketing campaigns
 * Provides integration with Campaign Advisor and Performance Analyzer
 */

import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { Platform } from '../types/aiAgents';

const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3001';

export type CampaignStatus = 'draft' | 'active' | 'paused' | 'completed' | 'archived';

export interface Campaign {
  id: string;
  name: string;
  description?: string;
  status: CampaignStatus;
  platforms: Platform[];
  budget: number;
  spent: number;
  startDate: Date;
  endDate: Date;
  productId?: string;
  icpId?: string;
  metrics: CampaignMetrics;
  createdAt: Date;
  updatedAt: Date;
}

export interface CampaignMetrics {
  impressions: number;
  clicks: number;
  conversions: number;
  ctr: number;
  cpc: number;
  cpa: number;
  roas: number;
}

interface UseCampaignsReturn {
  campaigns: Campaign[];
  isLoading: boolean;
  error: string | null;
  refetch: () => void;
  updateCampaignStatus: (campaignId: string, status: CampaignStatus) => Promise<void>;
  getCampaignById: (campaignId: string) => Campaign | undefined;
}

export const useCampaigns = (): UseCampaignsReturn => {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch campaigns from API
  const fetchCampaigns = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const response = await axios.get<Campaign[]>(`${API_BASE_URL}/api/v1/campaigns`, {
        headers: {
          'Content-Type': 'application/json',
        },
      });

      setCampaigns(response.data);
    } catch (err: any) {
      console.error('Error fetching campaigns:', err);
      setError(err.message || 'Failed to fetch campaigns');
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Update campaign status
  const updateCampaignStatus = useCallback(async (campaignId: string, status: CampaignStatus) => {
    try {
      await axios.patch(`${API_BASE_URL}/api/v1/campaigns/${campaignId}/status`, {
        status,
      });

      // Update local state
      setCampaigns((prev) =>
        prev.map((campaign) =>
          campaign.id === campaignId ? { ...campaign, status, updatedAt: new Date() } : campaign
        )
      );
    } catch (err: any) {
      console.error('Error updating campaign status:', err);
      throw new Error(err.message || 'Failed to update campaign status');
    }
  }, []);

  // Get campaign by ID
  const getCampaignById = useCallback(
    (campaignId: string) => {
      return campaigns.find((c) => c.id === campaignId);
    },
    [campaigns]
  );

  // Initial fetch
  useEffect(() => {
    fetchCampaigns();
  }, [fetchCampaigns]);

  return {
    campaigns,
    isLoading,
    error,
    refetch: fetchCampaigns,
    updateCampaignStatus,
    getCampaignById,
  };
};

export default useCampaigns;
