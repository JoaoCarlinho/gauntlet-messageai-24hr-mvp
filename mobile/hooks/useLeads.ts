/**
 * useLeads Hook
 *
 * Hook for fetching and managing leads from Discovery Bot sessions
 * Provides real-time updates via Socket.io
 */

import { useState, useEffect, useCallback } from 'react';
import api from '../lib/api';
import { socketManager } from '../lib/socket';

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

  // Fetch leads from API
  const fetchLeads = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const leads = await api.leads.getLeads();

      setLeads(leads);
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
      await api.leads.updateLeadStatus(leadId, status);

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
      const updatedLead = await api.leads.claimLead(leadId);

      // Update local state
      setLeads((prev) =>
        prev.map((lead) => (lead.id === leadId ? updatedLead : lead))
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
        const newActivity = await api.leads.addActivity(leadId, activity);

        // Update local state
        setLeads((prev) =>
          prev.map((lead) =>
            lead.id === leadId
              ? {
                  ...lead,
                  activities: [...(lead.activities || []), newActivity],
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
    if (!socketManager.isConnected()) return;

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

    socketManager.on('new_lead', handleNewLead);
    socketManager.on('lead_updated', handleLeadUpdate);

    return () => {
      socketManager.off('new_lead', handleNewLead);
      socketManager.off('lead_updated', handleLeadUpdate);
    };
  }, []);

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
