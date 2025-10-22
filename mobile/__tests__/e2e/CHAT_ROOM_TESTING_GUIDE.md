# Chat Room End-to-End Testing Guide

This guide provides comprehensive instructions for manually testing the chat room functionality to ensure all features work correctly between two devices.

## Prerequisites

- Two physical devices or simulators running the MessageAI app
- Both devices connected to the same network
- Backend server running and accessible
- Test user accounts created

## Test Setup

### 1. Device Preparation
- [ ] Open MessageAI app on Device A (iPhone/Android/Simulator)
- [ ] Open MessageAI app on Device B (iPhone/Android/Simulator)
- [ ] Ensure both devices are connected to WiFi
- [ ] Verify backend connectivity (check for any connection errors)

### 2. User Authentication
- [ ] **Device A**: Register/Login as User 1 (e.g., testuser1@example.com)
- [ ] **Device B**: Register/Login as User 2 (e.g., testuser2@example.com)
- [ ] Verify both users are successfully authenticated
- [ ] Check that user profiles display correctly

## Core Chat Functionality Tests

### 3. Conversation Creation
- [ ] **Device A**: Navigate to conversations list
- [ ] **Device A**: Create new conversation with User 2
- [ ] **Device B**: Verify conversation appears in conversations list
- [ ] **Device A**: Verify conversation appears in conversations list
- [ ] Check conversation name/participants are displayed correctly

### 4. Real-time Messaging
- [ ] **Device A**: Open conversation with User 2
- [ ] **Device B**: Open conversation with User 1
- [ ] **Device A**: Send message "Hello from User 1!"
- [ ] **Device A**: Verify message appears instantly (optimistic UI)
- [ ] **Device B**: Verify message appears in real-time
- [ ] **Device B**: Send message "Hello back from User 2!"
- [ ] **Device A**: Verify message appears in real-time
- [ ] Test sending multiple messages in quick succession

### 5. Message Status Indicators
- [ ] **Device A**: Send message and verify it shows loading indicator
- [ ] **Device A**: Verify message shows single checkmark (✓) when sent
- [ ] **Device B**: Open conversation and verify message shows double checkmarks (✓✓) on Device A
- [ ] **Device B**: Verify message shows blue checkmarks (✓✓) on Device A when read

### 6. Typing Indicators
- [ ] **Device A**: Start typing in message input
- [ ] **Device B**: Verify "User 1 is typing..." indicator appears
- [ ] **Device A**: Stop typing for 3 seconds
- [ ] **Device B**: Verify typing indicator disappears
- [ ] **Device A**: Start typing again
- [ ] **Device B**: Verify typing indicator reappears
- [ ] **Device A**: Send message
- [ ] **Device B**: Verify typing indicator disappears immediately

### 7. Read Receipts
- [ ] **Device A**: Send message "Read receipt test"
- [ ] **Device A**: Verify message shows single checkmark (sent)
- [ ] **Device B**: Open conversation (message becomes visible)
- [ ] **Device A**: Verify message shows double checkmarks (delivered)
- [ ] **Device A**: Verify message shows blue checkmarks (read)
- [ ] Test with multiple messages to verify all are marked as read

## Advanced Functionality Tests

### 8. Message Persistence
- [ ] **Device A**: Send several messages
- [ ] **Device A**: Close and reopen the app
- [ ] **Device A**: Open conversation and verify all messages are still there
- [ ] **Device B**: Close and reopen the app
- [ ] **Device B**: Open conversation and verify all messages are still there

### 9. Offline Scenarios
- [ ] **Device A**: Turn off WiFi/cellular data
- [ ] **Device A**: Send message "Offline test message"
- [ ] **Device A**: Verify message shows as "sending" or "failed"
- [ ] **Device A**: Turn WiFi back on
- [ ] **Device A**: Verify message automatically sends
- [ ] **Device B**: Verify message appears

