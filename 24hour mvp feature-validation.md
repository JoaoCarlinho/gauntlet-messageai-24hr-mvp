# 24-hour MVP feature validation (single iPhone + Mac)

This checklist is written to validate the messaging MVP features using a single iPhone and a Mac (the Mac can run the backend locally or act as a second client where useful). The plan assumes you will fix the critical issues in `ai-feature-integration-prep.md` first (especially socket token retrieval and event-name alignment).

Preconditions

- Backend reachable: a local backend (run on your Mac) or a deployed staging backend. If running locally, ensure the Mac's host is reachable by the iPhone (same network) or use ngrok / localtunnel.
- Environment: set `JWT_SECRET` on backend; ensure DB is migrated and `pushTokens` column exists.
- Mobile: build/run the Expo app on the iPhone (Expo Go or development client). Ensure `EXPO_PUBLIC_PROJECT_ID` is configured in the app so push tokens can be obtained.
- Test accounts: create two test users (User A and User B) with known credentials.

Test devices

- Device 1: iPhone (primary) — will run the mobile app. You can sign in as User A then sign out and sign in as User B to simulate two users on one device when necessary.
- Device 2: Mac — will be used as backend host and optionally as a second client using the web client or an emulator (iOS simulator or web interface). If an emulator is used, ensure it uses a different account than the iPhone.

High-level acceptance criteria

- One-on-one chat: messages sent by A are received by B in realtime and vice versa.
- Message persistence: messages survive app restart and are loaded from the backend/SQLite as expected.
- Optimistic UI: messages show immediately with a temporary ID/status and are confirmed/updated with the real messageId from the server.
- Presence and typing: online/offline indicators and typing events are shown consistently for participants in an active conversation.
- Read receipts: when a user opens a conversation, the other user receives a read-receipt update and the UI updates accordingly.
- Push notifications (foreground at minimum): when the recipient is offline or the app is backgrounded, a push notification arrives for new messages.

Validation steps (order matters)

Day 0 — Setup and smoke tests (2–3 hours)

1) Start backend and confirm socket server is running
   - On the Mac: start the backend (e.g., `yarn start:dev` or `pnpm --filter backend start`) and watch logs.
   - Confirm socket server started and prints listening port.
   - If the iPhone is to connect to local backend, expose the backend via ngrok or ensure both devices are on the same Wi-Fi and use the Mac's local IP.

2) Build/run the Expo app on the iPhone
   - Ensure `.env` or app config has `EXPO_PUBLIC_API_URL` pointing to the backend and `EXPO_PUBLIC_PROJECT_ID` is set.
   - Launch app in Expo Go and sign in as User A.
   - Validate that socket connects (client logs) and `socket.connected === true`.

3) Verify push token registration
   - On the iPhone, open app and confirm the app asked for notifications permission.
   - Verify `notificationManager` obtains a push token and the backend `/users/push-token` call succeeds (watch backend logs or DB row updates).

4) Quick send/receive sanity
   - From iPhone (User A) open conversation with User B (create if needed). Send a message.
   - On Mac (web client/emulator/simulator as User B): open conversation with A. Confirm message appears in realtime.

If the previous steps pass, progress to deeper validations below.

Realtime and optimistic UI tests (3–4 hours)

5) Optimistic message lifecycle
   - On iPhone (User A), send a message while connected.
   - Observe that the message shows instantly in UI with a tempId and status 'sending'.
   - Confirm a socket confirmation (event name `message_sent` or configured naming) arrives and the message in the UI is replaced/updated with final message id and status 'sent'.
   - Error case: flip network to offline immediately after sending; verify message status becomes 'failed' or queued, and when network is restored the message is retried and eventually confirmed.

6) Message persistence and reload
   - Close and kill the app on iPhone. Reopen and authenticate as the same user.
   - Open the conversation and verify previous messages are loaded (from home store / local SQLite cache / backend fetch). Verify consistent ordering and timestamps.

7) Presence & typing indicators
   - With User B connected on the Mac, on the iPhone start typing; verify typing indicator appears for B.
   - Stop typing; verify typing indicator disappears.
   - Put the Mac client to sleep or disconnect; on the iPhone verify presence updates to offline.

8) Read receipts
   - Send a message from A to B. On B, open conversation and verify the server emits read receipt and A's UI shows message as read (and backend `message_status` changes if tracked).

Group chat & edge cases (2–3 hours)

9) Basic group chat (3+ users)
   - Create a group with 3 users (A, B, C). With B connected on the Mac and C on another available client, send messages from A and verify real-time delivery to all.
   - Verify join/leave events are emitted and presence per participant is visible.

10) Large message payloads and attachments
   - Send a longer text message (>2KB) and verify delivery, persistence, and UI rendering.
   - If file attachments are supported, send a small image and validate upload + notification flow.

Notifications and offline behavior (2–3 hours)

11) Foreground notification handling
   - Background the app on the iPhone and send a message to the offline user (User A) from the Mac.
   - Verify a push notification arrives while app is backgrounded. If the app is in foreground, confirm that a local in-app notification is shown (if implemented).

12) Offline message queueing and resends
   - Put iPhone into airplane mode. Send messages; they should be queued locally.
   - Re-enable network and verify queued messages are sent automatically and confirmed by the server.

13) Signal recovery and idempotency
   - Simulate repeated message sends with unstable network (toggle network while sending repeatedly) and confirm there are no duplicate messages on server after retries. The client should deduplicate by tempId mapping.

Failure triage guidelines

- Socket not connecting: check token used for handshake, `getToken()` presence, and backend JWT_SECRET. Also confirm CORS / allowed origins.
- Messages not received: check event name mismatches (client listens for 'new_message' vs server emits 'message_received'). Inspect both client and server event names in logs.
- Push notifications not received: verify `EXPO_PUBLIC_PROJECT_ID` and that push tokens were recorded on server. Check `expo-server-sdk` responses for invalid tokens and run `cleanupInvalidPushTokens()` if many invalids are present.
- Optimistic messages not confirmed: search for the `message_sent` confirmation event on the server and ensure client listens for the same event name and maps `tempId` -> `messageId`.

Logging & artifacts to collect for debugging

- Client-side: console logs showing socket handshake, emitted events, tempIds, and any network error responses.
- Server-side: socket connection logs, message handler logs, push sending logs (Expo responses), and DB writes for messages/push tokens.
- Database: `messages` table rows for created messages; `users.pushTokens` column entries for recorded device tokens.

Completion criteria

When all the high-level acceptance criteria pass at least once (with two test accounts) and the push notification tests succeed, mark the MVP validation as complete. If any critical tests fail, create issues with logs attached and re-run the affected tests after fixes.

Optional: automation

- After manual validation, consider adding an automated test harness that can run on the Mac to simulate multiple users (headless browsers/emulators) and run a subset of the above smoke tests automatically.

If you'd like, I can implement the two high-priority code fixes mentioned in `ai-feature-integration-prep.md` now (export getToken or change socket token getter and fix the mark-as-read REST path). Tell me which option you prefer and I'll apply changes and run a quick validation of TypeScript errors.
