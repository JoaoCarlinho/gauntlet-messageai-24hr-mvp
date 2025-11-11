import { Request, Response } from 'express';
import multer from 'multer';
import { parse } from 'csv-parse';
import { Readable } from 'stream';
import * as prospectService from '../services/prospects.service';
import * as campaignService from '../services/prospectingCampaigns.service';

/**
 * Prospect Upload Controller
 * Handles CSV file uploads for bulk prospect creation
 */

// Configure multer for file upload (memory storage)
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB max
  },
  fileFilter: (req, file, cb) => {
    // Check file type
    if (file.mimetype !== 'text/csv' && !file.originalname.endsWith('.csv')) {
      return cb(new Error('Only CSV files are allowed'));
    }
    cb(null, true);
  },
}).single('file');

// Middleware for file upload
export const uploadMiddleware = upload;

interface CSVRow {
  Name?: string;
  Company?: string;
  Title?: string;
  'LinkedIn URL'?: string;
  Location?: string;
  Email?: string;
  [key: string]: string | undefined;
}

interface UploadError {
  row: number;
  error: string;
}

/**
 * Extract LinkedIn profile ID from URL
 */
const extractLinkedInProfileId = (url: string): string | null => {
  const pattern = /linkedin\.com\/in\/([\w\-]+)/;
  const match = url.match(pattern);
  return match ? match[1] : null;
};

/**
 * Validate LinkedIn URL format
 */
const validateLinkedInUrl = (url: string): boolean => {
  const pattern = /^https?:\/\/(www\.)?linkedin\.com\/in\/[\w\-]+\/?$/;
  return pattern.test(url);
};

/**
 * Upload CSV file and create prospects
 */
export const uploadProspectsCsv = async (req: Request & { teamId?: string }, res: Response) => {
  try {
    const { campaignId } = req.params;
    const teamId = req.teamId;

    if (!teamId) {
      return res.status(401).json({ error: 'Team ID not found in request' });
    }

    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    // Verify campaign belongs to team
    const campaign = await campaignService.getCampaign(campaignId, teamId);
    if (!campaign) {
      return res.status(404).json({ error: 'Campaign not found or access denied' });
    }

    // Parse CSV
    const results: CSVRow[] = [];
    const errors: UploadError[] = [];
    let rowNumber = 0;

    // Create readable stream from buffer
    const stream = Readable.from(req.file.buffer.toString());

    // Parse CSV with headers
    const parser = parse({
      columns: true,
      skip_empty_lines: true,
      trim: true,
      max_record_size: 1000,
      relax_quotes: true,
    });

    stream.pipe(parser);

    // Process each row
    const prospects: prospectService.ProspectCreateInput[] = [];

    for await (const row of parser) {
      rowNumber++;

      // Check row limit (max 1000 rows)
      if (rowNumber > 1000) {
        errors.push({
          row: rowNumber,
          error: 'Exceeded maximum row limit of 1000',
        });
        break;
      }

      const csvRow = row as CSVRow;

      // Validate required fields
      if (!csvRow.Name || !csvRow.Company || !csvRow.Title || !csvRow['LinkedIn URL']) {
        errors.push({
          row: rowNumber,
          error: 'Missing required fields (Name, Company, Title, LinkedIn URL)',
        });
        continue;
      }

      // Validate LinkedIn URL
      const linkedInUrl = csvRow['LinkedIn URL'];
      if (!validateLinkedInUrl(linkedInUrl)) {
        errors.push({
          row: rowNumber,
          error: `Invalid LinkedIn URL format: ${linkedInUrl}`,
        });
        continue;
      }

      // Extract profile ID
      const profileId = extractLinkedInProfileId(linkedInUrl);
      if (!profileId) {
        errors.push({
          row: rowNumber,
          error: 'Could not extract profile ID from LinkedIn URL',
        });
        continue;
      }

      // Build prospect data
      const prospectData: prospectService.ProspectCreateInput = {
        campaignId,
        platform: 'csv',
        platformProfileId: profileId,
        profileUrl: linkedInUrl,
        name: csvRow.Name,
        companyName: csvRow.Company,
        headline: csvRow.Title,
        location: csvRow.Location || undefined,
        contactInfo: csvRow.Email ? { email: csvRow.Email } : undefined,
        profileData: {
          source: 'csv_upload',
          originalRow: csvRow,
          uploadedAt: new Date().toISOString(),
        },
      };

      prospects.push(prospectData);
    }

    // Batch create prospects
    let created = 0;
    let skipped = 0;

    for (const prospectData of prospects) {
      try {
        await prospectService.createProspect(prospectData, teamId);
        created++;
      } catch (error: any) {
        if (error.message.includes('already exists')) {
          skipped++;
        } else {
          errors.push({
            row: prospects.indexOf(prospectData) + 1,
            error: error.message,
          });
        }
      }
    }

    // Return summary
    const summary = {
      uploaded: created,
      skipped,
      total: prospects.length,
      errors: errors.slice(0, 100), // Limit errors to 100 for response size
      message: `Successfully uploaded ${created} prospects${skipped > 0 ? `, skipped ${skipped} duplicates` : ''}`,
    };

    console.log(`📊 CSV Upload Summary - Created: ${created}, Skipped: ${skipped}, Errors: ${errors.length}`);

    res.status(200).json(summary);
  } catch (error: any) {
    console.error('❌ CSV upload failed:', error);
    res.status(500).json({
      error: 'Failed to process CSV file',
      message: error.message,
    });
  }
};

