#!/usr/bin/env node

/**
 * Standalone Production Integration Test
 * Tests the frontend mobile app against the production Railway backend
 */

const fetch = require('node-fetch');

const PRODUCTION_BACKEND_URL = 'https://gauntlet-messageai-24hr-mvp-production.up.railway.app';

// Simple test framework
class TestRunner {
  constructor() {
    this.tests = [];
    this.passed = 0;
    this.failed = 0;
  }

  test(name, fn) {
    this.tests.push({ name, fn });
  }

  async run() {
    console.log('🧪 Running Production Integration Tests');
    console.log('=' .repeat(50));
    console.log(`Backend URL: ${PRODUCTION_BACKEND_URL}`);
    console.log('');

    for (const test of this.tests) {
      try {
        console.log(`▶️  ${test.name}`);
        await test.fn();
        console.log(`✅ ${test.name} - PASSED`);
        this.passed++;
      } catch (error) {
        console.log(`❌ ${test.name} - FAILED: ${error.message}`);
        this.failed++;
      }
      console.log('');
    }

    console.log('=' .repeat(50));
    console.log(`📊 Test Results: ${this.passed} passed, ${this.failed} failed`);
    console.log(`🎯 Success Rate: ${Math.round((this.passed / (this.passed + this.failed)) * 100)}%`);
    
    if (this.failed === 0) {
      console.log('🎉 All tests passed!');
      process.exit(0);
    } else {
      console.log('⚠️  Some tests failed');
      process.exit(1);
    }
  }
}

// Assertion helpers
function expect(actual) {
  return {
    toBe(expected) {
      if (actual !== expected) {
        throw new Error(`Expected ${expected}, but got ${actual}`);
      }
    },
    toContain(expected) {
      if (!actual.includes(expected)) {
        throw new Error(`Expected "${actual}" to contain "${expected}"`);
      }
    },
    toBeDefined() {
      if (actual === undefined) {
        throw new Error('Expected value to be defined');
      }
    },
    toBeLessThan(expected) {
      if (actual >= expected) {
        throw new Error(`Expected ${actual} to be less than ${expected}`);
      }
    },
    toBeGreaterThanOrEqual(expected) {
      if (actual < expected) {
        throw new Error(`Expected ${actual} to be greater than or equal to ${expected}`);
      }
    }
  };
}

// Create test runner
const runner = new TestRunner();

// Health Check Tests
runner.test('Backend Health Check', async () => {
  const response = await fetch(`${PRODUCTION_BACKEND_URL}/health`);
  const health = await response.json();
  
  expect(health.status).toBe('ok');
  expect(health.services.database).toBe('connected');
  expect(health.services.socket).toBe('active');
  expect(health.environment).toBe('production');
});

runner.test('API Information Endpoint', async () => {
  const response = await fetch(`${PRODUCTION_BACKEND_URL}/api/v1`);
  const apiInfo = await response.json();
  
  expect(apiInfo.message).toBe('MessageAI API v1');
  expect(apiInfo.version).toBe('1.0.0');
  expect(apiInfo.features.rest).toBe(true);
  expect(apiInfo.features.websockets).toBe(true);
});

runner.test('Authentication Validation', async () => {
  const response = await fetch(`${PRODUCTION_BACKEND_URL}/api/v1/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: 'invalid-email',
      password: 'weak',
      displayName: 'A'
    })
  });
  
  const result = await response.json();
  expect(result.error).toContain('Validation failed');
});

runner.test('Protected Endpoints Require Authentication', async () => {
  const usersResponse = await fetch(`${PRODUCTION_BACKEND_URL}/api/v1/users/me`);
  expect(usersResponse.status).toBe(401);
  
  const conversationsResponse = await fetch(`${PRODUCTION_BACKEND_URL}/api/v1/conversations`);
  expect(conversationsResponse.status).toBe(401);
});

runner.test('Error Handling for Invalid Endpoints', async () => {
  const response = await fetch(`${PRODUCTION_BACKEND_URL}/api/v1/invalid-endpoint`);
  expect(response.status).toBe(404);
});

runner.test('Response Time Performance', async () => {
  const startTime = Date.now();
  const response = await fetch(`${PRODUCTION_BACKEND_URL}/health`);
  const endTime = Date.now();
  
  expect(response.status).toBe(200);
  expect(endTime - startTime).toBeLessThan(5000);
});

runner.test('CORS Configuration', async () => {
  const response = await fetch(`${PRODUCTION_BACKEND_URL}/api/v1`, {
    method: 'OPTIONS',
    headers: {
      'Origin': 'http://localhost:8084',
      'Access-Control-Request-Method': 'GET'
    }
  });
  
  // Should handle CORS preflight requests
  expect(response.status).toBeLessThan(500);
});

runner.test('WebSocket Service Status', async () => {
  const response = await fetch(`${PRODUCTION_BACKEND_URL}/health`);
  const health = await response.json();
  
  expect(health.services.socket).toBe('active');
});

runner.test('Database Connection Status', async () => {
  const response = await fetch(`${PRODUCTION_BACKEND_URL}/health`);
  const health = await response.json();
  
  expect(health.services.database).toBe('connected');
});

runner.test('AWS Configuration Status', async () => {
  const response = await fetch(`${PRODUCTION_BACKEND_URL}/health`);
  const health = await response.json();
  
  expect(health.services.aws).toBe('configured');
});

// Run all tests
runner.run().catch(console.error);
