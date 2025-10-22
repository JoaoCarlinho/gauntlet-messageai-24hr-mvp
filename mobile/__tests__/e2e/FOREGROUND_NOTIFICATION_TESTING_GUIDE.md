# Foreground Notification Testing Guide

## Overview
This guide provides comprehensive testing procedures for verifying that push notifications work correctly when the MessageAI app is in the foreground.

## Prerequisites
- Two physical devices (iOS/Android) or simulators
- Both devices have the MessageAI app installed
- Both devices are connected to the same network
- Push notification permissions are granted on both devices
- Both users are registered and logged in

## Test Scenarios

### Test 1: Basic Foreground Notification
**Objective**: Verify that notifications appear when the app is open and in the foreground.

**Steps**:
1. **Setup**:
   - Device A: Open MessageAI app, navigate to chat list
   - Device B: Open MessageAI app, navigate to chat list
   - Ensure both devices show the app in foreground

2. **Send Message**:
   - On Device A: Select conversation with Device B user
   - Send a text message: "Hello, this is a test message"
   - Observe Device B for notification

3. **Expected Results**:
   - Device B should show a notification banner at the top of the screen
   - Notification should display sender name and message preview
   - Notification should appear even though app is in foreground
   - App should remain functional and responsive

4. **Verification**:
   - ✅ Notification banner appears
   - ✅ Sender name is displayed correctly
   - ✅ Message preview is shown
   - ✅ App remains responsive

### Test 2: Notification Tap Navigation
**Objective**: Verify that tapping the notification navigates to the correct chat.

**Steps**:
1. **Setup**:
   - Device A: Open MessageAI app
   - Device B: Open MessageAI app, navigate to a different screen (e.g., profile)

2. **Send Message and Tap**:
   - On Device A: Send message: "Tap this notification to test navigation"
   - On Device B: Tap the notification banner when it appears

3. **Expected Results**:
   - Device B should navigate to the chat screen with Device A
   - Chat should show the new message
   - User should be able to see the conversation history

4. **Verification**:
   - ✅ Navigation works correctly
   - ✅ Correct chat is opened
   - ✅ New message is visible
   - ✅ Conversation history is displayed

### Test 3: Different Message Types
**Objective**: Verify notifications work for different message types.

**Steps**:
1. **Text Messages**:
   - Send: "This is a text message test"
   - Verify: Notification shows message preview

2. **Image Messages**:
   - Send an image with caption: "Check out this photo"
   - Verify: Notification shows "📷 Sent a photo" or similar

3. **Audio Messages**:
   - Send an audio message
   - Verify: Notification shows "🎵 Sent an audio message"

4. **File Messages**:
   - Send a document/file
   - Verify: Notification shows "📎 Sent a file"

**Expected Results**:
- ✅ Text messages show content preview
- ✅ Media messages show appropriate icons
- ✅ All message types trigger notifications

### Test 4: Multiple Messages
**Objective**: Verify handling of multiple rapid messages.

**Steps**:
1. **Setup**:
   - Device A: Open chat with Device B
   - Device B: Keep app in foreground

2. **Send Multiple Messages**:
   - Send 5 messages rapidly: "Message 1", "Message 2", etc.
   - Observe notification behavior

3. **Expected Results**:
   - Each message should trigger a notification
   - Notifications should stack or update appropriately
   - App should remain responsive

4. **Verification**:
   - ✅ All messages trigger notifications
   - ✅ Notification handling is smooth
   - ✅ No app crashes or freezes

### Test 5: Group Chat Notifications
**Objective**: Verify notifications work in group conversations.

**Steps**:
1. **Setup**:
   - Create a group chat with 3+ users
   - Device A: Open group chat
   - Device B: Keep app in foreground

2. **Send Group Message**:
   - On Device A: Send message to group: "Hello everyone!"
   - Observe Device B notification

3. **Expected Results**:
   - Notification should show sender name
   - Notification should indicate it's from a group
   - Tapping should navigate to group chat

4. **Verification**:
   - ✅ Group notifications work
   - ✅ Sender identification is correct
   - ✅ Navigation to group chat works

### Test 6: Notification Permissions
**Objective**: Verify behavior when notifications are disabled.

