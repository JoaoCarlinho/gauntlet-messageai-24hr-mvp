# MessageAI Sales Funnel - Development Task List & Checklist

**Repository**: `joaocarlinho/gauntlet-messageai-24hr-mvp`  
**Infrastructure Management**: Terraform for AWS  
**Current Status**: Core messaging features validated ✅  
**Focus**: Backend-first development, then frontend integration

---

## Project File Structure (Extended)

```
gauntlet-messageai-24hr-mvp/
├── .git/
├── .gitignore
├── README.md
├── package.json (root - workspace management)
├── .env.example
│
├── terraform/                       # AWS Infrastructure as Code
│   ├── main.tf
│   ├── variables.tf
│   ├── outputs.tf
│   ├── s3.tf                       # S3 buckets for media
│   ├── sqs.tf                      # SQS queues for webhooks
│   ├── lambda.tf                   # Lambda functions
│   ├── eventbridge.tf              # EventBridge schedules
│   ├── iam.tf                      # IAM roles and policies
│   └── terraform.tfvars.example
│
├── mobile/                          # React Native + Expo Frontend (Existing)
│   ├── app/
│   │   ├── (auth)/
│   │   │   ├── login.tsx
│   │   │   └── register.tsx
│   │   ├── (tabs)/
│   │   │   ├── _layout.tsx
│   │   │   ├── index.tsx           # Chat list
│   │   │   ├── leads.tsx           # NEW: Lead list
│   │   │   ├── campaigns.tsx       # NEW: Campaign dashboard
│   │   │   └── profile.tsx
│   │   ├── chat/
│   │   │   └── [id].tsx
│   │   ├── team/
│   │   │   ├── create.tsx          # NEW: Create team
│   │   │   └── settings.tsx        # NEW: Team settings
│   │   ├── products/
│   │   │   ├── list.tsx            # NEW: Product list
│   │   │   └── [id].tsx            # NEW: Product details
│   │   ├── ai-agents/
│   │   │   ├── product-definer.tsx # NEW: Product/ICP setup
│   │   │   ├── campaign-advisor.tsx # NEW: Campaign strategy
│   │   │   ├── content-generator.tsx # NEW: Content creation
│   │   │   └── performance-analyzer.tsx # NEW: Analytics
│   │   └── _layout.tsx
│   ├── components/
│   │   ├── chat/                   # Existing
│   │   ├── leads/                  # NEW
│   │   │   ├── LeadCard.tsx
│   │   │   ├── LeadDetailModal.tsx
│   │   │   └── LeadStatusBadge.tsx
│   │   ├── ai/                     # NEW
│   │   │   ├── ChatInterface.tsx
│   │   │   ├── StreamingMessage.tsx
│   │   │   ├── ThinkingIndicator.tsx
│   │   │   └── AgentAvatar.tsx
│   │   ├── campaigns/              # NEW
│   │   │   ├── CampaignCard.tsx
│   │   │   ├── MetricsChart.tsx
│   │   │   └── BudgetAllocation.tsx
│   │   └── ui/                     # Existing
│   ├── hooks/
│   │   ├── useAuth.ts              # Existing
│   │   ├── useSocket.ts            # Existing
│   │   ├── useLeads.ts             # NEW
│   │   ├── useAIAgent.ts           # NEW
│   │   ├── useCampaigns.ts         # NEW
│   │   └── useTeam.ts              # NEW
│   ├── lib/
│   │   ├── api.ts                  # Existing
│   │   ├── socket.ts               # Existing
│   │   ├── storage.ts              # Existing
│   │   └── streaming.ts            # NEW: SSE client
│   ├── store/
│   │   ├── auth.ts                 # Existing
│   │   ├── messages.ts             # Existing
│   │   ├── leads.ts                # NEW
│   │   ├── campaigns.ts            # NEW
│   │   ├── aiAgents.ts             # NEW
│   │   └── team.ts                 # NEW
│   ├── types/
│   │   └── index.ts                # Extended types
│   └── package.json
│
├── backend/                         # Node.js + Express API
│   ├── src/
│   │   ├── config/
│   │   │   ├── database.ts         # Existing
│   │   │   ├── socket.ts           # Existing
│   │   │   ├── aws.ts              # Existing
│   │   │   ├── pinecone.ts         # NEW: Vector DB config
│   │   │   ├── openai.ts           # NEW: OpenAI client
│   │   │   └── socialMedia.ts      # NEW: Platform API configs
│   │   ├── middleware/
│   │   │   ├── auth.ts             # Existing
│   │   │   ├── errorHandler.ts     # Existing
│   │   │   ├── validation.ts       # Existing
│   │   │   ├── teamAccess.ts       # NEW: Team-based auth
│   │   │   └── webhookVerification.ts # NEW
│   │   ├── routes/
│   │   │   ├── auth.routes.ts      # Existing
│   │   │   ├── users.routes.ts     # Existing
│   │   │   ├── conversations.routes.ts # Existing
│   │   │   ├── messages.routes.ts  # Existing
│   │   │   ├── teams.routes.ts     # NEW
│   │   │   ├── products.routes.ts  # NEW
│   │   │   ├── icps.routes.ts      # NEW
│   │   │   ├── campaigns.routes.ts # NEW
│   │   │   ├── leads.routes.ts     # NEW
│   │   │   ├── webhooks.routes.ts  # NEW
│   │   │   ├── aiAgents.routes.ts  # NEW
│   │   │   └── analytics.routes.ts # NEW
│   │   ├── controllers/
│   │   │   ├── auth.controller.ts  # Existing
│   │   │   ├── users.controller.ts # Existing
│   │   │   ├── conversations.controller.ts # Existing
│   │   │   ├── messages.controller.ts # Existing
│   │   │   ├── teams.controller.ts # NEW
│   │   │   ├── products.controller.ts # NEW
│   │   │   ├── campaigns.controller.ts # NEW
│   │   │   ├── leads.controller.ts # NEW
│   │   │   ├── webhooks.controller.ts # NEW
│   │   │   └── aiAgents.controller.ts # NEW
│   │   ├── services/
│   │   │   ├── auth.service.ts     # Existing
│   │   │   ├── message.service.ts  # Existing
│   │   │   ├── presence.service.ts # Existing
│   │   │   ├── s3.service.ts       # Existing
│   │   │   ├── teams.service.ts    # NEW
│   │   │   ├── products.service.ts # NEW
│   │   │   ├── leads.service.ts    # NEW
│   │   │   ├── campaigns.service.ts # NEW
│   │   │   ├── vectorDb.service.ts # NEW
│   │   │   ├── embedding.service.ts # NEW
│   │   │   ├── socialMedia.service.ts # NEW
│   │   │   └── aiAgents/           # NEW
│   │   │       ├── productDefiner.service.ts
│   │   │       ├── campaignAdvisor.service.ts
│   │   │       ├── contentGenerator.service.ts
│   │   │       ├── discoveryBot.service.ts
│   │   │       └── performanceAnalyzer.service.ts
│   │   ├── socket/
│   │   │   ├── handlers/
│   │   │   │   ├── message.handler.ts # Existing
│   │   │   │   ├── presence.handler.ts # Existing
│   │   │   │   ├── typing.handler.ts # Existing
│   │   │   │   └── leads.handler.ts # NEW
│   │   │   └── index.ts
│   │   ├── types/
│   │   │   └── index.ts
│   │   ├── utils/
│   │   │   ├── jwt.ts              # Existing
│   │   │   ├── validators.ts       # Existing
│   │   │   ├── prompts.ts          # NEW: AI system prompts
│   │   │   └── streaming.ts        # NEW: SSE helpers
│   │   └── index.ts
│   ├── prisma/
│   │   ├── schema.prisma           # Extended schema
│   │   ├── migrations/
│   │   └── seed.ts                 # NEW: Seed data
│   ├── package.json
│   ├── tsconfig.json
│   ├── .env
│   └── .env.example
│
├── aws-lambdas/                     # AWS Lambda Functions
│   ├── webhook-processor/          # NEW
│   │   ├── index.ts
│   │   ├── package.json
│   │   └── README.md
│   ├── metrics-sync/               # NEW
│   │   ├── index.ts
│   │   ├── package.json
│   │   └── README.md
│   ├── notification-worker/        # Existing (enhanced)
│   │   ├── index.ts
│   │   └── package.json
│   └── performance-reporter/       # NEW
│       ├── index.ts
│       ├── package.json
│       └── README.md
│
└── docs/                           # Documentation
    ├── API.md                      # API documentation
    ├── ARCHITECTURE.md             # System architecture
    ├── AI_AGENTS.md                # AI agent specifications
    └── DEPLOYMENT.md               # Deployment guide
```

---

## Phase 0: Pre-Development Setup (Manual Configuration Required)

### ⚠️ **YOUR ACTION REQUIRED**: Enhanced Platform Setup

