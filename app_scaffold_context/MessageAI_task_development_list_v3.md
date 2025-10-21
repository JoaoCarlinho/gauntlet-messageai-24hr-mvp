# **MessageAI MVP \- Development Task List & Checklist**

**Repository**: `joaocarlinho/gauntlet-messageai-24hr-mvp`  
 **Timeline**: 24 hours for MVP completion  
 **Project Structure**: Monorepo with separate frontend and backend

---

## **Project File Structure**

gauntlet-messageai-24hr-mvp/

├── .git/

├── .gitignore

├── README.md

├── package.json (root \- for workspace management)

├── .env.example

│

├── mobile/                          \# React Native \+ Expo Frontend

│   ├── .expo/

│   ├── app/                         \# Expo Router file-based routing

│   │   ├── (auth)/

│   │   │   ├── login.tsx

│   │   │   └── register.tsx

│   │   ├── (tabs)/

│   │   │   ├── \_layout.tsx

│   │   │   ├── index.tsx           \# Chat list

│   │   │   └── profile.tsx

│   │   ├── chat/

│   │   │   └── \[id\].tsx            \# Chat room (dynamic route)

│   │   ├── group/

│   │   │   └── new.tsx             \# New group creation

│   │   └── \_layout.tsx

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

│   │   ├── api.ts                  \# API client

│   │   ├── socket.ts               \# Socket.io client

│   │   └── storage.ts              \# SecureStore wrapper

│   ├── store/

│   │   ├── auth.ts                 \# Kea logic for auth

│   │   ├── messages.ts             \# Kea logic for messages

│   │   └── conversations.ts        \# Kea logic for conversations

│   ├── db/

│   │   ├── schema.ts               \# SQLite schema

│   │   └── queries.ts              \# Database queries

│   ├── types/

│   │   └── index.ts                \# TypeScript types

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

├── backend/                         \# Node.js \+ Express API

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

│   │   └── index.ts                \# Server entry point

│   ├── prisma/

│   │   ├── schema.prisma

│   │   └── migrations/

│   ├── package.json

│   ├── tsconfig.json

│   ├── .env

│   └── .env.example

│

└── aws-lambdas/                     \# AWS Lambda Functions

    ├── notification-worker/

    │   ├── index.ts

    │   └── package.json

    └── cleanup-jobs/

        ├── index.ts

        └── package.json

---

## **Phase 0: Pre-Development Setup (Manual Configuration Required)**

### **⚠️ YOUR ACTION REQUIRED: Platform Account Setup**

#### **Task 0.1: Create GitHub Repository**

**Description**: Initialize the project repository on GitHub  
 **Your Actions**:

* \[x\] Create new public repository: `gauntlet-messageai-24hr-mvp`  
* \[x\] Initialize with README.md  
* \[x\] Clone to local machine: `git clone https://github.com/joaocarlinho/gauntlet-messageai-24hr-mvp.git`  
* \[x\] Set up main branch protection (optional but recommended)

**Files Created**:

* `README.md`  
* `.gitignore`

---

#### **Task 0.2: Railway Account Setup**

**Description**: Set up Railway for backend hosting and PostgreSQL database  
 **Your Actions**:

* \[x\] Sign up at https://railway.app (use GitHub OAuth)  
* \[x\] Create new project: "MessageAI Backend"  
* \[x\] Add PostgreSQL service to project  
* \[x\] Note down database credentials:  
  * `DATABASE_URL` (will be auto-generated)  
  * Railway project ID  
  * Railway service domain  
* \[x\] Install Railway CLI: `npm i -g @railway/cli`  
* \[x\] Login to Railway CLI: `railway login`  
* \[x\] Link local project: `railway link` (do this after backend setup)

**Environment Variables to Save**:

DATABASE\_URL=postgresql://user:pass@railway.app:5432/railway

RAILWAY\_PROJECT\_ID=\<project-id\>

---

#### **Task 0.3: AWS Account Setup**

**Description**: Configure AWS services (S3, Lambda, SQS, EventBridge)  
 **Your Actions**:

* \[x\] Sign up/login to AWS Console  
* \[x\] Create IAM user for programmatic access:  
  * Username: `messageai-service`  
  * Permissions: `AmazonS3FullAccess`, `AWSLambdaFullAccess`, `AmazonSQSFullAccess`  
* \[x\] Generate access keys:  
  * Note down `AWS_ACCESS_KEY_ID`  
  * Note down `AWS_SECRET_ACCESS_KEY`  
* \[x\] Create S3 bucket:  
  * Name: `messageai-media-<random-suffix>`  
  * Region: `us-east-1` (or your preferred region)  
  * Enable CORS for file uploads  
  * Note down bucket name  
* \[x\] Create SQS queue:  
  * Name: `messageai-notification-queue`  
  * Type: Standard  
  * Note down queue URL

\[x\] Set up AWS CLI (optional for deployment):  
 aws configure\# Enter your access key, secret key, region

* 

**Environment Variables to Save**:

AWS\_ACCESS\_KEY\_ID=\<your-access-key\>

AWS\_SECRET\_ACCESS\_KEY=\<your-secret-key\>

AWS\_REGION=us-east-1

AWS\_S3\_BUCKET=messageai-media-\<suffix\>

AWS\_SQS\_QUEUE\_URL=https://sqs.us-east-1.amazonaws.com/...

---

#### **Task 0.4: Expo Account Setup**

**Description**: Set up Expo for React Native development and push notifications  
 **Your Actions**:

* \[x\] Sign up at https://expo.dev  
* \[x\] Create new project: "MessageAI"  
* \[x\] Note down project slug: `messageai`  
* \[x\] Generate Expo access token:  
  * Go to Access Tokens in account settings  
  * Create token: "MessageAI Development"  
  * Note down `EXPO_ACCESS_TOKEN`  
* \[x\] Install Expo CLI: `npm install -g expo-cli`  
* \[x\] Login: `expo login`

**Environment Variables to Save**:

EXPO\_PROJECT\_SLUG=messageai

EXPO\_ACCESS\_TOKEN=\<your-token\>

---

#### **Task 0.5: Firebase Setup (for Production Push Notifications)**

**Description**: Configure Firebase Cloud Messaging for production builds  
 **Your Actions**:

* \[x\] Go to https://console.firebase.google.com  
* \[x\] Create new project: "MessageAI"  
* \[x\] Add Android app:  
  * Package name: `com.joaocarlinho.messageai`  
  * Download `google-services.json`  
* \[x\] Add iOS app:  
  * Bundle ID: `com.joaocarlinho.messageai`  
  * Download `GoogleService-Info.plist`  
* \[x\] Enable Cloud Messaging  
* \[x\] Get server key from Project Settings \> Cloud Messaging  
* \[x\] Note down `FCM_SERVER_KEY`

**Environment Variables to Save**:

FCM\_SERVER\_KEY=\<your-server-key\>

**Note**: These files will be needed later, save them securely

---

## **Phase 1: Project Initialization**

### **PR \#1: Repository Setup & Project Scaffolding**

#### **Task 1.1: Initialize Monorepo Structure**

**Description**: Set up the monorepo with root package.json and workspace configuration  
 **Git Actions**:

cd gauntlet-messageai-24hr-mvp

git checkout \-b feature/project-init

**Files Created/Modified**:

* `package.json` (root)  
* `.gitignore`  
* `README.md`  
* `.env.example`

**Implementation Steps**:

* \[x\] Create root `package.json` with workspace configuration:

{

  "name": "messageai-monorepo",

  "private": true,

  "workspaces": \[

    "mobile",

    "backend",

    "aws-lambdas/\*"

  \],

  "scripts": {

    "mobile": "cd mobile && npm start",

    "backend": "cd backend && npm run dev",

    "install-all": "npm install && npm run install:mobile && npm run install:backend",

    "install:mobile": "cd mobile && npm install",

    "install:backend": "cd backend && npm install"

  }

}

* \[x\] Create comprehensive `.gitignore`:

\# Dependencies

node\_modules/

.pnp

.pnp.js

\# Expo

.expo/

.expo-shared/

dist/

web-build/

\# Environment

.env

.env.local

.env.\*.local

\# IDE

.vscode/

.idea/

\*.swp

\*.swo

\*\~

\# OS

.DS\_Store

Thumbs.db

\# Backend

backend/dist/

backend/.env

\# Mobile

mobile/.env

\# Build

\*.apk

\*.ipa

\*.aab

\# Logs

\*.log

npm-debug.log\*

* \[x\] Update README.md with project overview, setup instructions

---

#### **Task 1.2: Initialize React Native Frontend with Expo**

**Description**: Create Expo project with TypeScript and required dependencies  
 **Files Created**:

* `mobile/` (entire directory structure)  
* `mobile/package.json`  
* `mobile/app.json`  
* `mobile/tsconfig.json`  
* `mobile/.env.example`

**Implementation Steps**:

* \[x\] Run: `npx create-expo-app mobile --template expo-template-blank-typescript`  
* \[x\] Install dependencies:

cd mobile

npx expo install expo-router expo-sqlite expo-secure-store expo-image-picker expo-image expo-notifications @react-native-async-storage/async-storage

npm install socket.io-client kea react-query axios react-native-paper

npm install \-D @types/react @types/react-native

* \[x\] Configure `app.json`:

{

  "expo": {

    "name": "MessageAI",

    "slug": "messageai",

    "version": "1.0.0",

    "orientation": "portrait",

    "scheme": "messageai",

    "userInterfaceStyle": "automatic",

    "plugins": \[

      "expo-router",

      "expo-secure-store",

      "expo-sqlite",

      \[

        "expo-notifications",

        {

          "icon": "./assets/notification-icon.png",

          "color": "\#ffffff"

        }

      \]

    \],

    "ios": {

      "bundleIdentifier": "com.joaocarlinho.messageai",

      "supportsTablet": true

    },

    "android": {

      "package": "com.joaocarlinho.messageai",

      "adaptiveIcon": {

        "foregroundImage": "./assets/adaptive-icon.png",

        "backgroundColor": "\#ffffff"

      }

    }

  }

}

* \[x\] Create `mobile/.env.example`:

API\_URL=http://localhost:3000

SOCKET\_URL=http://localhost:3000

EXPO\_PUBLIC\_API\_URL=http://localhost:3000

---

#### **Task 1.3: Initialize Node.js Backend**

**Description**: Set up Express.js backend with TypeScript and Prisma  
 **Files Created**:

* `backend/` (entire directory structure)  
* `backend/package.json`  
* `backend/tsconfig.json`  
* `backend/prisma/schema.prisma`  
* `backend/.env.example`

**Implementation Steps**:

* \[x\] Create backend directory: `mkdir backend && cd backend`  
* \[x\] Initialize Node project: `npm init -y`  
* \[x\] Install dependencies:

npm install express socket.io prisma @prisma/client jsonwebtoken bcrypt cors dotenv express-validator aws-sdk

npm install \-D typescript ts-node nodemon @types/express @types/node @types/cors @types/jsonwebtoken @types/bcrypt

* \[x\] Create `tsconfig.json`:

{

  "compilerOptions": {

    "target": "ES2020",

    "module": "commonjs",

    "lib": \["ES2020"\],

    "outDir": "./dist",

    "rootDir": "./src",

    "strict": true,

    "esModuleInterop": true,

    "skipLibCheck": true,

    "forceConsistentCasingInFileNames": true,

    "resolveJsonModule": true

  },

  "include": \["src/\*\*/\*"\],

  "exclude": \["node\_modules"\]

}

* \[x\] Initialize Prisma: `npx prisma init`  
* \[x\] Create `backend/.env.example`:

PORT=3000

DATABASE\_URL=postgresql://user:pass@localhost:5432/messageai

JWT\_SECRET=your-super-secret-jwt-key-change-in-production

JWT\_REFRESH\_SECRET=your-super-secret-refresh-key-change-in-production

AWS\_ACCESS\_KEY\_ID=your-aws-access-key

AWS\_SECRET\_ACCESS\_KEY=your-aws-secret-key

AWS\_REGION=us-east-1

AWS\_S3\_BUCKET=messageai-media

AWS\_SQS\_QUEUE\_URL=https://sqs.us-east-1.amazonaws.com/your-queue

NODE\_ENV=development

* \[x\] Update `package.json` scripts:

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

---

#### **Task 1.4: Commit and Create PR \#1**

**Description**: Commit project initialization and push to GitHub  
 **Git Actions**:

git add .

git commit \-m "feat: Initialize monorepo with React Native (Expo) and Node.js backend"

git push origin feature/project-init

**Your Actions**:

* \[x\] Create Pull Request on GitHub: "PR \#1: Project Initialization & Scaffolding"  
* \[x\] Review changes in GitHub UI  
* \[x\] Merge PR to main  
* \[x\] Pull latest changes: `git checkout master && git pull`

---

## **Phase 2: Database & Authentication**

### **PR \#2: Database Schema & Prisma Setup**

#### **Task 2.1: Define Prisma Schema**

**Description**: Create complete database schema with all models  
 **Git Actions**:

git checkout \-b feature/database-schema

**Files Modified**:

* `backend/prisma/schema.prisma`

**Implementation Steps**:

* \[x\] Update `schema.prisma` with complete schema (from PRD):

generator client {

  provider \= "prisma-client-js"

}

datasource db {

  provider \= "postgresql"

  url      \= env("DATABASE\_URL")

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


  sentMessages     Message\[\]

  conversations    ConversationMember\[\]

  readReceipts     ReadReceipt\[\]

}

model Conversation {

  id            String   @id @default(uuid())

  type          String   // "direct" or "group"

  name          String?  // for group chats

  createdAt     DateTime @default(now())

  updatedAt     DateTime @updatedAt


  members       ConversationMember\[\]

  messages      Message\[\]

}

model ConversationMember {

  id              String   @id @default(uuid())

  conversationId  String

  userId          String

  joinedAt        DateTime @default(now())

  lastReadAt      DateTime?


  conversation    Conversation @relation(fields: \[conversationId\], references: \[id\], onDelete: Cascade)

  user            User @relation(fields: \[userId\], references: \[id\], onDelete: Cascade)


  @@unique(\[conversationId, userId\])

  @@index(\[userId\])

  @@index(\[conversationId\])

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


  conversation    Conversation @relation(fields: \[conversationId\], references: \[id\], onDelete: Cascade)

  sender          User @relation(fields: \[senderId\], references: \[id\], onDelete: Cascade)

  readReceipts    ReadReceipt\[\]


  @@index(\[conversationId\])

  @@index(\[senderId\])

  @@index(\[createdAt\])

}

model ReadReceipt {

  id          String   @id @default(uuid())

  messageId   String

  userId      String

  readAt      DateTime @default(now())


  message     Message @relation(fields: \[messageId\], references: \[id\], onDelete: Cascade)

  user        User @relation(fields: \[userId\], references: \[id\], onDelete: Cascade)


  @@unique(\[messageId, userId\])

  @@index(\[messageId\])

  @@index(\[userId\])

}

---

#### **Task 2.2: Run Initial Migration**

**Description**: Create and run first Prisma migration  
 **Your Actions**:

* \[x\] Copy `DATABASE_URL` from Railway to `backend/.env`  
* \[x\] Run migration: `cd backend && npx prisma migrate dev --name init`  
* \[x\] Generate Prisma Client: `npx prisma generate`  
* \[x\] Verify in Railway dashboard that tables are created

**Files Created**:

* `backend/prisma/migrations/` (migration files)

---

#### **Task 2.3: Create Database Client Wrapper**

**Description**: Set up Prisma client singleton  
 **Files Created**:

* `backend/src/config/database.ts`

**Implementation Steps**:

* \[x\] Create `backend/src/config/database.ts`:

import { PrismaClient } from '@prisma/client';

const prisma \= new PrismaClient({

  log: process.env.NODE\_ENV \=== 'development' ? \['query', 'error', 'warn'\] : \['error'\],

});

export default prisma;

---

#### **Task 2.4: Commit and Create PR \#2**

**Git Actions**:

git add .

git commit \-m "feat: Add Prisma schema and initial database migration"

git push origin feature/database-schema

**Your Actions**:

* \[x\] Create PR \#2: "Database Schema & Prisma Setup"  
* \[x\] Merge to main

---

### **PR \#3: Authentication System**

#### **Task 3.1: Create JWT Utility Functions**

**Description**: Implement JWT token generation and verification  
 **Git Actions**:

git checkout master && git pull

git checkout \-b feature/authentication

**Files Created**:

* `backend/src/utils/jwt.ts`

**Implementation Steps**:

* \[x\] Create JWT utility with access/refresh token generation  
* \[x\] Add token verification functions  
* \[x\] Include token refresh logic

---

#### **Task 3.2: Create Auth Middleware**

**Description**: Build authentication middleware for protected routes  
 **Files Created**:

* `backend/src/middleware/auth.ts`

**Implementation Steps**:

* \[x\] Create middleware to verify JWT from Authorization header  
* \[x\] Add user object to request context  
* \[x\] Handle token expiration errors

---

#### **Task 3.3: Build Auth Service**

**Description**: Implement registration, login, and token refresh logic  
 **Files Created**:

* `backend/src/services/auth.service.ts`

**Implementation Steps**:

* \[x\] Create user registration with password hashing  
* \[x\] Implement login with credential verification  
* \[x\] Add refresh token functionality  
* \[x\] Include password validation

---

#### **Task 3.4: Create Auth Controller**

**Description**: Build REST endpoints for authentication  
 **Files Created**:

* `backend/src/controllers/auth.controller.ts`

**Implementation Steps**:

* \[x\] POST `/api/v1/auth/register` endpoint  
* \[x\] POST `/api/v1/auth/login` endpoint  
* \[x\] POST `/api/v1/auth/refresh` endpoint  
* \[x\] Add request validation

---

#### **Task 3.5: Create Auth Routes**

**Description**: Set up authentication route handlers  
 **Files Created**:

* `backend/src/routes/auth.routes.ts`

**Implementation Steps**:

* \[x\] Define auth routes with controllers  
* \[x\] Add input validation middleware  
* \[x\] Connect to Express app

---

#### **Task 3.6: Create Main Server Entry Point**

**Description**: Set up Express server with basic configuration  
 **Files Created**:

* `backend/src/index.ts`

**Implementation Steps**:

* \[x\] Initialize Express app  
* \[x\] Configure CORS, body-parser  
* \[x\] Mount auth routes under `/api/v1`  
* \[x\] Add error handling middleware  
* \[x\] Start server on PORT from env

---

#### **Task 3.7: Test Authentication Locally**

**Description**: Verify auth endpoints work  
 **Your Actions**:

* \[x\] Start backend: `cd backend && npm run dev`  
* \[x\] Test registration with Postman/curl  
* \[x\] Test login and receive JWT  
* \[x\] Test refresh token endpoint

---

#### **Task 3.8: Commit and Create PR \#3**

**Git Actions**:

git add .

git commit \-m "feat: Implement complete authentication system with JWT"

git push origin feature/authentication

**Your Actions**:

* \[x\] Create PR \#3: "Authentication System"  
* \[x\] Merge to main

---

## **Phase 3: Core Messaging Infrastructure**

### **PR \#4: User & Profile Management**

#### **Task 4.1: Create User Service**

**Description**: Implement user-related business logic  
 **Git Actions**:

git checkout master && git pull

git checkout \-b feature/user-management

**Files Created**:

* `backend/src/services/users.service.ts`

**Implementation Steps**:

* \[x\] Get user profile by ID  
* \[x\] Update user profile (displayName)  
* \[x\] Update online status  
* \[x\] Get user's conversations list

---

#### **Task 4.2: Create Users Controller** ✅ **COMPLETED**

**Description**: Build REST endpoints for user operations  
 **Files Created**:

* `backend/src/controllers/users.controller.ts`

**Implementation Steps**:

* \[x\] GET `/api/v1/users/me` \- get current user  
* \[x\] PUT `/api/v1/users/me` \- update profile  
* \[x\] POST `/api/v1/users/avatar` \- upload avatar (S3)

---

#### **Task 4.3: Create S3 Service** ✅ **COMPLETED**

**Description**: Handle file uploads to AWS S3  
 **Files Created**:

* `backend/src/services/s3.service.ts`  
* `backend/src/config/aws.ts`

**Implementation Steps**:

* \[x\] Configure AWS S3 client  
* \[x\] Create upload function with pre-signed URLs  
* \[x\] Add file type validation  
* \[x\] Generate public URLs for avatars

---

#### **Task 4.4: Create User Routes** ✅ **COMPLETED**

**Description**: Mount user endpoints  
 **Files Created**:

* `backend/src/routes/users.routes.ts`

**Implementation Steps**:

* \[x\] Define user routes with auth middleware  
* \[x\] Connect to Express app in `index.ts`

---

#### **Task 4.5: Commit and Create PR \#4** ✅ **COMPLETED**

**Git Actions**:

git add .

git commit \-m "feat: Add user profile management and S3 avatar uploads"

git push origin feature/user-management

**Your Actions**:

* \[x\] Create PR \#4: "User & Profile Management"  
* \[ \] Merge to main

---

### **PR \#5: Conversations & Messages (REST API)**

#### **Task 5.1: Create Conversation Service** ✅ **COMPLETED**

**Description**: Implement conversation management logic  
 **Git Actions**:

git checkout master && git pull

git checkout \-b feature/conversations-api

**Files Created**:

* `backend/src/services/conversation.service.ts`

