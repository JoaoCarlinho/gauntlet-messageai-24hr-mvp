import prisma from '../config/database';
import { Prospect } from '@prisma/client';
import axios, { AxiosError } from 'axios';

/**
 * Enrichment Service
 * Integrates with Apollo.io and Hunter.io for prospect data enrichment
 */

export interface EnrichmentResult {
  email?: string;
  emailVerified?: boolean;
  phone?: string;
  jobTitle?: string;
  companyInfo?: {
    name: string;
    domain?: string;
    size?: string;
    industry?: string;
    location?: string;
  };
  confidence?: number;
  provider: 'apollo' | 'hunter' | 'combined';
  rawData?: any;
}

export interface EnrichmentOptions {
  forceProvider?: 'apollo' | 'hunter';
  skipQuotaCheck?: boolean;
}

const APOLLO_QUOTA_LIMIT = 10000; // Annual limit
const HUNTER_QUOTA_LIMIT = 25; // Monthly limit for free tier

/**
 * Enrich prospect with Apollo.io
 * @param prospect - Prospect to enrich
 * @param teamId - Team ID for quota tracking
 * @returns Enrichment result
 */
export const enrichWithApollo = async (
  prospect: Prospect,
  teamId: string
): Promise<EnrichmentResult> => {
  try {
    console.log(`🔍 Enriching prospect ${prospect.id} with Apollo`);

    // Check quota
    await checkApolloQuota(teamId);

    const apolloApiKey = process.env.APOLLO_API_KEY;
    const apolloBaseUrl = process.env.APOLLO_API_URL || 'https://api.apollo.io/v1';

    if (!apolloApiKey) {
      throw new Error('Apollo API key not configured');
    }

    // Build search request
    const requestData = {
      api_key: apolloApiKey,
      person_name: prospect.name,
      organization_name: prospect.companyName,
      page: 1,
      per_page: 1
    };

    // Make API call with retries
    const response = await makeRequestWithRetry(
      `${apolloBaseUrl}/people/search`,
      requestData,
      'POST',
      3
    );

    // Log API call
    await logEnrichment(
      teamId,
      prospect.id,
      'apollo',
      requestData,
      response.data,
      'success'
    );

    // Parse response
    if (!response.data?.people?.length) {
      return {
        provider: 'apollo',
        confidence: 0,
        rawData: response.data
      };
    }

    const person = response.data.people[0];

    return {
      email: person.email,
      emailVerified: person.email_status === 'verified',
      phone: person.phone_numbers?.[0]?.sanitized_number,
      jobTitle: person.title,
      companyInfo: {
        name: person.organization?.name || prospect.companyName || '',
        domain: person.organization?.website_url,
        size: person.organization?.estimated_num_employees,
        industry: person.organization?.industry,
        location: person.organization?.city
      },
      confidence: person.email_confidence || 0,
      provider: 'apollo',
      rawData: person
    };
  } catch (error) {
    console.error('❌ Failed to enrich with Apollo:', error);

    // Log failure
    await logEnrichment(
      teamId,
      prospect.id,
      'apollo',
      { prospectId: prospect.id },
      error instanceof Error ? { error: error.message } : {},
      'failed'
    );

    throw error;
  }
};

/**
 * Enrich prospect with Hunter.io
 * @param prospect - Prospect to enrich
 * @param teamId - Team ID for quota tracking
 * @returns Enrichment result
 */
export const enrichWithHunter = async (
  prospect: Prospect,
  teamId: string
): Promise<EnrichmentResult> => {
  try {
    console.log(`🔍 Enriching prospect ${prospect.id} with Hunter`);

    // Check quota
    await checkHunterQuota(teamId);

    const hunterApiKey = process.env.HUNTER_API_KEY;
    const hunterBaseUrl = process.env.HUNTER_API_URL || 'https://api.hunter.io/v2';

    if (!hunterApiKey) {
      throw new Error('Hunter API key not configured');
    }

    // Extract domain from company or profile URL
    const domain = extractDomain(prospect.companyUrl || prospect.profileUrl || '');

    if (!domain) {
      throw new Error('Cannot determine domain for Hunter search');
    }

    // Email finder request
    const requestData = {
      api_key: hunterApiKey,
      domain,
      full_name: prospect.name,
      company: prospect.companyName
    };

    // Make API call with retries
    const response = await makeRequestWithRetry(
      `${hunterBaseUrl}/email-finder`,
      requestData,
      'GET',
      3
    );

    // Log API call
    await logEnrichment(
      teamId,
      prospect.id,
      'hunter',
      requestData,
      response.data,
      'success'
    );

    // Parse response
    const data = response.data?.data;

    if (!data || !data.email) {
      return {
        provider: 'hunter',
        confidence: 0,
        rawData: response.data
      };
    }

    return {
      email: data.email,
      emailVerified: data.status === 'valid',
      jobTitle: data.position,
      companyInfo: {
        name: prospect.companyName || '',
        domain,
        size: data.company?.size,
        industry: data.company?.industry
      },
      confidence: data.score / 100, // Hunter returns 0-100, normalize to 0-1
      provider: 'hunter',
      rawData: data
    };
  } catch (error) {
    console.error('❌ Failed to enrich with Hunter:', error);

    // Log failure
    await logEnrichment(
      teamId,
      prospect.id,
      'hunter',
      { prospectId: prospect.id },
      error instanceof Error ? { error: error.message } : {},
      'failed'
    );

    throw error;
  }
};

/**
 * Smart enrichment router - chooses best provider based on criteria
 * @param prospect - Prospect to enrich
 * @param teamId - Team ID for quota tracking
 * @param options - Enrichment options
 * @returns Enrichment result
 */
