# **MessageAI MVP - Combined Development Task List & Checklist**

**Repository**: `joaocarlinho/gauntlet-messageai-24hr-mvp`  
**Timeline**: 24 hours for MVP completion  
**Project Structure**: Monorepo with separate frontend, backend, and infrastructure

**Status**: 
- ✅ Basic Terraform scaffold created
- ✅ Railway account setup completed
- ⏳ Ready for infrastructure provisioning and application development

---

## **Project File Structure**

```
gauntlet-messageai-24hr-mvp/
├── .git/
├── .gitignore
├── README.md
├── package.json (root - for workspace management)
├── .env.example
│
├── iac/                            # Terraform Infrastructure (✅ Created)
│   ├── main.tf
│   ├── variables.tf
│   ├── outputs.tf
│   ├── provider.tf
│   ├── validate.sh
│   └── README.md
│
├── mobile/                          # React Native + Expo Frontend
│   ├── .expo/
│   ├── app/                         # Expo Router file-based routing
│   │   ├── (auth)/
│   │   │   ├── login.tsx
│   │   │   └── register.tsx
│   │   ├── (tabs)/
│   │   │   ├── _layout.tsx
│   │   │   ├── index.tsx           # Chat list
│   │   │   └── profile.tsx
│   │   ├── chat/
│   │   │   └── [id].tsx            # Chat room (dynamic route)
│   │   ├── group/
│   │   │   └── new.tsx             # New group creation
│   │   └── _layout.tsx
│   ├── components/
│   │   ├── chat/
│   │   │   ├── MessageBubble.tsx
│   │   │   ├── InputToolbar.tsx
│   │   │   ├── ChatItem.tsx
│   │   │   └── TypingIndicator.tsx
│   │   ├── ui/
│   │   │   ├── Avatar.tsx
│   │   │   ├── Button.tsx
│   │   │   └── StatusIndicator.tsx
│   │   └── layout/
│   │       └── ErrorBoundary.tsx
│   ├── hooks/
│   │   ├── useAuth.ts
│   │   ├── useSocket.ts
│   │   ├── useMessages.ts
│   │   └── usePresence.ts
│   ├── lib/
│   │   ├── api.ts                  # API client
│   │   ├── socket.ts               # Socket.io client
│   │   └── storage.ts              # SecureStore wrapper
│   ├── store/
│   │   ├── auth.ts                 # Kea logic for auth
│   │   ├── messages.ts             # Kea logic for messages
│   │   └── conversations.ts        # Kea logic for conversations
│   ├── db/
│   │   ├── schema.ts               # SQLite schema
│   │   └── queries.ts              # Database queries
│   ├── types/
│   │   └── index.ts                # TypeScript types
│   ├── utils/
│   │   ├── formatters.ts
│   │   └── validators.ts
│   ├── assets/
│   │   └── images/
│   ├── app.json
│   ├── package.json
│   ├── tsconfig.json
│   ├── .env
│   └── .env.example
│
├── backend/                         # Node.js + Express API
│   ├── src/
│   │   ├── config/
│   │   │   ├── database.ts
│   │   │   ├── socket.ts
│   │   │   └── aws.ts
│   │   ├── middleware/
│   │   │   ├── auth.ts
│   │   │   ├── errorHandler.ts
│   │   │   └── validation.ts
│   │   ├── routes/
│   │   │   ├── auth.routes.ts
│   │   │   ├── users.routes.ts
│   │   │   ├── conversations.routes.ts
│   │   │   ├── messages.routes.ts
│   │   │   └── media.routes.ts
│   │   ├── controllers/
│   │   │   ├── auth.controller.ts
│   │   │   ├── users.controller.ts
│   │   │   ├── conversations.controller.ts
│   │   │   ├── messages.controller.ts
│   │   │   └── media.controller.ts
│   │   ├── services/
│   │   │   ├── auth.service.ts
│   │   │   ├── message.service.ts
│   │   │   ├── presence.service.ts
│   │   │   └── s3.service.ts
│   │   ├── socket/
│   │   │   ├── handlers/
│   │   │   │   ├── message.handler.ts
│   │   │   │   ├── presence.handler.ts
│   │   │   │   └── typing.handler.ts
│   │   │   └── index.ts
│   │   ├── types/
│   │   │   └── index.ts
│   │   ├── utils/
│   │   │   ├── jwt.ts
│   │   │   └── validators.ts
│   │   └── index.ts                # Server entry point
│   ├── prisma/
│   │   ├── schema.prisma
│   │   └── migrations/
│   ├── package.json
│   ├── tsconfig.json
│   ├── .env
│   └── .env.example
│
├── aws-lambdas/                     # AWS Lambda Functions
│   ├── notification-worker/
│   │   ├── index.ts
│   │   └── package.json
│   └── cleanup-jobs/
│       ├── index.ts
│       └── package.json
│
└── .github/
    └── workflows/
        ├── terraform.yml
        └── ci.yml
```

