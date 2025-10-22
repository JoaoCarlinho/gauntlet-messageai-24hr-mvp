# Group Chat Testing Guide

This guide provides comprehensive testing instructions for the group chat functionality in MessageAI.

## Prerequisites

- 3+ test user accounts
- Mobile app installed and running
- Backend server running and accessible
- Stable internet connection

## Test Scenarios

### 1. Group Creation Testing

#### Test 1.1: Create Group with 3 Users
**Objective**: Verify group creation works with multiple participants

**Steps**:
1. Login as User A
2. Navigate to "New Group" screen
3. Enter group name: "Test Group 1"
4. Search for User B and User C
5. Select both users
6. Tap "Create Group"
7. Verify group is created successfully
8. Verify navigation to group chat screen

**Expected Results**:
- ✅ Group created with correct name
- ✅ All 3 users are members
- ✅ User A is automatically added as member
- ✅ Navigation to group chat works
- ✅ Group name displays in chat header

#### Test 1.2: Group Creation Validation
**Objective**: Test input validation for group creation

**Steps**:
1. Try creating group with empty name
2. Try creating group with no participants
3. Try creating group with only 1 participant
4. Try creating group with very long name (100+ characters)

**Expected Results**:
- ❌ Empty name should show validation error
- ❌ No participants should show validation error
- ❌ Only 1 participant should show validation error
- ❌ Very long name should show validation error

### 2. Group Messaging Testing

#### Test 2.1: Send Messages from Different Users
**Objective**: Verify all group members can send messages

**Setup**: Create a group with 3 users (A, B, C)

**Steps**:
1. User A sends: "Hello everyone! 👋"
2. User B sends: "Hi there! How is everyone?"
3. User C sends: "Great to be in this group! 🎉"
4. User A sends: "Let's test some features!"
5. User B sends: "This is working well!"

**Expected Results**:
- ✅ All messages appear in correct order
- ✅ Messages show sender information (name/avatar)
- ✅ Timestamps are accurate
- ✅ Message status indicators work (sending/sent/delivered)

#### Test 2.2: Message Display in Group Chat
**Objective**: Verify proper message display for group conversations

**Steps**:
1. Send messages from different users
2. Observe message bubble layout
3. Check sender name display
4. Verify avatar positioning

**Expected Results**:
- ✅ Sender names appear above message bubbles
- ✅ Avatars appear to the left of received messages
- ✅ Own messages don't show sender info
- ✅ Message bubbles are properly aligned
- ✅ Different users' messages are visually distinct

### 3. Real-time Features Testing

#### Test 3.1: Real-time Message Delivery
**Objective**: Verify messages appear instantly for all users

**Setup**: Have 3 users in the same group chat

**Steps**:
1. User A sends a message
2. Observe on User B and User C devices
3. User B sends a message
4. Observe on User A and User C devices
5. User C sends a message
6. Observe on User A and User B devices

**Expected Results**:
- ✅ Messages appear instantly on all devices
- ✅ No significant delay in message delivery
- ✅ Messages appear in correct order
- ✅ No duplicate messages

#### Test 3.2: Typing Indicators in Group Chat
**Objective**: Verify typing indicators work in group conversations

**Steps**:
1. User A starts typing a message
2. Observe typing indicator on User B and User C devices
3. User A stops typing (sends message or cancels)
4. Verify typing indicator disappears
5. User B starts typing while User A is typing
6. Verify multiple typing indicators work

**Expected Results**:
- ✅ Typing indicator appears when user starts typing
- ✅ Typing indicator shows correct user name
- ✅ Typing indicator disappears when user stops typing
- ✅ Multiple typing indicators work simultaneously
- ✅ Typing indicator appears below message list

#### Test 3.3: Read Receipts in Group Chat
**Objective**: Verify read receipts work for group messages

**Steps**:
1. User A sends a message
2. User B opens the group chat
3. Verify read receipt updates on User A's device
4. User C opens the group chat
5. Verify read receipt updates on User A's device
6. Send message from User B
7. Verify read receipts for User A and User C

**Expected Results**:
- ✅ Read receipts update when users view messages
- ✅ Read receipts show correct status (✓, ✓✓)
- ✅ Read receipts are color-coded (blue for read)
- ✅ Read receipts update in real-time
- ✅ Multiple read receipts work correctly

### 4. Group Management Testing

#### Test 4.1: Group Information Display
**Objective**: Verify group information is displayed correctly

**Steps**:
1. Open group chat
2. Check group name in header
3. Tap on group name/header
4. Verify group details screen
5. Check member list
6. Verify member count

**Expected Results**:
- ✅ Group name displays correctly in header
- ✅ Group details screen shows all members
- ✅ Member count is accurate
- ✅ Member names and avatars display correctly
- ✅ Group type is shown as "Group"

