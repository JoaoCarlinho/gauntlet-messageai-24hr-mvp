import prisma from '../../config/database';
import axios from 'axios';
import {
  enrichWithApollo,
  enrichWithHunter,
  enrichProspect,
} from '../../services/enrichment.service';

// Import test helpers
import {
  createMockProspect,
  createMockCampaign,
  createMockLead,
  createMockICP,
} from '../setup';

jest.mock('../../config/database');
jest.mock('axios');

describe('Enrichment Service', () => {
  describe('enrichWithApollo', () => {
    it('should successfully enrich prospect with Apollo', async () => {
      const mockProspect = createMockProspect({
        id: 'prospect-1',
        name: 'John Doe',
        companyName: 'Acme Corp',
      });

      const mockApolloResponse = {
        data: {
          people: [
            {
              email: 'john@acme.com',
              email_status: 'verified',
              email_confidence: 0.95,
              phone_numbers: [{ sanitized_number: '+1234567890' }],
              title: 'CEO',
              organization: {
                name: 'Acme Corp',
                website_url: 'https://acme.com',
                estimated_num_employees: '50-100',
                industry: 'SaaS',
                city: 'San Francisco',
              },
            },
          ],
        },
      };

      // Mock quota check (no usage)
      (prisma.enrichmentLog.count as jest.Mock).mockResolvedValue(0);

      // Mock axios call
      (axios as unknown as jest.Mock).mockResolvedValue(mockApolloResponse);

      // Mock enrichment logging
      (prisma.enrichmentLog.create as jest.Mock).mockResolvedValue({});

      const result = await enrichWithApollo(mockProspect, 'team-1');

      expect(result.email).toBe('john@acme.com');
      expect(result.emailVerified).toBe(true);
      expect(result.phone).toBe('+1234567890');
      expect(result.jobTitle).toBe('CEO');
      expect(result.companyInfo?.name).toBe('Acme Corp');
      expect(result.companyInfo?.domain).toBe('https://acme.com');
      expect(result.confidence).toBe(0.95);
      expect(result.provider).toBe('apollo');

      expect(prisma.enrichmentLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          teamId: 'team-1',
          prospectId: 'prospect-1',
          provider: 'apollo',
          status: 'success',
          creditsUsed: 1,
        }),
      });
    });

    it('should handle Apollo quota exceeded', async () => {
      const mockProspect = createMockProspect();

      // Mock quota check (exceeded)
      (prisma.enrichmentLog.count as jest.Mock).mockResolvedValue(10000);

      await expect(enrichWithApollo(mockProspect, 'team-1')).rejects.toThrow(
        /Apollo quota exceeded/
      );

      expect(axios).not.toHaveBeenCalled();
    });

    it('should warn at 80% Apollo quota usage', async () => {
      const mockProspect = createMockProspect({
        name: 'Jane Doe',
        companyName: 'Tech Co',
      });

      const mockResponse = {
        data: {
          people: [
            {
              email: 'jane@techco.com',
              email_status: 'verified',
            },
          ],
        },
      };

      // Mock quota at 80% (8000 / 10000)
      (prisma.enrichmentLog.count as jest.Mock).mockResolvedValue(8000);
      (axios as unknown as jest.Mock).mockResolvedValue(mockResponse);
      (prisma.enrichmentLog.create as jest.Mock).mockResolvedValue({});

      const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();

      await enrichWithApollo(mockProspect, 'team-1');

      expect(consoleWarnSpy).toHaveBeenCalledWith(
        expect.stringContaining('Apollo quota warning')
      );

      consoleWarnSpy.mockRestore();
    });

    it('should handle Apollo API returning no results', async () => {
      const mockProspect = createMockProspect();

      (prisma.enrichmentLog.count as jest.Mock).mockResolvedValue(0);
      (axios as unknown as jest.Mock).mockResolvedValue({ data: { people: [] } });
      (prisma.enrichmentLog.create as jest.Mock).mockResolvedValue({});

      const result = await enrichWithApollo(mockProspect, 'team-1');

      expect(result.provider).toBe('apollo');
      expect(result.confidence).toBe(0);
      expect(result.email).toBeUndefined();
    });

    it('should throw error if Apollo API key not configured', async () => {
      const mockProspect = createMockProspect();
      const originalApiKey = process.env.APOLLO_API_KEY;

      delete process.env.APOLLO_API_KEY;
      (prisma.enrichmentLog.count as jest.Mock).mockResolvedValue(0);

      await expect(enrichWithApollo(mockProspect, 'team-1')).rejects.toThrow(
        'Apollo API key not configured'
      );

      process.env.APOLLO_API_KEY = originalApiKey;
    });

    it('should retry on rate limit (429)', async () => {
      const mockProspect = createMockProspect();

      (prisma.enrichmentLog.count as jest.Mock).mockResolvedValue(0);

      // First call: rate limit, second call: success
      (axios as unknown as jest.Mock)
        .mockRejectedValueOnce({
          isAxiosError: true,
          response: { status: 429 },
        })
        .mockResolvedValueOnce({
          data: { people: [{ email: 'test@example.com' }] },
        });

      (prisma.enrichmentLog.create as jest.Mock).mockResolvedValue({});

      const result = await enrichWithApollo(mockProspect, 'team-1');

      expect(result.email).toBe('test@example.com');
      expect(axios).toHaveBeenCalledTimes(2);
    });

    it('should log failed enrichment attempts', async () => {
      const mockProspect = createMockProspect();

      (prisma.enrichmentLog.count as jest.Mock).mockResolvedValue(0);
      (axios as unknown as jest.Mock).mockRejectedValue(new Error('API Error'));
      (prisma.enrichmentLog.create as jest.Mock).mockResolvedValue({});

      await expect(enrichWithApollo(mockProspect, 'team-1')).rejects.toThrow();

      expect(prisma.enrichmentLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          provider: 'apollo',
          status: 'failed',
        }),
      });
    });
  });

  describe('enrichWithHunter', () => {
    it('should successfully enrich prospect with Hunter', async () => {
      const mockProspect = createMockProspect({
        id: 'prospect-2',
        name: 'Jane Smith',
        companyName: 'Tech Startup',
        companyUrl: 'https://techstartup.com',
      });

      const mockHunterResponse = {
        data: {
          data: {
            email: 'jane@techstartup.com',
            status: 'valid',
            score: 85,
            position: 'CTO',
            company: {
              size: '10-50',
              industry: 'Technology',
            },
          },
        },
      };

      (prisma.enrichmentLog.count as jest.Mock).mockResolvedValue(0);
      (axios as unknown as jest.Mock).mockResolvedValue(mockHunterResponse);
      (prisma.enrichmentLog.create as jest.Mock).mockResolvedValue({});

      const result = await enrichWithHunter(mockProspect, 'team-1');

      expect(result.email).toBe('jane@techstartup.com');
      expect(result.emailVerified).toBe(true);
      expect(result.jobTitle).toBe('CTO');
      expect(result.companyInfo?.domain).toBe('techstartup.com');
      expect(result.confidence).toBe(0.85);
      expect(result.provider).toBe('hunter');
    });

    it('should handle Hunter quota exceeded', async () => {
      const mockProspect = createMockProspect();

      // Mock quota check (exceeded monthly limit of 25)
      (prisma.enrichmentLog.count as jest.Mock).mockResolvedValue(25);

      await expect(enrichWithHunter(mockProspect, 'team-1')).rejects.toThrow(
        /Hunter quota exceeded/
      );

      expect(axios).not.toHaveBeenCalled();
    });

    it('should extract domain from company URL', async () => {
      const mockProspect = createMockProspect({
        companyUrl: 'www.example.com',
      });

      const mockResponse = {
        data: {
          data: {
            email: 'test@example.com',
            status: 'valid',
            score: 70,
          },
        },
      };

      (prisma.enrichmentLog.count as jest.Mock).mockResolvedValue(0);
      (axios as unknown as jest.Mock).mockResolvedValue(mockResponse);
      (prisma.enrichmentLog.create as jest.Mock).mockResolvedValue({});

      const result = await enrichWithHunter(mockProspect, 'team-1');

      expect(result.companyInfo?.domain).toBe('example.com');
    });

    it('should throw error if domain cannot be determined', async () => {
      const mockProspect = createMockProspect({
        companyUrl: null,
        profileUrl: null,
      });

      (prisma.enrichmentLog.count as jest.Mock).mockResolvedValue(0);

      await expect(enrichWithHunter(mockProspect, 'team-1')).rejects.toThrow(
        'Cannot determine domain for Hunter search'
      );
    });

    it('should throw error if Hunter API key not configured', async () => {
      const mockProspect = createMockProspect({ companyUrl: 'https://test.com' });
      const originalApiKey = process.env.HUNTER_API_KEY;

      delete process.env.HUNTER_API_KEY;
      (prisma.enrichmentLog.count as jest.Mock).mockResolvedValue(0);

      await expect(enrichWithHunter(mockProspect, 'team-1')).rejects.toThrow(
        'Hunter API key not configured'
      );

      process.env.HUNTER_API_KEY = originalApiKey;
    });

    it('should handle Hunter API returning no results', async () => {
      const mockProspect = createMockProspect({ companyUrl: 'https://test.com' });

      (prisma.enrichmentLog.count as jest.Mock).mockResolvedValue(0);
      (axios as unknown as jest.Mock).mockResolvedValue({ data: { data: null } });
      (prisma.enrichmentLog.create as jest.Mock).mockResolvedValue({});

      const result = await enrichWithHunter(mockProspect, 'team-1');

      expect(result.provider).toBe('hunter');
      expect(result.confidence).toBe(0);
      expect(result.email).toBeUndefined();
    });
  });

  describe('enrichProspect (Smart Routing)', () => {
    it('should use Apollo for high-value prospects (e0.85)', async () => {
      const mockProspect = createMockProspect({
        icpMatchScore: 0.90,
        companyUrl: 'https://test.com',
      });

      const mockResponse = {
        data: {
          people: [{ email: 'test@apollo.com', email_status: 'verified' }],
        },
      };

      (prisma.enrichmentLog.count as jest.Mock).mockResolvedValue(0);
      (axios as unknown as jest.Mock).mockResolvedValue(mockResponse);
      (prisma.enrichmentLog.create as jest.Mock).mockResolvedValue({});

      const result = await enrichProspect(mockProspect, 'team-1');

      expect(result.provider).toBe('apollo');
      expect(result.email).toBe('test@apollo.com');
    });

    it('should use Hunter for medium-value prospects (<0.85)', async () => {
      const mockProspect = createMockProspect({
        icpMatchScore: 0.75,
        companyUrl: 'https://test.com',
      });

      const mockResponse = {
        data: {
          data: { email: 'test@hunter.com', status: 'valid', score: 80 },
        },
      };

      (prisma.enrichmentLog.count as jest.Mock).mockResolvedValue(0);
      (axios as unknown as jest.Mock).mockResolvedValue(mockResponse);
      (prisma.enrichmentLog.create as jest.Mock).mockResolvedValue({});

      const result = await enrichProspect(mockProspect, 'team-1');

      expect(result.provider).toBe('hunter');
      expect(result.email).toBe('test@hunter.com');
    });

    it('should fallback to Hunter if Apollo fails for high-value prospects', async () => {
      const mockProspect = createMockProspect({
        icpMatchScore: 0.90,
        companyUrl: 'https://test.com',
      });

      (prisma.enrichmentLog.count as jest.Mock).mockResolvedValue(0);

      // Apollo fails, Hunter succeeds
      (axios as unknown as jest.Mock)
        .mockRejectedValueOnce(new Error('Apollo API Error'))
        .mockResolvedValueOnce({
          data: {
            data: { email: 'fallback@hunter.com', status: 'valid', score: 70 },
          },
        });

      (prisma.enrichmentLog.create as jest.Mock).mockResolvedValue({});

      const result = await enrichProspect(mockProspect, 'team-1');

      expect(result.provider).toBe('hunter');
      expect(result.email).toBe('fallback@hunter.com');
    });

    it('should fallback to Apollo if Hunter fails for medium-value prospects', async () => {
      const mockProspect = createMockProspect({
        icpMatchScore: 0.70,
        companyUrl: null,
        profileUrl: null,
      });

      (prisma.enrichmentLog.count as jest.Mock).mockResolvedValue(0);

      // Hunter fails (no domain), Apollo succeeds
      (axios as unknown as jest.Mock).mockResolvedValueOnce({
        data: {
          people: [{ email: 'fallback@apollo.com', email_status: 'verified' }],
        },
      });

      (prisma.enrichmentLog.create as jest.Mock).mockResolvedValue({});

      const result = await enrichProspect(mockProspect, 'team-1');

      expect(result.provider).toBe('apollo');
      expect(result.email).toBe('fallback@apollo.com');
    });

    it('should force Apollo provider when specified in options', async () => {
      const mockProspect = createMockProspect({
        icpMatchScore: 0.50,
      });

      const mockResponse = {
        data: {
          people: [{ email: 'forced@apollo.com', email_status: 'verified' }],
        },
      };

      (prisma.enrichmentLog.count as jest.Mock).mockResolvedValue(0);
      (axios as unknown as jest.Mock).mockResolvedValue(mockResponse);
      (prisma.enrichmentLog.create as jest.Mock).mockResolvedValue({});

      const result = await enrichProspect(mockProspect, 'team-1', {
        forceProvider: 'apollo',
      });

      expect(result.provider).toBe('apollo');
    });

    it('should force Hunter provider when specified in options', async () => {
      const mockProspect = createMockProspect({
        icpMatchScore: 0.95,
        companyUrl: 'https://test.com',
      });

      const mockResponse = {
        data: {
          data: { email: 'forced@hunter.com', status: 'valid', score: 90 },
        },
      };

      (prisma.enrichmentLog.count as jest.Mock).mockResolvedValue(0);
      (axios as unknown as jest.Mock).mockResolvedValue(mockResponse);
      (prisma.enrichmentLog.create as jest.Mock).mockResolvedValue({});

      const result = await enrichProspect(mockProspect, 'team-1', {
        forceProvider: 'hunter',
      });

      expect(result.provider).toBe('hunter');
    });

    it('should throw error if all providers fail', async () => {
      const mockProspect = createMockProspect({
        icpMatchScore: 0.75,
        companyUrl: null,
        profileUrl: null,
      });

      (prisma.enrichmentLog.count as jest.Mock).mockResolvedValue(0);
      (axios as unknown as jest.Mock).mockRejectedValue(new Error('All APIs failed'));
      (prisma.enrichmentLog.create as jest.Mock).mockResolvedValue({});

      await expect(enrichProspect(mockProspect, 'team-1')).rejects.toThrow(
        'Failed to enrich prospect with any provider'
      );
    });
  });
});
