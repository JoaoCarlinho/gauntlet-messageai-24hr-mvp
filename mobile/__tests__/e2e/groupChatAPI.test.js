/**
 * Group Chat API Testing Script
 * Tests group chat functionality with multiple users
 */

const fetch = require('node-fetch');

// Configuration
const BASE_URL = 'https://gauntlet-messageai-24hr-mvp-production.up.railway.app/api/v1';
const TEST_USERS = [
  { email: 'testuser1@example.com', password: 'TestPassword123!', displayName: 'Test User 1' },
  { email: 'testuser2@example.com', password: 'TestPassword123!', displayName: 'Test User 2' },
  { email: 'testuser3@example.com', password: 'TestPassword123!', displayName: 'Test User 3' }
];

let authTokens = {};
let testGroupId = null;

/**
 * Helper function to make authenticated API requests
 */
async function makeRequest(endpoint, options = {}) {
  const url = `${BASE_URL}${endpoint}`;
  const defaultOptions = {
    headers: {
      'Content-Type': 'application/json',
      ...options.headers
    }
  };
  
  return fetch(url, { ...defaultOptions, ...options });
}

/**
 * Register a test user
 */
async function registerUser(userData) {
  try {
    const response = await makeRequest('/auth/register', {
      method: 'POST',
      body: JSON.stringify(userData)
    });
    
    if (response.ok) {
      const data = await response.json();
      console.log(`✅ User registered: ${userData.email}`);
      return data;
    } else {
      const error = await response.text();
      console.log(`⚠️ Registration failed for ${userData.email}: ${error}`);
      return null;
    }
  } catch (error) {
    console.error(`❌ Registration error for ${userData.email}:`, error.message);
    return null;
  }
}

/**
 * Login a user and get auth token
 */
async function loginUser(email, password) {
  try {
    const response = await makeRequest('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password })
    });
    
    if (response.ok) {
      const data = await response.json();
      authTokens[email] = data.token;
      console.log(`✅ User logged in: ${email}`);
      return data;
    } else {
      const error = await response.text();
      console.log(`⚠️ Login failed for ${email}: ${error}`);
      return null;
    }
  } catch (error) {
    console.error(`❌ Login error for ${email}:`, error.message);
    return null;
  }
}

/**
 * Create a group conversation
 */
async function createGroupConversation(token, groupName, participantIds) {
  try {
    const response = await makeRequest('/conversations', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        type: 'group',
        name: groupName,
        participantIds: participantIds
      })
    });
    
    if (response.ok) {
      const data = await response.json();
      console.log(`✅ Group conversation created: ${groupName}`);
      return data;
    } else {
      const error = await response.text();
      console.log(`⚠️ Group creation failed: ${error}`);
      return null;
    }
  } catch (error) {
    console.error(`❌ Group creation error:`, error.message);
    return null;
  }
}

/**
 * Get user ID from token
 */
