import request from 'supertest';
import express, { Request, Response, NextFunction } from 'express';
import {
  uploadProspectsCsv,
  validateCsv,
  downloadCsvTemplate,
  uploadMiddleware,
} from '../../controllers/prospectUpload.controller';
import * as prospectService from '../../services/prospects.service';
import * as campaignService from '../../services/prospectingCampaigns.service';

// Import test helpers
import {
  createMockProspect,
  createMockCampaign,
  createMockLead,
  createMockICP,
} from '../setup';

jest.mock('../../services/prospects.service');
jest.mock('../../services/prospectingCampaigns.service');

describe('Prospect Upload Controller', () => {
  let app: express.Application;

  beforeEach(() => {
    // Create Express app for testing
    app = express();
    app.use(express.json());

    // Mock auth middleware to inject teamId
    app.use((req: Request & { teamId?: string }, res: Response, next: NextFunction) => {
      req.teamId = 'team-1';
      next();
    });

    // Mount routes
    app.post('/campaigns/:campaignId/prospects/upload', uploadMiddleware, uploadProspectsCsv);
    app.post('/campaigns/:campaignId/prospects/validate', uploadMiddleware, validateCsv);
    app.get('/prospects/template', downloadCsvTemplate);

    jest.clearAllMocks();
  });

  describe('uploadProspectsCsv', () => {
    it('should upload valid CSV and create prospects', async () => {
      const csvContent = `Name,Company,Title,LinkedIn URL,Location,Email
John Doe,Acme Corp,CEO,https://linkedin.com/in/johndoe,San Francisco,john@acme.com
Jane Smith,Tech Co,CTO,https://linkedin.com/in/janesmith,New York,jane@techco.com`;

      const mockCampaign = createMockCampaign({
        id: 'campaign-1',
        teamId: 'team-1',
      });

      (campaignService.getCampaign as jest.Mock).mockResolvedValue(mockCampaign);
      (prospectService.createProspect as jest.Mock).mockResolvedValue(createMockProspect());

      const response = await request(app)
        .post('/campaigns/campaign-1/prospects/upload')
        .attach('file', Buffer.from(csvContent), 'prospects.csv')
        .expect(200);

      expect(response.body.uploaded).toBe(2);
      expect(response.body.skipped).toBe(0);
      expect(response.body.total).toBe(2);
      expect(response.body.errors).toHaveLength(0);
      expect(prospectService.createProspect).toHaveBeenCalledTimes(2);
    });

    it('should reject non-CSV files', async () => {
      const mockCampaign = createMockCampaign();
      (campaignService.getCampaign as jest.Mock).mockResolvedValue(mockCampaign);

      const response = await request(app)
        .post('/campaigns/campaign-1/prospects/upload')
        .attach('file', Buffer.from('not a csv'), 'test.txt')
        .expect(500);

      expect(response.body.error).toBeDefined();
    });

    it('should enforce file size limit (10MB)', async () => {
      const largeCsv = Buffer.alloc(11 * 1024 * 1024); // 11MB

      const response = await request(app)
        .post('/campaigns/campaign-1/prospects/upload')
        .attach('file', largeCsv, 'large.csv')
        .expect(500);

      expect(response.body.error).toBeDefined();
    });

    it('should validate required fields', async () => {
      const csvContent = `Name,Company,Title,LinkedIn URL,Location
John Doe,Acme Corp,,https://linkedin.com/in/johndoe,San Francisco
Jane Smith,,CTO,https://linkedin.com/in/janesmith,New York`;

      const mockCampaign = createMockCampaign();
      (campaignService.getCampaign as jest.Mock).mockResolvedValue(mockCampaign);

      const response = await request(app)
        .post('/campaigns/campaign-1/prospects/upload')
        .attach('file', Buffer.from(csvContent), 'prospects.csv')
        .expect(200);

      expect(response.body.uploaded).toBe(0);
      expect(response.body.errors.length).toBeGreaterThan(0);
      expect(response.body.errors[0].error).toContain('Missing required fields');
    });

    it('should validate LinkedIn URL format', async () => {
      const csvContent = `Name,Company,Title,LinkedIn URL
John Doe,Acme Corp,CEO,invalid-url
Jane Smith,Tech Co,CTO,https://twitter.com/janesmith`;

      const mockCampaign = createMockCampaign();
      (campaignService.getCampaign as jest.Mock).mockResolvedValue(mockCampaign);

      const response = await request(app)
        .post('/campaigns/campaign-1/prospects/upload')
        .attach('file', Buffer.from(csvContent), 'prospects.csv')
        .expect(200);

      expect(response.body.errors.length).toBe(2);
      expect(response.body.errors[0].error).toContain('Invalid LinkedIn URL format');
    });

    it('should extract LinkedIn profile ID correctly', async () => {
      const csvContent = `Name,Company,Title,LinkedIn URL
John Doe,Acme Corp,CEO,https://linkedin.com/in/john-doe-123
Jane Smith,Tech Co,CTO,https://www.linkedin.com/in/jane-smith/`;

      const mockCampaign = createMockCampaign();
      (campaignService.getCampaign as jest.Mock).mockResolvedValue(mockCampaign);
      (prospectService.createProspect as jest.Mock).mockResolvedValue(createMockProspect());

      await request(app)
        .post('/campaigns/campaign-1/prospects/upload')
        .attach('file', Buffer.from(csvContent), 'prospects.csv')
        .expect(200);

      expect(prospectService.createProspect).toHaveBeenCalledWith(
        expect.objectContaining({
          platformProfileId: 'john-doe-123',
        }),
        'team-1'
      );

      expect(prospectService.createProspect).toHaveBeenCalledWith(
        expect.objectContaining({
          platformProfileId: 'jane-smith',
        }),
        'team-1'
      );
    });

    it('should handle duplicate prospects', async () => {
      const csvContent = `Name,Company,Title,LinkedIn URL
John Doe,Acme Corp,CEO,https://linkedin.com/in/johndoe
Jane Smith,Tech Co,CTO,https://linkedin.com/in/janesmith`;

      const mockCampaign = createMockCampaign();
      (campaignService.getCampaign as jest.Mock).mockResolvedValue(mockCampaign);

      // First prospect succeeds, second already exists
      (prospectService.createProspect as jest.Mock)
        .mockResolvedValueOnce(createMockProspect())
        .mockRejectedValueOnce(new Error('Prospect already exists'));

      const response = await request(app)
        .post('/campaigns/campaign-1/prospects/upload')
        .attach('file', Buffer.from(csvContent), 'prospects.csv')
        .expect(200);

      expect(response.body.uploaded).toBe(1);
      expect(response.body.skipped).toBe(1);
      expect(response.body.message).toContain('skipped 1 duplicates');
    });

    it('should enforce maximum row limit (1000)', async () => {
      // Create CSV with 1001 rows
      let csvContent = 'Name,Company,Title,LinkedIn URL\n';
      for (let i = 1; i <= 1001; i++) {
        csvContent += `User ${i},Company ${i},Title ${i},https://linkedin.com/in/user${i}\n`;
      }

      const mockCampaign = createMockCampaign();
      (campaignService.getCampaign as jest.Mock).mockResolvedValue(mockCampaign);

      const response = await request(app)
        .post('/campaigns/campaign-1/prospects/upload')
        .attach('file', Buffer.from(csvContent), 'prospects.csv')
        .expect(200);

      expect(response.body.errors.some((e: any) => e.error.includes('Exceeded maximum row limit'))).toBe(true);
    });

    it('should require authentication (teamId)', async () => {
      // Create app without auth middleware
      const noAuthApp = express();
      noAuthApp.use(express.json());
      noAuthApp.post('/campaigns/:campaignId/prospects/upload', uploadMiddleware, uploadProspectsCsv);

      const csvContent = `Name,Company,Title,LinkedIn URL
John Doe,Acme Corp,CEO,https://linkedin.com/in/johndoe`;

      const response = await request(noAuthApp)
        .post('/campaigns/campaign-1/prospects/upload')
        .attach('file', Buffer.from(csvContent), 'prospects.csv')
        .expect(401);

      expect(response.body.error).toContain('Team ID not found');
    });

    it('should verify campaign belongs to team', async () => {
      const csvContent = `Name,Company,Title,LinkedIn URL
John Doe,Acme Corp,CEO,https://linkedin.com/in/johndoe`;

      // Campaign not found
      (campaignService.getCampaign as jest.Mock).mockResolvedValue(null);

      const response = await request(app)
        .post('/campaigns/campaign-1/prospects/upload')
        .attach('file', Buffer.from(csvContent), 'prospects.csv')
        .expect(404);

      expect(response.body.error).toContain('Campaign not found or access denied');
    });

    it('should handle optional fields (Location, Email)', async () => {
      const csvContent = `Name,Company,Title,LinkedIn URL,Location,Email
John Doe,Acme Corp,CEO,https://linkedin.com/in/johndoe,San Francisco,john@acme.com
Jane Smith,Tech Co,CTO,https://linkedin.com/in/janesmith,,`;

      const mockCampaign = createMockCampaign();
      (campaignService.getCampaign as jest.Mock).mockResolvedValue(mockCampaign);
      (prospectService.createProspect as jest.Mock).mockResolvedValue(createMockProspect());

      const response = await request(app)
        .post('/campaigns/campaign-1/prospects/upload')
        .attach('file', Buffer.from(csvContent), 'prospects.csv')
        .expect(200);

      expect(prospectService.createProspect).toHaveBeenNthCalledWith(
        1,
        expect.objectContaining({
          location: 'San Francisco',
          contactInfo: { email: 'john@acme.com' },
        }),
        'team-1'
      );

      expect(prospectService.createProspect).toHaveBeenNthCalledWith(
        2,
        expect.objectContaining({
          location: undefined,
          contactInfo: undefined,
        }),
        'team-1'
      );
    });

    it('should limit errors in response to 100', async () => {
      // Create CSV with 150 invalid rows
      let csvContent = 'Name,Company,Title,LinkedIn URL\n';
      for (let i = 1; i <= 150; i++) {
        csvContent += `User ${i},Company ${i},Title ${i},invalid-url-${i}\n`;
      }

      const mockCampaign = createMockCampaign();
      (campaignService.getCampaign as jest.Mock).mockResolvedValue(mockCampaign);

      const response = await request(app)
        .post('/campaigns/campaign-1/prospects/upload')
        .attach('file', Buffer.from(csvContent), 'prospects.csv')
        .expect(200);

      expect(response.body.errors.length).toBeLessThanOrEqual(100);
    });
  });

  describe('validateCsv', () => {
    it('should validate correct CSV format', async () => {
      const csvContent = `Name,Company,Title,LinkedIn URL
John Doe,Acme Corp,CEO,https://linkedin.com/in/johndoe
Jane Smith,Tech Co,CTO,https://linkedin.com/in/janesmith`;

      const response = await request(app)
        .post('/campaigns/campaign-1/prospects/validate')
        .attach('file', Buffer.from(csvContent), 'prospects.csv')
        .expect(200);

      expect(response.body.valid).toBe(true);
      expect(response.body.totalRows).toBe(2);
      expect(response.body.validRows).toBe(2);
      expect(response.body.errors).toHaveLength(0);
      expect(response.body.message).toContain('valid and ready for upload');
    });

    it('should identify validation errors without uploading', async () => {
      const csvContent = `Name,Company,Title,LinkedIn URL
John Doe,,CEO,https://linkedin.com/in/johndoe
Jane Smith,Tech Co,CTO,invalid-url`;

      const response = await request(app)
        .post('/campaigns/campaign-1/prospects/validate')
        .attach('file', Buffer.from(csvContent), 'prospects.csv')
        .expect(200);

      expect(response.body.valid).toBe(false);
      expect(response.body.errors.length).toBe(2);
      expect(response.body.validRows).toBe(0);
    });

    it('should require file upload', async () => {
      const response = await request(app)
        .post('/campaigns/campaign-1/prospects/validate')
        .expect(400);

      expect(response.body.error).toContain('No file provided');
    });
  });

  describe('downloadCsvTemplate', () => {
    it('should download CSV template with sample data', async () => {
      const response = await request(app)
        .get('/prospects/template')
        .expect(200);

      expect(response.headers['content-type']).toContain('text/csv');
      expect(response.headers['content-disposition']).toContain('attachment');
      expect(response.headers['content-disposition']).toContain('prospect-upload-template.csv');
      expect(response.text).toContain('Name,Company,Title,LinkedIn URL');
      expect(response.text).toContain('John Doe,Acme Corp');
      expect(response.text).toContain('linkedin.com/in/');
    });

    it('should include all required columns in template', async () => {
      const response = await request(app)
        .get('/prospects/template')
        .expect(200);

      const requiredColumns = ['Name', 'Company', 'Title', 'LinkedIn URL', 'Location', 'Email'];

      for (const column of requiredColumns) {
        expect(response.text).toContain(column);
      }
    });

    it('should include valid sample LinkedIn URLs', async () => {
      const response = await request(app)
        .get('/prospects/template')
        .expect(200);

      expect(response.text).toMatch(/https:\/\/linkedin\.com\/in\/\w+/);
    });
  });
});
