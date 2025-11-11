# Lead Generation Architecture - Persona-Based Social Media Prospecting

## Executive Summary

This document outlines the technical architecture for implementing automated lead generation that leverages ICP (Ideal Customer Profile) personas stored in Pinecone to discover and qualify prospects from LinkedIn and Facebook.

**Prepared by:** Winston (Architect)
**Date:** November 6, 2025
**Project:** MessageAI - Social Lead Generation Module

---

## Table of Contents

1. [Current State Analysis](#current-state-analysis)
2. [Proposed Architecture](#proposed-architecture)
3. [Technical Components](#technical-components)
4. [Integration Patterns](#integration-patterns)
5. [Data Flow](#data-flow)
6. [Implementation Phases](#implementation-phases)
7. [Risk Assessment & Mitigation](#risk-assessment--mitigation)
8. [Performance & Scalability](#performance--scalability)

---

## 1. Current State Analysis

### Existing Infrastructure

#### 1.1 Database Schema (PostgreSQL + Prisma)

**Relevant Models:**
```prisma
// Core ICP storage
model ICP {
  id              String   @id @default(uuid())
  productId       String
  name            String
  demographics    Json     // Age, location, job titles
  firmographics   Json     // Company size, industry, revenue
  psychographics  Json     // Pain points, goals, motivations
  behaviors       Json     // Buying triggers, decision process
  campaigns       Campaign[]
}

// Lead tracking
model Lead {
  id              String   @id @default(uuid())
  teamId          String
  campaignId      String?
  source          String   // Can add: "linkedin", "facebook"
  status          String   // "new", "contacted", "qualified", "converted", "lost"
  score           Int      @default(0)
  contactInfo     Json     // Email, phone, social profiles
  companyInfo     Json     // Company details
  enrichmentData  Json     // Additional scraped/API data
}
```

**Assessment:**
- ✅ ICP structure supports rich persona definition
- ✅ Lead model has flexible JSON fields for social data
- ⚠️ Need to extend `source` enum for social platforms
- ⚠️ Need enrichment tracking mechanism

#### 1.2 Vector Database (Pinecone)

**Current Implementation:**
- ICPs are vectorized and stored in Pinecone namespaces per team
- Vector embeddings use OpenAI `text-embedding-ada-002` (1536 dimensions)
- Supports semantic search for ICP matching

**Vector Text Structure:**
```typescript
// From icps.service.ts buildICPVectorText()
ICP: {name}
Demographics: Job Titles: {titles}; Age Range: {range}; Location: {location}
Firmographics: Industry: {industry}; Company Size: {size}; Revenue: {revenue}
Psychographics: Pain Points: {points}; Goals: {goals}
Behaviors: Buying Triggers: {triggers}; Preferred Channels: {channels}
```

**Assessment:**
- ✅ Strong semantic matching capability
- ✅ Team isolation via namespaces
- ✅ Similarity scoring for prospect matching
- ⚠️ Could enhance with behavioral signals from social profiles

#### 1.3 Services Layer

**Existing Services:**
- `icps.service.ts` - ICP CRUD + semantic search
- `leads.service.ts` - Lead management
- `vectorDb.service.ts` - Pinecone operations
- `embedding.service.ts` - OpenAI embeddings

**Assessment:**
- ✅ Solid foundation for persona-based matching
- ⚠️ Need new service: `leadEnrichment.service.ts`
- ⚠️ Need new service: `socialProspecting.service.ts`

---

## 2. Proposed Architecture

### 2.1 High-Level System Design

```
┌─────────────────────────────────────────────────────────────────┐
│                         MessageAI Platform                        │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  ┌───────────────┐        ┌─────────────────┐                  │
│  │  ICP Persona  │───────▶│  Pinecone       │                  │
│  │  Management   │        │  Vector Search  │                  │
│  └───────────────┘        └─────────────────┘                  │
│         │                          │                             │
│         │                          ▼                             │
│         │                  ┌─────────────────┐                  │
│         │                  │ Persona Match   │                  │
│         │                  │ & Scoring       │                  │
│         │                  └─────────────────┘                  │
│         │                          │                             │
│         ▼                          ▼                             │
│  ┌─────────────────────────────────────────┐                   │
│  │    Social Prospecting Orchestrator      │                   │
│  └─────────────────────────────────────────┘                   │
│         │                │                │                      │
│         ▼                ▼                ▼                      │
│  ┌───────────┐  ┌───────────────┐  ┌────────────┐             │
│  │ LinkedIn  │  │   Facebook    │  │  X (Twitter│             │
│  │ Integration│  │  Integration  │  │ Integration│             │
│  └───────────┘  └───────────────┘  └────────────┘             │
│      │ ▲              │ ▲               │ ▲                     │
│      │ │              │ │               │ │                     │
│      ▼ │              ▼ │               ▼ │                     │
│  ┌────────────────────────────────────────────┐                │
│  │       Data Enrichment & Validation         │                │
│  │  • Profile Scraping (Puppeteer/Playwright) │                │
│  │  • API Data (LinkedIn Sales Navigator)     │                │
│  │  • Company Data (Clearbit, Hunter.io)      │                │
│  └────────────────────────────────────────────┘                │
│                         │                                        │
│                         ▼                                        │
│  ┌─────────────────────────────────────┐                       │
│  │     Lead Scoring & Qualification     │                       │
│  │  • Semantic similarity to ICP         │                       │
│  │  • Activity signals (posts, engagement)│                      │
│  │  • Company fit score                  │                       │
│  └─────────────────────────────────────┘                       │
│                         │                                        │
│                         ▼                                        │
│  ┌─────────────────────────────────────┐                       │
│  │        Lead Storage & CRM            │                       │
│  │  • PostgreSQL (structured data)       │                       │
│  │  • S3 (profile snapshots, documents)  │                       │
│  └─────────────────────────────────────┘                       │
│                         │                                        │
│                         ▼                                        │
│  ┌─────────────────────────────────────┐                       │
│  │    Outreach Campaign Trigger         │                       │
│  │  • Email sequences                    │                       │
│  │  • LinkedIn InMail                    │                       │
│  │  • Personalized messaging             │                       │
│  └─────────────────────────────────────┘                       │
│                                                                   │
└─────────────────────────────────────────────────────────────────┘
```

### 2.2 Technology Stack Selection

#### Data Collection Methods

**Option 1: Official APIs (Recommended for Compliance)**

| Platform | API | Access Level | Cost | Compliance |
|----------|-----|--------------|------|------------|
| **LinkedIn** | LinkedIn Marketing API | Company pages, ads targeting | $$ | ✅ TOS Compliant |
| **LinkedIn** | Sales Navigator API | Premium search, lead lists | $$$ | ✅ TOS Compliant |
| **Facebook** | Marketing API | Audience insights, lookalikes | $ | ✅ TOS Compliant |
| **Facebook** | Graph API | Public profile data | Free | ✅ TOS Compliant |

**Option 2: Web Scraping (Use with Caution)**

| Tool | Use Case | Risk Level | Notes |
|------|----------|------------|-------|
| **Puppeteer** | LinkedIn profile scraping | 🔴 High | TOS violation, IP bans |
| **Playwright** | Facebook public pages | 🟡 Medium | Rate limiting required |
| **Selenium** | Authenticated browsing | 🔴 High | Account suspension risk |
| **Cheerio** | Static HTML parsing | 🟢 Low | For public pages only |

**Option 3: Third-Party Data Providers (Recommended)**

| Provider | Data Type | Quality | Integration |
|----------|-----------|---------|-------------|
| **Clearbit** | Company enrichment | ⭐⭐⭐⭐⭐ | REST API |
| **Hunter.io** | Email discovery | ⭐⭐⭐⭐ | REST API |
| **ZoomInfo** | B2B contact database | ⭐⭐⭐⭐⭐ | REST API + CSV |
| **Apollo.io** | Sales intelligence | ⭐⭐⭐⭐ | REST API |
| **Lusha** | Contact enrichment | ⭐⭐⭐⭐ | REST API + Extension |

**Recommended Approach:**
```
Hybrid Strategy:
1. Primary: Official APIs (LinkedIn Marketing API, Facebook Marketing API)
2. Secondary: Third-party enrichment (Clearbit, Hunter.io)
3. Fallback: Responsible web scraping (public data only, with rate limiting)
```

---

## 3. Technical Components

### 3.1 New Services Architecture

#### Service 1: Social Prospecting Service

**File:** `backend/src/services/socialProspecting.service.ts`

**Responsibilities:**
- Orchestrate multi-platform prospect discovery
- Translate ICP personas into platform-specific search criteria
- Queue and manage scraping/API jobs
- Rate limiting and retry logic

**Core Methods:**
```typescript
interface SocialProspectingService {
  // Main orchestration
  startProspectingCampaign(icpId: string, platforms: Platform[], options: ProspectingOptions): Promise<CampaignJob>;

  // Platform-specific search
  searchLinkedInProspects(criteria: LinkedInSearchCriteria): Promise<LinkedInProfile[]>;
  searchFacebookAudience(criteria: FacebookAudienceCriteria): Promise<FacebookProfile[]>;

  // Job management
  getCampaignStatus(jobId: string): Promise<JobStatus>;
  pauseProspectingCampaign(jobId: string): Promise<void>;

  // Results retrieval
  getDiscoveredProspects(jobId: string, filters: ProspectFilters): Promise<Prospect[]>;
}
```

#### Service 2: Lead Enrichment Service

**File:** `backend/src/services/leadEnrichment.service.ts`

**Responsibilities:**
- Enrich prospect data from multiple sources
- Validate contact information
- Calculate lead scores based on ICP match
- Maintain data quality

**Core Methods:**
```typescript
interface LeadEnrichmentService {
  // Enrichment
  enrichProspect(prospect: RawProspect): Promise<EnrichedLead>;
  enrichCompanyData(companyDomain: string): Promise<CompanyData>;
  findContactEmail(firstName: string, lastName: string, companyDomain: string): Promise<string | null>;

  // Scoring
  calculateICPMatch(prospect: EnrichedLead, icp: ICP): Promise<number>;
  scoreLeadQuality(lead: EnrichedLead): Promise<LeadScore>;

  // Validation
  validateContactInfo(contactInfo: ContactInfo): Promise<ValidationResult>;
  verifyEmailDeliverability(email: string): Promise<boolean>;
}
```

#### Service 3: Platform Integration Services

**LinkedIn Integration:** `backend/src/services/integrations/linkedin.service.ts`
```typescript
interface LinkedInService {
  // Authentication
  authenticateWithLinkedIn(clientId: string, clientSecret: string): Promise<OAuth2Token>;

  // Sales Navigator API
  searchPeopleAdvanced(criteria: SearchCriteria): Promise<LinkedInProfile[]>;
  getProfileDetails(profileUrl: string): Promise<LinkedInProfile>;

  // Marketing API
  getTargetingOptions(accountId: string): Promise<TargetingOptions>;
  createLookalikeAudience(sourceICPId: string): Promise<Audience>;

  // Compliance
  respectRateLimits(): Promise<void>;
  logAPIUsage(endpoint: string, responseCode: number): Promise<void>;
}
```

**Facebook Integration:** `backend/src/services/integrations/facebook.service.ts`
```typescript
interface FacebookService {
  // Authentication
  authenticateWithFacebook(appId: string, appSecret: string): Promise<OAuth2Token>;

  // Marketing API
  searchAudienceInsights(criteria: AudienceCriteria): Promise<AudienceInsights>;
  createLookalikeAudience(sourceICPId: string, countries: string[]): Promise<Audience>;

  // Graph API (Public Data Only)
  getPublicPageFollowers(pageId: string): Promise<PublicProfile[]>;
  getPublicGroupMembers(groupId: string): Promise<PublicProfile[]>;
}
```

### 3.2 Database Schema Extensions

**New Tables:**

```prisma
// Track prospecting campaigns
model ProspectingCampaign {
  id              String   @id @default(uuid())
  teamId          String
  icpId           String
  name            String
  platforms       String[] // ["linkedin", "facebook", "twitter"]
  searchCriteria  Json     // Platform-specific search params
  status          String   // "running", "paused", "completed", "failed"
  discoveredCount Int      @default(0)
  qualifiedCount  Int      @default(0)
  startedAt       DateTime @default(now())
  completedAt     DateTime?

  team            Team @relation(fields: [teamId], references: [id])
  icp             ICP @relation(fields: [icpId], references: [id])
  prospects       Prospect[]

  @@index([teamId])
  @@index([icpId])
  @@index([status])
}

// Store discovered prospects before converting to leads
model Prospect {
  id                String   @id @default(uuid())
  campaignId        String
  platform          String   // "linkedin", "facebook", "twitter"
  platformProfileId String   // External platform ID
  profileUrl        String
  name              String
  headline          String?
  location          String?
  companyName       String?
  companyUrl        String?
  contactInfo       Json     // Email, phone (if available)
  profileData       Json     // Full scraped/API data
  enrichmentData    Json     // Data from enrichment services
  icpMatchScore     Float    @default(0)
  qualityScore      Float    @default(0)
  status            String   @default("new") // "new", "enriched", "qualified", "converted", "rejected"
  convertedToLeadId String?
  discoveredAt      DateTime @default(now())
  enrichedAt        DateTime?

  campaign          ProspectingCampaign @relation(fields: [campaignId], references: [id])

  @@unique([platform, platformProfileId])
  @@index([campaignId])
  @@index([status])
  @@index([icpMatchScore])
}

// Extend existing Lead model
model Lead {
  // ... existing fields ...

  // Add new fields for social prospecting
  prospectId        String?  // Link back to Prospect
  socialProfiles    Json?    // {linkedin: url, facebook: url, twitter: url}
  enrichmentScore   Float?   // Quality of enriched data
  lastEnrichedAt    DateTime?
}

// Track enrichment API usage and costs
model EnrichmentLog {
  id          String   @id @default(uuid())
  teamId      String
  provider    String   // "clearbit", "hunter", "zoominfo"
  endpoint    String
  prospectId  String?
  leadId      String?
  requestData Json
  responseData Json?
  cost        Float    @default(0)
  status      String   // "success", "failed", "rate_limited"
  createdAt   DateTime @default(now())

  @@index([teamId])
  @@index([provider])
  @@index([createdAt])
}
```

### 3.3 Configuration & Environment Variables

**New Environment Variables:**

```bash
# LinkedIn Integration
LINKEDIN_CLIENT_ID=your_client_id
LINKEDIN_CLIENT_SECRET=your_client_secret
LINKEDIN_SALES_NAVIGATOR_TOKEN=your_token
LINKEDIN_API_VERSION=v2

# Facebook Integration
FACEBOOK_APP_ID=your_app_id
FACEBOOK_APP_SECRET=your_app_secret
FACEBOOK_ACCESS_TOKEN=your_token
FACEBOOK_API_VERSION=v18.0

# Third-Party Enrichment
CLEARBIT_API_KEY=your_key
HUNTER_API_KEY=your_key
ZOOMINFO_API_KEY=your_key
APOLLO_API_KEY=your_key

# Rate Limiting
LINKEDIN_RATE_LIMIT_PER_HOUR=1000
FACEBOOK_RATE_LIMIT_PER_HOUR=5000
ENRICHMENT_RATE_LIMIT_PER_HOUR=500

# Scraping (if needed)
PROXY_SERVICE_URL=your_proxy_url
PROXY_API_KEY=your_proxy_key
USER_AGENT_ROTATION=true
```

---

## 4. Integration Patterns

### 4.1 Persona to Search Criteria Translation

**Algorithm:**

```typescript
// Translate ICP persona into LinkedIn search criteria
function translateICPtoLinkedInSearch(icp: ICP): LinkedInSearchCriteria {
  const criteria: LinkedInSearchCriteria = {};

  // Demographics -> LinkedIn filters
  if (icp.demographics.jobTitles) {
    criteria.titles = icp.demographics.jobTitles; // Array of job titles
  }

  if (icp.demographics.location) {
    criteria.locations = parseLocations(icp.demographics.location); // Geographic regions
  }

  // Firmographics -> Company filters
  if (icp.firmographics.industry) {
    criteria.industries = mapToLinkedInIndustries(icp.firmographics.industry);
  }

  if (icp.firmographics.companySize) {
    criteria.companySizes = parseCompanySize(icp.firmographics.companySize);
    // e.g., "50-200" -> ["51-200"]
  }

  // Psychographics -> Keyword search
  if (icp.psychographics.painPoints) {
    criteria.keywords = extractKeywords(icp.psychographics.painPoints);
    // Search in profile descriptions, posts
  }

  // Behaviors -> Activity filters
  if (icp.behaviors.preferredChannels?.includes('LinkedIn')) {
    criteria.activityLevel = 'high'; // Active posters
  }

  return criteria;
}

// Translate ICP persona into Facebook audience criteria
function translateICPtoFacebookAudience(icp: ICP): FacebookAudienceCriteria {
  const criteria: FacebookAudienceCriteria = {
    targeting: {}
  };

  // Demographics
  if (icp.demographics.ageRange) {
    const [min, max] = parseAgeRange(icp.demographics.ageRange);
    criteria.targeting.age_min = min;
    criteria.targeting.age_max = max;
  }

  if (icp.demographics.location) {
    criteria.targeting.geo_locations = parseLocations(icp.demographics.location);
  }

  // Firmographics -> Work targeting
  if (icp.firmographics.industry) {
    criteria.targeting.work_employers = mapToFacebookEmployers(icp.firmographics.industry);
  }

  if (icp.demographics.jobTitles) {
    criteria.targeting.work_positions = icp.demographics.jobTitles;
  }

  // Psychographics -> Interest targeting
  if (icp.psychographics.interests) {
    criteria.targeting.interests = mapToFacebookInterests(icp.psychographics.interests);
  }

  // Behaviors -> Behavior targeting
  if (icp.behaviors.buyingTriggers) {
    criteria.targeting.behaviors = mapToFacebookBehaviors(icp.behaviors.buyingTriggers);
  }

  return criteria;
}
```

### 4.2 Semantic Matching Workflow

```
┌────────────────────────────────────────────────────────────┐
│ 1. ICP Persona Retrieval                                   │
│    • Fetch ICP from PostgreSQL                             │
│    • Load vector embedding from Pinecone                   │
└────────────────┬───────────────────────────────────────────┘
                 │
                 ▼
┌────────────────────────────────────────────────────────────┐
│ 2. Prospect Discovery (Multi-Platform)                     │
│    • LinkedIn: Search by job titles, companies             │
│    • Facebook: Target by demographics, interests           │
│    • Store raw profile data                                │
└────────────────┬───────────────────────────────────────────┘
                 │
                 ▼
┌────────────────────────────────────────────────────────────┐
│ 3. Profile Vectorization                                   │
│    • Extract key attributes from social profiles           │
│    • Generate text representation:                         │
│      "Job: {title} at {company} | Location: {location}    │
│       Bio: {bio} | Skills: {skills} | Interests: {interests}"│
│    • Create embedding via OpenAI API                       │
└────────────────┬───────────────────────────────────────────┘
                 │
                 ▼
┌────────────────────────────────────────────────────────────┐
│ 4. Semantic Similarity Calculation                         │
│    • Compare prospect vector with ICP vector               │
│    • Calculate cosine similarity (0-1 score)               │
│    • Apply weighted scoring:                               │
│      - Demographics match: 30%                             │
│      - Firmographics match: 25%                            │
│      - Psychographics match: 25%                           │
│      - Activity signals: 20%                               │
└────────────────┬───────────────────────────────────────────┘
                 │
                 ▼
┌────────────────────────────────────────────────────────────┐
│ 5. Qualification Threshold                                 │
│    • Score >= 0.75: High-quality lead (auto-convert)       │
│    • Score 0.60-0.74: Medium quality (manual review)       │
│    • Score < 0.60: Low quality (discard)                   │
└────────────────┬───────────────────────────────────────────┘
                 │
                 ▼
┌────────────────────────────────────────────────────────────┐
│ 6. Lead Enrichment & Conversion                            │
│    • Enrich with Clearbit (company data)                   │
│    • Enrich with Hunter.io (email)                         │
│    • Validate contact information                          │
│    • Convert Prospect → Lead in PostgreSQL                 │
└────────────────────────────────────────────────────────────┘
```

### 4.3 Rate Limiting & Compliance Strategy

```typescript
class RateLimiter {
  private requestCounts: Map<string, number[]> = new Map();

  async checkRateLimit(platform: string, endpoint: string): Promise<void> {
    const key = `${platform}:${endpoint}`;
    const now = Date.now();
    const hourAgo = now - 3600000; // 1 hour in ms

    // Get requests in last hour
    const requests = this.requestCounts.get(key) || [];
    const recentRequests = requests.filter(timestamp => timestamp > hourAgo);

    // Check limits
    const limits = {
      'linkedin:search': 100,
      'linkedin:profile': 500,
      'facebook:audience': 200,
      'clearbit:enrich': 50
    };

    const limit = limits[key] || 100;

    if (recentRequests.length >= limit) {
      const oldestRequest = Math.min(...recentRequests);
      const waitTime = (oldestRequest + 3600000) - now;
      throw new RateLimitError(`Rate limit exceeded. Retry in ${waitTime}ms`);
    }

    // Log request
    recentRequests.push(now);
    this.requestCounts.set(key, recentRequests);
  }

  async executeWithRetry<T>(
    operation: () => Promise<T>,
    platform: string,
    endpoint: string,
    maxRetries: number = 3
  ): Promise<T> {
    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        await this.checkRateLimit(platform, endpoint);
        return await operation();
      } catch (error) {
        if (error instanceof RateLimitError && attempt < maxRetries - 1) {
          // Exponential backoff
          await sleep(Math.pow(2, attempt) * 1000);
          continue;
        }
        throw error;
      }
    }
    throw new Error('Max retries exceeded');
  }
}
```

---

## 5. Data Flow

### 5.1 End-to-End Prospecting Flow

```
┌─────────────┐
│   User      │
│  Initiates  │
│ Prospecting │
└──────┬──────┘
       │
       │ POST /api/v1/prospecting/campaigns
       │ { icpId, platforms: ["linkedin", "facebook"] }
       │
       ▼
┌─────────────────────────────────────┐
│  API Controller                     │
│  • Validate request                 │
│  • Check team permissions           │
│  • Create ProspectingCampaign       │
└──────┬──────────────────────────────┘
       │
       ▼
┌─────────────────────────────────────┐
│  Social Prospecting Service         │
│  • Load ICP from PostgreSQL         │
│  • Retrieve ICP vector from Pinecone│
│  • Translate ICP → Search Criteria  │
│  • Queue platform jobs              │
└──────┬──────────────────────────────┘
       │
       ├────────────────┬────────────────┐
       │                │                │
       ▼                ▼                ▼
┌──────────────┐ ┌──────────────┐ ┌──────────────┐
│  LinkedIn    │ │  Facebook    │ │   X/Twitter  │
│  Integration │ │  Integration │ │  Integration │
└──────┬───────┘ └──────┬───────┘ └──────┬───────┘
       │                │                │
       │ API Calls      │ API Calls      │ API Calls
       │ (or scraping)  │ (or scraping)  │ (or scraping)
       │                │                │
       ▼                ▼                ▼
┌─────────────────────────────────────────┐
│  Raw Prospect Data Storage              │
│  • Store in Prospect table              │
│  • Status: "new"                        │
└──────┬──────────────────────────────────┘
       │
       ▼
┌─────────────────────────────────────────┐
│  Lead Enrichment Service                │
│  • Vectorize prospect profiles          │
│  • Calculate ICP similarity scores      │
│  • Enrich via Clearbit/Hunter.io        │
│  • Validate contact info                │
│  • Status: "enriched"                   │
└──────┬──────────────────────────────────┘
       │
       ▼
┌─────────────────────────────────────────┐
│  Lead Qualification Logic               │
│  if (icpMatchScore >= 0.75)             │
│     → Convert to Lead (status: qualified)│
│  else if (score >= 0.60)                │
│     → Manual review queue               │
│  else                                   │
│     → Discard or archive                │
└──────┬──────────────────────────────────┘
       │
       ▼
┌─────────────────────────────────────────┐
│  Lead Storage                           │
│  • Create Lead record                   │
│  • Link to ProspectingCampaign          │
│  • Store enriched data                  │
│  • Calculate lead score                 │
└──────┬──────────────────────────────────┘
       │
       ▼
┌─────────────────────────────────────────┐
│  Notification & Workflow Trigger        │
│  • Notify sales team                    │
│  • Add to CRM sequence                  │
│  • Trigger outreach automation          │
└─────────────────────────────────────────┘
```

### 5.2 Vector Similarity Matching Process

```
ICP Vector (from Pinecone)
↓
[0.234, -0.567, 0.891, ... ] (1536 dimensions)
                │
                │ Cosine Similarity
                │
                ▼
Prospect Profile Vector (generated)
↓
"Senior Product Manager at SaaS company
 Location: San Francisco
 Skills: Product strategy, agile, B2B
 Interests: Growth hacking, customer success"
↓
Embedding API → [0.241, -0.572, 0.885, ... ]
                │
                ▼
          Similarity Score: 0.87
                │
                ▼
       High-Quality Match! ✅
```

---

## 6. Implementation Phases

### Phase 1: Foundation (Weeks 1-2)

**Deliverables:**
- [ ] Database schema extensions (Prospect, ProspectingCampaign, EnrichmentLog)
- [ ] Base service structure (socialProspecting.service.ts, leadEnrichment.service.ts)
- [ ] Environment configuration for APIs
- [ ] Rate limiting framework

**Success Criteria:**
- Schema migrations applied successfully
- Service skeleton with TypeScript interfaces defined
- Environment variables validated

### Phase 2: LinkedIn Integration (Weeks 3-4)

**Deliverables:**
- [ ] LinkedIn OAuth 2.0 authentication
- [ ] LinkedIn Sales Navigator API integration (if available)
- [ ] LinkedIn Marketing API audience targeting
- [ ] ICP → LinkedIn search criteria translation
- [ ] Profile data extraction and storage

**Success Criteria:**
- Successful authentication and API calls
- Ability to search for 100+ prospects based on ICP
- Proper error handling and rate limiting

### Phase 3: Enrichment & Scoring (Week 5)

**Deliverables:**
- [ ] Clearbit integration for company data
- [ ] Hunter.io integration for email discovery
- [ ] Vector similarity scoring implementation
- [ ] Multi-factor lead quality scoring
- [ ] Automated prospect → lead conversion

**Success Criteria:**
- 80%+ enrichment success rate
- Accurate ICP matching (validated manually on sample)
- Qualified leads automatically created

### Phase 4: Facebook Integration (Week 6)

**Deliverables:**
- [ ] Facebook Marketing API integration
- [ ] Facebook Graph API for public data
- [ ] Audience insights extraction
- [ ] ICP → Facebook audience criteria translation

**Success Criteria:**
- Facebook audience targeting working
- Integration with enrichment pipeline

### Phase 5: Dashboard & Reporting (Week 7)

**Deliverables:**
- [ ] Prospecting campaign management UI
- [ ] Real-time campaign status dashboard
- [ ] Lead quality analytics
- [ ] Cost tracking and ROI metrics

**Success Criteria:**
- Users can launch campaigns via UI
- Real-time visibility into discovered prospects
- Clear ROI metrics displayed

### Phase 6: Optimization & Scale (Week 8+)

**Deliverables:**
- [ ] Batch processing optimization
- [ ] Background job queue (Bull/BullMQ)
- [ ] Webhook integrations for real-time updates
- [ ] Advanced filtering and segmentation
- [ ] A/B testing for ICP variations

**Success Criteria:**
- Handle 10,000+ prospects per campaign
- < 5 minute latency for new prospects
- 90%+ uptime

---

## 7. Risk Assessment & Mitigation

### 7.1 Legal & Compliance Risks

| Risk | Severity | Mitigation |
|------|----------|------------|
| **LinkedIn TOS Violation** | 🔴 Critical | Use official APIs only; avoid scraping |
| **GDPR Compliance** | 🔴 Critical | Obtain consent; provide data deletion |
| **CAN-SPAM Act** | 🟡 High | Include unsubscribe; validate emails |
| **Data Privacy Laws** | 🟡 High | Encrypt PII; implement access controls |

**Mitigation Strategy:**
1. **Use Official APIs**: Prioritize LinkedIn Sales Navigator API, Facebook Marketing API
2. **Legal Review**: Have legal team review data collection practices
3. **User Consent**: Implement double opt-in for contact lists
4. **Data Retention**: Auto-delete prospect data after 90 days if not converted
5. **Compliance Dashboard**: Track consent status, data retention policies

### 7.2 Technical Risks

| Risk | Severity | Mitigation |
|------|----------|------------|
| **API Rate Limits** | 🟡 High | Implement rate limiter; queue system |
| **API Cost Overruns** | 🟡 High | Budget alerts; usage tracking |
| **IP Bans from Scraping** | 🔴 Critical | Avoid scraping; use proxies if necessary |
| **Data Quality Issues** | 🟡 High | Validation layer; enrichment fallbacks |
| **Vector Search Performance** | 🟢 Medium | Optimize Pinecone queries; caching |

**Mitigation Strategy:**
1. **Rate Limiting**: Distributed rate limiter with Redis
2. **Cost Monitoring**: Real-time API usage dashboard
3. **Data Validation**: Multi-stage validation pipeline
4. **Fallback Providers**: Use 2-3 enrichment providers
5. **Performance Testing**: Load test Pinecone with 1M+ vectors

### 7.3 Business Risks

| Risk | Severity | Mitigation |
|------|----------|------------|
| **Low Match Quality** | 🟡 High | Iterative ICP refinement; feedback loop |
| **High Lead Cost** | 🟡 High | ROI tracking; cost optimization |
| **Sales Team Adoption** | 🟡 High | Training; gradual rollout |

---

## 8. Performance & Scalability

### 8.1 Performance Targets

| Metric | Target | Current Baseline |
|--------|--------|------------------|
| **Prospect Discovery Rate** | 1000/hour | N/A |
| **Enrichment Latency** | < 500ms per prospect | N/A |
| **ICP Match Scoring** | < 100ms per prospect | N/A |
| **API Response Time** | < 2s (p95) | TBD |
| **Background Job Processing** | 10,000 prospects/day | N/A |

### 8.2 Scalability Architecture

```
┌──────────────────────────────────────────────────────────┐
│                     Load Balancer                         │
└────────────────────┬─────────────────────────────────────┘
                     │
         ┌───────────┴───────────┐
         │                       │
         ▼                       ▼
┌─────────────────┐   ┌─────────────────┐
│  API Server 1   │   │  API Server 2   │
│  (Express)      │   │  (Express)      │
└────────┬────────┘   └────────┬────────┘
         │                     │
         └──────────┬──────────┘
                    │
         ┌──────────┴──────────┐
         │                     │
         ▼                     ▼
┌─────────────────┐   ┌─────────────────┐
│  Redis          │   │  PostgreSQL     │
│  (Rate Limit)   │   │  (Leads, ICPs)  │
└─────────────────┘   └─────────────────┘
         │                     │
         │                     │
         ▼                     ▼
┌─────────────────────────────────────────┐
│          Job Queue (BullMQ)             │
│  • Prospecting jobs                     │
│  • Enrichment jobs                      │
│  • Scoring jobs                         │
└────────┬────────────────────────────────┘
         │
         ├─────────────┬─────────────┐
         │             │             │
         ▼             ▼             ▼
┌──────────────┐ ┌──────────────┐ ┌──────────────┐
│  Worker 1    │ │  Worker 2    │ │  Worker 3    │
│ (Prospecting)│ │ (Enrichment) │ │  (Scoring)   │
└──────────────┘ └──────────────┘ └──────────────┘
```

**Scaling Strategies:**
1. **Horizontal Scaling**: Add more API servers behind load balancer
2. **Background Processing**: Offload heavy tasks to worker queues
3. **Database Sharding**: Partition leads/prospects by team
4. **Caching**: Redis for hot data (ICP vectors, search results)
5. **CDN**: Serve profile images and static assets via CloudFront

### 8.3 Cost Optimization

**Estimated Monthly Costs:**

| Service | Usage | Cost |
|---------|-------|------|
| **LinkedIn Sales Navigator API** | 10,000 searches/month | ~$500 |
| **Facebook Marketing API** | 50,000 requests/month | ~$100 |
| **Clearbit Enrichment** | 5,000 enrichments/month | ~$300 |
| **Hunter.io Email** | 3,000 searches/month | ~$150 |
| **OpenAI Embeddings** | 100,000 embeddings/month | ~$100 |
| **Pinecone Vector DB** | 1M vectors, 100k queries | ~$70 |
| **AWS S3 Storage** | 100GB | ~$2.50 |
| **Total** | | **~$1,222/month** |

**Cost Reduction Strategies:**
1. **Batch Operations**: Process prospects in batches to reduce API calls
2. **Caching**: Cache enrichment results for 30 days
3. **Smart Enrichment**: Only enrich high-scoring prospects
4. **Tiered Plans**: Start with free tiers, upgrade as needed

---

## 9. API Endpoints Specification

### 9.1 Prospecting Campaign Management

```typescript
// Start a new prospecting campaign
POST /api/v1/prospecting/campaigns
Request:
{
  "icpId": "uuid",
  "name": "Q4 Enterprise Leads",
  "platforms": ["linkedin", "facebook"],
  "searchCriteria": {
    "linkedin": {
      "titles": ["CTO", "VP Engineering"],
      "companySize": ["51-200", "201-500"],
      "location": "United States"
    },
    "facebook": {
      "ageRange": [30, 50],
      "interests": ["B2B Software", "SaaS"]
    }
  },
  "options": {
    "maxProspects": 1000,
    "autoEnrich": true,
    "autoConvert": true,
    "minMatchScore": 0.75
  }
}
Response:
{
  "campaignId": "uuid",
  "status": "running",
  "estimatedCompletion": "2025-11-07T10:00:00Z"
}

// Get campaign status
GET /api/v1/prospecting/campaigns/:campaignId
Response:
{
  "campaignId": "uuid",
  "name": "Q4 Enterprise Leads",
  "status": "running",
  "progress": {
    "discovered": 234,
    "enriched": 189,
    "qualified": 67,
    "converted": 45
  },
  "platforms": {
    "linkedin": { "discovered": 156, "status": "active" },
    "facebook": { "discovered": 78, "status": "active" }
  },
  "startedAt": "2025-11-06T08:00:00Z",
  "estimatedCompletion": "2025-11-07T10:00:00Z"
}

// List discovered prospects
GET /api/v1/prospecting/campaigns/:campaignId/prospects
Query params: ?status=enriched&minScore=0.7&limit=50
Response:
{
  "prospects": [
    {
      "id": "uuid",
      "name": "Jane Smith",
      "headline": "VP of Engineering at TechCorp",
      "platform": "linkedin",
      "profileUrl": "https://linkedin.com/in/janesmith",
      "contactInfo": {
        "email": "jane.smith@techcorp.com",
        "phone": "+1-555-0123"
      },
      "companyName": "TechCorp",
      "companyUrl": "https://techcorp.com",
      "icpMatchScore": 0.87,
      "qualityScore": 0.92,
      "status": "qualified",
      "discoveredAt": "2025-11-06T09:15:00Z"
    }
  ],
  "pagination": {
    "total": 234,
    "page": 1,
    "limit": 50
  }
}

// Convert prospect to lead
POST /api/v1/prospecting/prospects/:prospectId/convert
Response:
{
  "leadId": "uuid",
  "prospectId": "uuid",
  "message": "Prospect converted to lead successfully"
}

// Pause/Resume campaign
PATCH /api/v1/prospecting/campaigns/:campaignId
Request:
{
  "status": "paused" // or "running"
}
```

### 9.2 Lead Enrichment

```typescript
// Enrich a prospect
POST /api/v1/enrichment/prospects/:prospectId
Request:
{
  "providers": ["clearbit", "hunter"], // optional, defaults to all
  "validateEmail": true
}
Response:
{
  "prospectId": "uuid",
  "enrichmentData": {
    "clearbit": {
      "company": {
        "name": "TechCorp",
        "domain": "techcorp.com",
        "industry": "Software",
        "employees": 250,
        "founded": 2015
      },
      "person": {
        "email": "jane.smith@techcorp.com",
        "linkedin": "https://linkedin.com/in/janesmith",
        "twitter": "@janesmith"
      }
    },
    "hunter": {
      "email": "jane.smith@techcorp.com",
      "score": 95,
      "deliverable": true
    }
  },
  "enrichedAt": "2025-11-06T10:30:00Z",
  "cost": 0.50
}

// Batch enrich prospects
POST /api/v1/enrichment/batch
Request:
{
  "prospectIds": ["uuid1", "uuid2", "uuid3"],
  "providers": ["clearbit"]
}
Response:
{
  "jobId": "uuid",
  "status": "processing",
  "totalProspects": 3
}
```

---

## 10. Monitoring & Observability

### 10.1 Key Metrics to Track

```typescript
// Prospecting Metrics
interface ProspectingMetrics {
  // Discovery
  prospectsDiscoveredPerHour: number;
  platformBreakdown: Record<Platform, number>;
  apiCallSuccess rate: number;

  // Enrichment
  enrichmentSuccessRate: number;
  enrichmentLatency: number; // milliseconds
  enrichmentCostPerProspect: number;

  // Qualification
  averageICPMatchScore: number;
  conversionRate: number; // prospects → leads
  highQualityLeadRate: number; // score >= 0.75

  // Cost
  totalAPICost: number;
  costPerQualifiedLead: number;

  // Performance
  campaignDuration: number; // hours
  errorRate: number;
}
```

### 10.2 Logging Strategy

```typescript
// Structured logging with correlation IDs
logger.info('Prospecting campaign started', {
  correlationId: 'camp_abc123',
  teamId: 'team_xyz',
  icpId: 'icp_789',
  platforms: ['linkedin', 'facebook'],
  maxProspects: 1000
});

logger.info('Prospect discovered', {
  correlationId: 'camp_abc123',
  prospectId: 'pros_456',
  platform: 'linkedin',
  name: 'Jane Smith',
  matchScore: 0.87
});

logger.error('Enrichment failed', {
  correlationId: 'camp_abc123',
  prospectId: 'pros_456',
  provider: 'clearbit',
  error: 'Rate limit exceeded',
  retryAfter: 3600
});
```

---

## 11. Testing Strategy

### 11.1 Unit Tests

```typescript
describe('ICP to LinkedIn Translation', () => {
  it('should translate job titles correctly', () => {
    const icp = createMockICP({
      demographics: {
        jobTitles: ['CTO', 'VP Engineering']
      }
    });

    const criteria = translateICPtoLinkedInSearch(icp);

    expect(criteria.titles).toEqual(['CTO', 'VP Engineering']);
  });

  it('should map industry to LinkedIn categories', () => {
    const icp = createMockICP({
      firmographics: {
        industry: ['Software', 'SaaS']
      }
    });

    const criteria = translateICPtoLinkedInSearch(icp);

    expect(criteria.industries).toContain('COMPUTER_SOFTWARE');
  });
});

describe('Vector Similarity Scoring', () => {
  it('should calculate high similarity for matching profiles', async () => {
    const icpVector = [0.5, 0.3, -0.2, ...]; // Mock vector
    const prospectVector = [0.51, 0.29, -0.21, ...]; // Similar vector

    const score = calculateCosineSimilarity(icpVector, prospectVector);

    expect(score).toBeGreaterThan(0.95);
  });
});
```

### 11.2 Integration Tests

```typescript
describe('LinkedIn Integration', () => {
  it('should search for prospects with valid credentials', async () => {
    const criteria = {
      titles: ['CTO'],
      companySize: ['51-200']
    };

    const prospects = await linkedInService.searchPeopleAdvanced(criteria);

    expect(prospects.length).toBeGreaterThan(0);
    expect(prospects[0]).toHaveProperty('name');
    expect(prospects[0]).toHaveProperty('headline');
  });

  it('should handle rate limits gracefully', async () => {
    // Make requests until rate limit
    const promises = Array(200).fill(null).map(() =>
      linkedInService.getProfileDetails('dummy-url')
    );

    await expect(Promise.all(promises)).rejects.toThrow(RateLimitError);
  });
});
```

### 11.3 End-to-End Tests

```typescript
describe('Prospecting Campaign E2E', () => {
  it('should complete full campaign workflow', async () => {
    // 1. Create campaign
    const campaign = await createProspectingCampaign({
      icpId: testICP.id,
      platforms: ['linkedin'],
      maxProspects: 10
    });

    expect(campaign.status).toBe('running');

    // 2. Wait for discovery
    await waitForCampaignStatus(campaign.id, 'completed', { timeout: 60000 });

    // 3. Verify prospects were discovered
    const prospects = await getProspects(campaign.id);
    expect(prospects.length).toBeGreaterThan(0);

    // 4. Verify enrichment
    const enrichedProspects = prospects.filter(p => p.status === 'enriched');
    expect(enrichedProspects.length).toBeGreaterThan(0);

    // 5. Verify lead conversion
    const leads = await getLeads({ campaignId: campaign.id });
    expect(leads.length).toBeGreaterThan(0);
  }, 120000);
});
```

---

## 12. Security Considerations

### 12.1 API Key Management

```typescript
// Use AWS Secrets Manager or HashiCorp Vault
class SecretsManager {
  async getLinkedInCredentials(): Promise<LinkedInCredentials> {
    return {
      clientId: await this.getSecret('LINKEDIN_CLIENT_ID'),
      clientSecret: await this.getSecret('LINKEDIN_CLIENT_SECRET'),
      accessToken: await this.getSecret('LINKEDIN_ACCESS_TOKEN')
    };
  }

  private async getSecret(key: string): Promise<string> {
    // Fetch from AWS Secrets Manager
    const secret = await secretsManager.getSecretValue({ SecretId: key }).promise();
    return secret.SecretString;
  }
}
```

### 12.2 Data Encryption

```typescript
// Encrypt sensitive prospect data at rest
class DataEncryption {
  encryptContactInfo(contactInfo: ContactInfo): string {
    const cipher = crypto.createCipheriv('aes-256-gcm', encryptionKey, iv);
    let encrypted = cipher.update(JSON.stringify(contactInfo), 'utf8', 'hex');
    encrypted += cipher.final('hex');
    return encrypted;
  }

  decryptContactInfo(encryptedData: string): ContactInfo {
    const decipher = crypto.createDecipheriv('aes-256-gcm', encryptionKey, iv);
    let decrypted = decipher.update(encryptedData, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return JSON.parse(decrypted);
  }
}
```

### 12.3 Access Control

```typescript
// Role-based access control for prospecting features
const prospectingPermissions = {
  'admin': ['create_campaign', 'view_all', 'export_data', 'delete'],
  'sales_manager': ['create_campaign', 'view_team', 'export_data'],
  'sales_rep': ['view_assigned', 'update_status'],
  'viewer': ['view_assigned']
};

function checkPermission(user: User, action: string): boolean {
  const userRole = user.role;
  return prospectingPermissions[userRole]?.includes(action) || false;
}
```

---

## 13. Deployment Plan

### 13.1 Infrastructure as Code (Terraform)

```hcl
# AWS ECS for API servers
resource "aws_ecs_cluster" "prospecting" {
  name = "messageai-prospecting-cluster"
}

resource "aws_ecs_service" "api" {
  name            = "prospecting-api"
  cluster         = aws_ecs_cluster.prospecting.id
  task_definition = aws_ecs_task_definition.api.arn
  desired_count   = 3

  load_balancer {
    target_group_arn = aws_lb_target_group.api.arn
    container_name   = "api"
    container_port   = 3000
  }
}

# Background workers for prospecting jobs
resource "aws_ecs_service" "workers" {
  name            = "prospecting-workers"
  cluster         = aws_ecs_cluster.prospecting.id
  task_definition = aws_ecs_task_definition.worker.arn
  desired_count   = 5
}

# Redis for rate limiting and caching
resource "aws_elasticache_cluster" "redis" {
  cluster_id           = "messageai-prospecting-cache"
  engine               = "redis"
  node_type            = "cache.t3.medium"
  num_cache_nodes      = 1
  parameter_group_name = "default.redis7"
}
```

### 13.2 CI/CD Pipeline

```yaml
# .github/workflows/deploy-prospecting.yml
name: Deploy Prospecting Service

on:
  push:
    branches: [main]
    paths:
      - 'backend/src/services/socialProspecting.service.ts'
      - 'backend/src/services/leadEnrichment.service.ts'
      - 'backend/src/services/integrations/**'

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - name: Run unit tests
        run: npm test
      - name: Run integration tests
        run: npm run test:integration

  build:
    needs: test
    runs-on: ubuntu-latest
    steps:
      - name: Build Docker image
        run: docker build -t messageai-prospecting:${{ github.sha }} .
      - name: Push to ECR
        run: |
          aws ecr get-login-password | docker login --username AWS --password-stdin
          docker push messageai-prospecting:${{ github.sha }}

  deploy:
    needs: build
    runs-on: ubuntu-latest
    steps:
      - name: Update ECS service
        run: |
          aws ecs update-service \
            --cluster prospecting-cluster \
            --service prospecting-api \
            --force-new-deployment
```

---

## 14. Success Metrics & KPIs

### 14.1 Product Success Metrics

| Metric | Target | Measurement |
|--------|--------|-------------|
| **Time to First Lead** | < 24 hours | Campaign start → first qualified lead |
| **Lead Quality Score** | Avg 0.75+ | ICP match score distribution |
| **Conversion Rate** | 15%+ | Qualified leads → opportunities |
| **Cost per Lead** | < $50 | Total cost / qualified leads |
| **User Adoption** | 70%+ | Teams using prospecting feature |

### 14.2 Technical Performance Metrics

| Metric | Target | Monitoring |
|--------|--------|-----------|
| **API Uptime** | 99.5%+ | CloudWatch, PagerDuty |
| **Response Time (p95)** | < 2s | Application logs |
| **Error Rate** | < 1% | Sentry error tracking |
| **Job Queue Latency** | < 5 min | BullMQ dashboard |
| **Database Query Time** | < 100ms | PostgreSQL slow query log |

---

## 15. Recommendations & Next Steps

### Immediate Priorities (Week 1)

1. **Legal Review**
   - Consult with legal team on LinkedIn/Facebook TOS compliance
   - Draft data privacy policy for prospect data
   - Review GDPR/CCPA requirements

2. **API Access Setup**
   - Apply for LinkedIn Sales Navigator API access
   - Set up Facebook Marketing API developer account
   - Register for Clearbit/Hunter.io trial accounts

3. **Database Schema**
   - Review and approve Prospect/ProspectingCampaign schema
   - Plan migration strategy
   - Set up staging environment

### Technical Decision Points

**Decision 1: Scraping vs. API-Only Approach**
```
Recommendation: API-Only (at least initially)
Rationale:
- Lower legal risk
- More reliable data quality
- Better rate limit management
- Official support channels

Trade-off: Higher cost, potentially limited data access
```

**Decision 2: Enrichment Provider Selection**
```
Recommendation: Multi-provider strategy
Primary: Clearbit (company data)
Secondary: Hunter.io (emails)
Tertiary: ZoomInfo (B2B contacts)

Rationale:
- Redundancy if one provider fails
- Cost optimization (use cheapest for bulk)
- Data quality validation via cross-referencing
```

**Decision 3: Background Job Processing**
```
Recommendation: BullMQ (Redis-backed)
Alternatives: AWS SQS, RabbitMQ

Rationale:
- Native TypeScript support
- Built-in retry logic
- Job prioritization
- Redis already in stack

Implementation:
- Separate queues: discovery, enrichment, scoring
- Worker pools per queue type
- Dead letter queue for failed jobs
```

### Phase 1 Deliverables (2 weeks)

**Week 1:**
- [ ] Legal approval obtained
- [ ] API credentials acquired (LinkedIn, Facebook, enrichment providers)
- [ ] Database schema migration created and tested
- [ ] Service architecture document finalized (this document)

**Week 2:**
- [ ] Base service implementations (skeleton code)
- [ ] Rate limiter framework implemented
- [ ] Job queue infrastructure set up
- [ ] Development environment configured

**Success Criteria:**
- Can make authenticated API calls to LinkedIn/Facebook
- Database can store prospect data
- Rate limiter prevents API quota exhaustion
- Team is aligned on architecture approach

---

## 16. Appendix

### A. Glossary

**ICP (Ideal Customer Profile):** A detailed description of the perfect customer for a product, including demographics, firmographics, psychographics, and behaviors.

**Firmographics:** Company-level attributes like industry, size, revenue, location.

**Psychographics:** Psychological attributes like pain points, goals, motivations, values.

**Vector Embedding:** A numerical representation of text in high-dimensional space, enabling semantic similarity comparisons.

**Cosine Similarity:** A metric to measure similarity between two vectors (ranges from -1 to 1, where 1 is identical).

**Lead Scoring:** Assigning a numerical value to prospects based on their fit and likelihood to convert.

### B. Reference Links

**APIs:**
- [LinkedIn Marketing API Docs](https://docs.microsoft.com/en-us/linkedin/marketing/)
- [Facebook Marketing API Docs](https://developers.facebook.com/docs/marketing-apis/)
- [Clearbit API Docs](https://clearbit.com/docs)
- [Hunter.io API Docs](https://hunter.io/api-documentation)

**Libraries:**
- [Pinecone TypeScript SDK](https://docs.pinecone.io/docs/typescript-client)
- [OpenAI Node.js SDK](https://github.com/openai/openai-node)
- [BullMQ Documentation](https://docs.bullmq.io/)
- [Playwright for Web Scraping](https://playwright.dev/)

**Compliance:**
- [GDPR Guide](https://gdpr.eu/)
- [LinkedIn API Terms](https://www.linkedin.com/legal/api-terms-of-use)
- [Facebook Platform Policy](https://developers.facebook.com/docs/apps/review/policies)

### C. Sample ICP Profile for Testing

```json
{
  "id": "test-icp-001",
  "name": "Enterprise SaaS Decision Maker",
  "demographics": {
    "jobTitles": ["CTO", "VP Engineering", "Director of Engineering", "Head of Product"],
    "ageRange": "35-55",
    "location": "United States, United Kingdom, Canada",
    "education": "Bachelor's or higher in Computer Science or related field"
  },
  "firmographics": {
    "industry": ["Software", "SaaS", "Cloud Computing", "Cybersecurity"],
    "companySize": ["51-200", "201-500", "501-1000"],
    "revenue": "$10M-$100M ARR",
    "geography": "North America, Western Europe"
  },
  "psychographics": {
    "painPoints": [
      "Scaling engineering team",
      "Technical debt management",
      "DevOps automation",
      "Security compliance"
    ],
    "goals": [
      "Improve development velocity",
      "Reduce operational costs",
      "Enhance product quality",
      "Accelerate time-to-market"
    ],
    "motivations": [
      "Innovation",
      "Efficiency",
      "Competitive advantage",
      "Team productivity"
    ],
    "values": [
      "Data-driven decision making",
      "Best-in-class tools",
      "Developer experience",
      "Continuous improvement"
    ]
  },
  "behaviors": {
    "buyingTriggers": [
      "Recent funding round",
      "Hiring surge in engineering",
      "Product launch announcement",
      "Compliance deadline"
    ],
    "decisionProcess": "Collaborative evaluation with 3-6 month sales cycle",
    "preferredChannels": ["LinkedIn", "Industry conferences", "Peer recommendations"],
    "influencers": ["Engineering team feedback", "ROI calculations", "Analyst reports"]
  }
}
```

---

## Document Approval

**Reviewed by:**
- [ ] Product Management
- [ ] Engineering Leadership
- [ ] Legal & Compliance
- [ ] Security Team
- [ ] Sales Leadership

**Approval Date:** ______________

**Next Review:** 2026-Q1

---

*This architecture document is a living document and should be updated as the implementation progresses and requirements evolve.*