**Implementation Steps**:

* \[x\] Create direct conversation (1-on-1)  
* \[x\] Create group conversation  
* \[x\] Get user's conversation list with last message  
* \[x\] Get conversation by ID with members  
* \[x\] Add/remove members (for future)

---

#### **Task 5.2: Create Message Service** ✅ **COMPLETED**

**Description**: Implement message handling logic  
 **Files Created**:

* `backend/src/services/message.service.ts`

**Implementation Steps**:

* \[x\] Create message in database  
* \[x\] Get messages for conversation (with pagination)  
* \[x\] Update message status (sent/delivered/read)  
* \[x\] Create read receipts  
* \[x\] Get unread message count

---

#### **Task 5.3: Create Conversations Controller** ✅ **COMPLETED**

**Description**: Build REST endpoints for conversations  
 **Files Created**:

* `backend/src/controllers/conversations.controller.ts`

**Implementation Steps**:

* \[x\] GET `/api/v1/conversations` \- list user's conversations  
* \[x\] POST `/api/v1/conversations` \- create new conversation  
* \[x\] GET `/api/v1/conversations/:id` \- get conversation details

---

#### **Task 5.4: Create Messages Controller** ✅ **COMPLETED**

**Description**: Build REST endpoints for messages  
 **Files Created**:

* `backend/src/controllers/messages.controller.ts`

**Implementation Steps**:

* \[x\] GET `/api/v1/conversations/:id/messages` \- get messages (paginated)  
* \[x\] POST `/api/v1/conversations/:id/messages` \- create message (REST fallback)

---

#### **Task 5.5: Create Routes** ✅ **COMPLETED**

**Description**: Mount conversation and message routes  
 **Files Created**:

* `backend/src/routes/conversations.routes.ts`  
* `backend/src/routes/messages.routes.ts`

**Implementation Steps**:

* \[x\] Define routes with auth middleware  
* \[x\] Connect to Express app in `index.ts`

---

#### **Task 5.6: Commit and Create PR \#5**

**Git Actions**:

git add .

git commit \-m "feat: Add conversations and messages REST API"

git push origin feature/conversations-api

**Your Actions**:

* \[x\] Create PR \#5: "Conversations & Messages REST API"  
* \[x\] Merge to main

---

### **PR \#6: Real-Time Messaging (Socket.io)**

#### **Task 6.1: Configure Socket.io Server**

**Description**: Set up Socket.io with authentication  
 **Git Actions**:

git checkout master && git pull

git checkout \-b feature/socket-io

**Files Created**:

* `backend/src/config/socket.ts`  
* `backend/src/socket/index.ts`

**Implementation Steps**:

* \[x\] Initialize Socket.io with CORS configuration  
* \[x\] Add JWT authentication middleware for socket connections  
* \[x\] Configure transport fallback: `['polling', 'websocket']`  
* \[x\] Set up connection/disconnection handlers

---

#### **Task 6.2: Create Presence Service**

**Description**: Handle online/offline status tracking  
 **Files Created**:

* `backend/src/services/presence.service.ts`

**Implementation Steps**:

* \[x\] Track user online status in database  
* \[x\] Update lastSeen timestamp  
* \[x\] Emit presence updates to connected clients  
* \[x\] Handle heartbeat mechanism

---

#### **Task 6.3: Create Message Socket Handler** ✅ **COMPLETED**

**Description**: Handle real-time message events  
 **Files Created**:

* `backend/src/socket/handlers/message.handler.ts`

**Implementation Steps**:

* \[x\] Handle `send_message` event  
* \[x\] Emit `message_received` to conversation participants  
* \[x\] Handle `mark_read` event  
* \[x\] Emit delivery and read receipts  
* \[x\] Implement optimistic update confirmations

---

#### **Task 6.4: Create Presence Socket Handler** ✅ **COMPLETED**

**Description**: Handle presence and typing indicators  
 **Files Created**:

* `backend/src/socket/handlers/presence.handler.ts`

**Implementation Steps**:

* \[x\] Handle `typing_start` and `typing_stop` events  
* \[x\] Emit typing indicators to conversation members  
* \[x\] Handle online status updates  
* \[x\] Implement heartbeat for connection monitoring

---

#### **Task 6.5: Create Room Management** ✅ **COMPLETED**

**Description**: Manage Socket.io rooms for conversations  
 **Files Created**:

* `backend/src/socket/room-manager.ts`

**Files Modified**:

* `backend/src/socket/index.ts`  
* `backend/src/socket/handlers/presence.handler.ts`  
* `backend/src/socket/handlers/message.handler.ts`  
* `backend/src/config/socket.ts`

**Implementation Steps**:

* \[x\] Handle `join_conversation` \- add socket to room  
* \[x\] Handle `leave_conversation` \- remove from room  
* \[x\] Emit events to specific conversation rooms  
* \[x\] Clean up rooms on disconnect

---

#### **Task 6.6: Integrate Socket.io with Express** ✅ **COMPLETED**

**Description**: Mount Socket.io server on Express app  
 **Files Modified**:

* `backend/src/index.ts`

**Implementation Steps**:

* \[x\] Create HTTP server from Express app  
* \[x\] Initialize Socket.io with HTTP server  
* \[x\] Import and initialize socket handlers  
* \[x\] Start server listening on PORT

---

#### **Task 6.7: Test Socket.io Locally** ✅ **COMPLETED**

**Description**: Verify real-time messaging works  
 **Your Actions**:

* \[x\] Start backend: `cd backend && npm run dev`  
* \[x\] Use Socket.io client tester or Postman WebSocket feature  
* \[x\] Test connection with JWT token  
* \[x\] Test send\_message event  
* \[x\] Verify message\_received emission

---

#### **Task 6.8: Commit and Create PR \#6**

**Git Actions**:

git add .

git commit \-m "feat: Add Socket.io real-time messaging with presence and typing indicators"

git push origin feature/socket-io

**Your Actions**:

* \[ \] Create PR \#6: "Real-Time Messaging (Socket.io)"  
* \[ \] Merge to main

---

## **Phase 4: Mobile Frontend \- Authentication & Navigation**

### **PR \#7: Mobile App Structure & Navigation**

#### **Task 7.1: Set Up Expo Router Structure**

**Description**: Create file-based routing with Expo Router  
 **Git Actions**:

git checkout master && git pull

git checkout \-b feature/mobile-navigation

**Files Created**:

* `mobile/app/_layout.tsx`  
* `mobile/app/(auth)/_layout.tsx`  
* `mobile/app/(auth)/login.tsx`  
* `mobile/app/(auth)/register.tsx`  
* `mobile/app/(tabs)/_layout.tsx`  
* `mobile/app/(tabs)/index.tsx`  
* `mobile/app/(tabs)/profile.tsx`  
* `mobile/app/chat/[id].tsx`  
* `mobile/app/group/new.tsx`

**Implementation Steps**:

* \[ \] Create root layout with auth check  
* \[ \] Set up auth stack (login/register)  
* \[ \] Create tab navigator (chat list, profile)  
* \[ \] Add dynamic chat route with parameter  
* \[ \] Create group creation screen

---

#### **Task 7.2: Create TypeScript Types**

**Description**: Define shared types for the mobile app  
 **Files Created**:

* `mobile/types/index.ts`

**Implementation Steps**:

* \[ \] Define User, Message, Conversation, ConversationMember types  
* \[ \] Define API response types  
* \[ \] Define Socket event types  
* \[ \] Export all types

---

#### **Task 7.3: Create API Client**

**Description**: Set up Axios client with interceptors  
 **Files Created**:

* `mobile/lib/api.ts`

**Implementation Steps**:

* \[ \] Create Axios instance with base URL from env  
* \[ \] Add request interceptor to attach JWT token  
* \[ \] Add response interceptor to handle 401 (token refresh)  
* \[ \] Create API functions for auth, users, conversations, messages

---

#### **Task 7.4: Create Storage Utility**

**Description**: Wrapper for Expo SecureStore  
 **Files Created**:

* `mobile/lib/storage.ts`

**Implementation Steps**:

* \[ \] Create functions to save/get/delete tokens  
* \[ \] Add functions for user data persistence  
* \[ \] Include error handling

---

#### **Task 7.5: Create UI Components**

**Description**: Build reusable UI components  
 **Files Created**:

* `mobile/components/ui/Button.tsx`  
* `mobile/components/ui/Avatar.tsx`  
* `mobile/components/ui/StatusIndicator.tsx`  
* `mobile/components/layout/ErrorBoundary.tsx`

**Implementation Steps**:

* \[ \] Create styled Button component  
* \[ \] Create Avatar with initials fallback  
* \[ \] Create online/offline StatusIndicator  
* \[ \] Add ErrorBoundary for crash protection

---

#### **Task 7.6: Commit and Create PR \#7**

**Git Actions**:

git add .

git commit \-m "feat: Set up mobile app navigation structure and base components"

git push origin feature/mobile-navigation

**Your Actions**:

* \[ \] Create PR \#7: "Mobile Navigation & Base Structure"  
* \[ \] Merge to main

---

### **PR \#8: Mobile Authentication**

#### **Task 8.1: Create Kea Auth Logic**

**Description**: Set up Kea store for authentication state  
 **Git Actions**:

git checkout master && git pull

git checkout \-b feature/mobile-auth

**Files Created**:

* `mobile/store/auth.ts`

**Implementation Steps**:

* \[ \] Create Kea logic for auth state (user, tokens, isAuthenticated)  
* \[ \] Add actions: login, register, logout, refreshToken  
* \[ \] Add listeners for API calls  
* \[ \] Persist auth state to SecureStore

---

#### **Task 8.2: Create Auth Hook**

**Description**: Custom hook for auth operations  
 **Files Created**:

* `mobile/hooks/useAuth.ts`

**Implementation Steps**:

* \[ \] Create hook that uses Kea auth logic  
* \[ \] Export login, register, logout functions  
* \[ \] Include loading and error states

---

#### **Task 8.3: Build Login Screen**

**Description**: Create login UI with form validation  
 **Files Modified**:

* `mobile/app/(auth)/login.tsx`

**Implementation Steps**:

* \[ \] Create form with email/password inputs  
* \[ \] Add form validation  
* \[ \] Connect to auth hook  
* \[ \] Handle loading states and errors  
* \[ \] Navigate to chat list on success  
* \[ \] Add link to register screen

---

#### **Task 8.4: Build Register Screen**

**Description**: Create registration UI  
 **Files Modified**:

* `mobile/app/(auth)/register.tsx`

**Implementation Steps**:

* \[ \] Create form with email, password, display name  
* \[ \] Add validation (password strength, email format)  
* \[ \] Connect to auth hook  
* \[ \] Handle registration errors  
* \[ \] Navigate to chat list on success

---

#### **Task 8.5: Update Root Layout with Auth Check**