---

## **Phase 0: Pre-Development Setup**

### **⚠️ COMPLETED TASKS**
- ✅ **Task 0.1**: GitHub Repository Created
- ✅ **Task 0.2**: Railway Account Setup Completed
- ✅ **Task 0.6**: Basic Terraform Scaffold Created (`/iac` directory)

### **Task 0.3: Complete Terraform Infrastructure Configuration**

**Description**: Configure and provision AWS infrastructure and Railway resources using Terraform  
**Status**: ⏳ In Progress

**Your Actions**:

**Part A: Configure Terraform Variables**
- [x] Create `iac/terraform.tfvars` (git-ignored):
  ```hcl
  project_name     = "messageai"
  environment      = "production"
  aws_region       = "us-east-1"
  railway_api_key  = "<from-railway-account>"
  ```
- [x] Review and update `iac/variables.tf` with any additional variables needed
- [x] Configure Terraform backend for state management:
  - Option 1: Terraform Cloud (recommended for collaboration)
  - Option 2: S3 + DynamoDB backend

**Part B: Define AWS Resources**
- [x] Add AWS resources to `iac/main.tf`:
  - [x] S3 bucket for media storage (`messageai-media-*`)
  - [x] Configure S3 CORS policy for file uploads
  - [x] SQS queue (`messageai-notification-queue`)
  - [x] IAM roles and policies for Lambda functions
  - [x] CloudWatch log groups for monitoring
- [x] Create Lambda function resources (will link to `/aws-lambdas` code later)
**Progress update — Part B implemented (scaffolded)**
- [x] Add AWS resources to `iac/main.tf`:
  - [x] S3 bucket for media storage (`messageai-media-*`) (with CORS & lifecycle rule)
  - [x] Configure S3 CORS policy for file uploads
  - [x] SQS queue (`messageai-notification-queue`)
  - [x] IAM roles and policies for Lambda functions
  - [x] CloudWatch log groups for monitoring
- [x] Create Lambda function resources (placeholder resource added; actual code/artifact upload required)

**Part C: Define Railway Resources**
- [x] Add Railway PostgreSQL database resource
- [x] Configure Railway project and service
- [x] Set up Railway environment variables via Terraform

**Part D: Configure Outputs**
- [x] Update `iac/outputs.tf` to export:
  ```hcl
  output "database_url" { value = railway_service.postgres.database_url sensitive = true }
  output "aws_s3_bucket" { value = aws_s3_bucket.media.bucket }
  output "aws_sqs_queue_url" { value = aws_sqs_queue.notifications.url }
  output "aws_region" { value = var.aws_region }
  output "railway_service_domain" { value = railway_service.backend.domain }
  output "railway_project_id" { value = railway_project.messageai.id }
  ```

**Files Modified**:
- `iac/main.tf`
- `iac/variables.tf`
- `iac/outputs.tf`
- `iac/terraform.tfvars` (create, add to .gitignore)

---

### **✅ Task 0.4: Initialize and Apply Terraform**

**Description**: Provision infrastructure using Terraform  
**Git Actions**:
```bash
git checkout -b infrastructure/terraform-provisioning
```

