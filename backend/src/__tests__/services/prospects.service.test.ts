/**
 * Tests for Prospect Service (Epic 3, Story 3.1)
 * Tests CRUD operations with team-based access control
 */

import prisma from '../../config/database';
import { Prospect } from '@prisma/client';

// Import service functions
import {
  createProspect,
  getProspect,
  listProspects,
  updateProspect,
  deleteProspect,
  batchCreateProspects,
} from '../../services/prospects.service';

jest.mock('../../config/database');

// Import test helpers
import {
  createMockProspect,
  createMockCampaign,
  createMockLead,
  createMockICP,
} from '../setup';

describe('Prospect Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('createProspect', () => {
    it('should create a prospect with valid campaign', async () => {
      const mockCampaign = createMockCampaign();
      const prospectData = {
        campaignId: 'campaign-1',
        platform: 'linkedin' as const,
        platformProfileId: 'john-doe',
        profileUrl: 'https://linkedin.com/in/john-doe',
        name: 'John Doe',
        headline: 'CEO at Acme Corp',
        location: 'San Francisco, CA',
        companyName: 'Acme Corp',
        profileData: {},
      };

      (prisma.prospectingCampaign.findFirst as jest.Mock).mockResolvedValue(mockCampaign);
      (prisma.prospect.create as jest.Mock).mockResolvedValue({
        id: 'prospect-1',
        ...prospectData,
        status: 'new',
        icpMatchScore: 0,
        qualityScore: 0,
        discoveredAt: new Date(),
      });
      (prisma.prospectingCampaign.update as jest.Mock).mockResolvedValue(mockCampaign);

      const result = await createProspect(prospectData, 'team-1');

      expect(result).toBeDefined();
      expect(result.platform).toBe('linkedin');
      expect(result.name).toBe('John Doe');
      expect(prisma.prospectingCampaign.update).toHaveBeenCalledWith({
        where: { id: 'campaign-1' },
        data: { discoveredCount: { increment: 1 } },
      });
    });

    it('should reject prospect creation with invalid campaign (different team)', async () => {
      const prospectData = {
        campaignId: 'campaign-1',
        platform: 'linkedin' as const,
        platformProfileId: 'john-doe',
        profileUrl: 'https://linkedin.com/in/john-doe',
        profileData: {},
      };

      (prisma.prospectingCampaign.findFirst as jest.Mock).mockResolvedValue(null);

      await expect(createProspect(prospectData, 'team-1')).rejects.toThrow(
        'Campaign not found or access denied'
      );
    });

    it('should handle duplicate prospects gracefully', async () => {
      const mockCampaign = createMockCampaign();
      const prospectData = {
        campaignId: 'campaign-1',
        platform: 'linkedin' as const,
        platformProfileId: 'john-doe',
        profileUrl: 'https://linkedin.com/in/john-doe',
        profileData: {},
      };

      (prisma.prospectingCampaign.findFirst as jest.Mock).mockResolvedValue(mockCampaign);
      (prisma.prospect.create as jest.Mock).mockRejectedValue({
        code: 'P2002',
        meta: { target: ['platform', 'platformProfileId'] },
      });

      await expect(createProspect(prospectData, 'team-1')).rejects.toThrow();
    });
  });

  describe('getProspect', () => {
    it('should get prospect with correct teamId', async () => {
      const mockProspect = createMockProspect();

      (prisma.prospect.findFirst as jest.Mock).mockResolvedValue(mockProspect);

      const result = await getProspect('prospect-1', 'team-1');

      expect(result).toBeDefined();
      expect(result?.id).toBe('prospect-1');
      expect(prisma.prospect.findFirst).toHaveBeenCalledWith({
        where: {
          id: 'prospect-1',
          campaign: { teamId: 'team-1' },
        },
      });
    });

    it('should return null for prospect from different team', async () => {
      (prisma.prospect.findFirst as jest.Mock).mockResolvedValue(null);

      const result = await getProspect('prospect-1', 'team-2');

      expect(result).toBeNull();
    });
  });

  describe('listProspects', () => {
    it('should list prospects with status filter', async () => {
      const mockProspects = [
        createMockProspect({ id: 'p1', status: 'qualified' }),
        createMockProspect({ id: 'p2', status: 'qualified' }),
      ];

      (prisma.prospect.findMany as jest.Mock).mockResolvedValue(mockProspects);

      const result = await listProspects('campaign-1', 'team-1', { status: 'qualified' });

      expect(result).toHaveLength(2);
      expect(prisma.prospectingCampaign.findFirst).toHaveBeenCalledWith({
        where: { id: 'campaign-1', teamId: 'team-1' },
      });
    });

    it('should list prospects with ICP score range filter', async () => {
      const mockProspects = [createMockProspect({ icpMatchScore: 0.85 })];
      const mockCampaign = createMockCampaign();

      (prisma.prospectingCampaign.findFirst as jest.Mock).mockResolvedValue(mockCampaign);
      (prisma.prospect.findMany as jest.Mock).mockResolvedValue(mockProspects);

      const result = await listProspects('campaign-1', 'team-1', {
        minScore: 0.75,
        maxScore: 1.0,
      });

      expect(result).toHaveLength(1);
    });

    it('should list prospects with platform filter', async () => {
      const mockProspects = [createMockProspect({ platform: 'linkedin' })];
      const mockCampaign = createMockCampaign();

      (prisma.prospectingCampaign.findFirst as jest.Mock).mockResolvedValue(mockCampaign);
      (prisma.prospect.findMany as jest.Mock).mockResolvedValue(mockProspects);

      const result = await listProspects('campaign-1', 'team-1', { platform: 'linkedin' });

      expect(result).toHaveLength(1);
    });
  });

  describe('updateProspect', () => {
    it('should update prospect from same team', async () => {
      const mockCampaign = createMockCampaign();
      const mockProspect = createMockProspect();

      (prisma.prospect.findFirst as jest.Mock).mockResolvedValue(mockProspect);
      (prisma.prospect.update as jest.Mock).mockResolvedValue({
        ...mockProspect,
        status: 'enriched',
      });

      const result = await updateProspect('prospect-1', { status: 'enriched' }, 'team-1');

      expect(result.status).toBe('enriched');
    });

    it('should reject update for prospect from different team', async () => {
      (prisma.prospect.findFirst as jest.Mock).mockResolvedValue(null);

      await expect(
        updateProspect('prospect-1', { status: 'enriched' }, 'team-2')
      ).rejects.toThrow('Prospect not found or access denied');
    });
  });

  describe('deleteProspect', () => {
    it('should delete prospect from same team', async () => {
      const mockProspect = createMockProspect();

      (prisma.prospect.findFirst as jest.Mock).mockResolvedValue(mockProspect);
      (prisma.prospect.delete as jest.Mock).mockResolvedValue(mockProspect);

      await deleteProspect('prospect-1', 'team-1');

      expect(prisma.prospect.delete).toHaveBeenCalledWith({
        where: { id: 'prospect-1' },
      });
    });

    it('should reject delete for prospect from different team', async () => {
      (prisma.prospect.findFirst as jest.Mock).mockResolvedValue(null);

      await expect(deleteProspect('prospect-1', 'team-2')).rejects.toThrow(
        'Prospect not found or access denied'
      );
    });
  });

  describe('batchCreateProspects', () => {
    it('should create multiple prospects in batch', async () => {
      const mockCampaign = createMockCampaign();
      const prospectsData = [
        {
          campaignId: 'campaign-1',
          platform: 'csv' as const,
          platformProfileId: 'john-doe',
          profileUrl: 'https://linkedin.com/in/john-doe',
          profileData: {},
        },
        {
          campaignId: 'campaign-1',
          platform: 'csv' as const,
          platformProfileId: 'jane-smith',
          profileUrl: 'https://linkedin.com/in/jane-smith',
          profileData: {},
        },
      ];

      (prisma.prospectingCampaign.findFirst as jest.Mock).mockResolvedValue(mockCampaign);
      (prisma.prospect.create as jest.Mock)
        .mockResolvedValueOnce(createMockProspect({ id: 'p1' }))
        .mockResolvedValueOnce(createMockProspect({ id: 'p2' }));
      (prisma.prospectingCampaign.update as jest.Mock).mockResolvedValue(mockCampaign);

      const result = await batchCreateProspects(prospectsData, 'campaign-1', 'team-1');

      expect(result.created).toBe(2);
      expect(result.skipped).toBe(0);
      expect(prisma.prospectingCampaign.update).toHaveBeenCalledWith({
        where: { id: 'campaign-1' },
        data: { discoveredCount: { increment: 2 } },
      });
    });

    it('should handle partial failures in batch creation', async () => {
      const mockCampaign = createMockCampaign();
      const prospectsData = [
        {
          campaignId: 'campaign-1',
          platform: 'csv' as const,
          platformProfileId: 'john-doe',
          profileUrl: 'https://linkedin.com/in/john-doe',
          profileData: {},
        },
        {
          campaignId: 'campaign-1',
          platform: 'csv' as const,
          platformProfileId: 'invalid',
          profileUrl: '',
          profileData: {},
        },
      ];

      (prisma.prospectingCampaign.findFirst as jest.Mock).mockResolvedValue(mockCampaign);
      (prisma.prospect.create as jest.Mock)
        .mockResolvedValueOnce(createMockProspect({ id: 'p1' }))
        .mockRejectedValueOnce(new Error('Invalid data'));
      (prisma.prospectingCampaign.update as jest.Mock).mockResolvedValue(mockCampaign);

      const result = await batchCreateProspects(prospectsData, 'campaign-1', 'team-1');

      expect(result.created).toBe(1);
      expect(result.errors).toHaveLength(1);
    });
  });
});