#### Task 0.1: AWS Infrastructure with Terraform ✅ **COMPLETED**
**Description**: Set up AWS infrastructure using Terraform  
**Your Actions**:
- [x] Install Terraform: `brew install terraform` (Mac) or download from terraform.io
- [x] Configure AWS CLI: `aws configure`
  - Enter AWS Access Key ID
  - Enter AWS Secret Access Key
  - Default region: `us-east-1`
- [x] Create Terraform configuration files (see structure above)
- [x] Initialize Terraform: `cd terraform && terraform init`
- [x] Review planned changes: `terraform plan`
- [x] Apply infrastructure: `terraform apply`
- [x] Note outputs (S3 bucket names, SQS URLs, Lambda ARNs)

**✅ COMPLETED RESOURCES**:
- S3 Buckets: `messageai-media-8949ab32`, `messageai-content-library-production-b44e574f`, `messageai-artifacts-dab87024`
- SQS Queues: `messageai-webhook-queue-production`, `messageai-webhook-dlq-production`, `messageai-metrics-queue-production`, `messageai-performance-queue-production`, `messageai-notification-queue-production`
- Lambda Functions: `messageai-webhook-processor-production`, `messageai-metrics-sync-production`, `messageai-performance-reporter-production`, `messageai-placeholder-production`
- EventBridge Rules: `messageai-daily-metrics-sync-production`, `messageai-weekly-report-production`

**Files Created**:
- `terraform/main.tf`
- `terraform/variables.tf`
- `terraform/outputs.tf`
- `terraform/s3.tf`
- `terraform/sqs.tf`
- `terraform/lambda.tf`
- `terraform/iam.tf`
- `terraform/terraform.tfvars`

**Terraform Resources to Create**:
```hcl
# S3 Buckets
- messageai-media-{env}
- messageai-content-library-{env}

# SQS Queues
- messageai-webhook-queue
- messageai-webhook-dlq
- messageai-metrics-queue
- messageai-notification-queue

# Lambda Functions
- messageai-webhook-processor
- messageai-metrics-sync
- messageai-notification-worker
- messageai-performance-reporter

# EventBridge Rules
- messageai-daily-metrics-sync
- messageai-weekly-report
```

---

#### Task 0.2: Pinecone Vector Database Setup ✅ **COMPLETED**
**Description**: Set up managed vector database for semantic search  
**Your Actions**:
- [x] Sign up at https://www.pinecone.io
- [x] Create new project: "MessageAI"
- [x] Create index:
  - Name: `messageai-production`
  - Dimensions: 1536 (for OpenAI embeddings)
  - Metric: cosine
  - Type: Serverless (AWS us-east-1)
- [x] Note down:
  - `PINECONE_API_KEY`
  - `PINECONE_ENVIRONMENT` (e.g., `us-east1-gcp`)
  - `PINECONE_INDEX_NAME`

**✅ COMPLETED RESOURCES**:
- Pinecone Index: `messageai-production`
- Host: `messageai-production-046upaa.svc.aped-4627-b74a.pinecone.io`
- Dimensions: 1536 (OpenAI text-embedding-3-small compatible)
- Metric: cosine
- Type: Serverless (cost-efficient)
- Region: AWS us-east-1

**⚠️ NOTE ON BACKUP COLLECTION**:
- Collections cannot be created from serverless indexes (Pinecone limitation)
- Serverless indexes have automatic backups handled by Pinecone
- No manual collection setup required for serverless deployment

**Environment Variables to Save**:
```
PINECONE_API_KEY=*****
PINECONE_ENVIRONMENT=**********
PINECONE_INDEX_NAME=messageai-production
```

---

#### Task 0.3: OpenAI API Setup ✅ **COMPLETED**
**Description**: Configure OpenAI for LLM and embeddings  
**Your Actions**:
- [x] Sign up at https://platform.openai.com
- [x] Generate API key: Settings > API Keys > Create New Key
- [x] Set up billing: Add payment method
- [x] Set usage limits: $50/month soft limit, $100/month hard limit
- [x] Note down `OPENAI_API_KEY`

**✅ COMPLETED RESOURCES**:
- OpenAI API Key: Configured and ready for use
- Billing: Set up and active
- Usage Limits: Configured for production use

**Environment Variables to Save**:
```
OPENAI_API_KEY=****************
OPENAI_MODEL=gpt-4-turbo-preview
OPENAI_EMBEDDING_MODEL=text-embedding-3-small
```

---

#### Task 0.4: Social Media Platform API Access

##### Facebook/Instagram (Meta) 🔄 **PARTIALLY COMPLETED**
**Your Actions**:
- [x] Go to https://developers.facebook.com
- [x] Create new app: Type = Business
- [x] Add Products: Marketing API, Webhooks
- [x] Get App ID and App Secret
- [x] Set up webhook subscriptions for Lead Ads (requires backend endpoint)
- [x] Generate System User Access Token
- [x] Note webhook verification token

**✅ COMPLETED RESOURCES**:
- Facebook App: Created and configured
- App ID: Retrieved and stored
- App Secret: Retrieved and stored
- Access Token: Generated and stored

**⚠️ REMAINING TASKS**:
- Webhook subscriptions for Lead Ads need to be configured
- System User Access Token needs to be generated
- Webhook verification token: Generated and configured
- Backend webhook endpoint needs to be created (will be implemented in Phase 2)

**Environment Variables**:
```
FACEBOOK_APP_ID=****************
FACEBOOK_APP_SECRET=****************
FACEBOOK_ACCESS_TOKEN=****************
FACEBOOK_WEBHOOK_VERIFY_TOKEN=****************
```

