# **MessageAI MVP \- Product Requirements Document**

## **Project Overview**

MessageAI is a cross-platform messaging application built with React Native that provides real-time communication with WhatsApp-like reliability. This MVP focuses on core messaging infrastructure before AI features are added.

**Timeline**: 24 hours for MVP checkpoint  
 **Platform**: React Native (iOS & Android)  
 **Deployment Target**: Expo Go (MVP), with path to standalone builds

---

## **User Stories**

### **One-on-One Messaging**

* **As a user**, I want to send text messages to another user so that I can communicate in real-time  
* **As a user**, I want to see my messages appear immediately (optimistically) so that the app feels responsive  
* **As a user**, I want to see when my message is sent, delivered, and read so that I know the recipient has seen it  
* **As a user**, I want to see message timestamps so that I can track when conversations occurred  
* **As a user**, I want my messages to persist after closing the app so that I don't lose my conversation history  
* **As a user**, I want to see when the other person is online/offline so that I know if they're available  
* **As a user**, I want to receive messages even when offline and have them sync when I reconnect

  ### **Group Chat (3+ Users)**

* **As a user**, I want to create a group conversation with multiple participants so that I can coordinate with my team/family  
* **As a user**, I want to see who sent each message in a group so that I can follow the conversation  
* **As a user**, I want to see read receipts for each group member so that I know who has seen messages  
* **As a user**, I want to see all group members' online status so that I know who's available

  ### **Authentication & Profiles**

* **As a user**, I want to create an account with email/phone so that I have a persistent identity  
* **As a user**, I want to set a display name and profile picture so that others can recognize me  
* **As a user**, I want to see other users' profile information in chats

  ### **Notifications**

* **As a user**, I want to receive push notifications for new messages (at least in foreground) so that I don't miss important conversations  
* **As a user**, I want notifications to show the sender and message preview  
  ---

  ## **Key Features for MVP**

  ### **1\. User Authentication**

* Email/phone-based registration and login  
* User profile creation (display name, profile picture)  
* Session management and token refresh  
* Secure credential storage

  ### **2\. Real-Time Messaging Infrastructure**

* WebSocket alternative (long polling, SSE, or Socket.io fallback) for real-time message delivery  
* Message queue for offline scenario handling  
* Automatic reconnection on network recovery  
* Optimistic UI updates with rollback on failure  
* Message delivery states: sending → sent → delivered → read

  ### **3\. One-on-One Chat**

* Text message composition and sending  
* Real-time message delivery to recipient  
* Message timestamps (relative and absolute)  
* Message bubbles with sender distinction  
* Typing indicators  
* Read receipts (single/double check marks)  
* Message persistence in local database

  ### **4\. Group Chat**

* Group creation with 3+ participants  
* Group naming and member list  
* Message attribution (sender name/avatar in bubbles)  
* Per-user read receipts  
* Member online/offline status

  ### **5\. Online Presence System**

* Real-time online/offline status indicators  
* "Last seen" timestamps for offline users  
* Typing indicators ("User is typing...")  
* Presence updates via heartbeat mechanism (using WebSocket alternative)

  ### **6\. Message Persistence**

* Local SQLite database for message storage  
* Conversation list with last message preview  
* Message history loading (pagination)  
* Offline-first architecture  
* Background sync on app restart

  ### **7\. Push Notifications**

* Foreground notification display (minimum requirement)  
* Notification payload with sender info and message preview  
* Deep linking to conversation on notification tap  
* Badge count updates

  ### **8\. Media Support (Nice-to-have for MVP)**

* Image upload and display in chat bubbles  
* Image compression before upload  
* Loading states for media  
* Image preview/fullscreen view  
  ---

  ## **Tech Stack**

  ### **Frontend: React Native \+ Expo**

* **Framework**: React Native with Expo (Managed Workflow)  
* **Navigation**: Expo Router (file-based routing)  
* **State Management**:  
  * Kea (global app state)  
  * React Query / TanStack Query (server state & caching)  
* **Local Database**: Expo SQLite for message persistence  
* **Real-time**: WebSocket alternative (long polling or SSE) for message delivery  
* **UI Components**:  
  * React Native Paper or NativeBase (component library)  
  * Custom components following WhatsApp clone patterns  
* **Image Handling**: Expo Image Picker & Expo Image  
* **Notifications**: Expo Notifications API  
* **Storage**: Expo SecureStore for auth tokens

  ### **Backend: Node.js API Server**

