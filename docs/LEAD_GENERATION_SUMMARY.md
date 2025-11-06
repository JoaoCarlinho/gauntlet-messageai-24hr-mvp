# Lead Generation Architecture - Executive Summary

**Architect:** Winston
**Date:** November 6, 2025
**Status:** Design Complete - Ready for Implementation

---

## Overview

This architecture enables MessageAI to leverage ICP (Ideal Customer Profile) personas stored in Pinecone to automatically discover, enrich, and qualify prospects from LinkedIn and Facebook.

## Current State

✅ **What We Have:**
- ICPs stored in PostgreSQL with rich persona data (demographics, firmographics, psychographics, behaviors)
- ICP vectors in Pinecone for semantic matching
- Solid foundation services (icps.service.ts, leads.service.ts, vectorDb.service.ts)
- OpenAI embeddings integration

⚠️ **What We Need:**
- Social media platform integrations
- Lead enrichment services
- Automated prospect discovery and scoring
- Compliance and rate limiting framework

## Proposed Solution

### High-Level Flow

```
1. ICP Persona → 2. Platform Search → 3. Profile Vectorization →
4. Semantic Matching → 5. Enrichment → 6. Qualified Leads
```

### Key Components

**1. Social Prospecting Service**
- Orchestrates multi-platform discovery
- Translates ICP personas into platform-specific search criteria
- Manages API calls with rate limiting

**2. Lead Enrichment Service**
- Enriches prospects with Clearbit (company data), Hunter.io (emails)
- Calculates ICP match scores using vector similarity
- Validates contact information

**3. Platform Integrations**
- **LinkedIn:** Sales Navigator API + Marketing API
- **Facebook:** Marketing API + Graph API (public data)
- **Third-party:** Clearbit, Hunter.io, ZoomInfo

## Technical Approach

### Data Collection Strategy

**Recommended: Hybrid Approach**

| Method | Use Case | Compliance |
|--------|----------|------------|
| **Official APIs** | Primary method | ✅ TOS compliant |
| **Third-party providers** | Enrichment | ✅ Licensed data |
| **Responsible scraping** | Fallback only | ⚠️ Public data, rate-limited |

### Semantic Matching Process

```typescript
1. ICP Vector (from Pinecone): [0.234, -0.567, 0.891, ... ] (1536 dims)
2. Prospect Profile → "Senior PM at SaaS company, SF, Skills: ..."
3. Generate Embedding → [0.241, -0.572, 0.885, ... ]
4. Cosine Similarity → Score: 0.87
5. If score >= 0.75 → High-quality lead ✅
```

### Database Schema Extensions

**New Tables:**
- `ProspectingCampaign` - Track discovery campaigns
- `Prospect` - Store discovered profiles before conversion
- `EnrichmentLog` - Track API usage and costs

**Updated:**
- `Lead` - Add social profile links, enrichment metadata

## Implementation Phases

### Phase 1: Foundation (2 weeks)
- Database schema extensions
- Service structure setup
- API credential acquisition
- Rate limiting framework

### Phase 2: LinkedIn Integration (2 weeks)
- OAuth 2.0 authentication
- Sales Navigator API integration
- ICP → search criteria translation
- Profile extraction

### Phase 3: Enrichment & Scoring (1 week)
- Clearbit + Hunter.io integration
- Vector similarity scoring
- Automated lead conversion

### Phase 4: Facebook Integration (1 week)
- Marketing API integration
- Audience insights extraction

### Phase 5: Dashboard & Reporting (1 week)
- Campaign management UI
- Real-time status tracking
- Analytics and ROI metrics

### Phase 6: Optimization (Ongoing)
- Batch processing
- Background job queue (BullMQ)
- Advanced filtering
- A/B testing

## Key Decisions

### ✅ Use Official APIs (Not Scraping)
**Rationale:**
- Compliance with LinkedIn/Facebook TOS
- Reliable data quality
- Lower legal risk
- Official support

**Trade-off:** Higher cost (~$1,200/month), but safer and sustainable

### ✅ Multi-Provider Enrichment Strategy
- **Primary:** Clearbit (company data)
- **Secondary:** Hunter.io (email discovery)
- **Tertiary:** ZoomInfo (B2B contacts)

**Rationale:** Redundancy, cost optimization, data validation

