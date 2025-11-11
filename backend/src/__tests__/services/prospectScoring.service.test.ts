import prisma from '../../config/database';
import { Prospect } from '@prisma/client';
import {
  scoreProspect,
  batchScoreProspects,
  ScoringResult,
} from '../../services/prospectScoring.service';
import * as embeddingService from '../../services/embedding.service';
import * as vectorDbService from '../../services/vectorDb.service';
import * as prospectsService from '../../services/prospects.service';

// Import test helpers
import {
  createMockProspect,
  createMockCampaign,
  createMockLead,
  createMockICP,
} from '../setup';

jest.mock('../../config/database');
jest.mock('../../services/embedding.service');
jest.mock('../../services/vectorDb.service');
jest.mock('../../services/prospects.service');

describe('Prospect Scoring Service', () => {
  describe('scoreProspect', () => {
    it('should score a prospect with HOT qualification (e0.85)', async () => {
      const mockProspect = createMockProspect({
        id: 'prospect-1',
        campaignId: 'campaign-1',
        headline: 'CEO and Founder',
        companyName: 'Tech Startup Inc',
        location: 'San Francisco, CA',
        contactInfo: { email: 'ceo@tech.com' },
      });

      const mockICP = createMockICP({
        id: 'icp-1',
        demographics: {
          titles: ['CEO', 'Founder', 'CTO'],
          locations: ['San Francisco', 'New York'],
        },
        firmographics: {
          industries: ['SaaS', 'Tech'],
          companySizes: ['1-50'],
        },
      });

      const mockCampaign = createMockCampaign({
        id: 'campaign-1',
        icpId: 'icp-1',
        icp: mockICP,
      });

      // Mock service calls
      (prospectsService.getProspect as jest.Mock).mockResolvedValue(mockProspect);
      (prisma.prospectingCampaign.findFirst as jest.Mock).mockResolvedValue(mockCampaign);
      (embeddingService.generateEmbedding as jest.Mock).mockResolvedValue(new Array(1536).fill(0.5));
      (vectorDbService.fetchVector as jest.Mock).mockResolvedValue({
        id: 'icp-1',
        values: new Array(1536).fill(0.5),
      });
      (prospectsService.updateProspect as jest.Mock).mockResolvedValue(mockProspect);

      const result = await scoreProspect('prospect-1', 'team-1');

      expect(result.prospectId).toBe('prospect-1');
      expect(result.qualification).toBe('hot');
      expect(result.icpMatchScore).toBeGreaterThanOrEqual(0.85);
      expect(result.breakdown).toBeDefined();
      expect(prospectsService.updateProspect).toHaveBeenCalledWith(
        'prospect-1',
        expect.objectContaining({
          icpMatchScore: expect.any(Number),
          qualityScore: expect.any(Number),
        }),
        'team-1'
      );
    });

    it('should score a prospect with QUALIFIED qualification (0.75-0.84)', async () => {
      const mockProspect = createMockProspect({
        id: 'prospect-2',
        campaignId: 'campaign-1',
        headline: 'VP of Engineering',
        companyName: 'Software Co',
        location: 'Austin, TX',
      });

      const mockICP = createMockICP({
        id: 'icp-1',
        demographics: {
          titles: ['CEO', 'CTO', 'VP'],
          locations: ['San Francisco', 'Austin'],
        },
      });

      const mockCampaign = createMockCampaign({
        id: 'campaign-1',
        icpId: 'icp-1',
        icp: mockICP,
      });

      (prospectsService.getProspect as jest.Mock).mockResolvedValue(mockProspect);
      (prisma.prospectingCampaign.findFirst as jest.Mock).mockResolvedValue(mockCampaign);
      (embeddingService.generateEmbedding as jest.Mock).mockResolvedValue(new Array(1536).fill(0.4));
      (vectorDbService.fetchVector as jest.Mock).mockResolvedValue({
        id: 'icp-1',
        values: new Array(1536).fill(0.45),
      });
      (prospectsService.updateProspect as jest.Mock).mockResolvedValue(mockProspect);

      const result = await scoreProspect('prospect-2', 'team-1');

      expect(result.prospectId).toBe('prospect-2');
      expect(result.qualification).toBe('qualified');
      expect(result.icpMatchScore).toBeGreaterThanOrEqual(0.75);
      expect(result.icpMatchScore).toBeLessThan(0.85);
    });

    it('should score a prospect with WARM qualification (0.65-0.74)', async () => {
      const mockProspect = createMockProspect({
        id: 'prospect-3',
        campaignId: 'campaign-1',
        headline: 'Senior Developer',
        companyName: 'Tech Company',
        location: 'Remote',
      });

      const mockICP = createMockICP({
        id: 'icp-1',
        demographics: {
          titles: ['CTO', 'VP Engineering'],
          locations: ['San Francisco'],
        },
      });

      const mockCampaign = createMockCampaign({
        id: 'campaign-1',
        icpId: 'icp-1',
        icp: mockICP,
      });

      (prospectsService.getProspect as jest.Mock).mockResolvedValue(mockProspect);
      (prisma.prospectingCampaign.findFirst as jest.Mock).mockResolvedValue(mockCampaign);
      (embeddingService.generateEmbedding as jest.Mock).mockResolvedValue(new Array(1536).fill(0.3));
      (vectorDbService.fetchVector as jest.Mock).mockResolvedValue({
        id: 'icp-1',
        values: new Array(1536).fill(0.35),
      });
      (prospectsService.updateProspect as jest.Mock).mockResolvedValue(mockProspect);

      const result = await scoreProspect('prospect-3', 'team-1');

      expect(result.prospectId).toBe('prospect-3');
      expect(result.qualification).toBe('warm');
      expect(result.icpMatchScore).toBeGreaterThanOrEqual(0.65);
      expect(result.icpMatchScore).toBeLessThan(0.75);
    });

    it('should score a prospect with DISCARD qualification (<0.65)', async () => {
      const mockProspect = createMockProspect({
        id: 'prospect-4',
        campaignId: 'campaign-1',
        headline: 'Sales Associate',
        companyName: 'Retail Store',
        location: 'Unknown',
        contactInfo: {},
      });

      const mockICP = createMockICP({
        id: 'icp-1',
        demographics: {
          titles: ['CEO', 'CTO', 'Founder'],
          locations: ['San Francisco'],
        },
        firmographics: {
          industries: ['SaaS', 'Tech'],
        },
      });

      const mockCampaign = createMockCampaign({
        id: 'campaign-1',
        icpId: 'icp-1',
        icp: mockICP,
      });

      (prospectsService.getProspect as jest.Mock).mockResolvedValue(mockProspect);
      (prisma.prospectingCampaign.findFirst as jest.Mock).mockResolvedValue(mockCampaign);
      (embeddingService.generateEmbedding as jest.Mock).mockResolvedValue(new Array(1536).fill(0.1));
      (vectorDbService.fetchVector as jest.Mock).mockResolvedValue({
        id: 'icp-1',
        values: new Array(1536).fill(0.9),
      });
      (prospectsService.updateProspect as jest.Mock).mockResolvedValue(mockProspect);

      const result = await scoreProspect('prospect-4', 'team-1');

      expect(result.prospectId).toBe('prospect-4');
      expect(result.qualification).toBe('discard');
      expect(result.icpMatchScore).toBeLessThan(0.65);
    });

    it('should calculate quality score based on data completeness', async () => {
      const completeProspect = createMockProspect({
        id: 'prospect-5',
        campaignId: 'campaign-1',
        name: 'John Doe',
        headline: 'CEO',
        companyName: 'Acme Corp',
        location: 'San Francisco',
        profileUrl: 'https://linkedin.com/in/john-doe',
        contactInfo: { email: 'john@acme.com' },
      });

      const mockICP = createMockICP();
      const mockCampaign = createMockCampaign({ icpId: 'icp-1', icp: mockICP });

      (prospectsService.getProspect as jest.Mock).mockResolvedValue(completeProspect);
      (prisma.prospectingCampaign.findFirst as jest.Mock).mockResolvedValue(mockCampaign);
      (embeddingService.generateEmbedding as jest.Mock).mockResolvedValue(new Array(1536).fill(0.5));
      (vectorDbService.fetchVector as jest.Mock).mockResolvedValue({
        id: 'icp-1',
        values: new Array(1536).fill(0.5),
      });
      (prospectsService.updateProspect as jest.Mock).mockResolvedValue(completeProspect);

      const result = await scoreProspect('prospect-5', 'team-1');

      expect(result.qualityScore).toBeGreaterThan(0.8); // Complete data should have high quality score
    });

    it('should throw error if prospect not found', async () => {
      (prospectsService.getProspect as jest.Mock).mockResolvedValue(null);

      await expect(scoreProspect('invalid-id', 'team-1')).rejects.toThrow('Prospect not found');
    });

    it('should throw error if campaign not found', async () => {
      const mockProspect = createMockProspect();

      (prospectsService.getProspect as jest.Mock).mockResolvedValue(mockProspect);
      (prisma.prospectingCampaign.findFirst as jest.Mock).mockResolvedValue(null);

      await expect(scoreProspect('prospect-1', 'team-1')).rejects.toThrow('Campaign not found');
    });

    it('should throw error if campaign has no ICP', async () => {
      const mockProspect = createMockProspect();
      const mockCampaign = createMockCampaign({ icpId: null, icp: null });

      (prospectsService.getProspect as jest.Mock).mockResolvedValue(mockProspect);
      (prisma.prospectingCampaign.findFirst as jest.Mock).mockResolvedValue(mockCampaign);

      await expect(scoreProspect('prospect-1', 'team-1')).rejects.toThrow('Campaign has no ICP defined');
    });

    it('should throw error if ICP vector not found in Pinecone', async () => {
      const mockProspect = createMockProspect();
      const mockICP = createMockICP();
      const mockCampaign = createMockCampaign({ icpId: 'icp-1', icp: mockICP });

      (prospectsService.getProspect as jest.Mock).mockResolvedValue(mockProspect);
      (prisma.prospectingCampaign.findFirst as jest.Mock).mockResolvedValue(mockCampaign);
      (embeddingService.generateEmbedding as jest.Mock).mockResolvedValue(new Array(1536).fill(0.5));
      (vectorDbService.fetchVector as jest.Mock).mockResolvedValue(null);

      await expect(scoreProspect('prospect-1', 'team-1')).rejects.toThrow('Failed to fetch ICP vector');
    });
  });

  describe('batchScoreProspects', () => {
    it('should score multiple prospects in batch', async () => {
      const prospectIds = ['prospect-1', 'prospect-2', 'prospect-3'];

      const mockProspects = prospectIds.map((id, index) =>
        createMockProspect({
          id,
          campaignId: 'campaign-1',
          headline: `Executive ${index}`,
        })
      );

      const mockICP = createMockICP();
      const mockCampaign = createMockCampaign({ icpId: 'icp-1', icp: mockICP });

      // Mock all prospects to return successfully
      (prospectsService.getProspect as jest.Mock).mockImplementation((id: string) =>
        Promise.resolve(mockProspects.find(p => p.id === id))
      );
      (prisma.prospectingCampaign.findFirst as jest.Mock).mockResolvedValue(mockCampaign);
      (embeddingService.generateEmbedding as jest.Mock).mockResolvedValue(new Array(1536).fill(0.5));
      (vectorDbService.fetchVector as jest.Mock).mockResolvedValue({
        id: 'icp-1',
        values: new Array(1536).fill(0.5),
      });
      (prospectsService.updateProspect as jest.Mock).mockImplementation((id: string) =>
        Promise.resolve(mockProspects.find(p => p.id === id))
      );

      const results = await batchScoreProspects(prospectIds, 'team-1');

      expect(results).toHaveLength(3);
      expect(results.every(r => r.prospectId)).toBe(true);
      expect(results.every(r => typeof r.icpMatchScore === 'number')).toBe(true);
      expect(results.every(r => r.qualification)).toBe(true);
    });

    it('should continue scoring even if some prospects fail', async () => {
      const prospectIds = ['prospect-1', 'prospect-2', 'prospect-3'];

      const mockProspect1 = createMockProspect({ id: 'prospect-1' });
      const mockProspect3 = createMockProspect({ id: 'prospect-3' });
      const mockICP = createMockICP();
      const mockCampaign = createMockCampaign({ icpId: 'icp-1', icp: mockICP });

      // prospect-2 will fail
      (prospectsService.getProspect as jest.Mock).mockImplementation((id: string) => {
        if (id === 'prospect-2') return Promise.resolve(null);
        return Promise.resolve(id === 'prospect-1' ? mockProspect1 : mockProspect3);
      });
      (prisma.prospectingCampaign.findFirst as jest.Mock).mockResolvedValue(mockCampaign);
      (embeddingService.generateEmbedding as jest.Mock).mockResolvedValue(new Array(1536).fill(0.5));
      (vectorDbService.fetchVector as jest.Mock).mockResolvedValue({
        id: 'icp-1',
        values: new Array(1536).fill(0.5),
      });
      (prospectsService.updateProspect as jest.Mock).mockImplementation((id: string) =>
        Promise.resolve(id === 'prospect-1' ? mockProspect1 : mockProspect3)
      );

      const results = await batchScoreProspects(prospectIds, 'team-1');

      // Should have 2 successful results (prospect-2 failed)
      expect(results).toHaveLength(2);
      expect(results.map(r => r.prospectId)).toContain('prospect-1');
      expect(results.map(r => r.prospectId)).toContain('prospect-3');
      expect(results.map(r => r.prospectId)).not.toContain('prospect-2');
    });

    it('should return empty array if all prospects fail', async () => {
      const prospectIds = ['prospect-1', 'prospect-2'];

      (prospectsService.getProspect as jest.Mock).mockResolvedValue(null);

      const results = await batchScoreProspects(prospectIds, 'team-1');

      expect(results).toHaveLength(0);
    });
  });
});