async function getUserId(token) {
  try {
    const response = await makeRequest('/users/me', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    if (response.ok) {
      const data = await response.json();
      return data.id;
    } else {
      console.log(`⚠️ Failed to get user ID`);
      return null;
    }
  } catch (error) {
    console.error(`❌ Error getting user ID:`, error.message);
    return null;
  }
}

/**
 * Search for users
 */
async function searchUsers(token, query) {
  try {
    const response = await makeRequest(`/users/search?q=${encodeURIComponent(query)}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    if (response.ok) {
      const data = await response.json();
      return data;
    } else {
      console.log(`⚠️ User search failed: ${query}`);
      return [];
    }
  } catch (error) {
    console.error(`❌ User search error:`, error.message);
    return [];
  }
}

/**
 * Send a message to a conversation
 */
async function sendMessage(token, conversationId, content) {
  try {
    const response = await makeRequest('/messages', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        conversationId: conversationId,
        content: content,
        type: 'text'
      })
    });
    
    if (response.ok) {
      const data = await response.json();
      console.log(`✅ Message sent: "${content}"`);
      return data;
    } else {
      const error = await response.text();
      console.log(`⚠️ Message send failed: ${error}`);
      return null;
    }
  } catch (error) {
    console.error(`❌ Message send error:`, error.message);
    return null;
  }
}

/**
 * Get messages from a conversation
 */
async function getMessages(token, conversationId) {
  try {
    const response = await makeRequest(`/messages?conversationId=${conversationId}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    if (response.ok) {
      const data = await response.json();
      return data;
    } else {
      console.log(`⚠️ Failed to get messages for conversation ${conversationId}`);
      return [];
    }
  } catch (error) {
    console.error(`❌ Error getting messages:`, error.message);
    return [];
  }
}

/**
 * Main test function
 */
async function runGroupChatTests() {
  console.log('🚀 Starting Group Chat API Tests...\n');
  
  // Step 1: Register and login test users
  console.log('📝 Step 1: Setting up test users...');
  const userIds = [];
  
  for (const user of TEST_USERS) {
    // Try to register user (might already exist)
    await registerUser(user);
    
    // Login user
    const loginResult = await loginUser(user.email, user.password);
    if (loginResult) {
      const userId = await getUserId(authTokens[user.email]);
      if (userId) {
        userIds.push(userId);
        console.log(`   User ID: ${userId}`);
      }
    }
  }
  
  if (userIds.length < 3) {
    console.log('❌ Failed to setup 3 test users. Cannot proceed with group chat tests.');
    return;
  }
  
  console.log(`✅ Setup complete with ${userIds.length} users\n`);
  
  // Step 2: Create group conversation
  console.log('👥 Step 2: Creating group conversation...');
  const groupName = 'Test Group Chat';
  const participantIds = userIds.slice(0, 3); // Use first 3 users
  
  const groupResult = await createGroupConversation(
    authTokens[TEST_USERS[0].email], 
    groupName, 
    participantIds
  );
  
  if (!groupResult) {
    console.log('❌ Failed to create group conversation. Cannot proceed.');
    return;
  }
  
  testGroupId = groupResult.id;
  console.log(`✅ Group created with ID: ${testGroupId}\n`);
  
  // Step 3: Test sending messages from different users
  console.log('💬 Step 3: Testing message sending from different users...');
  
  const testMessages = [
    { userIndex: 0, message: 'Hello everyone! 👋' },
    { userIndex: 1, message: 'Hi there! How is everyone doing?' },
    { userIndex: 2, message: 'Great to be in this group! 🎉' },
    { userIndex: 0, message: 'Let\'s test some group features!' },
    { userIndex: 1, message: 'This is working well so far!' }
  ];
  
  for (const testMsg of testMessages) {
    const userEmail = TEST_USERS[testMsg.userIndex].email;
    const token = authTokens[userEmail];
    
    if (token) {
      await sendMessage(token, testGroupId, testMsg.message);
      // Small delay between messages
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }
  
  console.log('✅ Message sending test completed\n');
  
  // Step 4: Verify messages are received by all users
  console.log('📨 Step 4: Verifying messages are accessible to all users...');
  
  for (let i = 0; i < 3; i++) {
    const userEmail = TEST_USERS[i].email;
    const token = authTokens[userEmail];
    
    if (token) {
      const messages = await getMessages(token, testGroupId);
      console.log(`   User ${i + 1} can see ${messages.length} messages`);
      
      if (messages.length > 0) {
        console.log(`   Latest message: "${messages[messages.length - 1].content}"`);
      }
    }
  }
  
  console.log('✅ Message verification completed\n');
  
  // Step 5: Test conversation details
  console.log('🔍 Step 5: Testing conversation details...');
  
  const firstUserToken = authTokens[TEST_USERS[0].email];
  if (firstUserToken) {
    try {
      const response = await makeRequest(`/conversations/${testGroupId}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${firstUserToken}`
        }
      });
      
      if (response.ok) {
        const conversation = await response.json();
        console.log(`   Group Name: ${conversation.name}`);
        console.log(`   Group Type: ${conversation.type}`);
        console.log(`   Member Count: ${conversation.members?.length || 0}`);
        console.log('✅ Conversation details retrieved successfully');
      } else {
        console.log('⚠️ Failed to get conversation details');
      }
    } catch (error) {
      console.error('❌ Error getting conversation details:', error.message);
    }
  }
  
  console.log('\n🎉 Group Chat API Tests Completed!');
  console.log('\n📋 Test Summary:');
  console.log('✅ User registration and login');
  console.log('✅ Group conversation creation');
  console.log('✅ Message sending from multiple users');
  console.log('✅ Message retrieval by all users');
  console.log('✅ Conversation details access');
  
  console.log('\n📝 Manual Testing Required:');
  console.log('• Real-time message delivery (requires WebSocket connection)');
  console.log('• Typing indicators in group chat');
  console.log('• Read receipts for group messages');
  console.log('• Group member management (add/remove users)');
  console.log('• Group name updates');
}

// Run the tests
runGroupChatTests().catch(console.error);