**Your Actions**:
- [x] Navigate to infrastructure directory: `cd iac`
- [x] Initialize Terraform: `terraform init`
- [x] Validate configuration: `terraform validate`
- [x] Format Terraform files: `terraform fmt`
- [x] Review planned changes: `terraform plan -out=tfplan`
- [x] Apply infrastructure: `terraform apply tfplan`
- [x] Export environment variables to local files:
  ```bash
  terraform output -json > ../terraform-outputs.json
  ```
- [x] Verify all resources created successfully:
  - [x] Check AWS Console for S3 bucket, SQS queue
  - [x] Check Railway dashboard for database
  - [x] Save all output values for later use

**Environment Variables Generated**:
```
DATABASE_URL=<from-terraform-output>
RAILWAY_PROJECT_ID=<from-terraform-output>
RAILWAY_SERVICE_DOMAIN=<from-terraform-output>
AWS_ACCESS_KEY_ID=<your-aws-access-key>
AWS_SECRET_ACCESS_KEY=<your-aws-secret-key>
AWS_REGION=us-east-1
AWS_S3_BUCKET=<from-terraform-output>
AWS_SQS_QUEUE_URL=<from-terraform-output>
```

---

### **✅ Task 0.5: Expo Account Setup**

**Description**: Set up Expo for React Native development and push notifications  
**Your Actions**:

- [x] Sign up at https://expo.dev
- [x] Create new project: "MessageAI"
- [x] Note down project slug: `messageai`
- [x] Generate Expo access token:
  - Go to Access Tokens in account settings
  - Create token: "MessageAI Development"
  - Note down `EXPO_ACCESS_TOKEN`
- [x] Install Expo CLI: `npm install -g expo-cli`
- [x] Login: `expo login`

**Environment Variables Saved**:
```
EXPO_PROJECT_SLUG=messageai
EXPO_ACCESS_TOKEN=<your-token>
```

---

### **✅ Task 0.6: Firebase Setup (for Production Push Notifications)**

**Description**: Configure Firebase Cloud Messaging for production builds using HTTP v1 API  
**Your Actions**:

- [x] Go to https://console.firebase.google.com
- [x] Create new project: "MessageAI"
- [x] Add Android app:
  - Package name: `com.joaocarlinho.messageai`
  - Download `google-services.json`
- [x] Add iOS app:
  - Bundle ID: `com.joaocarlinho.messageai`
  - Download `GoogleService-Info.plist`
- [x] Enable Cloud Messaging
- [x] Generate Service Account Key (HTTP v1 API):
  - Go to Project Settings > Service Accounts
  - Click "Generate new private key"
  - Download the JSON file
  - Note down the `project_id` from the JSON
- [x] Set up HTTP v1 API credentials:
  - Extract `client_email` and `private_key` from the service account JSON
  - Note down `FIREBASE_PROJECT_ID`

**Environment Variables Saved**:
```
FIREBASE_PROJECT_ID=name_hash
FIREBASE_CLIENT_EMAIL=name@web.com
FIREBASE_PRIVATE_KEY=<private-key-from-json>
```

**Note**: 
- The legacy FCM server key is deprecated (disabled 6/20/2024)
- Use HTTP v1 API with service account credentials instead
- Save the service account JSON file securely
- These files will be needed later for push notifications

---

### **✅ Task 0.7: Create Environment Variable Templates**

**Description**: Generate `.env.example` files from Terraform outputs  
**Your Actions**:

- [x] Create `backend/.env.example`:
  ```
  PORT=3000
  NODE_ENV=development
  
  # Database (from Terraform)
  DATABASE_URL=postgresql://user:pass@host:5432/messageai
  
  # JWT Secrets
  JWT_SECRET=your-super-secret-jwt-key-change-in-production
  JWT_REFRESH_SECRET=your-super-secret-refresh-key-change-in-production
  
  # AWS (from Terraform)
  AWS_ACCESS_KEY_ID=your-aws-access-key
  AWS_SECRET_ACCESS_KEY=your-aws-secret-key
  AWS_REGION=us-east-1
  AWS_S3_BUCKET=messageai-media-xxx
  AWS_SQS_QUEUE_URL=https://sqs.us-east-1.amazonaws.com/xxx
  
  # Railway (from Terraform)
  RAILWAY_PROJECT_ID=xxx
  RAILWAY_SERVICE_DOMAIN=xxx.railway.app
  
  # Firebase (HTTP v1 API)
  FIREBASE_PROJECT_ID=your-firebase-project-id
  FIREBASE_CLIENT_EMAIL=your-service-account-email
  FIREBASE_PRIVATE_KEY=your-private-key
  ```

- [x] Create `mobile/.env.example`:
  ```
  # API Configuration
  API_URL=http://localhost:3000
  SOCKET_URL=http://localhost:3000
  EXPO_PUBLIC_API_URL=http://localhost:3000
  
  # Expo
  EXPO_PROJECT_SLUG=messageai
  ```

- [x] Create actual `.env` files from templates with real values
- [x] Ensure `.env` is in `.gitignore`

---

### **Task 0.8: Commit Infrastructure Setup**

**Git Actions**:
```bash
git add .
git commit -m "feat: configure terraform infrastructure for AWS and Railway"
git push origin infrastructure/terraform-provisioning
```

**Your Actions**:
- [ ] Create PR: "Infrastructure: Terraform Configuration & Provisioning"
- [ ] Review changes
- [ ] Merge to master
- [ ] Pull latest: `git checkout master && git pull`

---

## **Phase 1: Project Initialization**

### **PR #1: Repository Setup & Project Scaffolding**

#### **Task 1.1: Initialize Monorepo Structure**

**Description**: Set up the monorepo with root package.json and workspace configuration  
**Git Actions**:
```bash
git checkout -b feature/project-init
```

**Files Created/Modified**:
- `package.json` (root)
- `.gitignore`
- `README.md`
- `.env.example` (root)

**Implementation Steps**:

- [ ] Create root `package.json` with workspace configuration:
  ```json
  {
    "name": "messageai-monorepo",
    "private": true,
    "workspaces": [
      "mobile",
      "backend",
      "aws-lambdas/*"
    ],
    "scripts": {
      "mobile": "cd mobile && npm start",
      "backend": "cd backend && npm run dev",
      "install-all": "npm install && npm run install:mobile && npm run install:backend",
      "install:mobile": "cd mobile && npm install",
      "install:backend": "cd backend && npm install",
      "terraform:init": "cd iac && terraform init",
      "terraform:plan": "cd iac && terraform plan",
      "terraform:apply": "cd iac && terraform apply"
    }
  }
  ```

- [ ] Update `.gitignore`:
  ```
  # Dependencies
  node_modules/
  .pnp
  .pnp.js
  
  # Expo
  .expo/
  .expo-shared/
  dist/
  web-build/
  
  # Environment
  .env
  .env.local
  .env.*.local
  terraform-outputs.json
  
  # Terraform
  iac/.terraform/
  iac/.terraform.lock.hcl
  iac/terraform.tfstate
  iac/terraform.tfstate.backup
  iac/tfplan
  iac/terraform.tfvars
  
  # IDE
  .vscode/
  .idea/
  *.swp
  *.swo
  *~
  
  # OS
  .DS_Store
  Thumbs.db
  
  # Backend
  backend/dist/
  backend/.env
  
  # Mobile
  mobile/.env
  
  # Build
  *.apk
  *.ipa
  *.aab
  
  # Logs
  *.log
  npm-debug.log*
  ```

- [ ] Update README.md with:
  - Project overview
  - Technology stack
  - Setup instructions (referencing Terraform)
  - Development workflow
  - Deployment instructions

---

#### **Task 1.2: Initialize React Native Frontend with Expo**

**Description**: Create Expo project with TypeScript and required dependencies  
**Files Created**:
- `mobile/` (entire directory structure)
- `mobile/package.json`
- `mobile/app.json`
- `mobile/tsconfig.json`
- `mobile/.env.example`

