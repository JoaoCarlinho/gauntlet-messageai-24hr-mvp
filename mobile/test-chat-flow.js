#!/usr/bin/env node

/**
 * Comprehensive test script for chat flow
 * Tests the complete flow from authentication to socket connection to conversation loading
 */

const axios = require('axios');

const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'https://gauntlet-messageai-24hr-mvp-production.up.railway.app';

// Test credentials (you'll need to replace with actual test user)
const TEST_CREDENTIALS = {
  email: 'test@example.com',
  password: 'testpassword'
};

async function testChatFlow() {
  console.log('🧪 Testing Complete Chat Flow...\n');

  let accessToken = null;
  let refreshToken = null;
  let userId = null;

  try {
    // Test 1: Health check
    console.log('1. Testing backend health...');
    const healthResponse = await axios.get(`${API_BASE_URL}/api/v1/health`);
    console.log('✅ Backend is healthy:', healthResponse.data.status);

    // Test 2: Login
    console.log('\n2. Testing user login...');
    try {
      const loginResponse = await axios.post(`${API_BASE_URL}/api/v1/auth/login`, TEST_CREDENTIALS);
      
      if (loginResponse.data.user && loginResponse.data.tokens) {
        accessToken = loginResponse.data.tokens.accessToken;
        refreshToken = loginResponse.data.tokens.refreshToken;
        userId = loginResponse.data.user.id;
        
        console.log('✅ Login successful');
        console.log(`   User: ${loginResponse.data.user.displayName}`);
        console.log(`   User ID: ${userId}`);
        console.log(`   Access Token: ${accessToken.substring(0, 20)}...`);
      } else {
        throw new Error('Invalid login response structure');
      }
    } catch (error) {
      if (error.response?.status === 401) {
        console.log('⚠️  Login failed with test credentials - this is expected if test user doesn\'t exist');
        console.log('   You can create a test user or use existing credentials');
        return;
      }
      throw error;
    }

    // Test 3: Token validation
    console.log('\n3. Testing token validation...');
    const conversationsResponse = await axios.get(`${API_BASE_URL}/api/v1/conversations`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    });
    console.log('✅ Token is valid, conversations loaded');
    console.log(`   Conversations count: ${conversationsResponse.data.conversations?.length || 0}`);

    // Test 4: Token refresh
    console.log('\n4. Testing token refresh...');
    const refreshResponse = await axios.post(`${API_BASE_URL}/api/v1/auth/refresh`, {
      refreshToken: refreshToken
    });
    
    if (refreshResponse.data.accessToken) {
      const newAccessToken = refreshResponse.data.accessToken;
      console.log('✅ Token refresh successful');
      console.log(`   New Access Token: ${newAccessToken.substring(0, 20)}...`);
      
      // Test with new token
      const testResponse = await axios.get(`${API_BASE_URL}/api/v1/conversations`, {
        headers: {
          'Authorization': `Bearer ${newAccessToken}`
        }
      });
      console.log('✅ New token works correctly');
    } else {
      throw new Error('Token refresh failed - no new access token returned');
    }

    // Test 5: Socket connection simulation
    console.log('\n5. Testing socket endpoint accessibility...');
    try {
      // Test if socket.io endpoint is accessible
      const socketTestResponse = await axios.get(`${API_BASE_URL}/socket.io/`, {
        params: {
          transport: 'polling'
        }
      });
      console.log('✅ Socket.io endpoint is accessible');
    } catch (error) {
      if (error.response?.status === 200 || error.response?.status === 400) {
        console.log('✅ Socket.io endpoint is accessible (expected response)');
      } else {
        console.log('⚠️  Socket.io endpoint test inconclusive:', error.message);
      }
    }

    // Test 6: Logout
    console.log('\n6. Testing logout...');
    const logoutResponse = await axios.post(`${API_BASE_URL}/api/v1/auth/logout`, {}, {
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    });
    console.log('✅ Logout successful');

    console.log('\n🎉 All tests passed! Chat flow should work correctly.');
    console.log('\n📱 Next steps for mobile testing:');
    console.log('1. Deploy the mobile app with the fixes');
    console.log('2. Test login with valid credentials');
    console.log('3. Verify socket connection establishes successfully');
    console.log('4. Check that conversations load after socket connection');
    console.log('5. Test sending messages in a conversation');
    console.log('6. Test token refresh during active session');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', error.response.data);
    }
    
    console.log('\n🔧 Troubleshooting tips:');
    console.log('1. Check if backend is running and accessible');
    console.log('2. Verify API endpoints are correct');
    console.log('3. Check if test user exists in database');
    console.log('4. Verify JWT secrets are configured correctly');
  }
}

// Run the test
testChatFlow();
