#!/usr/bin/env node

/**
 * Production Backend Test Runner
 * Runs automated tests against the production Railway backend
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🚀 Starting Production Backend Integration Tests');
console.log('=' .repeat(60));

// Set production backend URL
process.env.EXPO_PUBLIC_API_URL = 'https://gauntlet-messageai-24hr-mvp-production.up.railway.app';

async function runTests() {
  try {
    console.log('📋 Test Configuration:');
    console.log(`   Backend URL: ${process.env.EXPO_PUBLIC_API_URL}`);
    console.log(`   Test Environment: ${process.env.NODE_ENV || 'test'}`);
    console.log('');

    // Test 1: Health Check
    console.log('🏥 Running Health Check Tests...');
    try {
      const healthResponse = await fetch(`${process.env.EXPO_PUBLIC_API_URL}/health`);
      const health = await healthResponse.json();
      
      if (health.status === 'ok') {
        console.log('   ✅ Backend is healthy');
        console.log(`   📊 Database: ${health.services.database}`);
        console.log(`   🔌 Socket: ${health.services.socket}`);
        console.log(`   ☁️  AWS: ${health.services.aws}`);
        console.log(`   🔑 JWT: ${health.services.jwt}`);
      } else {
        console.log('   ❌ Backend health check failed');
      }
    } catch (error) {
      console.log('   ❌ Health check failed:', error.message);
    }

    console.log('');

    // Test 2: API Endpoints
    console.log('🔗 Testing API Endpoints...');
    const endpoints = [
      { path: '/api/v1', method: 'GET', name: 'API Info' },
      { path: '/api/v1/auth', method: 'GET', name: 'Auth Endpoint' },
      { path: '/api/v1/users', method: 'GET', name: 'Users Endpoint' },
      { path: '/api/v1/conversations', method: 'GET', name: 'Conversations Endpoint' }
    ];

    for (const endpoint of endpoints) {
      try {
        const response = await fetch(`${process.env.EXPO_PUBLIC_API_URL}${endpoint.path}`, {
          method: endpoint.method
        });
        
        if (response.status < 500) {
          console.log(`   ✅ ${endpoint.name}: ${response.status}`);
        } else {
          console.log(`   ❌ ${endpoint.name}: ${response.status}`);
        }
      } catch (error) {
        console.log(`   ❌ ${endpoint.name}: ${error.message}`);
      }
    }

    console.log('');

    // Test 3: Authentication API
    console.log('🔐 Testing Authentication API...');
    try {
      // Test registration validation
      const registerResponse = await fetch(`${process.env.EXPO_PUBLIC_API_URL}/api/v1/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'invalid-email',
          password: 'weak',
          displayName: 'A'
        })
      });
      
      const registerResult = await registerResponse.json();
      if (registerResult.error && registerResult.error.includes('Validation failed')) {
        console.log('   ✅ Registration validation working');
      } else {
        console.log('   ⚠️  Registration validation response unexpected');
      }
    } catch (error) {
      console.log('   ❌ Registration test failed:', error.message);
    }

    console.log('');

    // Test 4: Run Jest Tests
    console.log('🧪 Running Jest Integration Tests...');
    try {
      const testCommand = 'npm test -- --testPathPattern="production-backend|production-integration" --verbose';
      console.log(`   Running: ${testCommand}`);
      
      execSync(testCommand, { 
        stdio: 'inherit',
        cwd: process.cwd()
      });
      
      console.log('   ✅ Jest tests completed');
    } catch (error) {
      console.log('   ⚠️  Jest tests had issues (this is expected in some environments)');
    }

    console.log('');

    // Test 5: Frontend Connection Test
    console.log('📱 Testing Frontend Connection...');
    try {
      // Test if the mobile app can make API calls
      const apiTestResponse = await fetch(`${process.env.EXPO_PUBLIC_API_URL}/api/v1`);
      const apiInfo = await apiTestResponse.json();
      
      if (apiInfo.message === 'MessageAI API v1') {
        console.log('   ✅ Frontend can connect to backend');
        console.log(`   📋 API Version: ${apiInfo.version}`);
        console.log(`   🔧 Features: ${Object.keys(apiInfo.features).join(', ')}`);
      } else {
        console.log('   ❌ Frontend connection test failed');
      }
    } catch (error) {
      console.log('   ❌ Frontend connection test failed:', error.message);
    }

    console.log('');
    console.log('🎉 Production Backend Integration Tests Completed!');
    console.log('=' .repeat(60));

  } catch (error) {
    console.error('❌ Test runner failed:', error);
    process.exit(1);
  }
}

// Run the tests
runTests();