**Implementation Steps**:

- [ ] Run: `npx create-expo-app mobile --template expo-template-blank-typescript`
- [ ] Install dependencies:
  ```bash
  cd mobile
  npx expo install expo-router expo-sqlite expo-secure-store expo-image-picker expo-image expo-notifications @react-native-async-storage/async-storage
  npm install socket.io-client kea react-query axios react-native-paper
  npm install -D @types/react @types/react-native
  ```

- [ ] Configure `app.json`:
  ```json
  {
    "expo": {
      "name": "MessageAI",
      "slug": "messageai",
      "version": "1.0.0",
      "orientation": "portrait",
      "scheme": "messageai",
      "userInterfaceStyle": "automatic",
      "plugins": [
        "expo-router",
        "expo-secure-store",
        "expo-sqlite",
        [
          "expo-notifications",
          {
            "icon": "./assets/notification-icon.png",
            "color": "#ffffff"
          }
        ]
      ],
      "ios": {
        "bundleIdentifier": "com.joaocarlinho.messageai",
        "supportsTablet": true
      },
      "android": {
        "package": "com.joaocarlinho.messageai",
        "adaptiveIcon": {
          "foregroundImage": "./assets/adaptive-icon.png",
          "backgroundColor": "#ffffff"
        }
      }
    }
  }
  ```

- [ ] Copy `.env.example` created in Task 0.7 to `mobile/.env.example`
- [ ] Create `mobile/.env` from Terraform outputs

---

#### **Task 1.3: Initialize Node.js Backend**

**Description**: Set up Express.js backend with TypeScript and Prisma  
**Files Created**:
- `backend/` (entire directory structure)
- `backend/package.json`
- `backend/tsconfig.json`
- `backend/prisma/schema.prisma`
- `backend/.env.example`

**Implementation Steps**:

- [ ] Create backend directory: `mkdir backend && cd backend`
- [ ] Initialize Node project: `npm init -y`
- [ ] Install dependencies:
  ```bash
  npm install express socket.io prisma @prisma/client jsonwebtoken bcrypt cors dotenv express-validator aws-sdk
  npm install -D typescript ts-node nodemon @types/express @types/node @types/cors @types/jsonwebtoken @types/bcrypt
  ```

- [ ] Create `tsconfig.json`:
  ```json
  {
    "compilerOptions": {
      "target": "ES2020",
      "module": "commonjs",
      "lib": ["ES2020"],
      "outDir": "./dist",
      "rootDir": "./src",
      "strict": true,
      "esModuleInterop": true,
      "skipLibCheck": true,
      "forceConsistentCasingInFileNames": true,
      "resolveJsonModule": true
    },
    "include": ["src/**/*"],
    "exclude": ["node_modules"]
  }
  ```

- [ ] Initialize Prisma: `npx prisma init`
- [ ] Copy `.env.example` created in Task 0.7 to `backend/.env.example`
- [ ] Create `backend/.env` from Terraform outputs (DATABASE_URL automatically set)
- [ ] Update `package.json` scripts:
  ```json
  {
    "scripts": {
      "dev": "nodemon src/index.ts",
      "build": "tsc",
      "start": "node dist/index.js",
      "prisma:migrate": "prisma migrate dev",
      "prisma:generate": "prisma generate",
      "prisma:studio": "prisma studio"
    }
  }
  ```

---

#### **Task 1.4: Commit and Create PR #1**

**Description**: Commit project initialization and push to GitHub  
**Git Actions**:
```bash
git add .
git commit -m "feat: Initialize monorepo with React Native (Expo) and Node.js backend"
git push origin feature/project-init
```

**Your Actions**:
- [ ] Create Pull Request on GitHub: "PR #1: Project Initialization & Scaffolding"
- [ ] Review changes in GitHub UI
- [ ] Merge PR to master
- [ ] Pull latest changes: `git checkout master && git pull`

---

## **Phase 2: Database & Authentication**