### 10. App Lifecycle Testing
- [ ] **Device A**: Background the app (home button)
- [ ] **Device B**: Send message "Background test"
- [ ] **Device A**: Foreground the app
- [ ] **Device A**: Verify message appears and any notifications are handled
- [ ] Test with app completely closed and reopened

### 11. Performance Testing
- [ ] Send 50+ messages in rapid succession
- [ ] Verify app remains responsive
- [ ] Test scrolling through long conversation history
- [ ] Verify message loading performance
- [ ] Test with multiple conversations open

## Error Handling Tests

### 12. Network Issues
- [ ] **Device A**: Disconnect from network
- [ ] **Device A**: Try to send message
- [ ] **Device A**: Verify appropriate error message is shown
- [ ] **Device A**: Reconnect to network
- [ ] **Device A**: Verify message sends automatically

### 13. Server Issues
- [ ] **Device A**: Send message while server is down
- [ ] **Device A**: Verify error handling and retry mechanism
- [ ] **Device A**: Verify message queues for retry

### 14. Invalid Data
- [ ] **Device A**: Try to send empty message
- [ ] **Device A**: Verify message is not sent
- [ ] **Device A**: Try to send very long message
- [ ] **Device A**: Verify message handling

## UI/UX Tests

### 15. Visual Elements
- [ ] Verify message bubbles are properly styled
- [ ] Check message alignment (own messages right, others left)
- [ ] Verify timestamps are displayed correctly
- [ ] Check avatar display for other users
- [ ] Verify input toolbar is always visible

### 16. Responsiveness
- [ ] Test on different screen sizes
- [ ] Verify keyboard doesn't cover input
- [ ] Test landscape orientation
- [ ] Verify scrolling behavior

### 17. Accessibility
- [ ] Test with screen reader
- [ ] Verify proper focus management
- [ ] Check color contrast
- [ ] Test with large text sizes

## Security Tests

### 18. Message Privacy
- [ ] Verify messages are only visible to conversation participants
- [ ] Test with third user - verify they cannot see messages
- [ ] Check message encryption (if implemented)

### 19. Authentication
- [ ] **Device A**: Logout and try to access conversation
- [ ] **Device A**: Verify access is denied
- [ ] **Device A**: Login again and verify conversation is accessible

## Test Results Documentation

### Pass/Fail Checklist
- [ ] Real-time messaging works correctly
- [ ] Typing indicators function properly
- [ ] Read receipts update correctly
- [ ] Offline scenarios handle gracefully
- [ ] App lifecycle events work correctly
- [ ] Performance is acceptable
- [ ] Error handling is user-friendly
- [ ] UI/UX is polished and responsive
- [ ] Security measures are in place

### Issues Found
Document any issues discovered during testing:

1. **Issue**: [Description]
   - **Severity**: High/Medium/Low
   - **Steps to Reproduce**: [Steps]
   - **Expected**: [Expected behavior]
   - **Actual**: [Actual behavior]

2. **Issue**: [Description]
   - **Severity**: High/Medium/Low
   - **Steps to Reproduce**: [Steps]
   - **Expected**: [Expected behavior]
   - **Actual**: [Actual behavior]

### Performance Metrics
- [ ] Message delivery time: [X]ms
- [ ] Typing indicator response time: [X]ms
- [ ] Read receipt update time: [X]ms
- [ ] App startup time: [X]s
- [ ] Memory usage: [X]MB

## Sign-off

- [ ] All core functionality tests passed
- [ ] All advanced functionality tests passed
- [ ] All error handling tests passed
- [ ] All UI/UX tests passed
- [ ] All security tests passed
- [ ] Performance is acceptable
- [ ] No critical issues found

**Tester**: [Name]
**Date**: [Date]
**Version**: [App Version]
**Build**: [Build Number]

---

## Quick Test Script

For a quick smoke test, run through these essential checks:

1. Login two users on separate devices
2. Create conversation between them
3. Send message from Device A → verify appears on Device B
4. Send message from Device B → verify appears on Device A
5. Test typing indicators
6. Test read receipts
7. Test offline/online scenarios

If all these pass, the core chat functionality is working correctly.
