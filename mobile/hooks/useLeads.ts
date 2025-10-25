/**
 * useLeads Hook
 *
 * Hook for fetching and managing leads from Discovery Bot sessions
 * Provides real-time updates via Socket.io
 */

import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { useSocket } from './useSocket';

const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3001';

export type LeadStatus = 'new' | 'contacted' | 'qualified' | 'unqualified' | 'converted';
export type LeadScore = 'hot' | 'warm' | 'cold';

export interface Lead {
  id: string;
  name: string;
  email: string;
  phone?: string;
  company?: string;
  jobTitle?: string;
  status: LeadStatus;
  score: LeadScore;
  source: string;
  discoverySessionId?: string;
  discoverySessionSummary?: string;
  assignedTo?: string;
  claimedBy?: string;
  claimedAt?: Date;
  activities?: LeadActivity[];
  createdAt: Date;
  updatedAt: Date;
}

export interface LeadActivity {
  id: string;
  leadId: string;
  type: 'note' | 'email' | 'call' | 'meeting' | 'status_change';
  description: string;
  userId: string;
  createdAt: Date;
}

interface UseLeadsReturn {
  leads: Lead[];
  isLoading: boolean;
  error: string | null;
  refetch: () => void;
  updateLeadStatus: (leadId: string, status: LeadStatus) => Promise<void>;
  claimLead: (leadId: string) => Promise<void>;
  addActivity: (leadId: string, activity: Omit<LeadActivity, 'id' | 'leadId' | 'userId' | 'createdAt'>) => Promise<void>;
}

export const useLeads = (): UseLeadsReturn => {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Use socket hook for real-time updates
  const { socket, isConnected } = useSocket({
    onMessage: () => {}, // Not used for leads
  });

  // Fetch leads from API
  const fetchLeads = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const response = await axios.get<Lead[]>(`${API_BASE_URL}/api/v1/leads`, {
        headers: {
          'Content-Type': 'application/json',
        },
      });

      setLeads(response.data);
    } catch (err: any) {
      console.error('Error fetching leads:', err);
      setError(err.message || 'Failed to fetch leads');
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Update lead status
  const updateLeadStatus = useCallback(async (leadId: string, status: LeadStatus) => {
    try {
      await axios.patch(`${API_BASE_URL}/api/v1/leads/${leadId}/status`, {
        status,
      });

      // Update local state
      setLeads((prev) =>
        prev.map((lead) =>
          lead.id === leadId ? { ...lead, status, updatedAt: new Date() } : lead
        )
      );
    } catch (err: any) {
      console.error('Error updating lead status:', err);
      throw new Error(err.message || 'Failed to update lead status');
    }
  }, []);

  // Claim lead
  const claimLead = useCallback(async (leadId: string) => {
    try {
      const response = await axios.post<Lead>(`${API_BASE_URL}/api/v1/leads/${leadId}/claim`);

      // Update local state
      setLeads((prev) =>
        prev.map((lead) => (lead.id === leadId ? response.data : lead))
      );
    } catch (err: any) {
      console.error('Error claiming lead:', err);
      throw new Error(err.message || 'Failed to claim lead');
    }
  }, []);

  // Add activity
  const addActivity = useCallback(
    async (
      leadId: string,
      activity: Omit<LeadActivity, 'id' | 'leadId' | 'userId' | 'createdAt'>
    ) => {
      try {
        const response = await axios.post<LeadActivity>(
          `${API_BASE_URL}/api/v1/leads/${leadId}/activities`,
          activity
        );

        // Update local state
        setLeads((prev) =>
          prev.map((lead) =>
            lead.id === leadId
              ? {
                  ...lead,
                  activities: [...(lead.activities || []), response.data],
                  updatedAt: new Date(),
                }
              : lead
          )
        );
      } catch (err: any) {
        console.error('Error adding activity:', err);
        throw new Error(err.message || 'Failed to add activity');
      }
    },
    []
  );

  // Listen for real-time lead updates
  useEffect(() => {
    if (!socket || !isConnected) return;

    const handleNewLead = (lead: Lead) => {
      console.log('New lead received:', lead);
      setLeads((prev) => [lead, ...prev]);
    };

    const handleLeadUpdate = (lead: Lead) => {
      console.log('Lead updated:', lead);
      setLeads((prev) =>
        prev.map((l) => (l.id === lead.id ? lead : l))
      );
    };

    socket.on('new_lead', handleNewLead);
    socket.on('lead_updated', handleLeadUpdate);

    return () => {
      socket.off('new_lead', handleNewLead);
      socket.off('lead_updated', handleLeadUpdate);
    };
  }, [socket, isConnected]);

  // Initial fetch
  useEffect(() => {
    fetchLeads();
  }, [fetchLeads]);

  return {
    leads,
    isLoading,
    error,
    refetch: fetchLeads,
    updateLeadStatus,
    claimLead,
    addActivity,
  };
};

export default useLeads;