### **PR #2: Database Schema & Prisma Setup**

#### **Task 2.1: Define Prisma Schema**

**Description**: Create complete database schema with all models  
**Git Actions**:
```bash
git checkout -b feature/database-schema
```

**Files Modified**:
- `backend/prisma/schema.prisma`

**Implementation Steps**:

- [ ] Update `schema.prisma` with complete schema:
  ```prisma
  generator client {
    provider = "prisma-client-js"
  }
  
  datasource db {
    provider = "postgresql"
    url      = env("DATABASE_URL")
  }
  
  model User {
    id            String   @id @default(uuid())
    email         String   @unique
    phoneNumber   String?  @unique
    password      String
    displayName   String
    avatarUrl     String?
    lastSeen      DateTime @default(now())
    isOnline      Boolean  @default(false)
    createdAt     DateTime @default(now())
    updatedAt     DateTime @updatedAt
  
    sentMessages     Message[]
    conversations    ConversationMember[]
    readReceipts     ReadReceipt[]
  }
  
  model Conversation {
    id            String   @id @default(uuid())
    type          String   // "direct" or "group"
    name          String?  // for group chats
    createdAt     DateTime @default(now())
    updatedAt     DateTime @updatedAt
  
    members       ConversationMember[]
    messages      Message[]
  }
  
  model ConversationMember {
    id              String   @id @default(uuid())
    conversationId  String
    userId          String
    joinedAt        DateTime @default(now())
    lastReadAt      DateTime?
  
    conversation    Conversation @relation(fields: [conversationId], references: [id], onDelete: Cascade)
    user            User @relation(fields: [userId], references: [id], onDelete: Cascade)
  
    @@unique([conversationId, userId])
    @@index([userId])
    @@index([conversationId])
  }
  
  model Message {
    id              String   @id @default(uuid())
    conversationId  String
    senderId        String
    content         String
    type            String   @default("text") // "text", "image", "system"
    mediaUrl        String?
    status          String   @default("sent") // "sending", "sent", "delivered", "read"
    createdAt       DateTime @default(now())
    updatedAt       DateTime @updatedAt
  
    conversation    Conversation @relation(fields: [conversationId], references: [id], onDelete: Cascade)
    sender          User @relation(fields: [senderId], references: [id], onDelete: Cascade)
    readReceipts    ReadReceipt[]
  
    @@index([conversationId])
    @@index([senderId])
    @@index([createdAt])
  }
  
  model ReadReceipt {
    id          String   @id @default(uuid())
    messageId   String
    userId      String
    readAt      DateTime @default(now())
  
    message     Message @relation(fields: [messageId], references: [id], onDelete: Cascade)
    user        User @relation(fields: [userId], references: [id], onDelete: Cascade)
  
    @@unique([messageId, userId])
    @@index([messageId])
    @@index([userId])
  }
  ```

---

#### **Task 2.2: Run Initial Migration**

**Description**: Create and run first Prisma migration using Terraform-provisioned database  
**Your Actions**:

- [ ] Verify `DATABASE_URL` in `backend/.env` (should be from Terraform output)
- [ ] Run migration: `cd backend && npx prisma migrate dev --name init`
- [ ] Generate Prisma Client: `npx prisma generate`
- [ ] Verify in Railway dashboard that tables are created
- [ ] Test connection: `npx prisma studio`

**Files Created**:
- `backend/prisma/migrations/` (migration files)

---

#### **Task 2.3: Create Database Client Wrapper**

**Description**: Set up Prisma client singleton  
**Files Created**:
- `backend/src/config/database.ts`

**Implementation Steps**:

- [ ] Create `backend/src/config/database.ts`:
  ```typescript
  import { PrismaClient } from '@prisma/client';
  
  const prisma = new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  });
  
  export default prisma;
  ```

---

#### **Task 2.4: Commit and Create PR #2**

**Git Actions**:
```bash
git add .
git commit -m "feat: Add Prisma schema and initial database migration"
git push origin feature/database-schema
```