**Steps**:
1. **Disable Notifications**:
   - On Device B: Go to Settings > Apps > MessageAI > Notifications
   - Disable notifications
   - Return to app

2. **Send Message**:
   - On Device A: Send message to Device B
   - Observe Device B behavior

3. **Expected Results**:
   - No notification should appear
   - App should still function normally
   - Message should still be delivered via socket

4. **Verification**:
   - ✅ No notifications when disabled
   - ✅ App functionality preserved
   - ✅ Messages still delivered

### Test 7: App State Transitions
**Objective**: Verify notifications during app state changes.

**Steps**:
1. **Background to Foreground**:
   - Device B: Put app in background
   - Device A: Send message
   - Device B: Bring app to foreground
   - Verify message appears in chat

2. **Foreground to Background**:
   - Device B: Keep app in foreground
   - Device A: Send message
   - Device B: Put app in background
   - Verify notification appears

3. **Expected Results**:
   - Messages delivered correctly in all states
   - Notifications appear when appropriate
   - App state transitions are smooth

4. **Verification**:
   - ✅ Background to foreground works
   - ✅ Foreground to background works
   - ✅ State transitions are smooth

## Automated Testing

### Unit Tests
Run the automated test suite to verify notification logic:

```bash
# Run notification service tests
npm test -- --testPathPattern=notification.service.test.ts

# Run message handler tests
npm test -- --testPathPattern=message.handler.test.ts

# Run mobile notification tests
cd mobile && npm test -- --testPathPattern=useNotifications.test.ts
```

### Integration Tests
```bash
# Run end-to-end tests
npm test -- --testPathPattern=e2e

# Run notification integration tests
npm test -- --testPathPattern=notification
```

## Troubleshooting

### Common Issues

1. **No Notifications Appearing**:
   - Check notification permissions
   - Verify push token registration
   - Check network connectivity
   - Verify backend notification service is running

2. **Notifications Not Tappable**:
   - Check notification handler setup
   - Verify navigation logic
   - Check app state management

3. **Wrong Chat Opens**:
   - Verify conversation ID in notification data
   - Check navigation routing
   - Verify deep linking setup

4. **Performance Issues**:
   - Check notification queue processing
   - Verify memory usage
   - Check for notification spam

### Debug Steps

1. **Enable Debug Logging**:
   ```typescript
   // In notification service
   console.log('Notification sent:', notificationResult);
   
   // In message handler
   console.log('Offline users:', offlineRecipients);
   ```

2. **Check Push Token Status**:
   ```typescript
   // In mobile app
   const token = await notificationManager.getCurrentPushToken();
   console.log('Push token:', token);
   ```

3. **Verify Backend Logs**:
   ```bash
   # Check backend logs for notification attempts
   tail -f logs/railway_logs.log | grep notification
   ```

## Test Results Template

### Test Execution Log
```
Date: [DATE]
Tester: [NAME]
Devices: [DEVICE_A] / [DEVICE_B]
App Version: [VERSION]
Backend Version: [VERSION]

Test Results:
□ Test 1: Basic Foreground Notification - PASS/FAIL
□ Test 2: Notification Tap Navigation - PASS/FAIL
□ Test 3: Different Message Types - PASS/FAIL
□ Test 4: Multiple Messages - PASS/FAIL
□ Test 5: Group Chat Notifications - PASS/FAIL
□ Test 6: Notification Permissions - PASS/FAIL
□ Test 7: App State Transitions - PASS/FAIL

Issues Found:
- [List any issues encountered]

Notes:
- [Additional observations]
```

## Success Criteria

All tests should pass with the following criteria:
- ✅ Notifications appear in foreground
- ✅ Notifications are tappable and navigate correctly
- ✅ All message types trigger appropriate notifications
- ✅ Multiple messages are handled smoothly
- ✅ Group chat notifications work correctly
- ✅ Permission handling works as expected
- ✅ App state transitions are smooth
- ✅ No crashes or performance issues

## Next Steps

After completing these tests:
1. Document any issues found
2. Fix any bugs discovered
3. Re-run tests to verify fixes
4. Proceed to background notification testing
5. Update test documentation with results