* **Runtime**: Node.js with Express.js  
* **Deployment**: Railway (API server hosting)  
* **WebSocket Alternative**: Socket.io server (or long polling/SSE fallback) for real-time messaging  
* **Database**: PostgreSQL (hosted on Railway)  
* **ORM**: Prisma (type-safe database access)  
* **Authentication**: JWT tokens with refresh token rotation  
* **File Storage**: AWS S3 for profile pictures and media

  ### **Background Jobs & Tasks**

* **Queue System**: AWS SQS for message queue processing  
* **Workers**: AWS Lambda for background tasks (notification delivery, cleanup jobs)  
* **Scheduled Tasks**: AWS EventBridge for cron-like jobs

  ### **Infrastructure & DevOps**

* **Frontend Hosting**: Vercel (for web build/landing page if needed)  
* **API Hosting**: Railway (primary API server)  
* **Database**: Railway PostgreSQL  
* **Object Storage**: AWS S3  
* **Push Notifications**:  
  * Expo Push Notification Service (for development)  
  * Firebase Cloud Messaging (for production builds)

  ### **Development Tools**

* **Language**: TypeScript (frontend & backend)  
* **API Testing**: Postman/Thunder Client  
* **Code Quality**: ESLint, Prettier  
* **Version Control**: Git/GitHub  
  ---

  ## **Architecture Patterns from Reference Repos**

  ### **From `whatsapp-clone-react-native`**

* **Component Structure**:  
  * `screens/` for main views (ChatList, ChatRoom, NewGroup)  
  * `components/` for reusable UI (ChatItem, MessageBubble, InputToolbar)  
  * `navigation/` for stack/tab navigators  
* **Chat UI Pattern**:  
  * FlatList for message rendering with inverted scroll  
  * InputToolbar component with send button  
  * Message bubbles with sender-based styling  
  * Avatar display in chat list and group messages

  ### **From `WhatsApp-Clone` (Mieron-HH)**

* **Real-time Messaging Flow**:  
  * Socket.io event listeners in custom hooks  
  * Message state management with optimistic updates  
  * Delivery receipt tracking system  
  * Online presence heartbeat mechanism  
* **Database Schema**:  
  * Users table (id, name, avatar, lastSeen)  
  * Conversations table (id, type, participants)  
  * Messages table (id, conversationId, senderId, content, timestamp, status)  
  * ReadReceipts table (messageId, userId, readAt)

  ---

  ## **Non-MVP Considerations**

The following features are explicitly **excluded from MVP** but should be architecturally supported for future implementation:

### **Security & Privacy**

* End-to-end encryption (E2EE)  
* Message deletion/editing  
* Disappearing messages  
* Block/report users  
* Two-factor authentication

  ### **Advanced Chat Features**

* Voice messages  
* Video messages  
* File attachments (documents, PDFs)  
* Message forwarding  
* Message reactions/emoji responses  
* Reply-to-message threading  
* Message search within conversation

  ### **Group Management**

* Add/remove group members  
* Admin permissions  
* Group profile picture  
* Group description  
* Exit group functionality  
* Mute group notifications

  ### **Media Gallery**

* Shared media tab (all photos/videos in conversation)  
* Media auto-download settings  
* Storage management

  ### **Call Features**

* Voice calls (VoIP)  
* Video calls  
* Call history

  ### **Advanced Notifications**

* Background push notifications (requires standalone build)  
* Notification settings per conversation  
* Custom notification sounds  
* Priority/silent notifications

  ### **Status/Stories**

* Ephemeral status updates (24-hour stories)  
* Status privacy controls

  ### **Profile & Settings**

* About/bio text  
* Status message  
* Privacy settings  
* Notification preferences  
* Theme customization (dark mode)  
* Language selection

  ### **Performance Optimizations**

* Message pagination (load older messages on scroll)  
* Image lazy loading  
* Virtual list optimization for large chats  
* Background sync optimization  
* Offline queue management  
  ---

  ## **Tech Stack Considerations & Pitfalls**

  ### **✅ Advantages of Chosen Stack**

**React Native \+ Expo**:

* Rapid development with hot reload  
* Expo Go for instant testing on physical devices  
* Cross-platform (iOS \+ Android) from single codebase  
* Rich ecosystem of libraries  
* Easy deployment pipeline to TestFlight/Play Store  
* Built-in APIs for notifications, camera, file system

**Railway for API Hosting**:

* Simple deployment from GitHub  
* Built-in PostgreSQL hosting  
* Environment variable management  
* Automatic HTTPS/SSL  
* Reasonable free tier for MVP  
* WebSocket support out of the box

**AWS for Background Tasks**:

* Lambda scales automatically  
* SQS handles message queuing reliably  
* S3 is industry-standard for object storage  
* Pay only for what you use

  ### **⚠️ Potential Pitfalls & Mitigations**

**1\. Expo Limitations**

* **Issue**: Expo Go has limitations for push notifications (only foreground)  
* **Mitigation**: Clearly document that background notifications require standalone build; MVP accepts foreground-only  
* **Issue**: Some native modules incompatible with Expo  
* **Mitigation**: Stick to Expo-compatible libraries; use `expo-dev-client` if custom native code needed

**2\. WebSocket Reliability**

* **Issue**: Socket.io connections can drop on mobile networks  
* **Mitigation**:  
  * Implement exponential backoff reconnection  
  * Queue messages locally during disconnection  
  * Add connection status indicator in UI  
  * Test thoroughly on 3G/flaky networks

**3\. React Native Performance**

* **Issue**: Large chat lists can cause performance issues  
* **Mitigation**:  
  * Use `FlatList` with `windowSize` optimization  
  * Implement message pagination (load 50 messages at a time)  
  * Memoize message components with `React.memo`  
  * Use `getItemLayout` for FlatList optimization

**4\. SQLite Sync Complexity**

* **Issue**: Keeping local SQLite in sync with server state is complex  
* **Mitigation**:  
  * Implement optimistic updates with rollback on failure  
  * Use message IDs from server as source of truth  
  * Handle conflict resolution (server state wins)  
  * Add "sync status" field to messages

**5\. Railway \+ WebSocket**

* **Issue**: Railway may have WebSocket connection limits/timeouts  
* **Mitigation**:  
  * Implement heartbeat/ping-pong to keep connections alive  
  * Monitor connection duration and reconnect proactively  
  * Consider Redis for WebSocket session management if scaling needed

**6\. Cross-Platform Consistency**

* **Issue**: iOS and Android have different behaviors for background tasks, notifications  
* **Mitigation**:  
  * Test on both platforms continuously  
  * Use platform-specific code only when necessary (`Platform.select()`)  
  * Document platform differences in README

**7\. AWS Lambda Cold Starts**

* **Issue**: Lambda functions can have 1-2 second cold starts  
* **Mitigation**:  
  * Keep functions warm with periodic pings (for production)  
  * For MVP, accept cold start delays  
  * Consider reserved concurrency for production

**8\. Image Upload Performance**

* **Issue**: Large images can slow down app, exhaust storage  
* **Mitigation**:  
  * Compress images before upload using `expo-image-manipulator`  
  * Set max dimensions (e.g., 1080px width)  
  * Show upload progress indicator  
  * Validate file sizes on backend

  ### **🎯 Best Practices for This Stack**

1. **Start with Expo Managed Workflow**: Don't eject unless absolutely necessary  
2. **TypeScript Everywhere**: Use strict mode for both frontend and backend  
3. **Environment Variables**: Use `.env` files with `expo-constants` for config  
4. **Error Boundaries**: Wrap components in error boundaries to prevent crashes  
5. **Logging**: Use `console.log` sparingly; implement proper logging service (Sentry) later  
6. **API Versioning**: Structure API routes with `/api/v1/` prefix from day one  
7. **Database Migrations**: Use Prisma migrations, commit migration files  
8. **Socket.io Rooms**: Use conversation IDs as room names for efficient message routing  
9. **Authentication Flow**: Store JWT in SecureStore, refresh tokens on 401 responses  
1. **Optimistic UI Pattern**:  
    1\. Add message to local DB with status="sending"2. Render message immediately in UI3. Emit socket event to server4. On server ACK: update status="sent"5. On delivery: update status="delivered"6. On read: update status="read"  
10.   
    ---

    ## **Database Schema (Prisma)**

