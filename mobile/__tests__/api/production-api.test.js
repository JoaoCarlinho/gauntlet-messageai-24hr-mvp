/**
 * Production API Integration Tests
 * Simple Node.js tests for API integration without React Native dependencies
 */

const fetch = require('node-fetch');

const PRODUCTION_BACKEND_URL = 'https://gauntlet-messageai-24hr-mvp-production.up.railway.app';

describe('Production API Integration Tests', () => {
  describe('Health Check', () => {
    test('should connect to production backend successfully', async () => {
      const response = await fetch(`${PRODUCTION_BACKEND_URL}/health`);
      const health = await response.json();
      
      expect(health.status).toBe('ok');
      expect(health.timestamp).toBeDefined();
      expect(health.services.database).toBe('connected');
      expect(health.services.socket).toBe('active');
    });

    test('should have correct environment configuration', async () => {
      const response = await fetch(`${PRODUCTION_BACKEND_URL}/health`);
      const health = await response.json();
      
      expect(health.environment).toBe('production');
      expect(health.railway.environment).toBe('production');
      expect(health.railway.publicDomain).toBe('gauntlet-messageai-24hr-mvp-production.up.railway.app');
    });
  });

  describe('API Endpoints', () => {
    test('should return API information', async () => {
      const response = await fetch(`${PRODUCTION_BACKEND_URL}/api/v1`);
      const apiInfo = await response.json();
      
      expect(apiInfo.message).toBe('MessageAI API v1');
      expect(apiInfo.version).toBe('1.0.0');
      expect(apiInfo.features.rest).toBe(true);
      expect(apiInfo.features.websockets).toBe(true);
    });

    test('should handle authentication endpoints', async () => {
      // Test registration validation
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

    test('should require authentication for protected endpoints', async () => {
      const response = await fetch(`${PRODUCTION_BACKEND_URL}/api/v1/users/me`);
      expect(response.status).toBe(401);
    });

    test('should require authentication for conversations', async () => {
      const response = await fetch(`${PRODUCTION_BACKEND_URL}/api/v1/conversations`);
      expect(response.status).toBe(401);
    });
  });

  describe('Error Handling', () => {
    test('should handle invalid endpoints gracefully', async () => {
      const response = await fetch(`${PRODUCTION_BACKEND_URL}/api/v1/invalid-endpoint`);
      expect(response.status).toBe(404);
    });

    test('should handle malformed JSON requests', async () => {
      const response = await fetch(`${PRODUCTION_BACKEND_URL}/api/v1/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: 'invalid json'
      });
      
      expect(response.status).toBeGreaterThanOrEqual(400);
    });
  });

  describe('Performance', () => {
    test('should respond within reasonable time', async () => {
      const startTime = Date.now();
      const response = await fetch(`${PRODUCTION_BACKEND_URL}/health`);
      const endTime = Date.now();
      
      expect(response.status).toBe(200);
      expect(endTime - startTime).toBeLessThan(5000); // Should respond within 5 seconds
    });
  });
});
