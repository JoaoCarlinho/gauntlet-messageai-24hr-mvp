flowchart TD  
  %% \========== CLIENT LAYER \==========  
  subgraph Client\["📱 Client (React Native \+ Expo)"\]  
    A1\[Login/Register Screen\\n(Auth via REST)\]  
    A2\[Chat List & Chat Room Screens\\n(Expo Router Navigation)\]  
    A3\[SQLite Local Storage\\n(Offline-first Messages)\]  
    A4\[Socket.io Client\\n(Real-time Messaging)\]  
    A5\[Expo Notifications API\\n(Foreground Notifications)\]  
    A6\[Expo SecureStore\\n(JWT Token Storage)\]  
  end

  %% \========== API LAYER \==========  
  subgraph Backend\["🖥️ Backend (Node.js \+ Express \+ Prisma)"\]  
    B1\[Auth Routes\\n(/api/v1/auth/\*)\\nJWT Issuance\]  
    B2\[User Routes\\n(/api/v1/users/\*)\\nProfile Mgmt \+ Avatar Upload\]  
    B3\[Conversations Routes\\n(/api/v1/conversations/\*)\\nGroup & Direct Chat Mgmt\]  
    B4\[Messages Routes\\n(/api/v1/messages/\*)\\nSend/Receive Messages\]  
    B5\[Socket.io Server\\nReal-time Event Handling\\n(Presence, Typing, Read Receipts)\]  
    B6\[Notification Service\\nExpo Push API Integration\]  
    B7\[Prisma ORM\\nDB Interface\]  
    B8\[S3 Service\\nFile Uploads via Pre-signed URLs\]  
    B9\[Presence & Message Services\\nStatus Tracking \+ Queue Mgmt\]  
  end

  %% \========== DATABASE & STORAGE \==========  
  subgraph Data\["🗄️ Data Storage & Queue"\]  
    D1\[(PostgreSQL @ Railway)\\nUser, Conversations, Messages, ReadReceipts\]  
    D2\[(AWS S3 Bucket)\\nMedia \+ Avatars\]  
    D3\[(AWS SQS Queue)\\nNotification Jobs\]  
    D4\[(AWS Lambda Functions)\\nNotification Worker \+ Cleanup Jobs\]  
  end

  %% \========== INFRASTRUCTURE & CI/CD \==========  
  subgraph Infra\["☁️ Infrastructure & Deployment"\]  
    I1\[GitHub Monorepo\\n(mobile, backend, aws-lambdas)\]  
    I2\[Railway Deployment\\n(API \+ PostgreSQL)\]  
    I3\[AWS Console\\n(S3, SQS, Lambda, EventBridge)\]  
    I4\[Expo.dev / EAS\\nMobile Builds & OTA Updates\]  
    I5\[Vercel (optional)\\nLanding Page / Web Build\]  
  end

  %% \========== CONNECTIONS \==========  
  %% Client ↔ Backend  
  A1 \--\>|POST /auth/login/register| B1  
  A2 \--\>|GET /users/me| B2  
  A2 \--\>|GET /conversations| B3  
  A2 \--\>|GET/POST /messages| B4  
  A4 \<--\> B5  
  A5 \--\>|Expo Push Token| B6  
  A6 \--\>|Attach JWT| B1  
  A3 \--\>|Sync Messages| B4

  %% Backend ↔ Data  
  B1 & B2 & B3 & B4 \--\> B7 \--\> D1  
  B8 \--\> D2  
  B5 \--\> D1  
  B6 \--\> D3 \--\> D4  
  B9 \--\> D1  
  D4 \--\> B6

  %% Infrastructure Relations  
  I1 \--\> I2  
  I1 \--\> I4  
  I1 \--\> I3  
  I2 \--\> B1  
  I3 \--\> D2 & D3 & D4  
  I4 \--\> A1 & A2  
  I5 \--\> A1

  %% \========== SDLC PHASES \==========  
  subgraph SDLC\["🧩 Software Development Lifecycle"\]  
    S1\[Phase 0 \- Setup\\n(GitHub, Railway, AWS, Expo, Firebase)\]  
    S2\[Phase 1 \- Project Init\\n(Monorepo, Scaffolding)\]  
    S3\[Phase 2 \- Database & Auth\]  
    S4\[Phase 3 \- Messaging Infrastructure\]  
    S5\[Phase 4 \- Mobile Frontend (Auth, Chat UI)\]  
    S6\[Phase 5 \- Real-time Integration & Offline Sync\]  
    S7\[Phase 6 \- Group Chat & Media\]  
    S8\[Phase 7 \- Push Notifications & Presence\]  
    S9\[Phase 8 \- Testing, Performance, Deployment\]  
  end

  I1 \--\> S2  
  B7 \--\> S3  
  B5 \--\> S4  
  A2 \--\> S5  
  A4 \--\> S6  
  A2 \--\> S7  
  B6 \--\> S8  
  I2 \--\> S9

  %% Legends  
  classDef client fill:\#e3f2fd,stroke:\#2196f3,color:\#0d47a1;  
  classDef backend fill:\#f3e5f5,stroke:\#9c27b0,color:\#4a148c;  
  classDef data fill:\#e8f5e9,stroke:\#43a047,color:\#1b5e20;  
  classDef infra fill:\#fff3e0,stroke:\#fb8c00,color:\#e65100;  
  classDef sdlc fill:\#ede7f6,stroke:\#5e35b1,color:\#311b92;

  class Client client;  
  class Backend backend;  
  class Data data;  
  class Infra infra;  
  class SDLC sdlc;

