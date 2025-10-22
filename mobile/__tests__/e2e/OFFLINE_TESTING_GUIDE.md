# Offline Testing Guide - Task 18.4

This guide provides step-by-step instructions for testing the offline functionality implemented in Task 18.3.

## Prerequisites

1. **Two devices or simulators** running the MessageAI app
2. **Backend server** running and accessible
3. **Two user accounts** logged in on different devices
4. **Network connectivity** that can be toggled on/off

## Test Scenarios

### Scenario 1: Basic Offline Message Queuing

**Objective**: Verify that messages are queued locally when offline and sent when connection is restored.

#### Steps:

1. **Setup**:
   - Device A: User A logged in
   - Device B: User B logged in
   - Both devices connected to WiFi/cellular
   - Create a conversation between User A and User B

2. **Test Offline Message Queuing**:
   - On Device A: Turn off WiFi and cellular data
   - On Device A: Send a message (e.g., "Hello from offline!")
   - **Expected Result**: 
     - Message appears in the chat UI with "sending" status
     - Connection status indicator shows "Disconnected" or "Offline"
     - Message is stored locally in SQLite database

3. **Test Message Sync on Reconnection**:
   - On Device A: Turn WiFi/cellular back on
   - **Expected Result**:
     - Connection status indicator shows "Connected"
     - Message status changes from "sending" to "sent"
     - Message appears on Device B
     - Message is synced to backend

### Scenario 2: Multiple Offline Messages

**Objective**: Verify that multiple messages can be queued while offline.

#### Steps:

1. **Setup**: Same as Scenario 1

2. **Test Multiple Message Queuing**:
   - On Device A: Turn off network connectivity
   - On Device A: Send multiple messages:
     - "First offline message"
     - "Second offline message"
     - "Third offline message"
   - **Expected Result**:
     - All messages appear in UI with "sending" status
     - All messages are queued locally

3. **Test Batch Sync**:
   - On Device A: Turn network back on
   - **Expected Result**:
     - All messages are sent in order
     - All messages appear on Device B
     - Message statuses update to "sent"

### Scenario 3: Mid-Conversation Offline

**Objective**: Verify app handles going offline during an active conversation.

#### Steps:

1. **Setup**: Active conversation between User A and User B

2. **Test Mid-Conversation Offline**:
   - On Device A: Send a message while online
   - On Device A: Immediately turn off network
   - On Device A: Send another message
   - On Device B: Send a message to User A
   - **Expected Result**:
     - Device A shows "sending" status for the offline message
     - Device A doesn't receive the message from Device B
     - Connection status shows "Disconnected"

3. **Test Reconnection and Sync**:
   - On Device A: Turn network back on
   - **Expected Result**:
     - Queued message is sent
     - Device A receives the message from Device B
     - Background sync fetches missed messages

### Scenario 4: Background Sync Testing

**Objective**: Verify background sync functionality when app comes to foreground.

#### Steps:

1. **Setup**: Both devices online and in conversation

2. **Test Background Sync**:
   - On Device A: Put app in background (minimize or switch apps)
   - On Device B: Send a message
   - On Device A: Bring app to foreground
   - **Expected Result**:
     - App automatically syncs and shows the new message
     - Socket reconnects if needed
     - No manual refresh required

### Scenario 5: Connection Status Indicators

**Objective**: Verify connection status indicators work correctly.

#### Steps:

1. **Test Connection States**:
   - **Online**: Status shows "Connected" (green)
   - **Offline**: Status shows "Disconnected" or "Offline" (red)
   - **Reconnecting**: Status shows "Reconnecting..." (yellow/orange)

2. **Test Status Updates**:
   - Toggle network on/off
   - Verify status indicator updates immediately
   - Verify status is visible in chat interface

## Expected Behaviors

### ✅ Success Criteria

1. **Message Queuing**: Messages are queued locally when offline
2. **Automatic Sync**: Messages send automatically when connection is restored
3. **Status Updates**: Connection status indicators work correctly
4. **Background Sync**: App syncs missed messages when coming to foreground
5. **Data Persistence**: Messages persist in local database
6. **UI Updates**: Chat UI updates correctly with message statuses

### ❌ Failure Indicators

1. **Lost Messages**: Messages disappear when going offline
2. **No Queuing**: Messages fail to send when offline
3. **No Auto-Sync**: Messages don't send when connection is restored
4. **UI Freezing**: App becomes unresponsive when offline
5. **Data Loss**: Messages are lost from local storage
6. **Status Issues**: Connection status doesn't update correctly

## Debugging Tips

### Check Local Database
```bash
# If using Expo, you can inspect the SQLite database
# Messages should be stored in the 'messages' table
```

### Check Console Logs
- Look for "Syncing missed messages..." logs
- Check for socket connection/disconnection logs
- Verify message queuing logs

### Check Network Tab
- Monitor API calls when going online/offline
- Verify message sync API calls are made

## Test Results Template

```
Test Date: ___________
Tester: ___________
App Version: ___________

Scenario 1 - Basic Offline Queuing:
[ ] Messages queue when offline
[ ] Messages send when reconnected
[ ] Status indicators work correctly

Scenario 2 - Multiple Offline Messages:
[ ] Multiple messages queue correctly
[ ] All messages send in order
[ ] No message loss

Scenario 3 - Mid-Conversation Offline:
[ ] App handles offline gracefully
[ ] Messages queue during conversation
[ ] Background sync works

Scenario 4 - Background Sync:
[ ] App syncs on foreground
[ ] Socket reconnects automatically
[ ] Missed messages are fetched

Scenario 5 - Connection Status:
[ ] Status updates correctly
[ ] Visual indicators are clear
[ ] Status persists across app states

Overall Result: [ ] PASS [ ] FAIL
Notes: ___________
```

## Troubleshooting

### Common Issues

1. **Messages not queuing**: Check if offline detection is working
2. **Messages not syncing**: Verify socket reconnection logic
3. **UI not updating**: Check message store integration
4. **Database errors**: Verify SQLite setup and migrations

### Quick Fixes

1. **Restart app** if connection status gets stuck
2. **Clear app data** if database issues persist
3. **Check network permissions** if offline detection fails
4. **Verify backend connectivity** if sync fails

---

**Note**: This testing should be performed on both iOS and Android devices/simulators to ensure cross-platform compatibility.
