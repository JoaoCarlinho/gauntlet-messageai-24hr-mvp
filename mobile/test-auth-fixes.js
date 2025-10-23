#!/usr/bin/env node

/**
 * Test script to verify authentication fixes
 * Run this after deploying the fixes to test the authentication flow
 */

const axios = require('axios');

const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'https://gauntlet-messageai-24hr-mvp-production.up.railway.app';

async function testAuthFlow() {
  console.log('🧪 Testing Authentication Flow Fixes...\n');

  try {
    // Test 1: Health check
    console.log('1. Testing health check...');
    const healthResponse = await axios.get(`${API_BASE_URL}/api/v1/health`);
    console.log('✅ Health check passed:', healthResponse.data);

    // Test 2: Test login endpoint
    console.log('\n2. Testing login endpoint...');
    const loginResponse = await axios.post(`${API_BASE_URL}/api/v1/auth/login`, {
      email: 'test@example.com',
      password: 'testpassword'
    });
    console.log('✅ Login endpoint accessible');

    // Test 3: Test token refresh endpoint
    console.log('\n3. Testing token refresh endpoint...');
    try {
      const refreshResponse = await axios.post(`${API_BASE_URL}/api/v1/auth/refresh`, {
        refreshToken: 'invalid-token'
      });
      console.log('⚠️  Refresh endpoint accessible (expected to fail with invalid token)');
    } catch (error) {
      if (error.response?.status === 401) {
        console.log('✅ Refresh endpoint properly rejects invalid tokens');
      } else {
        console.log('❌ Unexpected error from refresh endpoint:', error.message);
      }
    }

    console.log('\n🎉 Authentication flow tests completed!');
    console.log('\n📱 Next steps:');
    console.log('1. Deploy the mobile app with the fixes');
    console.log('2. Test login/logout flow on device');
    console.log('3. Monitor socket connection status');
    console.log('4. Check that token refresh works without disconnecting socket');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', error.response.data);
    }
  }
}

// Run the test
testAuthFlow();