**📝 WEBHOOK URL FORMAT**:
- Webhook URL will be: `https://your-backend-domain.com/api/v1/webhooks/facebook`
- This endpoint will be created in Phase 2 (PR #6: Webhook Receiver Infrastructure)
- Facebook will send POST requests to this URL when leads are generated

##### LinkedIn
**Your Actions**:
- [ ] Go to https://www.linkedin.com/developers/apps
- [ ] Create new app
- [ ] Request Marketing API access
- [ ] Add OAuth 2.0 scopes: `r_ads`, `r_liteprofile`, `w_member_social`
- [ ] Set up Lead Gen Forms webhook (requires backend endpoint)
- [ ] Note client ID and secret

**Environment Variables**:
```
LINKEDIN_CLIENT_ID=<client-id>
LINKEDIN_CLIENT_SECRET=<client-secret>
LINKEDIN_ACCESS_TOKEN=<token>
```

**📝 WEBHOOK URL FORMAT**:
- Webhook URL will be: `https://your-backend-domain.com/api/v1/webhooks/linkedin`
- This endpoint will be created in Phase 2 (PR #6: Webhook Receiver Infrastructure)

##### TikTok
**Your Actions**:
- [ ] Go to https://ads.tiktok.com/marketing_api/docs
- [ ] Apply for API access
- [ ] Create app and get credentials
- [ ] Set up Lead Generation webhook (requires backend endpoint)

**Environment Variables**:
```
TIKTOK_APP_ID=<app-id>
TIKTOK_APP_SECRET=<app-secret>
TIKTOK_ACCESS_TOKEN=<token>
```

**📝 WEBHOOK URL FORMAT**:
- Webhook URL will be: `https://your-backend-domain.com/api/v1/webhooks/tiktok`
- This endpoint will be created in Phase 2 (PR #6: Webhook Receiver Infrastructure)

##### X (Twitter)
**Your Actions**:
- [ ] Go to https://developer.twitter.com
- [ ] Create project and app
- [ ] Enable OAuth 2.0
- [ ] Get API Key and Secret

**Environment Variables**:
```
X_API_KEY=<api-key>
X_API_SECRET=<api-secret>
X_ACCESS_TOKEN=<token>
```

**📝 WEBHOOK URL FORMAT**:
- Webhook URL will be: `https://your-backend-domain.com/api/v1/webhooks/x`
- This endpoint will be created in Phase 2 (PR #6: Webhook Receiver Infrastructure)

---

#### Task 0.5: Existing Platform Verification
**Description**: Verify existing setups are still working  
**Your Actions**:
- [ ] Verify Railway deployment is active
- [ ] Verify PostgreSQL database is accessible
- [ ] Verify AWS S3 bucket for media exists
- [ ] Verify Expo account is active
- [ ] Test mobile app connects to backend

### PR #6: Webhook Receiver Infrastructure

#### Task 6.1: Create Webhook Verification Middleware
**Description**: Verify webhook signatures from social platforms  
**Git Actions**:
```bash
git checkout master && git pull
git checkout -b feature/webhook-infrastructure
```

**Files Created**:
- `backend/src/middleware/webhookVerification.ts`

**Implementation Steps**:
- [x] `verifyFacebookSignature(req, secret)` - Validate FB webhook
- [x] `verifyLinkedInSignature(req, secret)` - Validate LinkedIn webhook
- [x] `verifyTikTokSignature(req, secret)` - Validate TikTok webhook
- [x] Return 401 if signature invalid
- [x] Log all webhook attempts for security

---

#### Task 6.2: Create Webhook Service
**Description**: Process and normalize webhook payloads  
**Files Created**:
- `backend/src/services/webhooks.service.ts`

**Implementation Steps**:
- [x] `processFacebookLeadWebhook(payload)` - Parse FB lead data
- [x] `processLinkedInLeadWebhook(payload)` - Parse LinkedIn lead
- [x] `processTikTokLeadWebhook(payload)` - Parse TikTok lead
- [x] `normalizeLeadData(rawData, platform)` - Standardize format
- [x] `logWebhook(platform, eventType, payload)` - Audit trail
- [x] `queueLeadProcessing(leadData)` - Send to SQS for async processing
- [x] Deduplication logic (check if lead already exists)

---

#### Task 6.3: Create Webhook Controller
**Description**: Webhook endpoint handlers  
**Files Created**:
- `backend/src/controllers/webhooks.controller.ts`

**Implementation Steps**:
- [x] POST `/api/v1/webhooks/facebook` - Receive FB webhooks
- [x] GET `/api/v1/webhooks/facebook` - Verification endpoint
- [x] POST `/api/v1/webhooks/linkedin` - Receive LinkedIn webhooks
- [x] POST `/api/v1/webhooks/tiktok` - Receive TikTok webhooks
- [x] POST `/api/v1/webhooks/x` - Receive X webhooks
- [x] Respond with 200 OK immediately
- [x] Process async via SQS

---

#### Task 6.4: Create Webhook Routes
**Files Created**:
- `backend/src/routes/webhooks.routes.ts`

**Files Modified**:
- `backend/src/index.ts`

**Implementation Steps**:
- [x] Define webhook routes (PUBLIC, no auth)
- [x] Add webhook verification middleware
- [x] Use raw body parser for signature verification
- [x] Mount under `/api/v1/webhooks`

---

#### Task 6.5: Configure SQS Queue Client
**Description**: Send webhook payloads to SQS for processing  
**Files Modified**:
- `backend/src/config/aws.ts`

**Implementation Steps**:
- [x] Configure SQS client with credentials
- [x] `sendMessageToQueue(queueUrl, messageBody)` - Send to SQS
- [x] `sendBatchMessages(queueUrl, messages[])` - Batch send
- [x] Handle errors and retry logic

---

#### Task 6.6: Test Webhook Receiving ✅ **COMPLETED**
**Your Actions**:
- [x] Deploy backend to production (Railway) - **COMPLETED**
- [x] Test webhook health endpoint: `GET https://gauntlet-messageai-24hr-mvp-production.up.railway.app/api/v1/webhooks/health` - **COMPLETED**
- [x] Test webhook verification endpoint: `GET https://gauntlet-messageai-24hr-mvp-production.up.railway.app/api/v1/webhooks/facebook?hub.mode=subscribe&hub.verify_token=YOUR_TOKEN&hub.challenge=test` - **COMPLETED**
- [x] Configure Railway environment variables for Facebook API access - **COMPLETED**
- [x] Verify webhook infrastructure is ready for production use - **COMPLETED**
- [ ] Configure Facebook webhook URL to production endpoint (requires Facebook app configuration)
- [ ] Trigger test lead form submission on Facebook (requires Facebook app setup)
- [ ] Verify webhook received and logged in production logs (pending Facebook setup)
- [ ] Verify message sent to SQS queue (pending Facebook setup)
- [ ] Check SQS console for message processing (pending Facebook setup)

**Status**: Webhook infrastructure successfully deployed to Railway production. Facebook webhook verification endpoint working correctly with proper environment variables. Infrastructure ready for production use.

**Completed Infrastructure**:
- ✅ Webhook health endpoint: Working
- ✅ Facebook webhook verification endpoint: Working (returns challenge token correctly)
- ✅ Environment variables: Configured in Railway
- ✅ SQS infrastructure: Deployed and ready
- ✅ Lambda functions: Deployed and ready

**Next Steps**: Configure Facebook app webhook URL to point to production endpoint and test with actual lead form submissions.

---

#### Task 6.7: Commit and Create PR #6 ✅ **COMPLETED**
**Git Actions**:
```bash
git add .
git commit -m "feat: Add webhook receiver infrastructure with SQS queueing"
git push origin feature/webhook-infrastructure
```
**Your Actions**:
- [x] Create feature branch: `feature/webhook-infrastructure` - **COMPLETED**
- [x] Add all changes to git - **COMPLETED**
- [x] Commit with message: "feat: Add webhook receiver infrastructure with SQS queueing" - **COMPLETED**
- [x] Push to origin: `feature/webhook-infrastructure` - **COMPLETED**
- [x] Create PR #6: "Webhook Infrastructure" - **COMPLETED** (PR #33)
- [x] Merge to master

**Status**: Feature branch created and pushed successfully. Ready for PR creation.

**GitHub PR Link**: https://github.com/JoaoCarlinho/gauntlet-messageai-24hr-mvp/pull/33

---

## Phase 1: Backend Infrastructure - Database Schema & Core Services

### PR #1: Extended Database Schema for Sales Funnel

#### Task 1.1: Update Prisma Schema with New Models ✅ **COMPLETED**
**Description**: Add all new tables for teams, products, campaigns, leads  
**Git Actions**:
```bash
cd gauntlet-messageai-24hr-mvp
git checkout master
git pull
git checkout -b feature/sales-funnel-schema
```
**Status**: ✅ Schema updated with all sales funnel models

**Files Modified**:
- `backend/prisma/schema.prisma`

**Implementation Steps**:
- [x] Add Team model with name and slug
- [x] Add TeamMember model with role-based access
- [x] Add Product model with features, pricing, USPs (JSON fields)
- [x] Add ICP model with demographics, firmographics, psychographics (JSON fields)
- [x] Add Campaign model with platforms, budget, targeting strategy
- [x] Add AdCreative model for marketing content
- [x] Add Lead model with status, qualification score
- [x] Add DiscoverySession model with transcript and AI summary
- [x] Add LeadActivity model for activity tracking
- [x] Add CampaignMetric model for performance data
- [x] Add AIAgentConversation model for agent chat history
- [x] Add WebhookLog model for webhook audit trail
- [x] Add indexes for teamId, userId, campaignId, leadId
- [x] Add foreign key relations with CASCADE deletes
- [x] Add @@unique constraints where needed

**Models Added**:
- ✅ Team (with soft delete support)
- ✅ TeamMember (role-based access)
- ✅ Product (with JSON fields for features, pricing, USPs)
- ✅ ICP (with JSON fields for demographics, firmographics, psychographics, behaviors)
- ✅ Campaign (with platform arrays and targeting strategy)
- ✅ AdCreative (platform-specific marketing content)
- ✅ Lead (with qualification scoring and status tracking)
- ✅ DiscoverySession (AI conversation tracking)
- ✅ LeadActivity (activity logging)
- ✅ CampaignMetric (performance data with daily tracking)
- ✅ AIAgentConversation (AI agent chat history)
- ✅ WebhookLog (webhook audit trail)

**Schema Extensions**:
```prisma
model User {
  // Existing fields...
  teamMemberships   TeamMember[]
  aiConversations   AIAgentConversation[]
  leadActivities    LeadActivity[]
  assignedLeads     Lead[]
}
```

---

#### Task 1.2: Create and Run Migration 🔄 **IN PROGRESS**
**Description**: Generate migration and apply to Railway database  
**Your Actions**:
- [x] Generate Prisma Client: `npx prisma generate` - **COMPLETED**
- [x] Commit schema changes to feature branch - **COMPLETED**
- [x] Create PR #34 for schema changes - **COMPLETED**
- [x] Merge PR to trigger deployment and migration
- [x] Verify tables in Railway PostgreSQL dashboard

**Status**: Schema committed and PR created. Ready for merge to trigger deployment.

**Files Created**:
- `backend/prisma/migrations/YYYYMMDDHHMMSS_sales_funnel_schema/migration.sql` (will be generated on deployment)

**PR Link**: https://github.com/JoaoCarlinho/gauntlet-messageai-24hr-mvp/pull/34

**Next Steps**: Merge PR #34 to trigger Railway deployment, which will automatically apply the migration.

---

#### Task 1.3: Create Seed Data Script
**Description**: Seed database with sample teams, products for testing  
**Files Created**:
- `backend/prisma/seed.ts`

**Implementation Steps**:
- [ ] Create sample team: "Acme Sales Team"
- [ ] Create sample user with admin role
- [ ] Create sample product: "Executive Coaching"
- [ ] Create sample ICP for product
- [ ] Create sample campaign with metrics
- [ ] Create sample leads (new, qualified, closed)
- [ ] Add script to package.json: `"seed": "ts-node prisma/seed.ts"`

---

#### Task 1.4: Commit and Create PR #1
**Git Actions**:
```bash
git add .
git commit -m "feat: Add extended database schema for sales funnel with teams, products, campaigns, leads"
git push origin feature/sales-funnel-schema
```
**Your Actions**:
- [ ] Create PR #1: "Sales Funnel Database Schema"
- [ ] Review schema changes
- [ ] Merge to master

---

### PR #2: Team Management & Multi-Tenancy

#### Task 2.1: Create Team Service
**Description**: Implement team CRUD operations with data isolation  
**Git Actions**:
```bash
git checkout master && git pull
git checkout -b feature/team-management
```

**Files Created**:
- `backend/src/services/teams.service.ts`

**Implementation Steps**:
- [x] `createTeam(name, slug, creatorUserId)` - Create team and add creator as admin
- [x] `getTeamById(teamId, userId)` - Get team details (verify user is member)
- [v] `getUserTeams(userId)` - List all teams user belongs to
- [x] `updateTeam(teamId, data, userId)` - Update team (admin only)
- [x] `deleteTeam(teamId, userId)` - Soft delete team (admin only)
- [x] `addTeamMember(teamId, userId, role)` - Add member to team
- [x] `removeTeamMember(teamId, memberId)` - Remove member
- [x] `updateMemberRole(teamId, memberId, newRole)` - Change member role
- [x] `getTeamMembers(teamId)` - List all team members

---

#### Task 2.2: Create Team Access Middleware
**Description**: Middleware to enforce team-based data access  
**Files Created**:
- `backend/src/middleware/teamAccess.ts`

**Implementation Steps**:
- [x] `requireTeamMember` - Verify user belongs to team
- [x] `requireTeamAdmin` - Verify user is team admin
- [x] `requireTeamRole(role)` - Verify user has specific role
- [x] Extract teamId from request params or body
- [x] Add team info to request object for downstream use
- [x] Return 403 Forbidden if access denied

---

#### Task 2.3: Create Team Controller
**Description**: REST endpoints for team management  
**Files Created**:
- `backend/src/controllers/teams.controller.ts`

**Implementation Steps**:
- [x] POST `/api/v1/teams` - Create team
- [x] GET `/api/v1/teams` - List user's teams
- [x] GET `/api/v1/teams/:id` - Get team details
- [x] PUT `/api/v1/teams/:id` - Update team
- [x] DELETE `/api/v1/teams/:id` - Delete team
- [x] GET `/api/v1/teams/:id/members` - List members
- [x] POST `/api/v1/teams/:id/members` - Add member
- [x] DELETE `/api/v1/teams/:id/members/:userId` - Remove member
- [x] PUT `/api/v1/teams/:id/members/:userId` - Update member role

---

#### Task 2.4: Create Team Routes
**Description**: Mount team endpoints with auth middleware  
**Files Created**:
- `backend/src/routes/teams.routes.ts`

**Files Modified**:
- `backend/src/index.ts` (mount routes)

**Implementation Steps**:
- [x] Define team routes with auth middleware
- [x] Add team access middleware to protected routes
- [x] Add validation middleware for inputs
- [x] Mount under `/api/v1/teams`

---

#### Task 2.5: Update User Model Relations
**Description**: Add team context to user operations  
**Files Modified**:
- `backend/src/services/auth.service.ts`
- `backend/src/controllers/users.controller.ts`

**Implementation Steps**:
- [x] On user registration, optionally create default team
- [x] Include team memberships in user profile response
- [x] Add endpoint to switch active team context

---

#### Task 2.6: Test Team Management
**Description**: Verify team CRUD and access control  
**Your Actions**:
- [ ] Create team via API
- [ ] Add members with different roles
- [ ] Verify admin can update team
- [ ] Verify non-admin cannot update team
- [ ] Verify member can view team data
- [ ] Verify non-member gets 403

---

#### Task 2.7: Commit and Create PR #2
**Git Actions**:
```bash
git add .
git commit -m "feat: Add team management with role-based access control"
git push origin feature/team-management
```
**Your Actions**:
- [x] Create PR #2: "Team Management & Multi-Tenancy"
- [x] Merge to master

---

### PR #3: Vector Database Integration (Pinecone)

#### Task 3.1: Set Up Pinecone Client
**Description**: Configure Pinecone SDK for vector storage and search  
**Git Actions**:
```bash
git checkout master && git pull
git checkout -b feature/vector-database
```

**Files Created**:
- `backend/src/config/pinecone.ts`

**Implementation Steps**:
- [x] Install Pinecone SDK: `npm install @pinecone-database/pinecone`
- [x] Initialize Pinecone client with API key
- [x] Configure index connection
- [x] Export client for use in services
- [x] Add connection health check

**Dependencies**:
```bash
cd backend
npm install @pinecone-database/pinecone
```

---

#### Task 3.2: Create Embedding Service
**Description**: Generate embeddings using OpenAI  
**Files Created**:
- `backend/src/services/embedding.service.ts`
- `backend/src/config/openai.ts`

**Implementation Steps**:
- [x] Install OpenAI SDK: `npm install openai`
- [x] Configure OpenAI client
- [x] `generateEmbedding(text)` - Create vector embedding
- [x] `generateBatchEmbeddings(texts[])` - Batch processing
- [x] Handle rate limiting with retry logic
- [x] Cache embeddings for identical texts

---

#### Task 3.3: Create Vector Database Service
**Description**: CRUD operations for vector storage  
**Files Created**:
- `backend/src/services/vectorDb.service.ts`

**Implementation Steps**:
- [x] `upsertVector(namespace, id, vector, metadata)` - Store vector
- [x] `upsertBatch(namespace, vectors[])` - Bulk insert
- [x] `queryVectors(namespace, queryVector, topK, filter)` - Semantic search
- [x] `deleteVector(namespace, id)` - Remove vector
- [x] `deleteNamespace(namespace)` - Clear team data
- [x] Helper: `vectorizeAndStore(text, namespace, id, metadata)` - End-to-end
- [x] Helper: `searchByText(text, namespace, topK, filter)` - Query by text

**Namespace Strategy**:
```
team_{teamId}_products
team_{teamId}_icps
team_{teamId}_campaigns
team_{teamId}_discovery
```

---

#### Task 3.4: Test Vector Storage and Retrieval
**Description**: Verify embeddings work correctly  
**Your Actions**:
- [ ] Store sample product description
- [ ] Query with similar text
- [ ] Verify results include stored product
- [ ] Test namespace isolation (different teams)
- [ ] Test metadata filtering

---

#### Task 3.5: Commit and Create PR #3
**Git Actions**:
```bash
git add .
git commit -m "feat: Integrate Pinecone vector database with OpenAI embeddings"
git push origin feature/vector-database
```
**Your Actions**:
- [x] Create PR #3: "Vector Database Integration"
- [x] Merge to master

---

### PR #4: Product & ICP Management (Data Layer)

#### Task 4.1: Create Product Service
**Description**: Business logic for product management  
**Git Actions**:
```bash
git checkout master && git pull
git checkout -b feature/product-management
```

**Files Created**:
- `backend/src/services/products.service.ts`

**Implementation Steps**:
- [x] `createProduct(teamId, data)` - Create product, vectorize description
- [x] `getProduct(productId, teamId)` - Get product details
- [v] `listProducts(teamId)` - List team's products
- [x] `updateProduct(productId, teamId, data)` - Update and re-vectorize
- [x] `deleteProduct(productId, teamId)` - Delete product and vectors
- [x] `searchProducts(teamId, query)` - Semantic search across products
- [x] Vectorize: name, description, features, USPs
- [x] Store vectors in `team_{teamId}_products` namespace

---

#### Task 4.2: Create ICP Service
**Description**: Business logic for ICP management  
**Files Created**:
- `backend/src/services/icps.service.ts`

**Implementation Steps**:
- [x] `createICP(productId, teamId, data)` - Create ICP, vectorize attributes
- [x] `getICP(icpId, teamId)` - Get ICP details
- [x] `listICPs(productId, teamId)` - List ICPs for product
- [x] `updateICP(icpId, teamId, data)` - Update and re-vectorize
- [x] `deleteICP(icpId, teamId)` - Delete ICP and vectors
- [x] Vectorize: pain points, goals, industry, job titles
- [x] Store vectors in `team_{teamId}_icps` namespace

---

#### Task 4.3: Create Product Controller
**Description**: REST endpoints for products  
**Files Created**:
- `backend/src/controllers/products.controller.ts`

**Implementation Steps**:
- [x] POST `/api/v1/products` - Create product
- [x] GET `/api/v1/products` - List team's products
- [x] GET `/api/v1/products/:id` - Get product
- [x] PUT `/api/v1/products/:id` - Update product
- [x] DELETE `/api/v1/products/:id` - Delete product
- [x] GET `/api/v1/products/search?q=query` - Search products

---

#### Task 4.4: Create ICP Routes
**Description**: REST endpoints for ICPs  
**Files Created**:
- `backend/src/routes/icps.routes.ts`
- `backend/src/controllers/icps.controller.ts`

**Files Modified**:
- `backend/src/routes/products.routes.ts` (nest ICP routes)

**Implementation Steps**:
- [x] POST `/api/v1/products/:productId/icps` - Create ICP
- [x] GET `/api/v1/products/:productId/icps` - List ICPs
- [x] GET `/api/v1/icps/:id` - Get ICP
- [x] PUT `/api/v1/icps/:id` - Update ICP
- [x] DELETE `/api/v1/icps/:id` - Delete ICP

---

#### Task 4.5: Add Routes and Test
**Files Modified**:
- `backend/src/index.ts`

**Your Actions**:
- [x] Mount product routes
- [ ] Test create product
- [ ] Test create ICP for product
- [ ] Test semantic search for products
- [ ] Verify vectors stored in Pinecone dashboard

---

#### Task 4.6: Commit and Create PR #4
**Git Actions**:
```bash
git add .
git commit -m "feat: Add product and ICP management with vector storage"
git push origin feature/product-management
```
**Your Actions**:
- [x] Create PR #4: "Product & ICP Management"
- [x] Merge to master

---

### PR #5: Campaign Management (Data Layer)

#### Task 5.1: Create Campaign Service
**Description**: Campaign CRUD and metrics storage  
**Git Actions**:
```bash
git checkout master && git pull
git checkout -b feature/campaign-management
```

**Files Created**:
- `backend/src/services/campaigns.service.ts`

**Implementation Steps**:
- [x] `createCampaign(teamId, data)` - Create campaign
- [x] `getCampaign(campaignId, teamId)` - Get campaign details
- [x] `listCampaigns(teamId, filters)` - List campaigns with filters
- [x] `updateCampaign(campaignId, teamId, data)` - Update campaign
- [x] `deleteCampaign(campaignId, teamId)` - Delete campaign
- [x] `addMetrics(campaignId, metricsData)` - Store daily metrics
- [x] `getMetrics(campaignId, dateRange)` - Retrieve metrics
- [x] `calculateROI(campaignId)` - Calculate campaign ROI
- [x] `updateCampaignStatus(campaignId, status)` - Active/paused/completed

---

#### Task 5.2: Create Ad Creative Service
**Description**: Manage marketing content for campaigns  
**Files Created**:
- `backend/src/services/adCreatives.service.ts`

**Implementation Steps**:
- [x] `createAdCreative(campaignId, teamId, data)` - Store ad content
- [x] `listAdCreatives(campaignId, platform)` - Get creatives by platform
- [x] `updateAdCreative(creativeId, teamId, data)` - Update creative
- [x] `deleteAdCreative(creativeId, teamId)` - Remove creative
- [x] Store creative copy in vector database for similarity search

---

#### Task 5.3: Create Campaign Controller
**Description**: REST endpoints for campaign management  
**Files Created**:
- `backend/src/controllers/campaigns.controller.ts`

**Implementation Steps**:
- [ ] POST `/api/v1/campaigns` - Create campaign
- [ ] GET `/api/v1/campaigns` - List campaigns (with filters)
- [ ] GET `/api/v1/campaigns/:id` - Get campaign details
- [ ] PUT `/api/v1/campaigns/:id` - Update campaign
- [ ] DELETE `/api/v1/campaigns/:id` - Delete campaign
- [ ] GET `/api/v1/campaigns/:id/metrics` - Get metrics
- [ ] POST `/api/v1/campaigns/:id/metrics` - Add metrics
- [ ] POST `/api/v1/campaigns/:id/creatives` - Add ad creative
- [ ] GET `/api/v1/campaigns/:id/creatives` - List ad creatives

---

#### Task 5.4: Create Campaign Routes
**Files Created**:
- `backend/src/routes/campaigns.routes.ts`

**Files Modified**:
- `backend/src/index.ts`

**Implementation Steps**:
- [ ] Define campaign routes with team access middleware
- [ ] Add validation for budget, dates, platforms
- [ ] Mount under `/api/v1/campaigns`

---

#### Task 5.5: Test Campaign Operations
**Your Actions**:
- [ ] Create campaign linked to product/ICP
- [ ] Add campaign metrics
- [ ] Calculate ROI
- [ ] Update campaign status
- [ ] Verify team isolation (other teams can't see campaign)

---

#### Task 5.6: Commit and Create PR #5
**Git Actions**:
```bash
git add .
git commit -m "feat: Add campaign management with metrics tracking"
git push origin feature/campaign-management
```
**Your Actions**:
- [ ] Create PR #5: "Campaign Management"
- [ ] Merge to master

---

## Phase 2: Webhook Infrastructure & Lead Management


---

### PR #7: Lead Management System

#### Task 7.1: Create Lead Service
**Description**: Lead CRUD and status management  
**Git Actions**:
```bash
git checkout master && git pull
git checkout -b feature/lead-management
```

**Files Created**:
- `backend/src/services/leads.service.ts`

**Implementation Steps**:
- [ ] `createLead(teamId, campaignId, data)` - Create lead
- [ ] `getLead(leadId, teamId)` - Get lead details
- [ ] `listLeads(teamId, filters)` - List leads with filters (status, campaign, date)
- [ ] `updateLeadStatus(leadId, teamId, newStatus)` - Update status
- [ ] `claimLead(leadId, userId, teamId)` - Assign lead to user
- [ ] `addLeadActivity(leadId, userId, activityType, description)` - Log activity
- [ ] `getLeadActivities(leadId, teamId)` - Get activity history
- [ ] `searchLeads(teamId, query)` - Search by name/email
- [ ] Calculate lead qualification score placeholder

---

#### Task 7.2: Create Lead Controller
**Description**: REST endpoints for lead management  
**Files Created**:
- `backend/src/controllers/leads.controller.ts`

**Implementation Steps**:
- [ ] GET `/api/v1/leads` - List leads (with filters)
- [ ] GET `/api/v1/leads/:id` - Get lead details
- [ ] PUT `/api/v1/leads/:id` - Update lead
- [ ] POST `/api/v1/leads/:id/claim` - Claim lead
- [ ] POST `/api/v1/leads/:id/activities` - Add activity
- [ ] GET `/api/v1/leads/:id/activities` - Get activities
- [ ] GET `/api/v1/leads/:id/discovery` - Get discovery session
- [ ] POST `/api/v1/leads/search` - Search leads

---

#### Task 7.3: Create Lead Routes
**Files Created**:
- `backend/src/routes/leads.routes.ts`

**Files Modified**:
- `backend/src/index.ts`

**Implementation Steps**:
- [ ] Define lead routes with team access middleware
- [ ] Add validation for status transitions
- [ ] Mount under `/api/v1/leads`

---

#### Task 7.4: Create Lead Socket Handler
**Description**: Real-time lead notifications via Socket.io  
**Files Created**:
- `backend/src/socket/handlers/leads.handler.ts`

**Files Modified**:
- `backend/src/socket/index.ts`

**Implementation Steps**:
- [ ] `notifyNewLead(teamId, lead)` - Broadcast to team
- [ ] `notifyLeadClaimed(teamId, leadId, userId)` - Update claimed status
- [ ] `notifyLeadStatusChanged(teamId, leadId, newStatus)` - Status update
- [ ] Join team rooms: `team_{teamId}`
- [ ] Emit events to appropriate rooms

---

#### Task 7.5: Test Lead Management
**Your Actions**:
- [ ] Create lead manually via API
- [ ] List leads with filters
- [ ] Claim lead
- [ ] Update lead status
- [ ] Add activity
- [ ] Verify socket events received

---

#### Task 7.6: Commit and Create PR #7
**Git Actions**:
```bash
git add .
git commit -m "feat: Add lead management with real-time notifications"
git push origin feature/lead-management
```
**Your Actions**:
- [ ] Create PR #7: "Lead Management System"
- [ ] Merge to master

---

### PR #8: AWS Lambda - Webhook Processor

#### Task 8.1: Create Webhook Processor Lambda
**Description**: Process webhooks from SQS queue  
**Git Actions**:
```bash
git checkout master && git pull
git checkout -b feature/lambda-webhook-processor
```

**Files Created**:
- `aws-lambdas/webhook-processor/index.ts`
- `aws-lambdas/webhook-processor/package.json`
- `aws-lambdas/webhook-processor/README.md`

**Implementation Steps**:
- [ ] Install dependencies: `prisma`, `@prisma/client`, `aws-sdk`
- [ ] Initialize Prisma client
- [ ] Handle SQS event batch
- [ ] For each webhook message:
  - [ ] Parse lead data
  - [ ] Match to campaign (if campaign ID in payload)
  - [ ] Create Lead record in database
  - [ ] Trigger Socket.io notification via HTTP request
  - [ ] Mark message as processed
- [ ] Error handling: send failures to DLQ
- [ ] Log all operations

**package.json**:
```json
{
  "name": "webhook-processor",
  "version": "1.0.0",
  "dependencies": {
    "@prisma/client": "^5.0.0",
    "aws-sdk": "^2.1000.0"
  },
  "devDependencies": {
    "@types/aws-lambda": "^8.10.0",
    "typescript": "^5.0.0"
  }
}
```

---

#### Task 8.2: Update Terraform for Lambda Deployment
**Files Modified**:
- `terraform/lambda.tf`
- `terraform/iam.tf`

**Implementation Steps**:
- [ ] Define Lambda function resource
- [ ] Set environment variables (DATABASE_URL, API_URL)
- [ ] Configure SQS trigger
- [ ] Set timeout: 60 seconds
- [ ] Set memory: 512 MB
- [ ] Add IAM role with SQS read permissions

---

#### Task 8.3: Build and Deploy Lambda
**Your Actions**:
- [ ] Build Lambda: `cd aws-lambdas/webhook-processor && npm install && npm run build`
- [ ] Create deployment package: `zip -r function.zip dist/ node_modules/`
- [ ] Deploy via Terraform: `cd terraform && terraform apply`
- [ ] Or upload via AWS Console
- [ ] Test with sample SQS message

---

#### Task 8.4: Test End-to-End Webhook Flow
**Your Actions**:
- [ ] Trigger test webhook (Facebook lead form)
- [ ] Verify message in SQS
- [ ] Verify Lambda processes message
- [ ] Verify Lead created in database
- [ ] Verify Socket.io notification sent to team chat

---

#### Task 8.5: Commit and Create PR #8
**Git Actions**:
```bash
git add .
git commit -m "feat: Add Lambda function to process webhooks from SQS"
git push origin feature/lambda-webhook-processor
```
**Your Actions**:
- [ ] Create PR #8: "Lambda Webhook Processor"
- [ ] Merge to master

---

## Phase 3: AI Agent Infrastructure

### PR #9: AI Agent Foundation & Streaming

#### Task 9.1: Set Up Vercel AI SDK
**Description**: Install and configure AI SDK for agent development  
**Git Actions**:
```bash
git checkout master && git pull
git checkout -b feature/ai-agent-foundation
```

**Dependencies**:
```bash
cd backend
npm install ai @ai-sdk/openai zod
```

**Files Created**:
- `backend/src/config/openai.ts` (if not exists)

**Implementation Steps**:
- [ ] Configure OpenAI provider from AI SDK
- [ ] Set up streaming configuration
- [ ] Add error handling for API failures
- [ ] Configure retry logic

---

#### Task 9.2: Create AI System Prompts
**Description**: Define system prompts for each agent  
**Files Created**:
- `backend/src/utils/prompts.ts`

**Implementation Steps**:
- [ ] `PRODUCT_DEFINER_SYSTEM_PROMPT` - Product/ICP definition agent
- [ ] `CAMPAIGN_ADVISOR_SYSTEM_PROMPT` - Campaign strategy agent
- [ ] `CONTENT_GENERATOR_SYSTEM_PROMPT` - Marketing content agent
- [ ] `DISCOVERY_BOT_SYSTEM_PROMPT` - Customer discovery agent
- [ ] `PERFORMANCE_ANALYZER_SYSTEM_PROMPT` - Analytics agent
- [ ] Include instructions, examples, constraints
- [ ] Format with proper escaping

---

#### Task 9.3: Create Streaming Utility
**Description**: Helper functions for Server-Sent Events  
**Files Created**:
- `backend/src/utils/streaming.ts`

**Implementation Steps**:
- [ ] `initSSE(res)` - Initialize SSE headers
- [ ] `sendSSEMessage(res, data)` - Send data chunk
- [ ] `closeSSE(res)` - Close connection
- [ ] `streamToSSE(stream, res)` - Pipe AI stream to SSE
- [ ] Handle connection close/error

---

#### Task 9.4: Create AI Agent Conversation Service
**Description**: Manage agent conversation history  
**Files Created**:
- `backend/src/services/aiConversations.service.ts`

**Implementation Steps**:
- [ ] `createConversation(userId, teamId, agentType, contextId)` - Start conversation
- [ ] `getConversation(conversationId, userId)` - Get conversation
- [ ] `addMessage(conversationId, role, content)` - Add message to history
- [ ] `getMessages(conversationId)` - Get message history
- [ ] `updateConversationStatus(conversationId, status)` - Mark completed
- [ ] `deleteConversation(conversationId)` - Archive conversation

---

#### Task 9.5: Test Streaming Setup
**Your Actions**:
- [ ] Create test endpoint that streams "Hello World"
- [ ] Test with curl: `curl -N http://localhost:3000/api/v1/test-stream`
- [ ] Verify SSE messages arrive in chunks
- [ ] Test connection close

---

#### Task 9.6: Commit and Create PR #9
**Git Actions**:
```bash
git add .
git commit -m "feat: Add AI agent foundation with streaming support"
git push origin feature/ai-agent-foundation
```
**Your Actions**:
- [ ] Create PR #9: "AI Agent Foundation"
- [ ] Merge to master

---

### PR #10: AI Agent - Product & ICP Definer

#### Task 10.1: Create Product Definer Service
**Description**: Conversational agent for product/ICP setup  
**Git Actions**:
```bash
git checkout master && git pull
git checkout -b feature/ai-product-definer
```

**Files Created**:
- `backend/src/services/aiAgents/productDefiner.service.ts`

**Implementation Steps**:
- [ ] `startConversation(userId, teamId)` - Initialize product definition flow
- [ ] `processMessage(conversationId, userMessage)` - Handle user input
- [ ] Define tools/functions:
  - [ ] `save_product(name, description, features, pricing, usps)`
  - [ ] `save_icp(productId, demographics, firmographics, psychographics, behaviors)`
  - [ ] `search_similar_products(query)` - Find examples
- [ ] Implement conversation flow:
  - [ ] Ask about product name and offering
  - [ ] Ask about features and benefits
  - [ ] Ask about pricing structure
  - [ ] Ask about USPs vs competitors
  - [ ] Transition to ICP questions
  - [ ] Ask about demographics (age, location, job titles)
  - [ ] Ask about firmographics (company size, industry)
  - [ ] Ask about psychographics (pain points, goals)
  - [ ] Ask about behaviors (buying triggers)
  - [ ] Confirm with user before saving
- [ ] Call vector database service to store embeddings
- [ ] Stream responses to client

---

#### Task 10.2: Create Product Definer Controller
**Description**: HTTP endpoints for product definition agent  
**Files Created**:
- `backend/src/controllers/aiAgents.controller.ts`

**Implementation Steps**:
- [ ] POST `/api/v1/ai/product-definer/start` - Start conversation
  - Create AIAgentConversation record
  - Return conversationId
- [ ] POST `/api/v1/ai/product-definer/message` - Send message (streaming response)
  - Accept conversationId and message
  - Call agent service
  - Stream AI response via SSE
  - Save messages to conversation history
- [ ] POST `/api/v1/ai/product-definer/complete` - Finalize product/ICP
  - Mark conversation as completed
  - Return created product/ICP IDs

---

#### Task 10.3: Create AI Agent Routes
**Files Created**:
- `backend/src/routes/aiAgents.routes.ts`

**Files Modified**:
- `backend/src/index.ts`

**Implementation Steps**:
- [ ] Define AI agent routes with team access middleware
- [ ] Mount under `/api/v1/ai`
- [ ] Add rate limiting (100 requests/hour per user)

---

#### Task 10.4: Test Product Definer Agent
**Your Actions**:
- [ ] Start conversation via API
- [ ] Send message: "I offer executive coaching"
- [ ] Verify AI asks follow-up questions
- [ ] Complete full conversation flow
- [ ] Verify product and ICP saved to database
- [ ] Verify vectors stored in Pinecone

---

#### Task 10.5: Commit and Create PR #10
**Git Actions**:
```bash
git add .
git commit -m "feat: Add Product & ICP Definer AI agent with conversational flow"
git push origin feature/ai-product-definer
```
**Your Actions**:
- [ ] Create PR #10: "AI Product Definer Agent"
- [ ] Merge to master

---

### PR #11: AI Agent - Campaign Strategy Advisor

#### Task 11.1: Create Campaign Advisor Service
**Description**: AI agent for campaign planning and budget allocation  
**Git Actions**:
```bash
git checkout master && git pull
git checkout -b feature/ai-campaign-advisor
```

**Files Created**:
- `backend/src/services/aiAgents/campaignAdvisor.service.ts`

**Implementation Steps**:
- [ ] `startCampaignPlanning(userId, teamId, productId, icpId)` - Start conversation
- [ ] `processMessage(conversationId, userMessage)` - Handle input
- [ ] Define tools/functions:
  - [ ] `get_product_and_icp(productId, icpId)` - Retrieve context
  - [ ] `get_platform_demographics(platform)` - Platform data
  - [ ] `calculate_budget_allocation(totalBudget, platforms, icp)` - Optimize
  - [ ] `get_targeting_suggestions(platform, icp)` - Audience targeting
  - [ ] `get_industry_benchmarks(industry, platform)` - CPL, CTR data
  - [ ] `save_campaign_strategy(campaignData)` - Save plan
- [ ] Implement conversation flow:
  - [ ] Retrieve product and ICP from database
  - [ ] Ask about campaign objectives
  - [ ] Ask about total budget
  - [ ] Ask about timeline
  - [ ] Recommend platforms based on ICP
  - [ ] Suggest budget allocation with rationale
  - [ ] Provide targeting strategy
  - [ ] Generate campaign brief
- [ ] Store campaign strategy in vector DB

---

#### Task 11.2: Create Platform Demographics Data
**Description**: Reference data for platform targeting  
**Files Created**:
- `backend/src/data/platformDemographics.json`

**Implementation Steps**:
- [ ] Facebook demographics (age groups, interests)
- [ ] LinkedIn demographics (job titles, industries, seniority)
- [ ] Instagram demographics (age, interests, behaviors)
- [ ] X demographics (interests, topics)
- [ ] TikTok demographics (age groups, content types)
- [ ] Industry benchmarks (CPL, CTR by industry/platform)

---

#### Task 11.3: Create Budget Allocation Algorithm
**Description**: Optimize budget split across platforms  
**Files Modified**:
- `backend/src/services/aiAgents/campaignAdvisor.service.ts`

**Implementation Steps**:
- [ ] Score each platform for ICP match (0-100)
- [ ] Factor in CPL benchmarks
- [ ] Allocate budget proportionally to scores
- [ ] Ensure minimum budget threshold per platform ($500)
- [ ] Return allocation with rationale

---

#### Task 11.4: Add Campaign Advisor Endpoints
**Files Modified**:
- `backend/src/controllers/aiAgents.controller.ts`
- `backend/src/routes/aiAgents.routes.ts`

**Implementation Steps**:
- [ ] POST `/api/v1/ai/campaign-advisor/start` - Start planning
- [ ] POST `/api/v1/ai/campaign-advisor/message` - Continue conversation
- [ ] POST `/api/v1/ai/campaign-advisor/export` - Export campaign plan (PDF/JSON)

---

#### Task 11.5: Test Campaign Advisor
**Your Actions**:
- [ ] Start campaign planning with product/ICP
- [ ] Provide budget: $10,000
- [ ] Verify AI recommends platforms
- [ ] Verify budget allocation makes sense
- [ ] Export campaign plan
- [ ] Verify saved to database

---

#### Task 11.6: Commit and Create PR #11
**Git Actions**:
```bash
git add .
git commit -m "feat: Add Campaign Strategy Advisor AI agent"
git push origin feature/ai-campaign-advisor
```
**Your Actions**:
- [ ] Create PR #11: "AI Campaign Advisor"
- [ ] Merge to master

---

### PR #12: AI Agent - Content Generator

#### Task 12.1: Create Content Generator Service
**Description**: AI agent for ad copy, social posts, landing pages  
**Git Actions**:
```bash
git checkout master && git pull
git checkout -b feature/ai-content-generator
```

**Files Created**:
- `backend/src/services/aiAgents/contentGenerator.service.ts`

**Implementation Steps**:
- [ ] `generateAdCopy(productId, platform, variations)` - Create ad copy
  - Generate headlines (3-5 variations)
  - Generate body copy (3-5 variations)
  - Generate CTAs
  - Tailor to platform constraints (character limits)
- [ ] `generateSocialPosts(productId, platform, count)` - Create social posts
  - Facebook post format
  - LinkedIn article/post
  - Instagram caption with hashtags
  - X thread (multi-tweet)
  - TikTok video script
- [ ] `generateLandingPageCopy(productId)` - Create landing page sections
  - Hero headline and subheading
  - Feature/benefit sections
  - Social proof framework
  - FAQ section
  - CTA sections
- [ ] `generateImagePrompts(productId, concept)` - DALL-E prompts
- [ ] `saveToContentLibrary(teamId, content, type)` - Store in database
- [ ] Retrieve product details from vector DB for context

---

#### Task 12.2: Create Content Library Storage
**Description**: Store and organize generated content  
**Files Modified**:
- `backend/prisma/schema.prisma` (add ContentLibrary model if needed)
- `backend/src/services/contentLibrary.service.ts` (new)

**Implementation Steps**:
- [ ] Add ContentLibrary model to schema (if not exists)
- [ ] `saveContent(teamId, campaignId, contentType, content)` - Save
- [ ] `listContent(teamId, filters)` - List with filters
- [ ] `getContent(contentId, teamId)` - Get content
- [ ] `updateContent(contentId, teamId, content)` - Edit
- [ ] `deleteContent(contentId, teamId)` - Delete

---

#### Task 12.3: Add Content Generator Endpoints
**Files Modified**:
- `backend/src/controllers/aiAgents.controller.ts`
- `backend/src/routes/aiAgents.routes.ts`

**Implementation Steps**:
- [ ] POST `/api/v1/ai/content-generator/ad-copy` - Generate ad copy
  - Body: { productId, platform, variations: 3 }
- [ ] POST `/api/v1/ai/content-generator/social-posts` - Generate social posts
  - Body: { productId, platform, count: 5 }
- [ ] POST `/api/v1/ai/content-generator/landing-page` - Generate landing page
  - Body: { productId }
- [ ] POST `/api/v1/ai/content-generator/image-prompts` - Generate prompts
  - Body: { productId, concept: "professional headshot" }
- [ ] POST `/api/v1/ai/content-generator/regenerate` - Request variations
  - Body: { contentId, instruction: "make it more casual" }

---

#### Task 12.4: Test Content Generator
**Your Actions**:
- [ ] Generate Facebook ad copy for product
- [ ] Verify 3+ variations created
- [ ] Generate LinkedIn post
- [ ] Generate landing page hero section
- [ ] Generate image prompt
- [ ] Regenerate with different tone
- [ ] Verify content saved to library

---

#### Task 12.5: Commit and Create PR #12
**Git Actions**:
```bash
git add .
git commit -m "feat: Add Content Generator AI agent for ads, social posts, landing pages"
git push origin feature-ai-content-generator
```
**Your Actions**:
- [ ] Create PR #12: "AI Content Generator"
- [ ] Merge to master

---

### PR #13: AI Agent - Customer Discovery Bot

#### Task 13.1: Create Discovery Bot Service
**Description**: Public-facing RAG-powered discovery agent  
**Git Actions**:
```bash
git checkout master && git pull
git checkout -b feature/ai-discovery-bot
```

**Files Created**:
- `backend/src/services/aiAgents/discoveryBot.service.ts`

**Implementation Steps**:
- [ ] `startDiscoverySession(productId, leadData)` - Start discovery
  - Create Lead record
  - Create DiscoverySession record
  - Initialize conversation
- [ ] `processMessage(sessionId, userMessage)` - Handle prospect input
  - Use RAG to answer product questions
  - Ask discovery questions in sequence
  - Track responses
- [ ] Define tools/functions:
  - [ ] `search_product_info(query)` - Vector search for product details
  - [ ] `search_faq(query)` - Find FAQ answers
  - [ ] `calculate_qualification_score(responses)` - Score lead
  - [ ] `generate_discovery_summary(transcript)` - Create summary
  - [ ] `notify_sales_team(leadId, summary, score)` - Alert team
- [ ] Implement discovery flow:
  - [ ] Build rapport
  - [ ] Answer product questions using RAG
  - [ ] Ask: "What challenges are you facing with [problem]?"
  - [ ] Ask: "What's your timeline for solving this?"
  - [ ] Ask: "Who else is involved in this decision?"
  - [ ] Ask: "What's your budget range?"
  - [ ] Ask: "What have you tried before?"
  - [ ] Calculate qualification score (0-100)
  - [ ] Generate structured summary
  - [ ] Notify sales team via Socket.io

---

#### Task 13.2: Implement Qualification Scoring Algorithm
**Description**: Score lead based on discovery responses  
**Files Modified**:
- `backend/src/services/aiAgents/discoveryBot.service.ts`

**Implementation Steps**:
- [ ] Budget fit: 30 points (within range = 30, above = 20, below = 10)
- [ ] Timeline: 25 points (urgent = 25, 1-3 months = 20, 3+ months = 10)
- [ ] Decision maker: 20 points (is DM = 20, influences = 15, not involved = 5)
- [ ] Problem fit: 15 points (perfect match = 15, partial = 10, poor = 5)
- [ ] Prior attempts: 10 points (tried solutions = 10, first time = 5)
- [ ] Total: 0-100 score
- [ ] Classify: Hot (80+), Warm (60-79), Cold (<60)

---

#### Task 13.3: Create Discovery Bot Public Endpoints
**Description**: Public API for prospects (no auth required)  
**Files Modified**:
- `backend/src/controllers/aiAgents.controller.ts`
- `backend/src/routes/aiAgents.routes.ts`

**Implementation Steps**:
- [ ] POST `/api/v1/public/discovery/start` - Start discovery (NO AUTH)
  - Body: { productId, name, email, phone }
  - Create Lead and DiscoverySession
  - Return sessionId
- [ ] POST `/api/v1/public/discovery/message` - Send message (NO AUTH)
  - Body: { sessionId, message }
  - Stream AI response via SSE
- [ ] POST `/api/v1/public/discovery/complete` - End session (NO AUTH)
  - Finalize discovery
  - Generate summary and score
  - Notify sales team
  - Return summary

---

#### Task 13.4: Test Discovery Bot
**Your Actions**:
- [ ] Start discovery session as prospect
- [ ] Ask product questions, verify RAG responses
- [ ] Answer discovery questions
- [ ] Complete session
- [ ] Verify summary generated
- [ ] Verify sales team notified in Socket.io
- [ ] Check qualification score

---

#### Task 13.5: Commit and Create PR #13
**Git Actions**:
```bash
git add .
git commit

Here’s a new markdown document summarizing **remaining tasks** needed to complete the **MessageAI Sales PRD**, based on the current `messageai-sales-tasklist.md` file you provided.

---

# messageai-sales-remaining-tasks.md

## Overview

The last task in the attached task list is **Task 9.5: Test Streaming Setup** under **PR #9: AI Agent Foundation & Streaming**.
This establishes the foundation for real-time, streaming AI responses via the backend.

The **next logical step** is to build the *AI agent endpoints* outlined in the PRD — such as the Product/ICP Definer, Campaign Advisor, Content Generator, Discovery Bot, and Performance Analyzer.
These directly depend on the streaming and prompt infrastructure completed in PR #9.

---

## Phase 3 (Continued): AI Agent Endpoints

### PR #10: AI Agent - Product & ICP Definer

#### Task 10.1: Create Product Definer Controller

**Description**: Handles product definition conversations via AI.
**Files Created**:

* `backend/src/controllers/ai/productDefiner.controller.ts`

**Implementation Steps**:

* [ ] POST `/api/v1/ai/product-definer/start` – Start new conversation
* [ ] POST `/api/v1/ai/product-definer/message` – Continue conversation
* [ ] POST `/api/v1/ai/product-definer/complete` – Finalize and persist product
* [ ] Use `PRODUCT_DEFINER_SYSTEM_PROMPT`
* [ ] Stream responses using `streamToSSE()`

---

#### Task 10.2: Create Product Definer Routes

**Files Created**:

* `backend/src/routes/ai/productDefiner.routes.ts`

**Implementation Steps**:

* [ ] Define REST endpoints under `/api/v1/ai/product-definer`
* [ ] Use team access middleware
* [ ] Validate session context (teamId, userId, product data)

---

#### Task 10.3: Update Product Service Integration

**Files Modified**:

* `backend/src/services/products.service.ts`

**Implementation Steps**:

* [ ] Persist AI-generated product details
* [ ] Vectorize and store key product fields (name, features, USPs)
* [ ] Link to created ICP session if applicable

---

#### Task 10.4: Test Product Definer Flow

**Your Actions**:

* [ ] Start conversation with sample input
* [ ] Verify streaming responses
* [ ] Finalize and store product
* [ ] Confirm vector records created in Pinecone

---

### PR #11: AI Agent - Campaign Strategy Advisor

#### Task 11.1: Create Campaign Advisor Controller

**Description**: AI-driven campaign strategy planner.
**Files Created**:

* `backend/src/controllers/ai/campaignAdvisor.controller.ts`

**Implementation Steps**:

* [ ] POST `/api/v1/ai/campaign-advisor/start`
* [ ] POST `/api/v1/ai/campaign-advisor/message`
* [ ] POST `/api/v1/ai/campaign-advisor/export`
* [ ] Use `CAMPAIGN_ADVISOR_SYSTEM_PROMPT`
* [ ] Generate and persist strategy summaries

---

#### Task 11.2: Integrate with Campaign Service

**Files Modified**:

* `backend/src/services/campaigns.service.ts`

**Implementation Steps**:

* [ ] Store AI campaign recommendations (budget, platform, targeting)
* [ ] Link to existing campaign record
* [ ] Allow manual edits via dashboard

---

#### Task 11.3: Test Campaign Strategy Flow

**Your Actions**:

* [ ] Start campaign advisor conversation
* [ ] Verify recommendations saved correctly
* [ ] Export plan and confirm valid JSON structure

---

### PR #12: AI Agent - Content Generator

#### Task 12.1: Create Content Generator Controller

**Description**: Generates ad copy, social posts, and landing page content.
**Files Created**:

* `backend/src/controllers/ai/contentGenerator.controller.ts`

**Implementation Steps**:

* [ ] Implement endpoints per PRD:

  * `/api/v1/ai/content-generator/ad-copy`
  * `/api/v1/ai/content-generator/social-posts`
  * `/api/v1/ai/content-generator/landing-page`
  * `/api/v1/ai/content-generator/image-prompts`
  * `/api/v1/ai/content-generator/regenerate`
* [ ] Use `CONTENT_GENERATOR_SYSTEM_PROMPT`
* [ ] Stream responses and persist in campaign creatives

---

#### Task 12.2: Update Ad Creative Service

**Files Modified**:

* `backend/src/services/adCreatives.service.ts`

**Implementation Steps**:

* [ ] Add AI generation metadata (prompt version, generation date)
* [ ] Store generated copy in vector database for retrieval
* [ ] Add endpoint for regeneration history

---

### PR #13: AI Agent - Discovery Bot (Public)

#### Task 13.1: Create Discovery Bot Controller

**Description**: Public-facing bot for customer discovery.
**Files Created**:

* `backend/src/controllers/ai/discoveryBot.controller.ts`

**Implementation Steps**:

* [ ] POST `/api/v1/public/discovery/start`
* [ ] POST `/api/v1/public/discovery/message`
* [ ] POST `/api/v1/public/discovery/complete`
* [ ] Use `DISCOVERY_BOT_SYSTEM_PROMPT`
* [ ] Handle unauthenticated context safely

---

#### Task 13.2: Integrate Discovery Sessions

**Files Modified**:

* `backend/src/services/leads.service.ts`
* `backend/src/services/discovery.service.ts` (new)

**Implementation Steps**:

* [ ] Store transcript and summary
* [ ] Generate lead qualification score
* [ ] Notify sales team via Socket.io event `lead_received`

---

### PR #14: AI Agent - Performance Analyzer

#### Task 14.1: Create Performance Analyzer Controller

**Description**: Provides insights and optimization advice.
**Files Created**:

* `backend/src/controllers/ai/performanceAnalyzer.controller.ts`

**Implementation Steps**:

* [ ] Implement endpoints:

  * `/api/v1/ai/performance-analyzer/query`
  * `/api/v1/ai/performance-analyzer/insights`
  * `/api/v1/ai/performance-analyzer/optimize`
* [ ] Use `PERFORMANCE_ANALYZER_SYSTEM_PROMPT`
* [ ] Query campaign metrics data
* [ ] Stream analytics responses

---

### PR #15: Frontend Integration - React Native & Dashboard

#### Task 15.1: Extend Mobile Frontend (Expo)

**Files Modified**:

* `mobile/app/(tabs)/leads.tsx`
* `mobile/app/(tabs)/campaigns.tsx`
* `mobile/app/ai-agents/` (various)

**Implementation Steps**:

* [ ] Add new AI agent chat screens (product, campaign, content, discovery, analyzer)
* [ ] Implement streaming message components
* [ ] Integrate Socket.io for real-time lead updates

---

#### Task 15.2: Test End-to-End Sales Funnel

**Your Actions**:

* [ ] Trigger lead webhook → verify DB record
* [ ] Run AI product definition → generate campaign → content → discovery flow
* [ ] Verify insights and recommendations appear in dashboard
* [ ] Confirm notifications fire correctly across sockets

---

## Summary

| Last Completed Task                | Next Step                                        | Why It Follows                                                                                                                                                                          |
| ---------------------------------- | ------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Task 9.5: Test Streaming Setup** | **Task 10.1: Create Product Definer Controller** | The PRD’s next objective is to build the AI agents using the streaming foundation established in PR #9. The Product Definer is the first agent required for the AI-driven sales funnel. |

---

Would you like me to include the **AI Agent Testing & Deployment** phase (e.g., PR #16–17 for cloud deployment, QA, and documentation polish)?