**Your Actions**:
- [ ] Create PR #2: "Database Schema & Prisma Setup"
- [ ] Merge to master

---

### **PR #3: Authentication System**

#### **Task 3.1: Create JWT Utility Functions**

**Description**: Implement JWT token generation and verification  
**Git Actions**:
```bash
git checkout master && git pull
git checkout -b feature/authentication
```

**Files Created**:
- `backend/src/utils/jwt.ts`

**Implementation Steps**:
- [ ] Create JWT utility with access/refresh token generation
- [ ] Add token verification functions
- [ ] Include token refresh logic

---

#### **Task 3.2: Create Auth Middleware**

**Description**: Build authentication middleware for protected routes  
**Files Created**:
- `backend/src/middleware/auth.ts`

**Implementation Steps**:
- [ ] Create middleware to verify JWT from Authorization header
- [ ] Add user object to request context
- [ ] Handle token expiration errors

---

#### **Task 3.3: Build Auth Service**

**Description**: Implement registration, login, and token refresh logic  
**Files Created**:
- `backend/src/services/auth.service.ts`

**Implementation Steps**:
- [ ] Create user registration with password hashing
- [ ] Implement login with credential verification
- [ ] Add refresh token functionality
- [ ] Include password validation

---

#### **Task 3.4: Create Auth Controller**

**Description**: Build REST endpoints for authentication  
**Files Created**:
- `backend/src/controllers/auth.controller.ts`

**Implementation Steps**:
- [ ] POST `/api/v1/auth/register` endpoint
- [ ] POST `/api/v1/auth/login` endpoint
- [ ] POST `/api/v1/auth/refresh` endpoint
- [ ] Add request validation

---

#### **Task 3.5: Create Auth Routes**

**Description**: Set up authentication route handlers  
**Files Created**:
- `backend/src/routes/auth.routes.ts`

**Implementation Steps**:
- [ ] Define auth routes with controllers
- [ ] Add input validation middleware
- [ ] Connect to Express app

---

#### **Task 3.6: Create Main Server Entry Point**

**Description**: Set up Express server with basic configuration  
**Files Created**:
- `backend/src/index.ts`

**Implementation Steps**:
- [ ] Initialize Express app
- [ ] Configure CORS, body-parser
- [ ] Mount auth routes under `/api/v1`
- [ ] Add error handling middleware
- [ ] Start server on PORT from env

---

#### **Task 3.7: Test Authentication Locally**

**Description**: Verify auth endpoints work  
**Your Actions**:
- [ ] Start backend: `cd backend && npm run dev`
- [ ] Test registration with Postman/curl
- [ ] Test login and receive JWT
- [ ] Test refresh token endpoint

---

#### **Task 3.8: Commit and Create PR #3**

**Git Actions**:
```bash
git add .
git commit -m "feat: Implement complete authentication system with JWT"
git push origin feature/authentication
```

**Your Actions**:
- [ ] Create PR #3: "Authentication System"
- [ ] Merge to master

---

## **Phase 3: Core Messaging Infrastructure**

*[Continue with all remaining phases from the original document, maintaining the same structure but noting Terraform-managed resources where applicable]*

---

## **Phase 9: Deployment & Infrastructure Automation**

### **PR #21: CI/CD Pipeline for Terraform**

#### **Task 21.1: Create Terraform Validation Workflow**

**Description**: Add GitHub Actions workflow for infrastructure validation  
**Git Actions**:
```bash
git checkout master && git pull
git checkout -b ci/terraform-validation
```

**Files Created**:
- `.github/workflows/terraform.yml`

**Implementation Steps**:

- [ ] Create `.github/workflows/terraform.yml`:
  ```yaml
  name: Terraform CI
  
  on:
    push:
      branches: [ master ]
    pull_request:
      branches: [ master ]
    paths:
      - 'iac/**'
  
  jobs:
    terraform:
      runs-on: ubuntu-latest
      defaults:
        run:
          working-directory: iac
      
      steps:
        - uses: actions/checkout@v4
        
        - uses: hashicorp/setup-terraform@v3
          with:
            terraform_version: 1.7.0
        
        - name: Terraform Format Check
          run: terraform fmt -check
        
        - name: Terraform Init
          run: terraform init
        
        - name: Terraform Validate
          run: terraform validate
        
        - name: Terraform Plan
          run: terraform plan -no-color
          env:
            AWS_ACCESS_KEY_ID: ${{ secrets.AWS_ACCESS_KEY_ID }}
            AWS_SECRET_ACCESS_KEY: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
            RAILWAY_API_KEY: ${{ secrets.RAILWAY_API_KEY }}
  ```

- [ ] Configure GitHub Secrets:
  - [ ] Add `AWS_ACCESS_KEY_ID`
  - [ ] Add `AWS_SECRET_ACCESS_KEY`
  - [ ] Add `RAILWAY_API_KEY`

---

#### **Task 21.2: Backend Deployment to Railway**

**Description**: Configure automatic deployment to Railway  
**Files Created**:
- `backend/railway.json`

**Implementation Steps**:

- [ ] Create `backend/railway.json`:
  ```json
  {
    "$schema": "https://railway.app/railway.schema.json",
    "build": {
      "builder": "NIXPACKS",
      "buildCommand": "npm install && npx prisma generate && npm run build"
    },
    "deploy": {
      "startCommand": "npx prisma migrate deploy && npm start",
      "restartPolicyType": "ON_FAILURE",
      "restartPolicyMaxRetries": 10
    }
  }
  ```

- [ ] Connect Railway to GitHub repository
- [ ] Configure automatic deployments from master branch
- [ ] Verify environment variables are set in Railway (from Terraform)

---

#### **Task 21.3: Commit and Create PR**

**Git Actions**:
```bash
git add .
git commit -m "ci: Add Terraform validation and Railway deployment workflows"
git push origin ci/terraform-validation
```

**Your Actions**:
- [ ] Create PR: "CI/CD: Terraform Validation & Deployment"
- [ ] Merge to master

---

## **Appendix: Terraform-Enhanced Quick Reference**

### **Infrastructure Commands**

```bash
# Terraform
cd iac
terraform init                  # Initialize Terraform
terraform fmt                   # Format Terraform files
terraform validate              # Validate configuration
terraform plan                  # Preview changes
terraform apply                 # Apply changes
terraform output -json          # Export outputs
terraform destroy               # Destroy infrastructure (CAREFUL!)

# Export environment variables
terraform output -json > ../terraform-outputs.json
```

### **Development Workflow with Terraform**

1. **Initial Setup**:
   ```bash
   # Provision infrastructure first
   cd iac && terraform apply
   
   # Export variables
   terraform output -json > ../terraform-outputs.json
   
   # Install dependencies
   cd .. && npm run install-all
   
   # Set up backend
   cd backend
   npx prisma migrate dev
   npm run dev
   
   # In another terminal, start mobile
   cd mobile
   npx expo start
   ```

2. **Update Infrastructure**:
   ```bash
   cd iac
   terraform plan
   terraform apply
   terraform output -json > ../terraform-outputs.json
   # Update .env files if outputs changed
   ```

---

## **Benefits of This Combined Approach**

| Benefit | Description |
|---------|-------------|
| **Infrastructure as Code** | All cloud resources version-controlled and reproducible |
| **Faster Setup** | Automated provisioning eliminates manual configuration |
| **Consistency** | Same infrastructure across dev, staging, and production |
| **Railway Integration** | ✅ Accounts already set up, Terraform manages resources |
| **State Management** | Single source of truth for infrastructure configuration |
| **CI/CD Ready** | Automated validation prevents infrastructure drift |

---

## **Next Steps**

1. ✅ **Complete Terraform Configuration** (Task 0.3)
2. ✅ **Apply Infrastructure** (Task 0.4)
3. ⏳ **Begin Application Development** (Phase 1 onwards)

---

**Total Estimated Time**: 20-24 hours with Terraform automation (saves 2-4 hours vs manual setup)

