/**
 * Chat Room API Tests
 * Simple Node.js script to test backend API endpoints
 * Run with: node __tests__/e2e/chatRoomAPI.test.js
 */

const fetch = require('node-fetch');

const API_BASE_URL = 'https://gauntlet-messageai-24hr-mvp-production.up.railway.app';

// Test user credentials
const testUsers = {
  user1: {
    email: 'testuser1@example.com',
    password: 'password123',
    displayName: 'Test User 1'
  },
  user2: {
    email: 'testuser2@example.com',
    password: 'password123',
    displayName: 'Test User 2'
  }
};

let user1Token = null;
let user2Token = null;
let conversationId = null;

// Helper functions
async function registerTestUser(user) {
  try {
    const response = await fetch(`${API_BASE_URL}/api/v1/auth/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(user),
    });

    const data = await response.json();
    console.log(`Register ${user.email}: ${response.status} - ${data.message || 'Success'}`);
    return response.status === 201 || response.status === 400; // Accept both success and user exists
  } catch (error) {
    console.error(`Register ${user.email} failed:`, error.message);
    return false;
  }
}

async function loginUser(user) {
  try {
    const response = await fetch(`${API_BASE_URL}/api/v1/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: user.email,
        password: user.password,
      }),
    });

    const data = await response.json();
    console.log(`Login ${user.email}: ${response.status} - ${data.message || 'Success'}`);
    
    if (response.status === 200 && data.accessToken) {
      return data.accessToken;
    }
    return null;
  } catch (error) {
    console.error(`Login ${user.email} failed:`, error.message);
    return null;
  }
}

async function createConversation(token) {
  try {
    const response = await fetch(`${API_BASE_URL}/api/v1/conversations`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({
        type: 'direct',
        memberIds: [testUsers.user2.email]
      }),
    });

    const data = await response.json();
    console.log(`Create conversation: ${response.status} - ${data.message || 'Success'}`);
    
    if (response.status === 201 && data.conversation) {
      return data.conversation.id;
    }
    return null;
  } catch (error) {
    console.error('Create conversation failed:', error.message);
    return null;
  }
}

