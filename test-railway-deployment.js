#!/usr/bin/env node

/**
 * Railway Deployment Test Script
 * 
 * This script tests the Railway deployment to verify the database fix worked.
 */

const https = require('https');

const RAILWAY_URL = 'https://gauntlet-messageai-24hr-mvp-production.up.railway.app';

function makeRequest(path, method = 'GET', data = null) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'gauntlet-messageai-24hr-mvp-production.up.railway.app',
      port: 443,
      path: path,
      method: method,
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Railway-Test-Script/1.0'
      }
    };

    if (data) {
      const jsonData = JSON.stringify(data);
      options.headers['Content-Length'] = Buffer.byteLength(jsonData);
    }

    const req = https.request(options, (res) => {
      let responseData = '';
      
      res.on('data', (chunk) => {
        responseData += chunk;
      });
      
      res.on('end', () => {
        try {
          const parsed = JSON.parse(responseData);
          resolve({
            statusCode: res.statusCode,
            headers: res.headers,
            data: parsed
          });
        } catch (error) {
          resolve({
            statusCode: res.statusCode,
            headers: res.headers,
            data: responseData
          });
        }
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    if (data) {
      req.write(JSON.stringify(data));
    }
    
    req.end();
  });
}

async function testRailwayDeployment() {
  console.log('🚀 Testing Railway Deployment...\n');

  try {
    // Test 1: Health Check
    console.log('1️⃣ Testing Health Check...');
    const healthResponse = await makeRequest('/health');
    console.log(`   Status: ${healthResponse.statusCode}`);
    console.log(`   Database: ${healthResponse.data.services?.database || 'unknown'}`);
    console.log(`   AWS: ${healthResponse.data.services?.aws || 'unknown'}`);
    console.log(`   JWT: ${healthResponse.data.services?.jwt || 'unknown'}`);
    console.log(`   Socket: ${healthResponse.data.services?.socket || 'unknown'}\n`);

    // Test 2: User Registration
    console.log('2️⃣ Testing User Registration...');
    const testUser = {
      email: `test-${Date.now()}@example.com`,
      password: 'TestPassword123',
      displayName: 'Test User'
    };
    
    const registerResponse = await makeRequest('/api/v1/auth/register', 'POST', testUser);
    console.log(`   Status: ${registerResponse.statusCode}`);
    
    if (registerResponse.statusCode === 201) {
      console.log('   ✅ Registration successful!');
      console.log(`   User ID: ${registerResponse.data.user?.id || 'unknown'}`);
    } else if (registerResponse.statusCode === 500) {
      console.log('   ❌ Registration failed with 500 error');
      console.log(`   Error: ${registerResponse.data.error || 'Unknown error'}`);
      console.log(`   Message: ${registerResponse.data.message || 'No message'}`);
    } else {
      console.log(`   ⚠️  Registration returned status ${registerResponse.statusCode}`);
      console.log(`   Response: ${JSON.stringify(registerResponse.data, null, 2)}`);
    }
    console.log('');

    // Test 3: User Login
    console.log('3️⃣ Testing User Login...');
    const loginData = {
      email: testUser.email,
      password: testUser.password
    };
    
    const loginResponse = await makeRequest('/api/v1/auth/login', 'POST', loginData);
    console.log(`   Status: ${loginResponse.statusCode}`);
    
    if (loginResponse.statusCode === 200) {
      console.log('   ✅ Login successful!');
      console.log(`   Token: ${loginResponse.data.token ? 'Present' : 'Missing'}`);
    } else if (loginResponse.statusCode === 500) {
      console.log('   ❌ Login failed with 500 error');
      console.log(`   Error: ${loginResponse.data.error || 'Unknown error'}`);
      console.log(`   Message: ${loginResponse.data.message || 'No message'}`);
    } else {
      console.log(`   ⚠️  Login returned status ${loginResponse.statusCode}`);
      console.log(`   Response: ${JSON.stringify(loginResponse.data, null, 2)}`);
    }
    console.log('');

    // Test 4: API Endpoints
    console.log('4️⃣ Testing API Endpoints...');
    const endpoints = [
      '/api/v1/users/health',
      '/api/v1/conversations/health',
      '/api/v1/messages/health'
    ];

    for (const endpoint of endpoints) {
      try {
        const response = await makeRequest(endpoint);
        console.log(`   ${endpoint}: ${response.statusCode} ${response.statusCode === 200 ? '✅' : '❌'}`);
      } catch (error) {
        console.log(`   ${endpoint}: Error - ${error.message}`);
      }
    }

    console.log('\n🎯 Test Summary:');
    console.log(`   Health Check: ${healthResponse.statusCode === 200 ? '✅ PASS' : '❌ FAIL'}`);
    console.log(`   Registration: ${registerResponse.statusCode === 201 ? '✅ PASS' : '❌ FAIL'}`);
    console.log(`   Login: ${loginResponse.statusCode === 200 ? '✅ PASS' : '❌ FAIL'}`);

    if (registerResponse.statusCode === 500 || loginResponse.statusCode === 500) {
      console.log('\n🚨 Database schema issue may still exist!');
      console.log('   The pushTokens column fix may not have been applied.');
      console.log('   Check Railway logs for migration errors.');
    } else {
      console.log('\n🎉 Railway deployment is working correctly!');
    }

  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

// Run the test
testRailwayDeployment();
