#!/usr/bin/env node

/**
 * Authentication Fixes Validation Script
 * 
 * This script tests the authentication fixes implemented to resolve the issues
 * identified in the mobile and railway logs.
 */

const axios = require('axios');

// Configuration
const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:3000/api/v1';
const TEST_EMAIL = 'test@example.com';
const TEST_PASSWORD = 'TestPassword123';
const TEST_DISPLAY_NAME = 'Test User';

// Test results tracking
const testResults = {
  passed: 0,
  failed: 0,
  errors: []
};

// Utility functions
function logTest(testName, passed, error = null) {
  const status = passed ? '✅ PASS' : '❌ FAIL';
  console.log(`${status}: ${testName}`);
  
  if (passed) {
    testResults.passed++;
  } else {
    testResults.failed++;
    if (error) {
      testResults.errors.push({ test: testName, error: error.message || error });
    }
  }
}

async function makeRequest(method, endpoint, data = null, token = null) {
  const config = {
    method,
    url: `${API_BASE_URL}${endpoint}`,
    headers: {
      'Content-Type': 'application/json',
    }
  };
  
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  
  if (data) {
    config.data = data;
  }
  
  return axios(config);
}

// Test functions
async function testHealthCheck() {
  try {
    const response = await makeRequest('GET', '/health');
    logTest('Health Check', response.status === 200);
    return true;
  } catch (error) {
    logTest('Health Check', false, error);
    return false;
  }
}

async function testUserRegistration() {
  try {
    const userData = {
      email: TEST_EMAIL,
      password: TEST_PASSWORD,
      displayName: TEST_DISPLAY_NAME
    };
    
    const response = await makeRequest('POST', '/auth/register', userData);
    const hasUser = response.data.user && response.data.user.email === TEST_EMAIL;
    const hasTokens = response.data.tokens && response.data.tokens.accessToken && response.data.tokens.refreshToken;
    
    logTest('User Registration', response.status === 201 && hasUser && hasTokens);
    return response.data.tokens;
  } catch (error) {
    // Registration might fail if user already exists, which is okay
    if (error.response?.status === 409) {
      logTest('User Registration (Already Exists)', true);
      return null; // Will need to login instead
    }
    logTest('User Registration', false, error);
    return null;
  }
}

async function testUserLogin() {
  try {
    const credentials = {
      email: TEST_EMAIL,
      password: TEST_PASSWORD
    };
    
    const response = await makeRequest('POST', '/auth/login', credentials);
    const hasUser = response.data.user && response.data.user.email === TEST_EMAIL;
    const hasTokens = response.data.tokens && response.data.tokens.accessToken && response.data.tokens.refreshToken;
    
    logTest('User Login', response.status === 200 && hasUser && hasTokens);
    return response.data.tokens;
  } catch (error) {
    logTest('User Login', false, error);
    return null;
  }
}

async function testTokenValidation(tokens) {
  if (!tokens) {
    logTest('Token Validation', false, new Error('No tokens available'));
    return false;
  }
  
  try {
    const response = await makeRequest('GET', '/users/me', null, tokens.accessToken);
    logTest('Token Validation', response.status === 200 && response.data.user);
    return true;
  } catch (error) {
    logTest('Token Validation', false, error);
    return false;
  }
}

async function testTokenRefresh(tokens) {
  if (!tokens) {
    logTest('Token Refresh', false, new Error('No tokens available'));
    return null;
  }
  
  try {
    const response = await makeRequest('POST', '/auth/refresh', {
      refreshToken: tokens.refreshToken
    });
    
    const hasNewAccessToken = response.data.accessToken && response.data.expiresIn;
    logTest('Token Refresh', response.status === 200 && hasNewAccessToken);
    
    if (hasNewAccessToken) {
      return {
        accessToken: response.data.accessToken,
        refreshToken: tokens.refreshToken // Keep existing refresh token
      };
    }
    return null;
  } catch (error) {
    logTest('Token Refresh', false, error);
    return null;
  }
}