**Description**: Protect routes based on auth state  
 **Files Modified**:

* `mobile/app/_layout.tsx`

**Implementation Steps**:

* \[ \] Check auth state on app load  
* \[ \] Redirect to login if not authenticated  
* \[ \] Redirect to chat list if authenticated  
* \[ \] Show loading screen during check

---

#### **Task 8.6: Test Authentication Flow**

**Description**: Verify login/register works  
 **Your Actions**:

* \[ \] Copy backend API URL to `mobile/.env`: `API_URL=https://your-railway-app.railway.app`  
* \[ \] Start mobile app: `cd mobile && npx expo start`  
* \[ \] Test registration on device/simulator  
* \[ \] Test login  
* \[ \] Verify token storage in SecureStore  
* \[ \] Test logout

---

#### **Task 8.7: Commit and Create PR \#8**

**Git Actions**:

git add .

git commit \-m "feat: Implement mobile authentication with login and register screens"

git push origin feature/mobile-auth

**Your Actions**:

* \[ \] Create PR \#8: "Mobile Authentication"  
* \[ \] Merge to main

---

## **Phase 5: Mobile Frontend \- Chat Interface**

### **PR \#9: Chat List Screen**

#### **Task 9.1: Create Conversations Kea Logic**

**Description**: Set up state management for conversations  
 **Git Actions**:

git checkout master && git pull

git checkout \-b feature/chat-list

**Files Created**:

* `mobile/store/conversations.ts`

**Implementation Steps**:

* \[ \] Create Kea logic for conversations list  
* \[ \] Add actions: loadConversations, selectConversation  
* \[ \] Integrate with React Query for caching  
* \[ \] Sort conversations by last message timestamp

---

#### **Task 9.2: Create ChatItem Component**

**Description**: Build conversation list item component  
 **Files Created**:

* `mobile/components/chat/ChatItem.tsx`

**Implementation Steps**:

* \[ \] Display avatar, name, last message preview  
* \[ \] Show timestamp (relative: "5m ago")  
* \[ \] Display unread badge count  
* \[ \] Show online status indicator  
* \[ \] Add press handler to navigate to chat

---

#### **Task 9.3: Build Chat List Screen**

**Description**: Create main conversation list view  
 **Files Modified**:

* `mobile/app/(tabs)/index.tsx`

**Implementation Steps**:

* \[ \] Fetch conversations on mount  
* \[ \] Render FlatList with ChatItem components  
* \[ \] Add pull-to-refresh  
* \[ \] Show empty state for no conversations  
* \[ \] Add floating action button to start new chat  
* \[ \] Handle navigation to chat room

---

#### **Task 9.4: Commit and Create PR \#9**

**Git Actions**:

git add .

git commit \-m "feat: Add chat list screen with conversation items"

git push origin feature/chat-list

**Your Actions**:

* \[ \] Create PR \#9: "Chat List Screen"  
* \[ \] Merge to main

---

### **PR \#10: Chat Room \- UI Components**

#### **Task 10.1: Create MessageBubble Component**

**Description**: Build message bubble with sender styling  
 **Git Actions**:

git checkout master && git pull

git checkout \-b feature/chat-room-ui

**Files Created**:

* `mobile/components/chat/MessageBubble.tsx`

**Implementation Steps**:

* \[ \] Create bubble with different styles for sent/received  
* \[ \] Display message content  
* \[ \] Show timestamp below bubble  
* \[ \] Add read receipts (checkmarks)  
* \[ \] Display message status (sending, sent, delivered, read)  
* \[ \] Support text and image types

---

#### **Task 10.2: Create InputToolbar Component**

**Description**: Build message input with send button  
 **Files Created**:

* `mobile/components/chat/InputToolbar.tsx`

**Implementation Steps**:

* \[ \] Create TextInput with auto-growing height  
* \[ \] Add send button (disabled when empty)  
* \[ \] Add image picker button  
* \[ \] Handle input focus/blur  
* \[ \] Trigger typing indicators

---

#### **Task 10.3: Create TypingIndicator Component**

**Description**: Show "User is typing..." indicator  
 **Files Created**:

* `mobile/components/chat/TypingIndicator.tsx`

**Implementation Steps**:

* \[ \] Display animated dots  
* \[ \] Show typing user's name  
* \[ \] Auto-hide after timeout  
* \[ \] Support multiple users typing

---

#### **Task 10.4: Commit and Create PR \#10**

**Git Actions**:

git add .

git commit \-m "feat: Create chat room UI components (MessageBubble, InputToolbar, TypingIndicator)"

git push origin feature/chat-room-ui

**Your Actions**:

* \[ \] Create PR \#10: "Chat Room UI Components"  
* \[ \] Merge to main

---

### **PR \#11: Local Database (SQLite)**

#### **Task 11.1: Create SQLite Schema**

**Description**: Define local database schema for offline storage  
 **Git Actions**:

git checkout master && git pull

git checkout \-b feature/sqlite-storage

**Files Created**:

* `mobile/db/schema.ts`

**Implementation Steps**:

* \[ \] Create Users table  
* \[ \] Create Conversations table  
* \[ \] Create Messages table  
* \[ \] Create ReadReceipts table  
* \[ \] Add indexes for performance

---

#### **Task 11.2: Create Database Queries**

**Description**: Build CRUD functions for local database  
 **Files Created**:

* `mobile/db/queries.ts`

**Implementation Steps**:

* \[ \] Create functions to insert/update/delete messages  
* \[ \] Add queries to fetch conversation messages  
* \[ \] Create functions to update message status  
* \[ \] Add conversation CRUD operations  
* \[ \] Include read receipt management

---

#### **Task 11.3: Initialize Database on App Start**

**Description**: Set up database when app launches  
 **Files Modified**:

* `mobile/app/_layout.tsx`

**Implementation Steps**:

* \[ \] Open/create SQLite database on mount  
* \[ \] Run migrations if needed  
* \[ \] Handle database errors gracefully

---

#### **Task 11.4: Commit and Create PR \#11**

**Git Actions**:

git add .

git commit \-m "feat: Add SQLite local database for offline message storage"

git push origin feature/sqlite-storage

**Your Actions**:

* \[ \] Create PR \#11: "Local SQLite Database"  
* \[ \] Merge to main

---

### **PR \#12: Socket.io Client Integration**

#### **Task 12.1: Create Socket Client**

**Description**: Set up Socket.io client with authentication  
 **Git Actions**:

git checkout master && git pull

git checkout \-b feature/socket-client

**Files Created**:

* `mobile/lib/socket.ts`

**Implementation Steps**:

* \[ \] Initialize Socket.io client with auth token  
* \[ \] Configure transports: `['polling', 'websocket']`  
* \[ \] Add connection/disconnection handlers  
* \[ \] Add reconnection logic with exponential backoff  
* \[ \] Show connection status in UI

---

#### **Task 12.2: Create Socket Hook**

**Description**: Custom hook for socket operations  
 **Files Created**:

* `mobile/hooks/useSocket.ts`

**Implementation Steps**:

* \[ \] Create hook that manages socket connection  
* \[ \] Add functions to emit events (send\_message, typing\_start, etc.)  
* \[ \] Add listeners for incoming events  
* \[ \] Return socket state (connected, connecting, disconnected)  
* \[ \] Clean up listeners on unmount

---

#### **Task 12.3: Create Messages Kea Logic**

**Description**: State management for messages with optimistic updates  
 **Files Created**:

* `mobile/store/messages.ts`

**Implementation Steps**:

* \[ \] Create Kea logic for messages by conversation  
* \[ \] Add action: sendMessage (optimistic)  
* \[ \] Add listener: handle message\_received from socket  
* \[ \] Update message status on delivery/read events  
* \[ \] Sync with local SQLite database

---

#### **Task 12.4: Create Messages Hook**

**Description**: Hook for message operations  
 **Files Created**:

* `mobile/hooks/useMessages.ts`

**Implementation Steps**:

* \[ \] Load messages from local DB on mount  
* \[ \] Subscribe to socket events for new messages  
* \[ \] Provide sendMessage function  
* \[ \] Handle optimistic updates  
* \[ \] Sync read receipts

---

#### **Task 12.5: Commit and Create PR \#12**

**Git Actions**:

git add .

git commit \-m "feat: Integrate Socket.io client with optimistic message updates"

git push origin feature/socket-client

**Your Actions**:

* \[ \] Create PR \#12: "Socket.io Client Integration"  
* \[ \] Merge to main

---

### **PR \#13: Chat Room Screen \- Full Implementation**

#### **Task 13.1: Build Chat Room Screen**

**Description**: Complete chat room with real-time messaging  
 **Git Actions**:

git checkout master && git pull

git checkout \-b feature/chat-room-complete

**Files Modified**:

* `mobile/app/chat/[id].tsx`

**Implementation Steps**:

* \[ \] Get conversation ID from route params  
* \[ \] Load messages from local DB  
* \[ \] Connect to socket and join conversation room  
* \[ \] Render FlatList (inverted) with MessageBubble components  
* \[ \] Add InputToolbar at bottom  
* \[ \] Handle send message with optimistic update  
* \[ \] Update UI when new messages arrive via socket  
* \[ \] Show typing indicators  
* \[ \] Mark messages as read when visible

---

#### **Task 13.2: Implement Optimistic UI**

**Description**: Messages appear instantly before server confirmation  
 **Files Modified**:

* `mobile/store/messages.ts`  
* `mobile/app/chat/[id].tsx`

**Implementation Steps**:

* \[ \] Generate temporary message ID (UUID)  
* \[ \] Add message to local state with status="sending"  
* \[ \] Save to local SQLite  
* \[ \] Emit send\_message event to server  
* \[ \] On server ACK: update message with real ID, status="sent"  
* \[ \] On error: mark as failed, allow retry

---

#### **Task 13.3: Add Typing Indicators**

**Description**: Show when other users are typing  
 **Files Modified**:

* `mobile/app/chat/[id].tsx`

**Implementation Steps**:

* \[ \] Emit typing\_start when user starts typing  
* \[ \] Emit typing\_stop after 3s of inactivity  
* \[ \] Listen for user\_typing events from socket  
* \[ \] Display TypingIndicator component  
* \[ \] Hide when user\_stopped\_typing received

---

#### **Task 13.4: Implement Read Receipts**

**Description**: Mark messages as read and show checkmarks  
 **Files Modified**:

* `mobile/app/chat/[id].tsx`  
* `mobile/components/chat/MessageBubble.tsx`

**Implementation Steps**:

* \[ \] Mark messages as read when they appear on screen  
* \[ \] Emit mark\_read event for each message  
* \[ \] Listen for message\_read events  
* \[ \] Update MessageBubble to show single/double checkmarks  
* \[ \] Show blue checkmarks when read

---

#### **Task 13.5: Test Chat Room End-to-End**

