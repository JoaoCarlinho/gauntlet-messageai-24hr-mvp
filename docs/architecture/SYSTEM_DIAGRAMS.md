# Lead Generation System Diagrams

## 1. High-Level System Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                          MessageAI Platform                              │
│                                                                           │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │                    Frontend (React Native)                        │  │
│  │  • Campaign Dashboard  • Lead Management  • Analytics             │  │
│  └────────────────────────────┬─────────────────────────────────────┘  │
│                               │                                          │
│                               │ HTTPS/REST API                           │
│                               │                                          │
│  ┌────────────────────────────▼─────────────────────────────────────┐  │
│  │                    API Gateway (Express)                          │  │
│  │  • Authentication  • Rate Limiting  • Request Validation          │  │
│  └────────────────────────────┬─────────────────────────────────────┘  │
│                               │                                          │
│         ┌─────────────────────┼────────────────────┐                    │
│         │                     │                    │                    │
│         ▼                     ▼                    ▼                    │
│  ┌─────────────┐    ┌─────────────────┐   ┌──────────────┐            │
│  │ Prospecting │    │  Enrichment     │   │    Lead      │            │
│  │  Service    │───▶│   Service       │──▶│  Management  │            │
│  └──────┬──────┘    └────────┬────────┘   └──────────────┘            │
│         │                    │                                          │
│         │                    │                                          │
│  ┌──────▼────────────────────▼─────────────────────┐                   │
│  │            Background Job Queue (BullMQ)         │                   │
│  │  Queue: discovery | enrichment | scoring         │                   │
│  └──────────────────────┬───────────────────────────┘                   │
│                         │                                                │
│         ┌───────────────┼───────────────┐                               │
│         │               │               │                               │
│         ▼               ▼               ▼                               │
│  ┌───────────┐   ┌───────────┐   ┌───────────┐                        │
│  │ Worker 1  │   │ Worker 2  │   │ Worker 3  │                        │
│  │Discovery  │   │Enrichment │   │  Scoring  │                        │
│  └─────┬─────┘   └─────┬─────┘   └─────┬─────┘                        │
│        │               │               │                                │
└────────┼───────────────┼───────────────┼────────────────────────────────┘
         │               │               │
         │               │               │