#### Test 4.2: Group Member Management
**Objective**: Test adding/removing group members (if implemented)

**Steps**:
1. Open group details
2. Try to add a new member
3. Try to remove an existing member
4. Verify member changes are reflected
5. Test permissions (who can add/remove members)

**Expected Results**:
- ✅ Group admins can add/remove members
- ✅ Regular members cannot add/remove members
- ✅ Member changes are reflected in real-time
- ✅ Removed members lose access to group
- ✅ Added members gain access to group

### 5. Error Handling Testing

#### Test 5.1: Network Connectivity Issues
**Objective**: Test behavior during network problems

**Steps**:
1. Start group chat with 3 users
2. Disconnect User A's internet
3. User B sends a message
4. Reconnect User A's internet
5. Verify User A receives missed messages
6. User A sends a message
7. Verify message is delivered

**Expected Results**:
- ✅ Offline users don't receive messages immediately
- ✅ Reconnected users receive missed messages
- ✅ Message status shows "failed" for offline users
- ✅ Messages retry automatically when reconnected
- ✅ No message loss during network issues

#### Test 5.2: Large Group Testing
**Objective**: Test performance with larger groups

**Steps**:
1. Create group with 5+ users
2. Send multiple messages rapidly
3. Test scrolling performance
4. Test message loading
5. Test typing indicators with many users

**Expected Results**:
- ✅ App remains responsive with large groups
- ✅ Message loading is efficient
- ✅ Scrolling is smooth
- ✅ Typing indicators work with many users
- ✅ No performance degradation

### 6. Cross-Platform Testing

#### Test 6.1: Multi-Device Testing
**Objective**: Verify group chat works across different devices

**Steps**:
1. User A on iOS, User B on Android, User C on Web
2. Create group with all users
3. Send messages from different devices
4. Test all real-time features
5. Verify consistent experience

**Expected Results**:
- ✅ Group chat works on all platforms
- ✅ Messages sync across devices
- ✅ Real-time features work consistently
- ✅ UI is appropriate for each platform
- ✅ No platform-specific issues

## Test Data

### Test Users
```
User A: testuser1@example.com / TestPassword123!
User B: testuser2@example.com / TestPassword123!
User C: testuser3@example.com / TestPassword123!
User D: testuser4@example.com / TestPassword123!
User E: testuser5@example.com / TestPassword123!
```

### Test Groups
```
Group 1: "Test Group 1" (Users A, B, C)
Group 2: "Large Test Group" (Users A, B, C, D, E)
Group 3: "Performance Test Group" (Users A, B, C, D, E)
```

## Test Results Template

### Test Execution Log
```
Date: ___________
Tester: ___________
App Version: ___________
Backend Version: ___________

Test Results:
□ Test 1.1: Group Creation - PASS/FAIL
□ Test 1.2: Group Validation - PASS/FAIL
□ Test 2.1: Message Sending - PASS/FAIL
□ Test 2.2: Message Display - PASS/FAIL
□ Test 3.1: Real-time Delivery - PASS/FAIL
□ Test 3.2: Typing Indicators - PASS/FAIL
□ Test 3.3: Read Receipts - PASS/FAIL
□ Test 4.1: Group Information - PASS/FAIL
□ Test 4.2: Member Management - PASS/FAIL
□ Test 5.1: Network Issues - PASS/FAIL
□ Test 5.2: Large Groups - PASS/FAIL
□ Test 6.1: Multi-Device - PASS/FAIL

Issues Found:
1. ________________
2. ________________
3. ________________

Overall Result: PASS/FAIL
```

## Automated Testing

### API Tests
Run the automated API tests:
```bash
cd mobile/__tests__/e2e
node groupChatAPI.test.js
```

### Expected API Test Results
- ✅ User registration and login
- ✅ Group conversation creation
- ✅ Message sending from multiple users
- ✅ Message retrieval by all users
- ✅ Conversation details access

## Notes

- Real-time features require WebSocket connections
- Some tests may need to be run multiple times for reliability
- Network conditions can affect real-time feature testing
- Consider testing during different times of day for performance
- Document any platform-specific behaviors or limitations

## Troubleshooting

### Common Issues
1. **Messages not appearing**: Check WebSocket connection
2. **Typing indicators not working**: Verify socket event handling
3. **Read receipts not updating**: Check message view tracking
4. **Group creation failing**: Verify user search functionality
5. **Performance issues**: Check message loading and caching

### Debug Steps
1. Check browser/app console for errors
2. Verify backend logs for WebSocket events
3. Test with smaller groups first
4. Check network connectivity
5. Verify user authentication status