export const enrichProspect = async (
  prospect: Prospect,
  teamId: string,
  options: EnrichmentOptions = {}
): Promise<EnrichmentResult> => {
  try {
    // Force specific provider if requested
    if (options.forceProvider === 'apollo') {
      return await enrichWithApollo(prospect, teamId);
    }
    if (options.forceProvider === 'hunter') {
      return await enrichWithHunter(prospect, teamId);
    }

    // Smart routing based on ICP score and quota availability
    const icpScore = prospect.icpMatchScore || 0;

    // High-value prospects (≥0.85): Use Apollo for best data
    if (icpScore >= 0.85) {
      try {
        return await enrichWithApollo(prospect, teamId);
      } catch (error) {
        // Fallback to Hunter if Apollo fails
        console.log('Apollo failed, falling back to Hunter');
        return await enrichWithHunter(prospect, teamId);
      }
    }

    // Medium-value prospects: Prefer Hunter to save Apollo quota
    try {
      return await enrichWithHunter(prospect, teamId);
    } catch (error) {
      // Fallback to Apollo if Hunter fails
      console.log('Hunter failed, falling back to Apollo');
      return await enrichWithApollo(prospect, teamId);
    }
  } catch (error) {
    console.error('❌ Enrichment failed for all providers:', error);
    throw new Error('Failed to enrich prospect with any provider');
  }
};

/**
 * Check Apollo quota
 */
const checkApolloQuota = async (teamId: string): Promise<void> => {
  const startOfYear = new Date(new Date().getFullYear(), 0, 1);

  const usageCount = await prisma.enrichmentLog.count({
    where: {
      teamId,
      provider: 'apollo',
      status: 'success',
      createdAt: { gte: startOfYear }
    }
  });

  if (usageCount >= APOLLO_QUOTA_LIMIT) {
    const resetDate = new Date(new Date().getFullYear() + 1, 0, 1);
    throw new Error(
      `Apollo quota exceeded (${usageCount}/${APOLLO_QUOTA_LIMIT}). Resets on ${resetDate.toLocaleDateString()}`
    );
  }

  // Warn at 80% usage
  if (usageCount >= APOLLO_QUOTA_LIMIT * 0.8) {
    console.warn(
      `⚠️ Apollo quota warning: ${usageCount}/${APOLLO_QUOTA_LIMIT} credits used`
    );
  }
};

/**
 * Check Hunter quota
 */
const checkHunterQuota = async (teamId: string): Promise<void> => {
  const startOfMonth = new Date(
    new Date().getFullYear(),
    new Date().getMonth(),
    1
  );

  const usageCount = await prisma.enrichmentLog.count({
    where: {
      teamId,
      provider: 'hunter',
      status: 'success',
      createdAt: { gte: startOfMonth }
    }
  });

  if (usageCount >= HUNTER_QUOTA_LIMIT) {
    const resetDate = new Date(
      new Date().getFullYear(),
      new Date().getMonth() + 1,
      1
    );
    throw new Error(
      `Hunter quota exceeded (${usageCount}/${HUNTER_QUOTA_LIMIT}). Resets on ${resetDate.toLocaleDateString()}`
    );
  }
};

/**
 * Make HTTP request with retry logic
 */
const makeRequestWithRetry = async (
  url: string,
  data: any,
  method: 'GET' | 'POST' = 'POST',
  maxRetries: number = 3
): Promise<any> => {
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const response = await axios({
        method,
        url,
        data: method === 'POST' ? data : undefined,
        params: method === 'GET' ? data : undefined,
        timeout: 10000
      });

      return response;
    } catch (error) {
      lastError = error as Error;

      if (axios.isAxiosError(error)) {
        const axiosError = error as AxiosError;

        // Don't retry on client errors (except rate limit)
        if (
          axiosError.response?.status &&
          axiosError.response.status >= 400 &&
          axiosError.response.status < 500 &&
          axiosError.response.status !== 429
        ) {
          throw error;
        }

        // Retry on rate limit with exponential backoff
        if (axiosError.response?.status === 429) {
          const delay = Math.pow(2, attempt - 1) * 1000; // 1s, 2s, 4s
          console.log(`Rate limited, retrying in ${delay}ms (attempt ${attempt}/${maxRetries})`);
          await new Promise(resolve => setTimeout(resolve, delay));
          continue;
        }
      }

      // Retry on network/server errors
      if (attempt < maxRetries) {
        const delay = Math.pow(2, attempt - 1) * 1000;
        console.log(`Request failed, retrying in ${delay}ms (attempt ${attempt}/${maxRetries})`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }

  throw lastError || new Error('Request failed after retries');
};

/**
 * Log enrichment attempt
 */
const logEnrichment = async (
  teamId: string,
  prospectId: string,
  provider: 'apollo' | 'hunter',
  request: any,
  response: any,
  status: 'success' | 'failed'
): Promise<void> => {
  try {
    await prisma.enrichmentLog.create({
      data: {
        teamId,
        prospectId,
        provider,
        endpoint: provider === 'apollo' ? '/people/search' : '/email-finder',
        status,
        creditsUsed: status === 'success' ? 1 : 0,
        requestData: request,
        responseData: response,
        errorMessage: status === 'failed' ? response?.error : null
      }
    });
  } catch (error) {
    console.error('Failed to log enrichment:', error);
  }
};

/**
 * Extract domain from URL
 */
const extractDomain = (url: string): string | null => {
  try {
    if (!url) return null;

    // Add protocol if missing
    if (!url.startsWith('http')) {
      url = `https://${url}`;
    }

    const urlObj = new URL(url);
    return urlObj.hostname.replace('www.', '');
  } catch {
    return null;
  }
};

export default {
  enrichWithApollo,
  enrichWithHunter,
  enrichProspect
};