# AI feature integration - preflight review

This document summarizes the code-review findings relevant to the messaging, realtime, presence and push-notification features. It lists specific misconfigurations or likely runtime issues and recommended, actionable fixes prioritized by severity.

Summary
- Scope reviewed: mobile code under `mobile/` (socket, notifications, api, storage, hooks, store) and backend code under `backend/src/` (socket server, socket handlers, notification service, users service, routes).
- High-level conclusion: Core architecture for realtime messaging, optimistic UI, message persistence and push notifications exists and is mostly implemented. There are a few concrete mismatches and small bugs that will block or degrade features during manual validation. Fixes are low-to-medium effort.

Critical issues (must-fix before running validation)

1) Mobile socket client imports a non-existent helper: `getToken`
   - Where: `mobile/lib/socket.ts` (line ~61) imports `getToken` from `./storage` and calls it. Storage exposes `TokenStorage.getAccessToken()` / `AuthStorage` but there is no exported `getToken` function.
   - Symptom: runtime error on socket connect: "getToken is not a function" or import undefined — socket will not attempt to connect and realtime features will not work.
   - Recommended fixes (pick one):
     - Quick: export a small helper in `mobile/lib/storage.ts` e.g. `export const getToken = TokenStorage.getAccessToken;` (lowest change footprint).
     - Better: update `mobile/lib/socket.ts` to `import { tokenManager } from './api'` and call `await tokenManager.getAccessToken()` (keeps token logic in one place).
   - Priority: High

2) REST path mismatch for mark-as-read (mobile vs backend)
   - Where: `mobile/lib/api.ts` defines `messagesAPI.markMessageAsRead(messageId)` and calls POST `/messages/${messageId}/read`.
   - Backend route expects: POST `/api/v1/conversations/:id/messages/:messageId/read` (conversation id is required).
   - Symptom: HTTP 404 or missing route if the mobile code ever attempts to call REST mark-as-read. The socket-based read receipts look intact, so this mostly impacts any codepaths that rely on the REST endpoint.
   - Recommended fix: change `messagesAPI.markMessageAsRead` to accept both conversationId and messageId and call `/conversations/${conversationId}/messages/${messageId}/read` or remove/disable the REST wrapper if socket is the canonical path.
   - Priority: High (affects read receipt REST flows)

Medium issues (should be fixed before broad validation)

3) Socket auth token extraction and lifecycle
   - Backend expects JWT in socket handshake at `handshake.auth.token` or in headers Authorization Bearer. The backend middleware `authenticateSocket` verifies JWT with `process.env.JWT_SECRET`.
   - Mobile client must therefore send the access token (JWT). After fix (1) above, ensure the access token stored is the JWT issued by backend auth endpoints. If the token is opaque or refresh-token only, socket auth will fail.
   - Recommendation: confirm token format (JWT) returned by `/auth/login` and ensure `tokenManager.setTokens()` stores the access token used for socket auth. Also confirm `EXPO_PUBLIC_API_URL` and the socket URL are correct in environment.
   - Priority: Medium

4) EXPO projectId and push token flow
   - Mobile notifications manager reads `process.env.EXPO_PUBLIC_PROJECT_ID || Constants.expoConfig?.extra?.projectId` before calling `Notifications.getExpoPushTokenAsync({ projectId })`.
   - `mobile/config.env.example` contains an `EXPO_PUBLIC_PROJECT_ID` placeholder. Ensure the running Expo environment actually exposes that value to the app (Expo eas.json or app config extra, or `.env` loaded into Metro) and that Expo Go / standalone app is configured correctly.
   - If projectId is missing the app will skip push registration (getPushToken warns and returns null).
   - Priority: Medium