┌────────▼───────────────▼───────────────▼────────────────────────────────┐
│                      External Integrations                                │
│                                                                           │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐                 │
│  │   LinkedIn   │  │   Facebook   │  │   Clearbit   │                 │
│  │Marketing API │  │Marketing API │  │  Enrichment  │                 │
│  └──────────────┘  └──────────────┘  └──────────────┘                 │
│                                                                           │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐                 │
│  │  Hunter.io   │  │  ZoomInfo    │  │   Pinecone   │                 │
│  │Email Finder  │  │  B2B Data    │  │ Vector Search│                 │
│  └──────────────┘  └──────────────┘  └──────────────┘                 │
│                                                                           │
└───────────────────────────────────────────────────────────────────────────┘
```

## 2. ICP to Prospect Matching Flow

```
┌─────────────────────────────────────────────────────────────────────┐
│ Step 1: ICP Retrieval                                                │
├─────────────────────────────────────────────────────────────────────┤
│                                                                       │
│  PostgreSQL                          Pinecone                        │
│  ┌────────────────┐                 ┌────────────────┐             │
│  │ ICP Record     │                 │ ICP Vector     │             │
│  │ • Demographics │                 │ [0.234, -0.567,│             │
│  │ • Firmographics│────────────────▶│  0.891, ...]   │             │
│  │ • Psychographics│                │ (1536 dims)    │             │
│  │ • Behaviors    │                 └────────────────┘             │
│  └────────────────┘                                                  │
│                                                                       │
└───────────────────────────┬───────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────────┐
│ Step 2: Search Criteria Translation                                 │
├─────────────────────────────────────────────────────────────────────┤
│                                                                       │
│  ICP Attributes              →        Platform Criteria             │
│  ───────────────────────────────────────────────────────────────    │
│  Job Titles: ["CTO", "VP"]  →  LinkedIn: titles=["CTO", "VP"]      │
│  Industry: "SaaS"            →  LinkedIn: industries=["SOFTWARE"]   │
│  Company Size: "50-200"      →  LinkedIn: companySize=["51-200"]    │
│  Location: "USA"             →  LinkedIn: locations=["US"]          │
│                                                                       │
│  Pain Points: ["scale"]      →  Keywords: ["scaling", "growth"]     │
│  Interests: ["DevOps"]       →  Facebook: interests=["DevOps"]      │
│                                                                       │
└───────────────────────────┬───────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────────┐
│ Step 3: Platform Search & Discovery                                 │
├─────────────────────────────────────────────────────────────────────┤
│                                                                       │
│  LinkedIn API                      Facebook API                      │
│  ┌─────────────────┐              ┌─────────────────┐              │
│  │ Search Results  │              │ Audience Results│              │
│  │ • 156 profiles  │              │ • 78 profiles   │              │
│  │ • Job titles    │              │ • Demographics  │              │
│  │ • Companies     │              │ • Interests     │              │
│  │ • Locations     │              │ • Behaviors     │              │
│  └─────────────────┘              └─────────────────┘              │
│           │                               │                          │
│           └───────────────┬───────────────┘                          │
│                           ▼                                          │
│                    Raw Prospect Data                                 │
│                    (234 total profiles)                              │
│                                                                       │
└───────────────────────────┬───────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────────┐
│ Step 4: Profile Vectorization                                       │
├─────────────────────────────────────────────────────────────────────┤
│                                                                       │
│  For each prospect:                                                  │
│  ┌──────────────────────────────────────────────────────┐          │
│  │ Profile Text Generation                               │          │
│  │                                                        │          │
│  │ "Senior Product Manager at TechCorp                   │          │
│  │  Location: San Francisco, CA                          │          │
│  │  Skills: Product strategy, agile, B2B                 │          │
│  │  Bio: Passionate about growth hacking and             │          │
│  │       customer success..."                            │          │
│  └────────────────────┬─────────────────────────────────┘          │
│                       │                                              │
│                       ▼                                              │
│              OpenAI Embedding API                                    │
│              text-embedding-ada-002                                  │
│                       │                                              │
│                       ▼                                              │
│         Prospect Vector: [0.241, -0.572, 0.885, ...]               │
│                                                                       │
└───────────────────────────┬───────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────────┐
│ Step 5: Semantic Similarity Scoring                                 │
├─────────────────────────────────────────────────────────────────────┤
│                                                                       │
│  Cosine Similarity Calculation                                       │
│  ┌────────────────────────────────────────────────────┐            │
│  │  ICP Vector:      [0.234, -0.567, 0.891, ...]      │            │
│  │  Prospect Vector: [0.241, -0.572, 0.885, ...]      │            │
│  │                                                      │            │
│  │  Similarity = dot(A, B) / (||A|| * ||B||)          │            │
│  │                                                      │            │
│  │  Result: 0.87  (87% match)                         │            │
│  └────────────────────────────────────────────────────┘            │
│                                                                       │
│  Weighted Scoring:                                                   │
│  • Demographics match:    30% × 0.90 = 0.27                         │
│  • Firmographics match:   25% × 0.85 = 0.21                         │
│  • Psychographics match:  25% × 0.88 = 0.22                         │
│  • Activity signals:      20% × 0.80 = 0.16                         │
│  ─────────────────────────────────────────                          │
│  Total Score: 0.86                                                   │
│                                                                       │
└───────────────────────────┬───────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────────┐
│ Step 6: Qualification & Enrichment                                  │
├─────────────────────────────────────────────────────────────────────┤
│                                                                       │
│  Score >= 0.75: High Quality → Auto-convert to Lead                 │
│  ┌──────────────────────────────────────────────────┐              │
│  │ Enrichment Pipeline                               │              │
│  │ ┌─────────────┐  ┌─────────────┐  ┌──────────┐ │              │
│  │ │  Clearbit   │→ │ Hunter.io   │→ │ Validate │ │              │
│  │ │Company Data │  │Find Email   │  │  Contact │ │              │
│  │ └─────────────┘  └─────────────┘  └──────────┘ │              │
│  └──────────────────────────────────────────────────┘              │
│                       │                                              │
│                       ▼                                              │
│             Qualified Lead Created                                   │
│             ✅ Ready for Outreach                                    │
│                                                                       │
│  Score 0.60-0.74: Medium → Manual Review Queue                      │
│  Score < 0.60: Low → Discard/Archive                                │
│                                                                       │
└─────────────────────────────────────────────────────────────────────┘
```

## 3. Data Storage Architecture

```
┌───────────────────────────────────────────────────────────────────┐
│                      PostgreSQL Database                           │
├───────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ┌──────────────┐       ┌──────────────────┐                     │
│  │     Team     │       │    Product       │                     │
│  │              │       │                  │                     │
│  │ • id         │──────▶│ • id             │                     │
│  │ • name       │       │ • teamId         │                     │
│  │ • slug       │       │ • name           │                     │
│  └──────────────┘       │ • description    │                     │
│                         │ • features       │                     │
│                         │ • pricing        │                     │
│                         └────────┬─────────┘                     │
│                                  │                                │
│                                  │                                │
│                         ┌────────▼─────────┐                     │
│                         │      ICP         │                     │
│                         │                  │                     │
│                         │ • id             │                     │
│                         │ • productId      │                     │
│                         │ • name           │                     │
│                         │ • demographics   │◀────────┐          │
│                         │ • firmographics  │         │          │
│                         │ • psychographics │         │          │
│                         │ • behaviors      │         │          │
│                         └────────┬─────────┘         │          │
│                                  │                    │          │
│                                  │                    │          │
│                         ┌────────▼──────────────┐    │          │
│                         │ ProspectingCampaign   │    │          │
│                         │                       │    │          │
│                         │ • id                  │    │          │
│                         │ • teamId              │    │          │
│                         │ • icpId               │────┘          │
│                         │ • name                │               │
│                         │ • platforms           │               │
│                         │ • searchCriteria      │               │
│                         │ • status              │               │
│                         │ • discoveredCount     │               │
│                         │ • qualifiedCount      │               │
│                         └────────┬──────────────┘               │
│                                  │                                │
│                                  │                                │
│                         ┌────────▼──────────────┐               │
│                         │     Prospect          │               │
│                         │                       │               │
│                         │ • id                  │               │
│                         │ • campaignId          │               │
│                         │ • platform            │               │
│                         │ • platformProfileId   │               │
│                         │ • profileUrl          │               │
│                         │ • name                │               │
│                         │ • headline            │               │
│                         │ • contactInfo         │               │
│                         │ • enrichmentData      │               │
│                         │ • icpMatchScore       │               │
│                         │ • qualityScore        │               │
│                         │ • status              │               │
│                         └────────┬──────────────┘               │
│                                  │                                │
│                                  │ (score >= 0.75)                │
│                                  │                                │
│                         ┌────────▼──────────────┐               │
│                         │       Lead            │               │
│                         │                       │               │
│                         │ • id                  │               │
│                         │ • prospectId          │               │
│                         │ • teamId              │               │
│                         │ • campaignId          │               │
│                         │ • source              │               │
│                         │ • status              │               │
│                         │ • score               │               │
│                         │ • contactInfo         │               │
│                         │ • companyInfo         │               │
│                         │ • enrichmentData      │               │
│                         │ • socialProfiles      │               │
│                         └───────────────────────┘               │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘

┌───────────────────────────────────────────────────────────────────┐
│                      Pinecone Vector Database                      │
├───────────────────────────────────────────────────────────────────┤
│                                                                     │
│  Namespace: team_{teamId}_ICPS                                     │
│  ┌─────────────────────────────────────────────────────┐          │
│  │ Vector ID: icp_{uuid}                                │          │
│  │ Vector: [0.234, -0.567, 0.891, ... ] (1536 dims)   │          │
│  │ Metadata:                                            │          │
│  │   • teamId: "team_123"                              │          │
│  │   • type: "icp"                                     │          │
│  │   • icpId: "icp_789"                                │          │
│  │   • productId: "prod_456"                           │          │
│  │   • name: "Enterprise SaaS Decision Maker"          │          │
│  │   • text: "ICP: Enterprise... Demographics: ..."    │          │
│  └─────────────────────────────────────────────────────┘          │
│                                                                     │
│  Supports:                                                          │
│  • Semantic search (find similar ICPs)                             │
│  • Cosine similarity scoring                                        │
│  • Metadata filtering                                               │
│  • High-performance vector operations                               │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘

┌───────────────────────────────────────────────────────────────────┐
│                         Redis Cache                                │
├───────────────────────────────────────────────────────────────────┤
│                                                                     │
│  Use Cases:                                                         │
│  • Rate limiting counters                                           │
│  • Job queue (BullMQ)                                               │
│  • Session storage                                                  │
│  • Enrichment result cache (30 days TTL)                           │
│  • API response cache (hot data)                                    │
│                                                                     │
│  Example Keys:                                                      │
│  rate_limit:linkedin:search:{teamId} → count                       │
│  enrichment:clearbit:{email} → cached result                       │
│  icp:vector:{icpId} → cached vector                                │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