**Description**: Verify real-time chat works between two devices  
 **Your Actions**:

* \[ \] Open app on two devices/simulators  
* \[ \] Log in as different users  
* \[ \] Create conversation between them  
* \[ \] Send messages from Device A  
* \[ \] Verify messages appear on Device B in real-time  
* \[ \] Test typing indicators  
* \[ \] Test read receipts  
* \[ \] Test offline scenario (turn off WiFi, send message, reconnect)

---

#### **Task 13.6: Commit and Create PR \#13**

**Git Actions**:

git add .

git commit \-m "feat: Complete chat room with real-time messaging, typing indicators, and read receipts"

git push origin feature/chat-room-complete

**Your Actions**:

* \[ \] Create PR \#13: "Chat Room \- Full Implementation"  
* \[ \] Merge to main

---

## **Phase 6: Group Chat & Media**

### **PR \#14: Group Chat Functionality**

#### **Task 14.1: Create New Group Screen**

**Description**: UI to create group with multiple participants  
 **Git Actions**:

git checkout master && git pull

git checkout \-b feature/group-chat

**Files Modified**:

* `mobile/app/group/new.tsx`

**Implementation Steps**:

* \[ \] Create UI to search/select users  
* \[ \] Add group name input  
* \[ \] Show selected participants list  
* \[ \] Call API to create group conversation  
* \[ \] Navigate to group chat on success

---

#### **Task 14.2: Update Backend for Group Chat**

**Description**: Enhance conversation creation for groups  
 **Files Modified**:

* `backend/src/services/conversation.service.ts`  
* `backend/src/controllers/conversations.controller.ts`

**Implementation Steps**:

* \[ \] Accept array of userIds for group creation  
* \[ \] Create conversation with type="group"  
* \[ \] Add all members to ConversationMember table  
* \[ \] Return conversation with member details

---

#### **Task 14.3: Update MessageBubble for Groups**

**Description**: Show sender name/avatar in group messages  
 **Files Modified**:

* `mobile/components/chat/MessageBubble.tsx`

**Implementation Steps**:

* \[ \] Display sender avatar in received messages (group only)  
* \[ \] Show sender name above message bubble  
* \[ \] Keep sent messages without sender info  
* \[ \] Detect conversation type (direct vs group)

---

#### **Task 14.4: Update Socket Handler for Groups**

**Description**: Emit messages to all group members  
 **Files Modified**:

* `backend/src/socket/handlers/message.handler.ts`

**Implementation Steps**:

* \[ \] Get all conversation members  
* \[ \] Emit message\_received to all online members  
* \[ \] Track delivery per member  
* \[ \] Handle read receipts from multiple users

---

#### **Task 14.5: Test Group Chat**

**Description**: Verify group messaging works with 3+ users  
 **Your Actions**:

* \[ \] Create group with 3 users  
* \[ \] Send messages from different members  
* \[ \] Verify all members receive messages  
* \[ \] Test typing indicators in group  
* \[ \] Test read receipts for each member

---

#### **Task 14.6: Commit and Create PR \#14**

**Git Actions**:

git add .

git commit \-m "feat: Add group chat functionality with 3+ participants"

git push origin feature/group-chat

**Your Actions**:

* \[ \] Create PR \#14: "Group Chat Functionality"  
* \[ \] Merge to main

---

### **PR \#15: Image Upload & Display**

#### **Task 15.1: Add Image Picker to InputToolbar**

**Description**: Allow users to select and send images  
 **Git Actions**:

git checkout master && git pull

git checkout \-b feature/image-upload

**Files Modified**:

* `mobile/components/chat/InputToolbar.tsx`

**Implementation Steps**:

* \[ \] Add image picker button (camera icon)  
* \[ \] Use Expo ImagePicker to select image  
* \[ \] Compress image before upload  
* \[ \] Show upload progress indicator  
* \[ \] Send image message after upload

---

#### **Task 15.2: Create Media Upload Endpoint**

**Description**: Backend endpoint to upload images to S3  
 **Files Created**:

* `backend/src/routes/media.routes.ts`  
* `backend/src/controllers/media.controller.ts`

**Files Modified**:

* `backend/src/services/s3.service.ts`

**Implementation Steps**:

* \[ \] POST `/api/v1/media/upload` endpoint  
* \[ \] Accept multipart/form-data image upload  
* \[ \] Validate file type and size  
* \[ \] Upload to S3 with unique filename  
* \[ \] Return public URL

---

#### **Task 15.3: Update MessageBubble for Images**

**Description**: Display images in chat bubbles  
 **Files Modified**:

* `mobile/components/chat/MessageBubble.tsx`

**Implementation Steps**:

* \[ \] Detect message type="image"  
* \[ \] Display image with Expo Image component  
* \[ \] Add loading state for image  
* \[ \] Make image tappable for fullscreen view  
* \[ \] Show image dimensions (max width/height)

---

#### **Task 15.4: Create Image Fullscreen View**

**Description**: Modal to view images fullscreen  
 **Files Created**:

* `mobile/components/chat/ImageViewer.tsx`

**Implementation Steps**:

* \[ \] Create modal overlay  
* \[ \] Display image at full size  
* \[ \] Add pinch-to-zoom gesture  
* \[ \] Add close button  
* \[ \] Support swiping to close

---

#### **Task 15.5: Update Socket Handler for Image Messages**

**Description**: Handle image messages via socket  
 **Files Modified**:

* `backend/src/socket/handlers/message.handler.ts`

**Implementation Steps**:

* \[ \] Accept mediaUrl in send\_message event  
* \[ \] Store message with type="image"  
* \[ \] Emit message\_received with image URL  
* \[ \] Handle same as text messages

---

#### **Task 15.6: Test Image Sending**

**Description**: Verify image upload and display works  
 **Your Actions**:

* \[ \] Send image from Device A  
* \[ \] Verify image uploads to S3  
* \[ \] Verify Device B receives image message  
* \[ \] Test image display in chat  
* \[ \] Test fullscreen image view

---

#### **Task 15.7: Commit and Create PR \#15**

**Git Actions**:

git add .

git commit \-m "feat: Add image upload and display in chat messages"

git push origin feature/image-upload

**Your Actions**:

* \[ \] Create PR \#15: "Image Upload & Display"  
* \[ \] Merge to main

---

## **Phase 7: Push Notifications & Presence**

### **PR \#16: Online Presence System**

#### **Task 16.1: Update Presence Service**

**Description**: Track user online status and last seen  
 **Git Actions**:

git checkout master && git pull

git checkout \-b feature/presence-system

**Files Modified**:

* `backend/src/services/presence.service.ts`

**Implementation Steps**:

* \[ \] Update user isOnline=true on socket connect  
* \[ \] Update lastSeen on disconnect  
* \[ \] Emit user\_online to user's contacts  
* \[ \] Emit user\_offline with lastSeen  
* \[ \] Implement heartbeat mechanism (ping every 30s)

---

#### **Task 16.2: Create Presence Hook**

**Description**: Track and display user presence in mobile app  
 **Files Created**:

* `mobile/hooks/usePresence.ts`

**Implementation Steps**:

* \[ \] Listen for user\_online events  
* \[ \] Listen for user\_offline events  
* \[ \] Update local state with user presence  
* \[ \] Provide function to get user status

---

#### **Task 16.3: Display Presence in Chat List**

**Description**: Show online status in conversation items  
 **Files Modified**:

* `mobile/components/chat/ChatItem.tsx`

**Implementation Steps**:

* \[ \] Add StatusIndicator component (green dot for online)  
* \[ \] Show "Last seen" timestamp for offline users  
* \[ \] Update in real-time when status changes

---

#### **Task 16.4: Display Presence in Chat Room**

**Description**: Show online status in chat header  
 **Files Modified**:

* `mobile/app/chat/[id].tsx`

**Implementation Steps**:

* \[ \] Add presence indicator in header  
* \[ \] Show "online" or "last seen X mins ago"  
* \[ \] For groups: show "X members online"

---

#### **Task 16.5: Commit and Create PR \#16**

**Git Actions**:

git add .

git commit \-m "feat: Add online presence system with last seen timestamps"

git push origin feature/presence-system

**Your Actions**:

* \[ \] Create PR \#16: "Online Presence System"  
* \[ \] Merge to main

---

### **PR \#17: Push Notifications (Foreground)**

#### **Task 17.1: Set Up Expo Notifications**

**Description**: Configure Expo Notifications in mobile app  
 **Git Actions**:

git checkout master && git pull

git checkout \-b feature/push-notifications

**Files Created**:

* `mobile/lib/notifications.ts`

**Implementation Steps**:

* \[ \] Request notification permissions on app start  
* \[ \] Get Expo push token  
* \[ \] Send token to backend for storage  
* \[ \] Set up notification listeners (received, response)  
* \[ \] Handle notification tap to navigate to chat

---

#### **Task 17.2: Store Push Tokens in Backend**

**Description**: Save user's push tokens for sending notifications  
 **Files Modified**:

* `backend/prisma/schema.prisma` (add pushTokens field to User)  
* `backend/src/services/users.service.ts`

**Implementation Steps**:

* \[ \] Add migration for pushTokens field  
* \[ \] Create endpoint to save push token  
* \[ \] Update user's pushTokens array on login

---

#### **Task 17.3: Create Notification Service**

**Description**: Send push notifications via Expo Push API  
 **Files Created**:

* `backend/src/services/notification.service.ts`

**Implementation Steps**:

* \[ \] Create function to send Expo push notification  
* \[ \] Include message preview and sender name  
* \[ \] Add conversation ID for deep linking  
* \[ \] Handle notification errors gracefully

---

#### **Task 17.4: Trigger Notifications on New Messages**

**Description**: Send push notification when message received (user offline)  
 **Files Modified**:

* `backend/src/socket/handlers/message.handler.ts`

**Implementation Steps**:

* \[ \] Check if recipient is online (socket connected)  
* \[ \] If offline, send push notification  
* \[ \] Include sender name and message preview  
* \[ \] For foreground: rely on socket delivery

---

#### **Task 17.5: Test Foreground Notifications**

**Description**: Verify notifications appear when app is open  
 **Your Actions**:

* \[ \] Send message from Device A to Device B  
* \[ \] Keep Device B app in foreground  
* \[ \] Verify notification banner appears  
* \[ \] Tap notification, verify navigation to chat

---

#### **Task 17.6: Commit and Create PR \#17**

**Git Actions**:

git add .

git commit \-m "feat: Add foreground push notifications with Expo"

git push origin feature/push-notifications

**Your Actions**:

* \[ \] Create PR \#17: "Push Notifications (Foreground)"  
* \[ \] Merge to main

---

## **Phase 8: Polish & Testing**

### **PR \#18: Offline Support & Sync**

#### **Task 18.1: Implement Message Queue**