async function sendMessage(conversationId, token, content) {
  try {
    const response = await fetch(`${API_BASE_URL}/api/v1/conversations/${conversationId}/messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({
        content: content,
        type: 'text'
      }),
    });

    const data = await response.json();
    console.log(`Send message: ${response.status} - ${data.message || 'Success'}`);
    
    if (response.status === 201 && data.message) {
      return data.message;
    }
    return null;
  } catch (error) {
    console.error('Send message failed:', error.message);
    return null;
  }
}

async function getMessages(conversationId, token) {
  try {
    const response = await fetch(`${API_BASE_URL}/api/v1/conversations/${conversationId}/messages`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    const data = await response.json();
    console.log(`Get messages: ${response.status} - ${data.message || 'Success'}`);
    
    if (response.status === 200 && data.messages) {
      return data.messages;
    }
    return null;
  } catch (error) {
    console.error('Get messages failed:', error.message);
    return null;
  }
}

async function markMessageAsRead(messageId, token) {
  try {
    const response = await fetch(`${API_BASE_URL}/api/v1/messages/${messageId}/read`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
    });

    const data = await response.json();
    console.log(`Mark message as read: ${response.status} - ${data.message || 'Success'}`);
    return response.status === 200;
  } catch (error) {
    console.error('Mark message as read failed:', error.message);
    return false;
  }
}

// Test functions
async function testUserAuthentication() {
  console.log('\n=== Testing User Authentication ===');
  
  // Register test users
  const user1Registered = await registerTestUser(testUsers.user1);
  const user2Registered = await registerTestUser(testUsers.user2);
  
  if (!user1Registered || !user2Registered) {
    console.error('❌ User registration failed');
    return false;
  }
  
  // Login users
  user1Token = await loginUser(testUsers.user1);
  user2Token = await loginUser(testUsers.user2);
  
  if (!user1Token || !user2Token) {
    console.error('❌ User login failed');
    return false;
  }
  
  console.log('✅ User authentication successful');
  return true;
}

async function testConversationCreation() {
  console.log('\n=== Testing Conversation Creation ===');
  
  conversationId = await createConversation(user1Token);
  
  if (!conversationId) {
    console.error('❌ Conversation creation failed');
    return false;
  }
  
  console.log('✅ Conversation creation successful');
  return true;
}

async function testMessaging() {
  console.log('\n=== Testing Messaging ===');
  
  // Send message from user 1
  const message1 = await sendMessage(conversationId, user1Token, 'Hello from User 1!');
  if (!message1) {
    console.error('❌ Send message from user 1 failed');
    return false;
  }
  
  // Send message from user 2
  const message2 = await sendMessage(conversationId, user2Token, 'Hello back from User 2!');
  if (!message2) {
    console.error('❌ Send message from user 2 failed');
    return false;
  }
  
  // Get messages for user 1
  const messages1 = await getMessages(conversationId, user1Token);
  if (!messages1 || messages1.length < 2) {
    console.error('❌ Get messages for user 1 failed');
    return false;
  }
  
  // Get messages for user 2
  const messages2 = await getMessages(conversationId, user2Token);
  if (!messages2 || messages2.length < 2) {
    console.error('❌ Get messages for user 2 failed');
    return false;
  }
  
  console.log('✅ Messaging successful');
  return true;
}

async function testReadReceipts() {
  console.log('\n=== Testing Read Receipts ===');
  
  // Send message from user 1
  const message = await sendMessage(conversationId, user1Token, 'Read receipt test message');
  if (!message) {
    console.error('❌ Send message for read receipt test failed');
    return false;
  }
  
  // Mark message as read by user 2
  const markedAsRead = await markMessageAsRead(message.id, user2Token);
  if (!markedAsRead) {
    console.error('❌ Mark message as read failed');
    return false;
  }
  
  console.log('✅ Read receipts successful');
  return true;
}

async function testErrorHandling() {
  console.log('\n=== Testing Error Handling ===');
  
  // Test invalid conversation ID
  const invalidMessage = await sendMessage('invalid-id', user1Token, 'Test message');
  if (invalidMessage) {
    console.error('❌ Should not be able to send message to invalid conversation');
    return false;
  }
  
  // Test unauthorized access
  try {
    const response = await fetch(`${API_BASE_URL}/api/v1/conversations/${conversationId}/messages`, {
      method: 'GET',
      headers: {
        'Authorization': 'Bearer invalid-token',
      },
    });
    
    if (response.status !== 401) {
      console.error('❌ Should return 401 for invalid token');
      return false;
    }
  } catch (error) {
    console.error('❌ Error handling test failed:', error.message);
    return false;
  }
  
  console.log('✅ Error handling successful');
  return true;
}

// Main test runner
async function runTests() {
  console.log('🚀 Starting Chat Room API Tests...\n');
  
  const tests = [
    { name: 'User Authentication', fn: testUserAuthentication },
    { name: 'Conversation Creation', fn: testConversationCreation },
    { name: 'Messaging', fn: testMessaging },
    { name: 'Read Receipts', fn: testReadReceipts },
    { name: 'Error Handling', fn: testErrorHandling },
  ];
  
  let passed = 0;
  let failed = 0;
  
  for (const test of tests) {
    try {
      const result = await test.fn();
      if (result) {
        passed++;
      } else {
        failed++;
      }
    } catch (error) {
      console.error(`❌ ${test.name} failed with error:`, error.message);
      failed++;
    }
  }
  
  console.log('\n=== Test Results ===');
  console.log(`✅ Passed: ${passed}`);
  console.log(`❌ Failed: ${failed}`);
  console.log(`📊 Total: ${passed + failed}`);
  
  if (failed === 0) {
    console.log('\n🎉 All tests passed! Chat room API is working correctly.');
  } else {
    console.log('\n⚠️  Some tests failed. Please check the backend implementation.');
  }
  
  return failed === 0;
}

// Run tests if this file is executed directly
if (require.main === module) {
  runTests().then(success => {
    process.exit(success ? 0 : 1);
  }).catch(error => {
    console.error('Test runner failed:', error);
    process.exit(1);
  });
}

module.exports = { runTests };