## 4. Background Job Processing

```
┌─────────────────────────────────────────────────────────────────────┐
│                    BullMQ Job Queue Architecture                     │
├─────────────────────────────────────────────────────────────────────┤
│                                                                       │
│  ┌───────────────────────────────────────────────────────────────┐ │
│  │                      Queue: Discovery                          │ │
│  │  Priority: High                                                 │ │
│  │  Concurrency: 5 workers                                         │ │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐        │ │
│  │  │ Job: Search  │  │ Job: Search  │  │ Job: Scrape  │        │ │
│  │  │ LinkedIn     │  │ Facebook     │  │ Profile      │        │ │
│  │  │              │  │              │  │              │        │ │
│  │  │ campaignId   │  │ campaignId   │  │ profileUrl   │        │ │
│  │  │ criteria     │  │ criteria     │  │ platform     │        │ │
│  │  └──────────────┘  └──────────────┘  └──────────────┘        │ │
│  └───────────────────────────────────────────────────────────────┘ │
│                               │                                      │
│                               ▼                                      │
│  ┌───────────────────────────────────────────────────────────────┐ │
│  │                    Queue: Enrichment                           │ │
│  │  Priority: Medium                                               │ │
│  │  Concurrency: 10 workers                                        │ │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐        │ │
│  │  │ Job: Enrich  │  │ Job: Find    │  │ Job: Validate│        │ │
│  │  │ Clearbit     │  │ Email        │  │ Contact      │        │ │
│  │  │              │  │              │  │              │        │ │
│  │  │ prospectId   │  │ prospectId   │  │ email        │        │ │
│  │  │ provider     │  │ name, domain │  │ phone        │        │ │
│  │  └──────────────┘  └──────────────┘  └──────────────┘        │ │
│  └───────────────────────────────────────────────────────────────┘ │
│                               │                                      │
│                               ▼                                      │
│  ┌───────────────────────────────────────────────────────────────┐ │
│  │                      Queue: Scoring                            │ │
│  │  Priority: High                                                 │ │
│  │  Concurrency: 15 workers                                        │ │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐        │ │
│  │  │ Job: Vector  │  │ Job: Quality │  │ Job: Convert │        │ │
│  │  │ Similarity   │  │ Score        │  │ to Lead      │        │ │
│  │  │              │  │              │  │              │        │ │
│  │  │ prospectId   │  │ prospectId   │  │ prospectId   │        │ │
│  │  │ icpId        │  │ enrichedData │  │ score        │        │ │
│  │  └──────────────┘  └──────────────┘  └──────────────┘        │ │
│  └───────────────────────────────────────────────────────────────┘ │
│                                                                       │
│  Failed Jobs → Dead Letter Queue (manual review)                    │
│  Completed Jobs → Archived (30 days retention)                      │
│                                                                       │
└─────────────────────────────────────────────────────────────────────┘
```