**Description**: Queue messages when offline and sync on reconnect  
 **Git Actions**:

git checkout master && git pull

git checkout \-b feature/offline-support

**Files Modified**:

* `mobile/store/messages.ts`  
* `mobile/hooks/useSocket.ts`

**Implementation Steps**:

* \[ \] Detect when socket disconnects  
* \[ \] Queue outgoing messages in local DB with status="queued"  
* \[ \] On reconnect, send queued messages  
* \[ \] Update message status after successful send  
* \[ \] Show "connecting" indicator in UI

---

#### **Task 18.2: Add Connection Status Indicator**

**Description**: Show user when app is offline  
 **Files Created**:

* `mobile/components/ui/ConnectionStatus.tsx`

**Files Modified**:

* `mobile/app/_layout.tsx`

**Implementation Steps**:

* \[ \] Create banner component that shows "No connection"  
* \[ \] Display when socket is disconnected  
* \[ \] Show "Reconnecting..." when attempting to reconnect  
* \[ \] Hide when connected

---

#### **Task 18.3: Background Sync**

**Description**: Sync messages when app comes to foreground  
 **Files Modified**:

* `mobile/app/_layout.tsx`

**Implementation Steps**:

* \[ \] Listen for app state changes (background/foreground)  
* \[ \] On foreground: reconnect socket if needed  
* \[ \] Fetch missed messages from API  
* \[ \] Update local DB and UI

---

#### **Task 18.4: Test Offline Scenarios**

**Description**: Verify app handles offline gracefully  
 **Your Actions**:

* \[ \] Turn off WiFi/cellular on Device A  
* \[ \] Send message (should queue locally)  
* \[ \] Turn WiFi back on  
* \[ \] Verify message sends automatically  
* \[ \] Verify Device B receives message  
* \[ \] Test going offline mid-conversation

---

#### **Task 18.5: Commit and Create PR \#18**

**Git Actions**:

git add .

git commit \-m "feat: Add offline support with message queueing and sync"

git push origin feature/offline-support

**Your Actions**:

* \[ \] Create PR \#18: "Offline Support & Sync"  
* \[ \] Merge to main

---

### **PR \#19: Performance Optimizations**

#### **Task 19.1: Optimize FlatList Rendering**

**Description**: Improve performance for large message lists  
 **Git Actions**:

git checkout master && git pull

git checkout \-b feature/performance-optimizations

**Files Modified**:

* `mobile/app/chat/[id].tsx`  
* `mobile/components/chat/MessageBubble.tsx`

**Implementation Steps**:

* \[ \] Add `getItemLayout` to FlatList for consistent item heights  
* \[ \] Set `windowSize` to limit rendered items  
* \[ \] Memoize MessageBubble with React.memo  
* \[ \] Add `keyExtractor` for stable keys  
* \[ \] Implement message pagination (load 50 at a time)

---

#### **Task 19.2: Optimize Image Loading**

**Description**: Add lazy loading and caching for images  
 **Files Modified**:

* `mobile/components/chat/MessageBubble.tsx`

**Implementation Steps**:

* \[ \] Use Expo Image with placeholder  
* \[ \] Add loading indicator for images  
* \[ \] Cache images on device  
* \[ \] Compress images before upload (already done)

---

#### **Task 19.3: Reduce Re-renders**

**Description**: Optimize React component updates  
 **Files Modified**:

* `mobile/components/chat/ChatItem.tsx`  
* `mobile/components/chat/InputToolbar.tsx`

**Implementation Steps**:

* \[ \] Memoize expensive computations with useMemo  
* \[ \] Use useCallback for event handlers  
* \[ \] Apply React.memo to components

---

#### **Task 19.4: Test Performance**

**Description**: Verify app performance with large datasets  
 **Your Actions**:

* \[ \] Test with conversation containing 500+ messages  
* \[ \] Test scrolling performance  
* \[ \] Test with 20+ conversations in list  
* \[ \] Use React DevTools Profiler to identify bottlenecks

---

#### **Task 19.5: Commit and Create PR \#19**

**Git Actions**:

git add .

git commit \-m "perf: Optimize FlatList rendering and reduce re-renders"

git push origin feature/performance-optimizations

**Your Actions**:

* \[ \] Create PR \#19: "Performance Optimizations"  
* \[ \] Merge to main

---

### **PR \#20: Error Handling & Edge Cases**

#### **Task 20.1: Add Global Error Handler**

**Description**: Catch and handle errors gracefully  
 **Git Actions**:

git checkout master && git pull

git checkout \-b feature/error-handling

**Files Modified**:

* `mobile/app/_layout.tsx`  
* `mobile/components/layout/ErrorBoundary.tsx`

**Implementation Steps**:

* \[ \] Wrap app in ErrorBoundary  
* \[ \] Display friendly error message on crash  
* \[ \] Add "Retry" button to reload app  
* \[ \] Log errors to console (Sentry in production)

---

#### **Task 20.2: Handle API Errors**

**Description**: Show user-friendly messages for API failures  
 **Files Modified**:

* `mobile/lib/api.ts`  
* `mobile/hooks/useAuth.ts`  
* `mobile/hooks/useMessages.ts`

**Implementation Steps**:

* \[ \] Add error handling in API client  
* \[ \] Display toast/alert for network errors  
* \[ \] Handle 401 errors (logout)  
* \[ \] Handle 500 errors (show generic message)  
* \[ \] Retry failed requests with exponential backoff

---

#### **Task 20.3: Handle Socket Disconnections**

**Description**: Gracefully handle socket connection failures  
 **Files Modified**:

* `mobile/lib/socket.ts`  
* `mobile/hooks/useSocket.ts`

**Implementation Steps**:

* \[ \] Add socket error listeners  
* \[ \] Implement exponential backoff for reconnection  
* \[ \] Show connection status to user  
* \[ \] Queue messages during disconnection

---

#### **Task 20.4: Handle Edge Cases**

**Description**: Address common edge cases  
 **Files Modified**:

* Various files across mobile app

**Implementation Steps**:

* \[ \] Handle empty states (no conversations, no messages)  
* \[ \] Handle deleted users/conversations  
* \[ \] Handle malformed messages  
* \[ \] Handle clock skew (timestamp issues)  
* \[ \] Handle simultaneous messages from multiple devices

---

#### **Task 20.5: Add Input Validation**

**Description**: Validate user inputs on frontend  
 **Files Modified**:

* `mobile/app/(auth)/login.tsx`  
* `mobile/app/(auth)/register.tsx`  
* `mobile/components/chat/InputToolbar.tsx`

**Implementation Steps**:

* \[ \] Validate email format  
* \[ \] Validate password strength  
* \[ \] Limit message length  
* \[ \] Prevent empty messages  
* \[ \] Sanitize display names

---

#### **Task 20.6: Test Error Scenarios**

**Description**: Verify error handling works  
 **Your Actions**:

* \[ \] Test with invalid login credentials  
* \[ \] Test with server offline  
* \[ \] Test with slow network (throttle to 3G)  
* \[ \] Test with airplane mode  
* \[ \] Force app crash and verify ErrorBoundary

---

#### **Task 20.7: Commit and Create PR \#20**

**Git Actions**:

git add .

git commit \-m "feat: Add comprehensive error handling and edge case coverage"

git push origin feature/error-handling

**Your Actions**:

* \[ \] Create PR \#20: "Error Handling & Edge Cases"  
* \[ \] Merge to main

---

## **Phase 9: Deployment & Final Testing**

### **PR \#21: Backend Deployment to Railway**

#### **Task 21.1: Configure Railway Environment Variables**

**Description**: Set up environment variables in Railway dashboard  
 **Git Actions**:

git checkout master && git pull

git checkout \-b deployment/backend-railway

**Your Actions \- Railway Dashboard**:

* \[ \] Go to Railway project settings

\[ \] Add environment variables:  
 NODE\_ENV=productionPORT=3000JWT\_SECRET=\<generate-strong-secret\>JWT\_REFRESH\_SECRET=\<generate-strong-secret\>AWS\_ACCESS\_KEY\_ID=\<from-task-0.3\>AWS\_SECRET\_ACCESS\_KEY=\<from-task-0.3\>AWS\_REGION=us-east-1AWS\_S3\_BUCKET=\<from-task-0.3\>AWS\_SQS\_QUEUE\_URL=\<from-task-0.3\>FCM\_SERVER\_KEY=\<from-task-0.5\>EXPO\_PUSH\_TOKEN=\<optional\>

*   
* \[ \] DATABASE\_URL will be auto-populated by Railway PostgreSQL

---

#### **Task 21.2: Add Railway Configuration**

**Description**: Configure Railway deployment settings  
 **Files Created**:

* `backend/railway.json`  
* `backend/.railwayignore`

**Implementation Steps**:

* \[ \] Create `railway.json`:

{

  "$schema": "https://railway.app/railway.schema.json",

  "build": {

    "builder": "NIXPACKS",

    "buildCommand": "npm install && npm run build"

  },

  "deploy": {

    "startCommand": "npm start",

    "restartPolicyType": "ON\_FAILURE",

    "restartPolicyMaxRetries": 10

  }

}

* \[ \] Create `.railwayignore`:

node\_modules/

.env

.env.local

\*.log

dist/

---

#### **Task 21.3: Update CORS Configuration**

**Description**: Allow frontend to connect to deployed backend  
 **Files Modified**:

* `backend/src/index.ts`

**Implementation Steps**:

* \[ \] Update CORS to allow Expo Go origins  
* \[ \] Add Railway domain to allowed origins  
* \[ \] Allow credentials for cookies/auth

---

#### **Task 21.4: Run Prisma Migration on Production**

**Description**: Set up database schema on Railway PostgreSQL  
 **Your Actions**:

* \[ \] Connect to Railway project: `cd backend && railway link`  
* \[ \] Run migration: `railway run npx prisma migrate deploy`  
* \[ \] Verify tables in Railway PostgreSQL dashboard

---

#### **Task 21.5: Deploy Backend to Railway**

**Description**: Push code and trigger deployment  
 **Git Actions**:

git add .

git commit \-m "deploy: Configure Railway deployment for backend"

git push origin deployment/backend-railway

**Your Actions \- Railway CLI**:

* \[ \] In `backend/` directory, run: `railway up`  
* \[ \] Wait for build to complete  
* \[ \] Note the deployed URL: `https://your-app.railway.app`  
* \[ \] Test API health: `curl https://your-app.railway.app/api/v1/health`

---

#### **Task 21.6: Test Deployed Backend**

**Description**: Verify all endpoints work in production  
 **Your Actions**:

* \[ \] Test POST `/api/v1/auth/register` with Postman  
* \[ \] Test POST `/api/v1/auth/login`  
* \[ \] Test Socket.io connection with token  
* \[ \] Verify database persistence  
* \[ \] Check Railway logs for errors

