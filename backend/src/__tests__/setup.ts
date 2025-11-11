/**
 * Jest Test Setup
 * Runs before all tests to configure the testing environment
 */

import { PrismaClient } from '@prisma/client';
import { mockDeep } from 'jest-mock-extended';

// Mock Prisma Client
jest.mock('../config/database', () => ({
  __esModule: true,
  default: mockDeep<PrismaClient>(),
}));

// Mock environment variables
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-jwt-secret';
process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/messageai_test';
process.env.APOLLO_API_KEY = 'test-apollo-key';
process.env.HUNTER_API_KEY = 'test-hunter-key';
process.env.PINECONE_API_KEY = 'test-pinecone-key';
process.env.PINECONE_ENVIRONMENT = 'test';
process.env.PINECONE_INDEX_NAME = 'test-index';
process.env.OPENAI_API_KEY = 'test-openai-key';

beforeEach(() => {
  // Reset all mocks before each test
  jest.clearAllMocks();
});

// Export test utilities
export const createMockProspect = (overrides: any = {}) => ({
  id: 'prospect-1',
  campaignId: 'campaign-1',
  platform: 'linkedin',
  platformProfileId: 'john-doe',
  profileUrl: 'https://linkedin.com/in/john-doe',
  name: 'John Doe',
  headline: 'CEO at Acme Corp',
  location: 'San Francisco, CA',
  companyName: 'Acme Corp',
  companyUrl: 'https://acme.com',
  contactInfo: { email: 'john@acme.com' },
  profileData: {},
  enrichmentData: null,
  icpMatchScore: 0.85,
  qualityScore: 75,
  status: 'qualified',
  convertedToLeadId: null,
  discoveredAt: new Date(),
  enrichedAt: null,
  ...overrides,
});

export const createMockCampaign = (overrides: any = {}) => ({
  id: 'campaign-1',
  teamId: 'team-1',
  icpId: 'icp-1',
  name: 'Q4 SaaS Founders',
  platforms: ['linkedin'],
  searchCriteria: { keywords: ['founder', 'CEO'], location: 'San Francisco' },
  status: 'running',
  discoveredCount: 100,
  qualifiedCount: 25,
  convertedCount: 5,
  startedAt: new Date(),
  completedAt: null,
  icp: null, // Add icp field for includes
  ...overrides,
});

export const createMockLead = (overrides: any = {}) => ({
  id: 'lead-1',
  teamId: 'team-1',
  campaignId: 'campaign-1',
  assignedUserId: null,
  email: 'john@acme.com',
  phone: null,
  firstName: 'John',
  lastName: 'Doe',
  company: 'Acme Corp',
  jobTitle: 'CEO',
  source: 'linkedin',
  status: 'new',
  qualificationScore: 85,
  rawData: {},
  prospectId: 'prospect-1',
  socialProfiles: { linkedin: 'https://linkedin.com/in/john-doe' },
  enrichmentScore: 75,
  lastEnrichedAt: new Date(),
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
});

export const createMockUser = (overrides: any = {}) => ({
  id: 'user-1',
  email: 'test@example.com',
  phoneNumber: null,
  password: 'hashed-password',
  displayName: 'Test User',
  avatarUrl: null,
  lastSeen: new Date(),
  isOnline: true,
  pushTokens: [],
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
});

export const createMockTeam = (overrides: any = {}) => ({
  id: 'team-1',
  name: 'Test Team',
  slug: 'test-team',
  description: 'A test team',
  createdAt: new Date(),
  updatedAt: new Date(),
  deletedAt: null,
  ...overrides,
});

export const createMockICP = (overrides: any = {}) => ({
  id: 'icp-1',
  productId: 'product-1',
  name: 'SaaS Founders',
  demographics: {},
  firmographics: {},
  psychographics: {},
  behaviors: {},
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
});