/**
 * Download sample CSV template
 */
export const downloadCsvTemplate = (req: Request, res: Response) => {
  const template = `Name,Company,Title,LinkedIn URL,Location,Email
John Doe,Acme Corp,Founder & CEO,https://linkedin.com/in/johndoe,San Francisco CA,john@acme.com
Jane Smith,StartupXYZ,VP Engineering,https://linkedin.com/in/janesmith,New York NY,
Bob Johnson,TechCo,CTO,https://linkedin.com/in/bobjohnson,Austin TX,bob@techco.io
Alice Williams,DataInc,Head of Sales,https://linkedin.com/in/alicewilliams,Seattle WA,
Charlie Brown,AI Solutions,Product Manager,https://linkedin.com/in/charliebrown,Boston MA,charlie@aisolutions.ai`;

  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename="prospect-upload-template.csv"');
  res.send(template);
};

/**
 * Validate CSV format without uploading
 */
export const validateCsv = async (req: Request & { teamId?: string }, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file provided' });
    }

    const errors: UploadError[] = [];
    let rowNumber = 0;
    let validRows = 0;

    // Create readable stream from buffer
    const stream = Readable.from(req.file.buffer.toString());

    // Parse CSV with headers
    const parser = parse({
      columns: true,
      skip_empty_lines: true,
      trim: true,
      max_record_size: 1000,
      relax_quotes: true,
    });

    stream.pipe(parser);

    for await (const row of parser) {
      rowNumber++;

      const csvRow = row as CSVRow;

      // Validate required fields
      if (!csvRow.Name || !csvRow.Company || !csvRow.Title || !csvRow['LinkedIn URL']) {
        errors.push({
          row: rowNumber,
          error: 'Missing required fields',
        });
        continue;
      }

      // Validate LinkedIn URL
      if (!validateLinkedInUrl(csvRow['LinkedIn URL'])) {
        errors.push({
          row: rowNumber,
          error: 'Invalid LinkedIn URL format',
        });
        continue;
      }

      validRows++;
    }

    res.status(200).json({
      valid: errors.length === 0,
      totalRows: rowNumber,
      validRows,
      errors: errors.slice(0, 100),
      message: errors.length === 0
        ? 'CSV file is valid and ready for upload'
        : `Found ${errors.length} errors in CSV file`,
    });
  } catch (error: any) {
    console.error('❌ CSV validation failed:', error);
    res.status(500).json({
      error: 'Failed to validate CSV file',
      message: error.message,
    });
  }
};