---

#### **Task 21.7: Commit and Create PR \#21**

**Git Actions**:

\# (Already pushed in 21.5)

**Your Actions**:

* \[ \] Create PR \#21: "Backend Deployment to Railway"  
* \[ \] Merge to main

---

### **PR \#22: Mobile App Configuration for Production Backend**

#### **Task 22.1: Update Mobile Environment Variables**

**Description**: Point mobile app to deployed Railway backend  
 **Git Actions**:

git checkout master && git pull

git checkout \-b config/production-backend

**Files Modified**:

* `mobile/.env`  
* `mobile/app.json`

**Implementation Steps**:

* \[ \] Update `mobile/.env`:

API\_URL=https://your-app.railway.app

SOCKET\_URL=https://your-app.railway.app

EXPO\_PUBLIC\_API\_URL=https://your-app.railway.app

* \[ \] Update `app.json` with production config

---

#### **Task 22.2: Test Mobile with Production Backend**

**Description**: Verify mobile app connects to Railway  
 **Your Actions**:

* \[ \] Start mobile app: `cd mobile && npx expo start`  
* \[ \] Test registration  
* \[ \] Test login  
* \[ \] Send messages between two devices  
* \[ \] Verify real-time updates work  
* \[ \] Check Railway logs for incoming requests

---

#### **Task 22.3: Commit and Create PR \#22**

**Git Actions**:

git add .

git commit \-m "config: Update mobile app to use production Railway backend"

git push origin config/production-backend

**Your Actions**:

* \[ \] Create PR \#22: "Mobile App \- Production Backend"  
* \[ \] Merge to main

---

### **PR \#23: AWS Lambda Functions (Background Tasks)**

#### **Task 23.1: Create Notification Worker Lambda**

**Description**: Lambda function to process notification queue  
 **Git Actions**:

git checkout master && git pull

git checkout \-b feature/aws-lambdas

**Files Created**:

* `aws-lambdas/notification-worker/index.ts`  
* `aws-lambdas/notification-worker/package.json`

**Implementation Steps**:

* \[ \] Create Lambda function to read from SQS queue  
* \[ \] Send push notifications via Expo Push API  
* \[ \] Handle batch processing  
* \[ \] Add error handling and DLQ support

---

#### **Task 23.2: Create Cleanup Jobs Lambda**

**Description**: Lambda for periodic database cleanup  
 **Files Created**:

* `aws-lambdas/cleanup-jobs/index.ts`  
* `aws-lambdas/cleanup-jobs/package.json`

**Implementation Steps**:

* \[ \] Delete old messages (optional)  
* \[ \] Clean up orphaned data  
* \[ \] Archive old conversations  
* \[ \] Update database statistics

---

#### **Task 23.3: Deploy Lambda Functions**

**Description**: Deploy functions to AWS Lambda  
 **Your Actions \- AWS Console**:

* \[ \] Create Lambda function: `messageai-notification-worker`  
* \[ \] Upload zipped code or use AWS CLI  
* \[ \] Set environment variables (DATABASE\_URL, EXPO\_PUSH\_TOKEN)  
* \[ \] Configure SQS trigger  
* \[ \] Set timeout to 60 seconds  
* \[ \] Test with sample SQS message

---

#### **Task 23.4: Set Up EventBridge Schedule**

**Description**: Schedule cleanup jobs to run daily  
 **Your Actions \- AWS Console**:

* \[ \] Create EventBridge rule: `messageai-daily-cleanup`  
* \[ \] Set schedule: `cron(0 2 * * ? *)` (2 AM daily)  
* \[ \] Add Lambda target: `messageai-cleanup-jobs`  
* \[ \] Test rule manually

---

#### **Task 23.5: Commit and Create PR \#23**

**Git Actions**:

git add .

git commit \-m "feat: Add AWS Lambda functions for notifications and cleanup"

git push origin feature/aws-lambdas

**Your Actions**:

* \[ \] Create PR \#23: "AWS Lambda Functions"  
* \[ \] Merge to main

---

## **Phase 10: Final Testing & Documentation**

### **PR \#24: End-to-End Testing & Bug Fixes**

#### **Task 24.1: Comprehensive Manual Testing**

**Description**: Test all MVP features systematically  
 **Git Actions**:

git checkout master && git pull

git checkout \-b testing/e2e-manual

**Your Actions \- Testing Checklist**:

* \[ \] **Authentication**:

  * \[ \] Register new user  
  * \[ \] Login with correct credentials  
  * \[ \] Login with incorrect credentials (should fail)  
  * \[ \] Logout and verify token cleared  
  * \[ \] Token refresh on expiration  
* \[ \] **One-on-One Chat**:

  * \[ \] Send text message (Device A → Device B)  
  * \[ \] Verify message appears instantly (optimistic UI)  
  * \[ \] Verify message received on Device B in real-time  
  * \[ \] Check message timestamp  
  * \[ \] Verify read receipts (checkmarks)  
  * \[ \] Send 20+ messages rapidly (stress test)  
* \[ \] **Group Chat**:

  * \[ \] Create group with 3+ users  
  * \[ \] Send messages from each member  
  * \[ \] Verify all members receive messages  
  * \[ \] Check sender attribution (name/avatar)  
  * \[ \] Verify read receipts for each member  
* \[ \] **Presence System**:

  * \[ \] Verify online status shows when user connects  
  * \[ \] Verify offline status after disconnect  
  * \[ \] Check "last seen" timestamp accuracy  
  * \[ \] Test typing indicators in 1-on-1 and group chats  
* \[ \] **Offline Support**:

  * \[ \] Turn off WiFi on Device A  
  * \[ \] Send message (should queue locally)  
  * \[ \] Turn WiFi back on  
  * \[ \] Verify message sends automatically  
  * \[ \] Test receiving messages while offline  
* \[ \] **Message Persistence**:

  * \[ \] Force quit app  
  * \[ \] Reopen app  
  * \[ \] Verify all messages still visible  
  * \[ \] Verify conversation list intact  
* \[ \] **Push Notifications**:

  * \[ \] Send message to user with app in foreground  
  * \[ \] Verify notification appears  
  * \[ \] Tap notification, verify navigation  
* \[ \] **Image Upload**:

  * \[ \] Send image from Device A  
  * \[ \] Verify upload progress  
  * \[ \] Verify Device B receives image  
  * \[ \] Test image fullscreen view  
  * \[ \] Test with large image (compression)  
* \[ \] **App Lifecycle**:

  * \[ \] Background app mid-conversation  
  * \[ \] Reopen app, verify reconnection  
  * \[ \] Send message while app backgrounded  
  * \[ \] Verify message appears on reopen  
* \[ \] **Poor Network Conditions**:

  * \[ \] Throttle network to 3G  
  * \[ \] Send messages (should work, just slower)  
  * \[ \] Test with intermittent connectivity  
  * \[ \] Verify reconnection logic

---

#### **Task 24.2: Document Bugs and Create Fixes**

**Description**: Track and fix any issues found during testing  
 **Your Actions**:

* \[ \] Create GitHub Issues for each bug found  
* \[ \] Prioritize critical bugs (blocking MVP)  
* \[ \] Fix bugs and commit to this branch  
* \[ \] Re-test after each fix

**Files Modified**:

* (Various files depending on bugs found)

---

#### **Task 24.3: Commit and Create PR \#24**

**Git Actions**:

git add .

git commit \-m "test: Complete E2E testing and fix critical bugs"

git push origin testing/e2e-manual

**Your Actions**:

* \[ \] Create PR \#24: "E2E Testing & Bug Fixes"  
* \[ \] Merge to main

---

### **PR \#25: Documentation & README**

#### **Task 25.1: Write Comprehensive README**

**Description**: Document setup, features, and deployment  
 **Git Actions**:

git checkout master && git pull

git checkout \-b docs/comprehensive-readme

**Files Modified**:

* `README.md`

**Implementation Steps**:

* \[ \] Add project overview and features list  
* \[ \] Include screenshots/GIFs of app in action  
* \[ \] Document tech stack  
* \[ \] Write setup instructions:  
  * \[ \] Prerequisites (Node.js, Expo CLI, Railway CLI)  
  * \[ \] Clone repo  
  * \[ \] Install dependencies  
  * \[ \] Configure environment variables  
  * \[ \] Run migrations  
  * \[ \] Start backend  
  * \[ \] Start mobile app  
* \[ \] Document deployment process:  
  * \[ \] Railway backend deployment  
  * \[ \] AWS Lambda setup  
  * \[ \] Mobile app build (Expo Go / standalone)  
* \[ \] Add API documentation (endpoints)  
* \[ \] Include troubleshooting section  
* \[ \] Add license and contribution guidelines

---

#### **Task 25.2: Create Environment Variable Templates**

**Description**: Document all required env vars  
 **Files Modified**:

* `backend/.env.example`  
* `mobile/.env.example`

**Implementation Steps**:

* \[ \] Update backend `.env.example` with all variables  
* \[ \] Update mobile `.env.example` with all variables  
* \[ \] Add comments explaining each variable

---

#### **Task 25.3: Add Code Comments**

**Description**: Document complex functions and logic  
 **Files Modified**:

* Key files in `backend/src/` and `mobile/`

**Implementation Steps**:

* \[ \] Add JSDoc comments to functions  
* \[ \] Document complex algorithms (optimistic updates, reconnection)  
* \[ \] Add inline comments for non-obvious code

---

#### **Task 25.4: Create Architecture Diagram**

**Description**: Visual representation of system architecture  
 **Files Created**:

* `docs/architecture.png` or `docs/architecture.md`

**Implementation Steps**:

* \[ \] Create diagram showing:  
  * \[ \] Mobile app (React Native \+ Expo)  
  * \[ \] Backend (Node.js \+ Express)  
  * \[ \] PostgreSQL database  
  * \[ \] Socket.io real-time layer  
  * \[ \] AWS S3, Lambda, SQS  
  * \[ \] Firebase/Expo push notifications  
* \[ \] Show data flow for message sending

---

#### **Task 25.5: Commit and Create PR \#25**

**Git Actions**:

git add .

git commit \-m "docs: Add comprehensive README and architecture documentation"

git push origin docs/comprehensive-readme

**Your Actions**:

* \[ \] Create PR \#25: "Documentation & README"  
* \[ \] Merge to main

---

## **Phase 11: Demo Video & Submission**

### **Task 26: Record Demo Video**

#### **Task 26.1: Prepare Demo Script**

**Description**: Plan what to show in 5-7 minute video  
 **Your Actions**:

* \[ \] Write script covering:  
  1. Introduction (30s) \- Project overview  
  2. Authentication (30s) \- Register/login  
  3. One-on-One Chat (1.5min) \- Real-time messaging, typing indicators, read receipts  
  4. Group Chat (1.5min) \- Create group, send messages, show attribution  
  5. Offline Support (1min) \- Go offline, queue message, reconnect, sync  
  6. App Lifecycle (30s) \- Background/foreground, force quit/reopen  
  7. Image Upload (30s) \- Send image, view fullscreen  
  8. Online Presence (30s) \- Show online/offline status  
  9. Conclusion (30s) \- Tech stack, challenges, next steps

---

#### **Task 26.2: Set Up Recording Environment**

**Description**: Prepare devices and screen recording tools  
 **Your Actions**:

* \[ \] Set up two devices (or device \+ simulator)  
* \[ \] Install screen recording software:  
  * iOS: Built-in Screen Recording or QuickTime  
  * Android: ADB screenrecord or built-in recorder  
  * Mac: QuickTime Player or OBS Studio  
* \[ \] Test screen recording quality  
* \[ \] Prepare voiceover setup (microphone)

---

#### **Task 26.3: Record Demo**

**Description**: Capture app functionality on video  
 **Your Actions**:

* \[ \] Record Device A screen  
* \[ \] Record Device B screen separately (or picture-in-picture)  
* \[ \] Follow demo script  
* \[ \] Show both devices simultaneously (split screen or side-by-side)  
* \[ \] Record voiceover explaining features  
* \[ \] Capture any bugs gracefully, explain workarounds

---

#### **Task 26.4: Edit Video**

**Description**: Compile and edit final demo video  
 **Your Actions**:

* \[ \] Use video editing tool (iMovie, DaVinci Resolve, Camtasia)  
* \[ \] Add intro title card  
* \[ \] Sync Device A and Device B footage (split screen)  
* \[ \] Add voiceover or captions  
* \[ \] Highlight key features with text overlays  
* \[ \] Add background music (optional, keep low)  
* \[ \] Export as MP4 (1080p, 30fps)  
* \[ \] Target length: 5-7 minutes

---

#### **Task 26.5: Upload Video**

**Description**: Host demo video for submission  
 **Your Actions**:

* \[ \] Upload to YouTube (unlisted or public)  
* \[ \] Upload to Vimeo  
* \[ \] Or: Host on Google Drive / Dropbox with public link  
* \[ \] Note down video URL for submission

---

### **Task 27: Create Persona Brainlift Document**

#### **Task 27.1: Write Persona Analysis**

**Description**: 1-page document explaining persona and AI features  
 **Your Actions**:

* \[ \] Create document (Google Docs, Word, or Markdown)  
* \[ \] Include sections:  
  1. **Chosen Persona**: Name and description  
  2. **Pain Points**: Specific problems they face (from PRD)  
  3. **AI Features**: How each of 5 required features solves problems  
  4. **Advanced Feature**: Description of your 1 advanced capability  
  5. **Technical Decisions**: Key tech choices and rationale  
  6. **Impact**: How solution improves their workflow  
* \[ \] Keep to 1 page  
* \[ \] Export as PDF

---

### **Task 28: Prepare Social Post**

#### **Task 28.1: Draft Post Content**

**Description**: Write engaging social media post  
 **Your Actions**:

* \[ \] Write 2-3 sentence description:  
  * What you built  
  * Key features  
  * Tech stack highlights  
* \[ \] Mention chosen persona  
* \[ \] Include demo video link or embed  
* \[ \] Add 2-3 screenshots of app  
* \[ \] Draft hashtags: \#GauntletAI \#ReactNative \#Messaging \#AI

---

#### **Task 28.2: Post on Social Media**

**Description**: Share project on X/LinkedIn  
 **Your Actions**:

* \[ \] Post on X (Twitter) with @GauntletAI tag  
* \[ \] Post on LinkedIn with @GauntletAI mention  
* \[ \] Include video link  
* \[ \] Attach screenshots  
* \[ \] Share GitHub repo link

---

### **Task 29: Final Submission**

#### **Task 29.1: Prepare Submission Package**

**Description**: Gather all required materials  
 **Your Actions**:

* \[ \] **GitHub Repository**: Ensure latest code pushed

  * \[ \] `https://github.com/joaocarlinho/gauntlet-messageai-24hr-mvp`  
  * \[ \] README is comprehensive  
  * \[ \] All PRs merged to main  
* \[ \] **Demo Video**: 5-7 minutes

  * \[ \] URL: \_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_  
* \[ \] **Deployed Application**:

  * \[ \] Backend: Railway URL  
  * \[ \] Mobile: Expo Go link or instructions  
* \[ \] **Persona Brainlift**: 1-page PDF

  * \[ \] File saved: `persona-brainlift.pdf`  
* \[ \] **Social Post**: Links to posts

  * \[ \] X/Twitter: \_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_  
  * \[ \] LinkedIn: \_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_

---

#### **Task 29.2: Test Deployment Links**

**Description**: Verify all links work before submission  
 **Your Actions**:

* \[ \] Test Railway backend URL (returns health check)  
* \[ \] Test Expo Go link on fresh device  
* \[ \] Verify demo video plays  
* \[ \] Verify GitHub repo is public  
* \[ \] Check all environment variable examples are included

---

#### **Task 29.3: Submit to GauntletAI**

**Description**: Submit project before deadline  
 **Your Actions**:

* \[ \] Go to submission portal: \_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_  
* \[ \] Fill in submission form:  
  * \[ \] GitHub repo URL  
  * \[ \] Demo video URL  
  * \[ \] Deployment links  
  * \[ \] Persona brainlift PDF upload  
  * \[ \] Social post links  
* \[ \] Submit before **Sunday 10:59 PM CT**  
* \[ \] Confirm submission email received

---

## **🎉 MVP COMPLETE\!**

### **Final Checklist \- Verify ALL Success Criteria**

* \[ \] ✅ Two users can exchange messages in real-time on separate devices  
* \[ \] ✅ Messages persist after app restart (local database)  
* \[ \] ✅ Optimistic UI shows messages instantly, then confirms delivery  
* \[ \] ✅ Online/offline indicators update in real-time  
* \[ \] ✅ Messages show timestamps and read receipts  
* \[ \] ✅ Users can create accounts and log in  
* \[ \] ✅ Basic group chat works with 3+ users  
* \[ \] ✅ Push notifications appear in foreground  
* \[ \] ✅ App handles offline scenarios (queue messages, sync on reconnect)  
* \[ \] ✅ Backend is deployed and accessible (Railway)  
* \[ \] ✅ App runs on Expo Go (or standalone build)

---

## **Post-Submission (Optional Enhancements)**

### **Future PRs (Beyond MVP)**

#### **PR \#26: Background Push Notifications (Standalone Build)**

* \[ \] Build standalone APK/IPA  
* \[ \] Configure FCM for background notifications  
* \[ \] Test background notification delivery

#### **PR \#27: Message Search**

* \[ \] Add search bar in chat list  
* \[ \] Implement full-text search in SQLite  
* \[ \] Highlight search results

#### **PR \#28: Message Reactions**

* \[ \] Add long-press menu for emoji reactions  
* \[ \] Store reactions in database  
* \[ \] Display reactions below messages

#### **PR \#29: Voice Messages**

* \[ \] Add audio recording with Expo AV  
* \[ \] Upload audio to S3  
* \[ \] Display audio player in messages

#### **PR \#30: AI Features (Phase 2\)**

* \[ \] Choose persona from PRD  
* \[ \] Implement 5 required AI features  
* \[ \] Add 1 advanced AI capability  
* \[ \] Integrate with OpenAI/Claude APIs

---

## **Appendix: Quick Reference Commands**

### **Git Workflow**

\# Start new feature

git checkout master && git pull

git checkout \-b feature/feature-name

\# Commit changes

git add .

git commit \-m "feat: description"

\# Push and create PR

git push origin feature/feature-name

\# Then create PR on GitHub, review, merge

\# Return to main

git checkout master && git pull

### **Development Commands**

\# Backend

cd backend

npm run dev              \# Start dev server

npx prisma studio        \# Open database GUI

npx prisma migrate dev   \# Run migrations

railway logs             \# View Railway logs

\# Mobile

cd mobile

npx expo start           \# Start Expo dev server

npx expo start \--clear   \# Clear cache

npx expo start \--tunnel  \# Use tunnel for testing

\# Root

npm run install-all      \# Install all dependencies

### **Railway Commands**

railway login            \# Login to Railway

railway link             \# Link local project

railway up               \# Deploy backend

railway run \<command\>    \# Run command in Railway env

railway logs             \# View logs

### **Testing Endpoints**

\# Health check

curl https://your-app.railway.app/api/v1/health

\# Register user

curl \-X POST https://your-app.railway.app/api/v1/auth/register \\

  \-H "Content-Type: application/json" \\

  \-d '{"email":"test@example.com","password":"password123","displayName":"Test User"}'

\# Login

curl \-X POST https://your-app.railway.app/api/v1/auth/login \\

  \-H "Content-Type: application/json" \\

  \-d '{"email":"test@example.com","password":"password123"}'

---

## **Notes & Tips**

### **⚠️ Common Pitfalls to Avoid**

1. **Forgetting environment variables**: Always update `.env` files after platform setup  
2. **Not testing on physical devices**: Simulators don't accurately represent real-world behavior  
3. **Skipping migrations**: Always run Prisma migrations after schema changes  
4. **Hardcoding URLs**: Use environment variables for API/Socket URLs  
5. **Not handling offline**: Test offline scenarios frequently  
6. **Ignoring errors**: Check Railway logs and Expo console for errors  
7. **Not committing .env.example**: Always commit example env files (not actual .env)

### **💡 Pro Tips**

1. **Test incrementally**: Don't wait until the end to test features  
2. **Use Prisma Studio**: Great for inspecting database during development  
3. **Railway logs are your friend**: Check logs when things break  
4. **Expo Go is fast**: Use it for rapid iteration, build standalone for production  
5. **Socket.io debugging**: Use `socket.on('connect_error')` to debug connection issues  
6. **Git commit often**: Small, frequent commits are easier to debug  
7. **Take breaks**: 24 hours is intense, pace yourself

### **📋 Time Estimates**

* **Phase 0**: 1-2 hours (manual setup)  
* **Phase 1**: 1 hour (project init)  
* **Phase 2**: 2 hours (database & auth)  
* **Phase 3**: 3 hours (messaging REST API)  
* **Phase 4**: 3 hours (mobile auth & navigation)  
* **Phase 5**: 5 hours (chat UI & real-time)  
* **Phase 6**: 2 hours (group chat & images)  
* **Phase 7**: 2 hours (notifications & presence)  
* **Phase 8**: 2 hours (polish & testing)  
* **Phase 9**: 2 hours (deployment)  
* **Phase 10**: 2 hours (final testing)  
* **Phase 11**: 1-2 hours (demo video & submission)

**Total**: \~24-26 hours (MVP)

