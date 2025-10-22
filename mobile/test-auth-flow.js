#!/usr/bin/env node

/**
 * Authentication Flow Test
 * Tests the authentication endpoints to verify they're working
 */

const fetch = require('node-fetch');

const PRODUCTION_BACKEND_URL = 'https://gauntlet-messageai-24hr-mvp-production.up.railway.app';

async function testAuthFlow() {
  console.log('🔐 Testing Authentication Flow');
  console.log('=' .repeat(40));
  console.log('');

  try {
    // Test 1: Registration with valid data
    console.log('📝 Test 1: User Registration');
    const registerData = {
      email: `testuser_${Date.now()}@example.com`,
      password: 'TestPass123',
      displayName: 'Test User'
    };

    const registerResponse = await fetch(`${PRODUCTION_BACKEND_URL}/api/v1/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(registerData)
    });

    const registerResult = await registerResponse.json();
    
    if (registerResponse.ok) {
      console.log('   ✅ Registration successful');
      console.log(`   👤 User ID: ${registerResult.data?.user?.id || 'N/A'}`);
      console.log(`   🔑 Access Token: ${registerResult.data?.accessToken ? 'Present' : 'Missing'}`);
      
      // Test 2: Login with the same credentials
      console.log('');
      console.log('🔑 Test 2: User Login');
      
      const loginResponse = await fetch(`${PRODUCTION_BACKEND_URL}/api/v1/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: registerData.email,
          password: registerData.password
        })
      });

      const loginResult = await loginResponse.json();
      
      if (loginResponse.ok) {
        console.log('   ✅ Login successful');
        console.log(`   👤 User: ${loginResult.data?.user?.displayName || 'N/A'}`);
        console.log(`   🔑 Access Token: ${loginResult.data?.accessToken ? 'Present' : 'Missing'}`);
        
        // Test 3: Access protected endpoint
        console.log('');
        console.log('🛡️  Test 3: Protected Endpoint Access');
        
        const protectedResponse = await fetch(`${PRODUCTION_BACKEND_URL}/api/v1/users/me`, {
          headers: {
            'Authorization': `Bearer ${loginResult.data?.accessToken}`
          }
        });

        if (protectedResponse.ok) {
          console.log('   ✅ Protected endpoint accessible');
        } else {
          console.log(`   ❌ Protected endpoint failed: ${protectedResponse.status}`);
        }
        
      } else {
        console.log(`   ❌ Login failed: ${loginResult.error || 'Unknown error'}`);
      }
      
    } else {
      console.log(`   ❌ Registration failed: ${registerResult.error || 'Unknown error'}`);
      
      // If registration fails, try login with existing user
      console.log('');
      console.log('🔑 Test 2: Login with existing user');
      
      const loginResponse = await fetch(`${PRODUCTION_BACKEND_URL}/api/v1/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'test@example.com',
          password: 'TestPass123'
        })
      });

      const loginResult = await loginResponse.json();
      
      if (loginResponse.ok) {
        console.log('   ✅ Login successful with existing user');
      } else {
        console.log(`   ❌ Login failed: ${loginResult.error || 'Unknown error'}`);
      }
    }

    console.log('');
    console.log('🎯 Authentication Flow Test Complete');
    console.log('=' .repeat(40));

  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

testAuthFlow();
