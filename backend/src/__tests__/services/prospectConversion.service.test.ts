import prisma from '../../config/database';
import {
  convertProspectToLead,
  batchConvertProspects,
  ConflictError,
  BadRequestError,
} from '../../services/prospectConversion.service';

// Import test helpers
import {
  createMockProspect,
  createMockCampaign,
  createMockLead,
  createMockICP,
} from '../setup';

jest.mock('../../config/database');

describe('Prospect Conversion Service', () => {
  describe('convertProspectToLead', () => {
    it('should convert a qualified prospect to lead', async () => {
      const mockCampaign = createMockCampaign({
        id: 'campaign-1',
        teamId: 'team-1',
        name: 'Q4 SaaS Founders',
      });

      const mockProspect = createMockProspect({
        id: 'prospect-1',
        campaignId: 'campaign-1',
        status: 'qualified',
        icpMatchScore: 0.87,
        name: 'John Doe',
        headline: 'CEO at Acme Corp',
        companyName: 'Acme Corp',
        contactInfo: { email: 'john@acme.com', phone: '+1234567890' },
        convertedToLeadId: null,
        campaign: mockCampaign,
      });

      const mockLead = createMockLead({
        id: 'lead-1',
        teamId: 'team-1',
        prospectId: 'prospect-1',
        email: 'john@acme.com',
      });

      (prisma.prospect.findFirst as jest.Mock).mockResolvedValue(mockProspect);

      // Mock transaction
      const mockTx = {
        lead: {
          create: jest.fn().mockResolvedValue(mockLead),
        },
        prospect: {
          update: jest.fn().mockResolvedValue({
            ...mockProspect,
            status: 'converted',
            convertedToLeadId: 'lead-1',
          }),
        },
        prospectingCampaign: {
          update: jest.fn().mockResolvedValue(mockCampaign),
        },
      };

      (prisma.$transaction as jest.Mock).mockImplementation(async (callback: any) =>
        callback(mockTx)
      );

      const result = await convertProspectToLead('prospect-1', 'team-1');

      expect(result.leadId).toBe('lead-1');
      expect(result.prospectId).toBe('prospect-1');
      expect(result.message).toBe('Prospect converted successfully');
      expect(mockTx.lead.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          teamId: 'team-1',
          campaignId: 'campaign-1',
          prospectId: 'prospect-1',
          email: 'john@acme.com',
          phone: '+1234567890',
          firstName: 'John',
          lastName: 'Doe',
          company: 'Acme Corp',
          jobTitle: 'CEO at Acme Corp',
          status: 'new',
          qualificationScore: 0.87,
        }),
      });
      expect(mockTx.prospect.update).toHaveBeenCalledWith({
        where: { id: 'prospect-1' },
        data: {
          status: 'converted',
          convertedToLeadId: 'lead-1',
          updatedAt: expect.any(Date),
        },
      });
      expect(mockTx.prospectingCampaign.update).toHaveBeenCalledWith({
        where: { id: 'campaign-1' },
        data: {
          convertedCount: { increment: 1 },
        },
      });
    });

    it('should convert prospect with high ICP score even if status is not "qualified"', async () => {
      const mockCampaign = createMockCampaign({
        id: 'campaign-1',
        teamId: 'team-1',
      });

      const mockProspect = createMockProspect({
        id: 'prospect-2',
        status: 'enriched',
        icpMatchScore: 0.88,
        convertedToLeadId: null,
        campaign: mockCampaign,
      });

      const mockLead = createMockLead({ id: 'lead-2' });

      (prisma.prospect.findFirst as jest.Mock).mockResolvedValue(mockProspect);

      const mockTx = {
        lead: {
          create: jest.fn().mockResolvedValue(mockLead),
        },
        prospect: {
          update: jest.fn().mockResolvedValue(mockProspect),
        },
        prospectingCampaign: {
          update: jest.fn().mockResolvedValue(mockCampaign),
        },
      };

      (prisma.$transaction as jest.Mock).mockImplementation(async (callback: any) =>
        callback(mockTx)
      );

      const result = await convertProspectToLead('prospect-2', 'team-1');

      expect(result.leadId).toBe('lead-2');
      expect(mockTx.lead.create).toHaveBeenCalled();
    });

    it('should parse multi-part names correctly', async () => {
      const mockCampaign = createMockCampaign({
        id: 'campaign-1',
        teamId: 'team-1',
      });

      const mockProspect = createMockProspect({
        id: 'prospect-3',
        status: 'qualified',
        name: 'Mary Jane Watson Parker',
        convertedToLeadId: null,
        campaign: mockCampaign,
      });

      const mockLead = createMockLead({ id: 'lead-3' });

      (prisma.prospect.findFirst as jest.Mock).mockResolvedValue(mockProspect);

      const mockTx = {
        lead: {
          create: jest.fn().mockResolvedValue(mockLead),
        },
        prospect: {
          update: jest.fn().mockResolvedValue(mockProspect),
        },
        prospectingCampaign: {
          update: jest.fn().mockResolvedValue(mockCampaign),
        },
      };

      (prisma.$transaction as jest.Mock).mockImplementation(async (callback: any) =>
        callback(mockTx)
      );

      await convertProspectToLead('prospect-3', 'team-1');

      expect(mockTx.lead.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          firstName: 'Mary',
          lastName: 'Jane Watson Parker',
        }),
      });
    });

    it('should include social profiles from enrichment data', async () => {
      const mockCampaign = createMockCampaign({
        id: 'campaign-1',
        teamId: 'team-1',
      });

      const mockProspect = createMockProspect({
        id: 'prospect-4',
        status: 'qualified',
        platform: 'linkedin',
        profileUrl: 'https://linkedin.com/in/john-doe',
        profileData: {
          linkedin: 'https://linkedin.com/in/john-doe',
          twitter: 'https://twitter.com/johndoe',
        },
        convertedToLeadId: null,
        campaign: mockCampaign,
      });

      const mockLead = createMockLead({ id: 'lead-4' });

      (prisma.prospect.findFirst as jest.Mock).mockResolvedValue(mockProspect);

      const mockTx = {
        lead: {
          create: jest.fn().mockResolvedValue(mockLead),
        },
        prospect: {
          update: jest.fn().mockResolvedValue(mockProspect),
        },
        prospectingCampaign: {
          update: jest.fn().mockResolvedValue(mockCampaign),
        },
      };

      (prisma.$transaction as jest.Mock).mockImplementation(async (callback: any) =>
        callback(mockTx)
      );

      await convertProspectToLead('prospect-4', 'team-1');

      expect(mockTx.lead.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          socialProfiles: {
            linkedin: 'https://linkedin.com/in/john-doe',
            twitter: 'https://twitter.com/johndoe',
          },
        }),
      });
    });

    it('should throw error if prospect not found', async () => {
      (prisma.prospect.findFirst as jest.Mock).mockResolvedValue(null);

      await expect(convertProspectToLead('invalid-id', 'team-1')).rejects.toThrow(
        'Prospect not found or access denied'
      );
    });

    it('should throw ConflictError if prospect already converted', async () => {
      const mockCampaign = createMockCampaign();
      const mockProspect = createMockProspect({
        status: 'converted',
        convertedToLeadId: 'existing-lead-1',
        campaign: mockCampaign,
      });

      (prisma.prospect.findFirst as jest.Mock).mockResolvedValue(mockProspect);

      await expect(convertProspectToLead('prospect-1', 'team-1')).rejects.toThrow(ConflictError);
      await expect(convertProspectToLead('prospect-1', 'team-1')).rejects.toThrow(
        'Prospect already converted to lead'
      );
    });

    it('should throw BadRequestError if prospect does not meet qualification criteria', async () => {
      const mockCampaign = createMockCampaign();
      const mockProspect = createMockProspect({
        status: 'discovered',
        icpMatchScore: 0.50,
        convertedToLeadId: null,
        campaign: mockCampaign,
      });

      (prisma.prospect.findFirst as jest.Mock).mockResolvedValue(mockProspect);

      await expect(convertProspectToLead('prospect-1', 'team-1')).rejects.toThrow(BadRequestError);
      await expect(convertProspectToLead('prospect-1', 'team-1')).rejects.toThrow(
        'Prospect does not meet qualification criteria'
      );
    });

    it('should enforce team-based access control', async () => {
      (prisma.prospect.findFirst as jest.Mock).mockResolvedValue(null);

      await expect(convertProspectToLead('prospect-1', 'different-team')).rejects.toThrow(
        'Prospect not found or access denied'
      );

      expect(prisma.prospect.findFirst).toHaveBeenCalledWith({
        where: {
          id: 'prospect-1',
          campaign: { teamId: 'different-team' },
        },
        include: { campaign: true },
      });
    });

    it('should use transaction to ensure atomicity', async () => {
      const mockCampaign = createMockCampaign();
      const mockProspect = createMockProspect({
        status: 'qualified',
        convertedToLeadId: null,
        campaign: mockCampaign,
      });

      (prisma.prospect.findFirst as jest.Mock).mockResolvedValue(mockProspect);

      const transactionMock = jest.fn();
      (prisma.$transaction as jest.Mock).mockImplementation(transactionMock);

      try {
        await convertProspectToLead('prospect-1', 'team-1');
      } catch (error) {
        // Transaction mock will fail, but we're just checking it was called
      }

      expect(prisma.$transaction).toHaveBeenCalled();
    });
  });

  describe('batchConvertProspects', () => {
    it('should convert multiple qualified prospects in batch', async () => {
      const mockCampaign = createMockCampaign({
        id: 'campaign-1',
        teamId: 'team-1',
      });

      const mockProspects = [
        createMockProspect({
          id: 'prospect-1',
          status: 'qualified',
          convertedToLeadId: null,
          campaign: mockCampaign,
        }),
        createMockProspect({
          id: 'prospect-2',
          status: 'qualified',
          convertedToLeadId: null,
          campaign: mockCampaign,
        }),
      ];

      (prisma.prospect.findFirst as jest.Mock).mockImplementation((args: any) =>
        Promise.resolve(mockProspects.find(p => p.id === args.where.id))
      );

      const mockTx = {
        lead: {
          create: jest.fn().mockImplementation(() =>
            Promise.resolve(createMockLead())
          ),
        },
        prospect: {
          update: jest.fn().mockImplementation(() => Promise.resolve(mockProspects[0])),
        },
        prospectingCampaign: {
          update: jest.fn().mockResolvedValue(mockCampaign),
        },
      };

      (prisma.$transaction as jest.Mock).mockImplementation(async (callback: any) =>
        callback(mockTx)
      );

      const result = await batchConvertProspects(['prospect-1', 'prospect-2'], 'team-1');

      expect(result.successful).toHaveLength(2);
      expect(result.failed).toHaveLength(0);
      expect(result.successful[0].prospectId).toBe('prospect-1');
      expect(result.successful[1].prospectId).toBe('prospect-2');
    });

    it('should track failed conversions separately', async () => {
      const mockCampaign = createMockCampaign();
      const qualifiedProspect = createMockProspect({
        id: 'prospect-1',
        status: 'qualified',
        convertedToLeadId: null,
        campaign: mockCampaign,
      });

      (prisma.prospect.findFirst as jest.Mock).mockImplementation((args: any) => {
        if (args.where.id === 'prospect-1') {
          return Promise.resolve(qualifiedProspect);
        }
        return Promise.resolve(null); // prospect-2 not found
      });

      const mockTx = {
        lead: {
          create: jest.fn().mockResolvedValue(createMockLead()),
        },
        prospect: {
          update: jest.fn().mockResolvedValue(qualifiedProspect),
        },
        prospectingCampaign: {
          update: jest.fn().mockResolvedValue(mockCampaign),
        },
      };

      (prisma.$transaction as jest.Mock).mockImplementation(async (callback: any) =>
        callback(mockTx)
      );

      const result = await batchConvertProspects(['prospect-1', 'prospect-2'], 'team-1');

      expect(result.successful).toHaveLength(1);
      expect(result.failed).toHaveLength(1);
      expect(result.successful[0].prospectId).toBe('prospect-1');
      expect(result.failed[0].prospectId).toBe('prospect-2');
      expect(result.failed[0].error).toBe('Prospect not found or access denied');
    });

    it('should continue processing even if some conversions fail', async () => {
      const mockCampaign = createMockCampaign();
      const prospects = [
        createMockProspect({
          id: 'prospect-1',
          status: 'qualified',
          convertedToLeadId: null,
          campaign: mockCampaign,
        }),
        createMockProspect({
          id: 'prospect-2',
          status: 'discovered',
          icpMatchScore: 0.3,
          convertedToLeadId: null,
          campaign: mockCampaign,
        }),
        createMockProspect({
          id: 'prospect-3',
          status: 'qualified',
          convertedToLeadId: null,
          campaign: mockCampaign,
        }),
      ];

      (prisma.prospect.findFirst as jest.Mock).mockImplementation((args: any) =>
        Promise.resolve(prospects.find(p => p.id === args.where.id))
      );

      const mockTx = {
        lead: {
          create: jest.fn().mockResolvedValue(createMockLead()),
        },
        prospect: {
          update: jest.fn().mockImplementation((args: any) =>
            Promise.resolve(prospects.find(p => p.id === args.where.id))
          ),
        },
        prospectingCampaign: {
          update: jest.fn().mockResolvedValue(mockCampaign),
        },
      };

      (prisma.$transaction as jest.Mock).mockImplementation(async (callback: any) =>
        callback(mockTx)
      );

      const result = await batchConvertProspects(
        ['prospect-1', 'prospect-2', 'prospect-3'],
        'team-1'
      );

      // prospect-1 and prospect-3 should succeed
      expect(result.successful).toHaveLength(2);
      // prospect-2 should fail (doesn't meet qualification criteria)
      expect(result.failed).toHaveLength(1);
      expect(result.failed[0].prospectId).toBe('prospect-2');
    });

    it('should return empty successful array if all conversions fail', async () => {
      (prisma.prospect.findFirst as jest.Mock).mockResolvedValue(null);

      const result = await batchConvertProspects(['prospect-1', 'prospect-2'], 'team-1');

      expect(result.successful).toHaveLength(0);
      expect(result.failed).toHaveLength(2);
    });
  });
});