## 5. Rate Limiting Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                     Distributed Rate Limiter                         │
├─────────────────────────────────────────────────────────────────────┤
│                                                                       │
│  Redis-backed Token Bucket Algorithm                                 │
│                                                                       │
│  ┌────────────────────────────────────────────────────────────┐    │
│  │  Platform: LinkedIn                                         │    │
│  │  ┌──────────────────────────────────────────────────────┐ │    │
│  │  │ Endpoint: search                                      │ │    │
│  │  │ Limit: 100 requests/hour                              │ │    │
│  │  │ Current: 47/100                                       │ │    │
│  │  │ Window: 2025-11-06 12:00 - 13:00                     │ │    │
│  │  │ Reset in: 23 minutes                                 │ │    │
│  │  └──────────────────────────────────────────────────────┘ │    │
│  │                                                             │    │
│  │  ┌──────────────────────────────────────────────────────┐ │    │
│  │  │ Endpoint: profile                                     │ │    │
│  │  │ Limit: 500 requests/hour                              │ │    │
│  │  │ Current: 234/500                                      │ │    │
│  │  └──────────────────────────────────────────────────────┘ │    │
│  └────────────────────────────────────────────────────────────┘    │
│                                                                       │
│  ┌────────────────────────────────────────────────────────────┐    │
│  │  Platform: Facebook                                         │    │
│  │  ┌──────────────────────────────────────────────────────┐ │    │
│  │  │ Endpoint: audience                                    │ │    │
│  │  │ Limit: 200 requests/hour                              │ │    │
│  │  │ Current: 89/200                                       │ │    │
│  │  └──────────────────────────────────────────────────────┘ │    │
│  └────────────────────────────────────────────────────────────┘    │
│                                                                       │
│  ┌────────────────────────────────────────────────────────────┐    │
│  │  Platform: Clearbit                                         │    │
│  │  ┌──────────────────────────────────────────────────────┐ │    │
│  │  │ Endpoint: enrich                                      │ │    │
│  │  │ Limit: 50 requests/hour                               │ │    │
│  │  │ Current: 38/50 ⚠️ Nearing limit                       │ │    │
│  │  └──────────────────────────────────────────────────────┘ │    │
│  └────────────────────────────────────────────────────────────┘    │
│                                                                       │
│  Retry Strategy:                                                      │
│  • Exponential backoff: 1s, 2s, 4s, 8s                              │
│  • Max retries: 3                                                     │
│  • Queue delayed jobs when limit reached                              │
│                                                                       │
└─────────────────────────────────────────────────────────────────────┘
```

## 6. Security Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                        Security Layers                               │
├─────────────────────────────────────────────────────────────────────┤
│                                                                       │
│  Layer 1: API Gateway Security                                       │
│  ┌───────────────────────────────────────────────────────────────┐ │
│  │ • JWT Authentication                                           │ │
│  │ • Role-based access control (RBAC)                            │ │
│  │ • Request rate limiting (per user/team)                       │ │
│  │ • Input validation (express-validator)                        │ │
│  │ • CORS policy enforcement                                     │ │
│  └───────────────────────────────────────────────────────────────┘ │
│                                                                       │
│  Layer 2: Data Encryption                                            │
│  ┌───────────────────────────────────────────────────────────────┐ │
│  │ At Rest:                                                       │ │
│  │ • PII encrypted (AES-256-GCM)                                 │ │
│  │ • Database encryption (PostgreSQL TDE)                        │ │
│  │ • S3 server-side encryption                                   │ │
│  │                                                                 │ │
│  │ In Transit:                                                     │ │
│  │ • TLS 1.3 for all API calls                                   │ │
│  │ • Certificate pinning (mobile app)                            │ │
│  └───────────────────────────────────────────────────────────────┘ │
│                                                                       │
│  Layer 3: Secrets Management                                         │
│  ┌───────────────────────────────────────────────────────────────┐ │
│  │ • AWS Secrets Manager for API keys                            │ │
│  │ • Environment-specific credentials                            │ │
│  │ • Automatic rotation (90 days)                                │ │
│  │ • Audit logging of secret access                              │ │
│  └───────────────────────────────────────────────────────────────┘ │
│                                                                       │
│  Layer 4: Access Control                                             │
│  ┌───────────────────────────────────────────────────────────────┐ │
│  │ Roles:                                                         │ │
│  │ • admin: Full access                                          │ │
│  │ • sales_manager: Team-level access                            │ │
│  │ • sales_rep: Assigned leads only                              │ │
│  │ • viewer: Read-only                                           │ │
│  │                                                                 │ │
│  │ Permissions:                                                    │ │
│  │ • create_campaign                                              │ │
│  │ • view_prospects                                               │ │
│  │ • export_data                                                  │ │
│  │ • delete_campaign                                              │ │
│  └───────────────────────────────────────────────────────────────┘ │
│                                                                       │
│  Layer 5: Compliance                                                 │
│  ┌───────────────────────────────────────────────────────────────┐ │
│  │ • GDPR: Right to deletion, data portability                   │ │
│  │ • CCPA: Opt-out mechanisms                                    │ │
│  │ • SOC 2: Audit trails, access logs                            │ │
│  │ • Data retention: 90-day auto-purge                           │ │
│  └───────────────────────────────────────────────────────────────┘ │
│                                                                       │
└─────────────────────────────────────────────────────────────────────┘
```