2. model User {  
3.   id            String   @id @default(uuid())  
4.   email         String   @unique  
5.   phoneNumber   String?  @unique  
6.   displayName   String  
7.   avatarUrl     String?  
8.   lastSeen      DateTime @default(now())  
9.   isOnline      Boolean  @default(false)  
10.   createdAt     DateTime @default(now())  
11.     
12.   sentMessages     Message\[\]  
13.   conversations    ConversationMember\[\]  
14.   readReceipts     ReadReceipt\[\]  
15. }  
16.   
17. model Conversation {  
18.   id            String   @id @default(uuid())  
19.   type          String   // "direct" or "group"  
20.   name          String?  // for group chats  
21.   createdAt     DateTime @default(now())  
22.   updatedAt     DateTime @updatedAt  
23.     
24.   members       ConversationMember\[\]  
25.   messages      Message\[\]  
26. }  
27.   
28. model ConversationMember {  
29.   id              String   @id @default(uuid())  
30.   conversationId  String  
31.   userId          String  
32.   joinedAt        DateTime @default(now())  
33.     
34.   conversation    Conversation @relation(fields: \[conversationId\], references: \[id\])  
35.   user            User @relation(fields: \[userId\], references: \[id\])  
36.     
37.   @@unique(\[conversationId, userId\])  
38. }  
39.   
40. model Message {  
41.   id              String   @id @default(uuid())  
42.   conversationId  String  
43.   senderId        String  
44.   content         String  
45.   type            String   @default("text") // "text", "image", "system"  
46.   mediaUrl        String?  
47.   status          String   @default("sending") // "sending", "sent", "delivered", "read"  
48.   createdAt       DateTime @default(now())  
49.     
50.   conversation    Conversation @relation(fields: \[conversationId\], references: \[id\])  
51.   sender          User @relation(fields: \[senderId\], references: \[id\])  
52.   readReceipts    ReadReceipt\[\]  
53. }  
54.   
55. model ReadReceipt {  
56.   id          String   @id @default(uuid())  
57.   messageId   String  
58.   userId      String  
59.   readAt      DateTime @default(now())  
60.     
61.   message     Message @relation(fields: \[messageId\], references: \[id\])  
62.   user        User @relation(fields: \[userId\], references: \[id\])  
63.     
64.   @@unique(\[messageId, userId\])  
65. }  
      
    ---

    ## **API Endpoints (REST \+ WebSocket)**

    ### **REST API**

66. POST   /api/v1/auth/register  
67. POST   /api/v1/auth/login  
68. POST   /api/v1/auth/refresh  
69. GET    /api/v1/users/me  
70. PUT    /api/v1/users/me  
71. POST   /api/v1/users/avatar  
72. GET    /api/v1/conversations  
73. POST   /api/v1/conversations  
74. GET    /api/v1/conversations/:id/messages  
75. POST   /api/v1/conversations/:id/messages  
76. POST   /api/v1/media/upload  
    

    ### **WebSocket Events (Socket.io)**

**Client → Server**:

77. join\_conversation { conversationId }  
78. leave\_conversation { conversationId }  
79. send\_message { conversationId, content, type, tempId }  
80. typing\_start { conversationId }  
81. typing\_stop { conversationId }  
82. mark\_read { messageId }  
    

**Server → Client**:

83. message\_received { message, conversation }  
84. message\_delivered { messageId, deliveredAt }  
85. message\_read { messageId, userId, readAt }  
86. user\_online { userId }  
87. user\_offline { userId, lastSeen }  
88. user\_typing { conversationId, userId }  
89. user\_stopped\_typing { conversationId, userId }  
      
    ---

    ## **Success Criteria for MVP**

The MVP is considered **complete** when:

1. ✅ Two users can exchange messages in real-time on separate devices  
2. ✅ Messages persist after app restart (local database)  
3. ✅ Optimistic UI shows messages instantly, then confirms delivery  
4. ✅ Online/offline indicators update in real-time  
5. ✅ Messages show timestamps and read receipts  
6. ✅ Users can create accounts and log in  
7. ✅ Basic group chat works with 3+ users  
8. ✅ Push notifications appear in foreground  
9. ✅ App handles offline scenarios (queue messages, sync on reconnect)  
10. ✅ Backend is deployed and accessible  
11. ✅ App runs on Expo Go (or standalone build)  
    ---

    ## **Next Steps After MVP Review**

1. Review and finalize this PRD  
2. Set up project repositories (monorepo vs separate repos)  
3. Initialize React Native \+ Expo project  
4. Set up Railway backend with PostgreSQL  
5. Implement authentication flow  
6. Build core messaging UI components  
7. Implement WebSocket real-time layer  
8. Add local database with SQLite  
9. Test on physical devices  
10. Deploy backend to Railway  
11. Record demo video  
90. 