### ✅ BullMQ for Background Jobs
**Rationale:**
- TypeScript native
- Redis-backed (already in stack)
- Built-in retry logic
- Job prioritization

## Risk Mitigation

| Risk | Severity | Mitigation |
|------|----------|------------|
| **LinkedIn TOS Violation** | 🔴 Critical | Use official APIs only |
| **GDPR Compliance** | 🔴 Critical | Implement consent management |
| **API Rate Limits** | 🟡 High | Distributed rate limiter (Redis) |
| **High Costs** | 🟡 High | Usage monitoring, budget alerts |
| **Low Match Quality** | 🟡 High | Iterative ICP refinement, feedback loop |

## Performance Targets

| Metric | Target |
|--------|--------|
| **Prospect Discovery Rate** | 1,000/hour |
| **Enrichment Latency** | < 500ms per prospect |
| **ICP Match Scoring** | < 100ms per prospect |
| **API Response Time** | < 2s (p95) |
| **Campaign Throughput** | 10,000 prospects/day |

## Cost Estimate

| Service | Monthly Cost |
|---------|-------------|
| LinkedIn Sales Navigator API | ~$500 |
| Facebook Marketing API | ~$100 |
| Clearbit Enrichment | ~$300 |
| Hunter.io Email | ~$150 |
| OpenAI Embeddings | ~$100 |
| Pinecone Vector DB | ~$70 |
| **Total** | **~$1,220/month** |

**ROI:** If generating 500 qualified leads/month at $50/lead cost = $25k value

## Success Metrics

### Product KPIs
- **Time to First Lead:** < 24 hours
- **Lead Quality Score:** Avg 0.75+
- **Conversion Rate:** 15%+ (leads → opportunities)
- **Cost per Lead:** < $50
- **User Adoption:** 70%+ of teams

### Technical KPIs
- **API Uptime:** 99.5%+
- **Error Rate:** < 1%
- **Queue Latency:** < 5 minutes

## API Endpoints (Key Examples)

```typescript
// Start campaign
POST /api/v1/prospecting/campaigns
{
  "icpId": "uuid",
  "platforms": ["linkedin", "facebook"],
  "maxProspects": 1000,
  "minMatchScore": 0.75
}

// Get campaign status
GET /api/v1/prospecting/campaigns/:id
→ { discovered: 234, enriched: 189, qualified: 67 }

// List prospects
GET /api/v1/prospecting/campaigns/:id/prospects?minScore=0.7

// Convert to lead
POST /api/v1/prospecting/prospects/:id/convert
```

## Next Steps

### Week 1: Pre-Implementation
1. ✅ Architecture review and approval (this document)
2. ⏳ Legal review of LinkedIn/Facebook TOS compliance
3. ⏳ Acquire API credentials (LinkedIn, Facebook, Clearbit, Hunter.io)
4. ⏳ Set up development environment

### Week 2-3: Phase 1 Implementation
1. Database schema migration
2. Service skeleton code
3. Rate limiter framework
4. Job queue infrastructure

### Week 4+: Platform Integrations
1. LinkedIn Sales Navigator integration
2. Facebook Marketing API integration
3. Enrichment pipeline
4. Lead scoring and conversion

## Recommended Reading

**Full Architecture Document:** [LEAD_GENERATION_ARCHITECTURE.md](./architecture/LEAD_GENERATION_ARCHITECTURE.md)

**Sections:**
- Section 3: Technical Components (detailed service specs)
- Section 4: Integration Patterns (ICP → search translation)
- Section 5: Data Flow (end-to-end diagrams)
- Section 7: Risk Assessment (compliance strategy)
- Section 9: API Endpoints (complete spec)

## Approval Required

Before implementation begins, we need sign-off from:
- [ ] Product Management (business value, roadmap fit)
- [ ] Engineering Leadership (technical feasibility, resources)
- [ ] Legal & Compliance (TOS compliance, data privacy)
- [ ] Security Team (data encryption, access control)
- [ ] Sales Leadership (lead quality expectations, CRM integration)

---

## Questions & Concerns?

**Winston (Architect)** is available for:
- Technical deep dives
- Architecture reviews
- Implementation guidance
- Risk assessment discussions

**Contact:** Via the BMAD Method workflow system

---

*"Good architecture is about balance: innovative where it matters, boring where it doesn't, and always built for evolution."* - Winston, Architect