## 7. Monitoring & Observability

```
┌─────────────────────────────────────────────────────────────────────┐
│                    Monitoring Stack                                  │
├─────────────────────────────────────────────────────────────────────┤
│                                                                       │
│  Application Metrics (CloudWatch/Datadog)                            │
│  ┌───────────────────────────────────────────────────────────────┐ │
│  │ • Request rate, latency, error rate                           │ │
│  │ • API endpoint performance                                     │ │
│  │ • Database query performance                                   │ │
│  │ • Job queue metrics (pending, processing, failed)             │ │
│  │ • Worker utilization                                           │ │
│  └───────────────────────────────────────────────────────────────┘ │
│                                                                       │
│  Business Metrics (Custom Dashboard)                                 │
│  ┌───────────────────────────────────────────────────────────────┐ │
│  │ • Prospects discovered/hour                                    │ │
│  │ • Enrichment success rate                                      │ │
│  │ • Average ICP match score                                      │ │
│  │ • Lead conversion rate                                         │ │
│  │ • Cost per qualified lead                                      │ │
│  │ • Platform breakdown (LinkedIn vs Facebook)                    │ │
│  └───────────────────────────────────────────────────────────────┘ │
│                                                                       │
│  Error Tracking (Sentry)                                             │
│  ┌───────────────────────────────────────────────────────────────┐ │
│  │ • Exception tracking with stack traces                         │ │
│  │ • Error grouping and deduplication                             │ │
│  │ • Performance monitoring                                        │ │
│  │ • Release tracking                                              │ │
│  └───────────────────────────────────────────────────────────────┘ │
│                                                                       │
│  Logging (CloudWatch Logs/ELK)                                       │
│  ┌───────────────────────────────────────────────────────────────┐ │
│  │ Structured JSON logs with:                                     │ │
│  │ • Correlation IDs (trace requests)                             │ │
│  │ • Log levels (ERROR, WARN, INFO, DEBUG)                        │ │
│  │ • Contextual metadata                                           │ │
│  │ • Searchable fields                                             │ │
│  └───────────────────────────────────────────────────────────────┘ │
│                                                                       │
│  Alerting (PagerDuty/OpsGenie)                                       │
│  ┌───────────────────────────────────────────────────────────────┐ │
│  │ Critical:                                                       │ │
│  │ • API downtime > 5 minutes                                     │ │
│  │ • Error rate > 5%                                               │ │
│  │ • Database connection failures                                  │ │
│  │                                                                  │ │
│  │ Warning:                                                         │ │
│  │ • Response time > 3s (p95)                                     │ │
│  │ • Enrichment cost > $500/day                                   │ │
│  │ • Job queue backlog > 1000                                     │ │
│  └───────────────────────────────────────────────────────────────┘ │
│                                                                       │
└─────────────────────────────────────────────────────────────────────┘
```

---

*These diagrams provide a visual representation of the lead generation architecture. For detailed implementation specifics, refer to [LEAD_GENERATION_ARCHITECTURE.md](./LEAD_GENERATION_ARCHITECTURE.md).*