5) Push token registration timing
   - The app attempts to get and send push token as part of `notificationManager.initialize()` (which can run on app start) and also exposes `registerPushTokenAfterAuth()` to call after login.
   - The backend accepts `/users/push-token` and will return 401 if not authenticated; mobile code handles 401 gracefully and retries after login. Keep `registerPushTokenAfterAuth()` called after login to ensure tokens are persisted.
   - Recommendation: add an integration test or flow that calls `notificationManager.registerPushTokenAfterAuth()` immediately after successful login.
   - Priority: Medium

Lower-priority / cosmetic issues

6) Logging and error messages
   - There are many console.logs used for debugging. Consider adding a consistent logger wrapper and a runtime flag to reduce noise when running validations.
   - Priority: Low

7) API clients: resilient parsing
   - `mobile/lib/api.ts` contains several defensive response-handling branches. These are fine, but ensure the backend returns `success` / `data` fields consistently for all message/conversation endpoints to avoid subtle runtime branching.
   - Priority: Low

Operational checks to run before manual validation

- Ensure the backend has `JWT_SECRET` set in environment (development or production) and matches the value used to sign access tokens returned by `/auth/login`.
- Ensure the backend database has the `pushTokens` column and migration applied. There is a helper script `backend/fix-database.js` that can add the column if missing.
- Confirm `EXPO_PUBLIC_PROJECT_ID` is available to the built/served mobile app. For Expo Go, the projectId is usually managed by EAS or the new Expo account system.
- Verify socket origin/CORS settings: `backend/src/config/socket.ts` contains `socketConfig.cors.origin`. When running locally with Expo, add the correct origin(s) if testing from Expo Dev Client or custom hostnames.

Recommended immediate code changes (minimal, safe)

1. Fix missing getToken export (fast patch)
   - Option A (minimal): Add to `mobile/lib/storage.ts`:
     - export const getToken = TokenStorage.getAccessToken;
   - Option B (preferred): Change `mobile/lib/socket.ts` to import `tokenManager` from `mobile/lib/api.ts` and call `tokenManager.getAccessToken()`.

2. Fix REST mark-as-read wrapper
   - Change `mobile/lib/api.ts` messagesAPI.markMessageAsRead signature to: `async markMessageAsRead(conversationId: string, messageId: string)` and call `/conversations/${conversationId}/messages/${messageId}/read`.

3. Add post-login push token registration call
   - Ensure after the auth flow (where tokens are set) the app calls `notificationManager.registerPushTokenAfterAuth()` (e.g., in the auth success handler). This ensures tokens are saved whenever user logs in on a physical device.

Tests and verification to add

- Unit test for `mobile/lib/socket.ts` to ensure token retrieval path works (mock SecureStore or tokenManager).
- E2E smoke test that: login -> connect socket -> join conversation -> send message -> receive message on other device (or second simulator) and assert optimistic update and final message ID mapping.
- Integration test: send a message when the recipient is offline and assert `backend/services/notification.service.ts` returns a success for push sending (mock Expo server or run with real Expo credentials in a staging environment).

Follow-ups / next steps

1. Apply the minimal code fixes described above and run the manual validation plan (documented separately) using one iPhone and a Mac.
2. If realtime errors remain, collect socket logs (both client and backend) and the handshake exchange. Backend logs will show the reason if authentication fails.
3. Add automated tests for the push-token flow and optimistic message lifecycle.

Appendix: key files referenced
- Mobile: `mobile/lib/socket.ts`, `mobile/lib/notifications.ts`, `mobile/lib/api.ts`, `mobile/lib/storage.ts`, `mobile/hooks/useMessages.ts`, `mobile/store/messages.ts`
- Backend: `backend/src/config/socket.ts`, `backend/src/socket/index.ts`, `backend/src/socket/handlers/message.handler.ts`, `backend/src/services/notification.service.ts`, `backend/src/services/users.service.ts`, `backend/src/routes/users.routes.ts`

If you want I can open a PR that implements the minimal fixes (exporting getToken and correcting the markMessageAsRead path) and add unit tests demonstrating the change — tell me which fix preference you want for the token helper (export or swap to tokenManager) and I'll implement it.
