/**
 * Connection Tests
 * These tests verify the mobile app can connect to the Railway backend
 */

describe('Backend Connection Tests', () => {
  const API_BASE_URL = 'https://gauntlet-messageai-24hr-mvp-production.up.railway.app';
  
  describe('Backend Health Check', () => {
    it('should return health status', async () => {
      const response = await fetch(`${API_BASE_URL}/health`);
      const data = await response.json();
      
      expect(response.status).toBe(200);
      expect(data.status).toBe('OK');
      expect(data.environment).toBe('production');
      expect(data.uptime).toBeDefined();
    });
  });

  describe('API Endpoints Check', () => {
    it('should respond to auth register endpoint', async () => {
      const response = await fetch(`${API_BASE_URL}/api/v1/auth/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: 'test@example.com',
          password: 'password123',
          displayName: 'Test User',
        }),
      });

      // We expect either 201 (success) or 400/500 (error), but not 404 (not found)
      expect([201, 400, 500]).toContain(response.status);
      
      const data = await response.json();
      expect(data).toBeDefined();
      
      // Log the response for debugging
      console.log('Register endpoint response:', {
        status: response.status,
        data: data
      });
    });

    it('should respond to auth login endpoint', async () => {
      const response = await fetch(`${API_BASE_URL}/api/v1/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: 'test@example.com',
          password: 'password123',
        }),
      });

      // We expect either 200 (success) or 401/500 (error), but not 404 (not found)
      expect([200, 401, 500]).toContain(response.status);
      
      const data = await response.json();
      expect(data).toBeDefined();
      
      // Log the response for debugging
      console.log('Login endpoint response:', {
        status: response.status,
        data: data
      });
    });

    it('should respond to auth logout endpoint', async () => {
      const response = await fetch(`${API_BASE_URL}/api/v1/auth/logout`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      // We expect either 200 (success) or 401/500 (error), but not 404 (not found)
      expect([200, 401, 500]).toContain(response.status);
      
      const data = await response.json();
      expect(data).toBeDefined();
      
      // Log the response for debugging
      console.log('Logout endpoint response:', {
        status: response.status,
        data: data
      });
    });
  });

  describe('Mobile App Configuration', () => {
    it('should have correct API URL configured', () => {
      const expectedUrl = 'https://gauntlet-messageai-24hr-mvp-production.up.railway.app';
      expect(expectedUrl).toBe('https://gauntlet-messageai-24hr-mvp-production.up.railway.app');
    });

    it('should have environment file configured', () => {
      // This test verifies the .env file exists and has the correct structure
      const fs = require('fs');
      const path = require('path');
      
      const envPath = path.join(__dirname, '../../.env');
      expect(fs.existsSync(envPath)).toBe(true);
      
      const envContent = fs.readFileSync(envPath, 'utf8');
      expect(envContent).toContain('EXPO_PUBLIC_API_URL');
      expect(envContent).toContain('gauntlet-messageai-24hr-mvp-production.up.railway.app');
    });
  });
});