async function testExpiredTokenHandling(tokens) {
  if (!tokens) {
    logTest('Expired Token Handling', false, new Error('No tokens available'));
    return false;
  }
  
  try {
    // Try to use an obviously invalid token
    const response = await makeRequest('GET', '/users/me', null, 'invalid-token');
    logTest('Expired Token Handling', false, new Error('Should have rejected invalid token'));
    return false;
  } catch (error) {
    if (error.response?.status === 401) {
      logTest('Expired Token Handling', true);
      return true;
    }
    logTest('Expired Token Handling', false, error);
    return false;
  }
}

async function testPushTokenRegistration(tokens) {
  if (!tokens) {
    logTest('Push Token Registration', false, new Error('No tokens available'));
    return false;
  }
  
  try {
    const pushTokenData = {
      pushToken: 'ExponentPushToken[test-token-123]',
      platform: 'ios',
      deviceId: 'test-device-123'
    };
    
    const response = await makeRequest('POST', '/users/push-token', pushTokenData, tokens.accessToken);
    logTest('Push Token Registration', response.status === 200 && response.data.success);
    return true;
  } catch (error) {
    logTest('Push Token Registration', false, error);
    return false;
  }
}

async function testConversationsAccess(tokens) {
  if (!tokens) {
    logTest('Conversations Access', false, new Error('No tokens available'));
    return false;
  }
  
  try {
    const response = await makeRequest('GET', '/conversations', null, tokens.accessToken);
    logTest('Conversations Access', response.status === 200);
    return true;
  } catch (error) {
    logTest('Conversations Access', false, error);
    return false;
  }
}

async function testUserSearch(tokens) {
  if (!tokens) {
    logTest('User Search', false, new Error('No tokens available'));
    return false;
  }
  
  try {
    const response = await makeRequest('GET', '/users/search?q=test', null, tokens.accessToken);
    logTest('User Search', response.status === 200);
    return true;
  } catch (error) {
    logTest('User Search', false, error);
    return false;
  }
}

async function testLogout(tokens) {
  if (!tokens) {
    logTest('User Logout', false, new Error('No tokens available'));
    return false;
  }
  
  try {
    const response = await makeRequest('POST', '/auth/logout', null, tokens.accessToken);
    logTest('User Logout', response.status === 200);
    return true;
  } catch (error) {
    logTest('User Logout', false, error);
    return false;
  }
}

// Main test runner
async function runTests() {
  console.log('🧪 Starting Authentication Fixes Validation Tests\n');
  console.log(`Testing against: ${API_BASE_URL}\n`);
  
  // Test 1: Health Check
  const isHealthy = await testHealthCheck();
  if (!isHealthy) {
    console.log('\n❌ Server is not healthy. Stopping tests.');
    return;
  }
  
  // Test 2: User Registration or Login
  let tokens = await testUserRegistration();
  if (!tokens) {
    tokens = await testUserLogin();
  }
  
  if (!tokens) {
    console.log('\n❌ Could not obtain authentication tokens. Stopping tests.');
    return;
  }
  
  // Test 3: Token Validation
  await testTokenValidation(tokens);
  
  // Test 4: Token Refresh
  const refreshedTokens = await testTokenRefresh(tokens);
  if (refreshedTokens) {
    tokens = refreshedTokens;
  }
  
  // Test 5: Expired Token Handling
  await testExpiredTokenHandling(tokens);
  
  // Test 6: Push Token Registration
  await testPushTokenRegistration(tokens);
  
  // Test 7: Conversations Access
  await testConversationsAccess(tokens);
  
  // Test 8: User Search
  await testUserSearch(tokens);
  
  // Test 9: Logout
  await testLogout(tokens);
  
  // Print results
  console.log('\n📊 Test Results Summary:');
  console.log(`✅ Passed: ${testResults.passed}`);
  console.log(`❌ Failed: ${testResults.failed}`);
  console.log(`📈 Success Rate: ${((testResults.passed / (testResults.passed + testResults.failed)) * 100).toFixed(1)}%`);
  
  if (testResults.errors.length > 0) {
    console.log('\n🚨 Errors:');
    testResults.errors.forEach(({ test, error }) => {
      console.log(`  - ${test}: ${error}`);
    });
  }
  
  if (testResults.failed === 0) {
    console.log('\n🎉 All tests passed! Authentication fixes are working correctly.');
  } else {
    console.log('\n⚠️  Some tests failed. Please review the errors above.');
  }
}

// Run the tests
runTests().catch(error => {
  console.error('Test runner failed:', error);
  process.exit(1);
});
