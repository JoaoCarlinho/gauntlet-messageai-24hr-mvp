/**
 * End-to-End Authentication Tests
 * These tests make real API calls to the Railway backend
 */

describe('Authentication E2E Tests', () => {
  const API_BASE_URL = 'https://gauntlet-messageai-24hr-mvp-production.up.railway.app';
  
  // Test data
  const testUser = {
    email: `test-${Date.now()}@example.com`,
    password: 'TestPassword123',
    displayName: 'Test User',
  };

  describe('Backend Health Check', () => {
    it('should return health status', async () => {
      const response = await fetch(`${API_BASE_URL}/health`);
      const data = await response.json();
      
      expect(response.status).toBe(200);
      expect(data.status).toBe('OK');
      expect(data.environment).toBe('production');
    });
  });

  describe('User Registration Flow', () => {
    it('should register a new user successfully', async () => {
      const response = await fetch(`${API_BASE_URL}/api/v1/auth/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(testUser),
      });

      const data = await response.json();
      
      expect(response.status).toBe(201);
      expect(data.success).toBe(true);
      expect(data.data.user.email).toBe(testUser.email);
      expect(data.data.user.displayName).toBe(testUser.displayName);
      expect(data.data.accessToken).toBeDefined();
      expect(data.data.refreshToken).toBeDefined();
    });

    it('should reject duplicate email registration', async () => {
      const response = await fetch(`${API_BASE_URL}/api/v1/auth/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(testUser),
      });

      const data = await response.json();
      
      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.message).toContain('email');
    });
  });

  describe('User Login Flow', () => {
    it('should login with valid credentials', async () => {
      const response = await fetch(`${API_BASE_URL}/api/v1/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: testUser.email,
          password: testUser.password,
        }),
      });

      const data = await response.json();
      
      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.user.email).toBe(testUser.email);
      expect(data.data.accessToken).toBeDefined();
      expect(data.data.refreshToken).toBeDefined();
    });

    it('should reject invalid credentials', async () => {
      const response = await fetch(`${API_BASE_URL}/api/v1/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: testUser.email,
          password: 'wrongpassword',
        }),
      });

      const data = await response.json();
      
      expect(response.status).toBe(401);
      expect(data.success).toBe(false);
    });
  });

  describe('Token Validation', () => {
    let accessToken: string;
    let refreshToken: string;

    beforeAll(async () => {
      // Login to get tokens
      const response = await fetch(`${API_BASE_URL}/api/v1/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: testUser.email,
          password: testUser.password,
        }),
      });

      const data = await response.json();
      accessToken = data.data.accessToken;
      refreshToken = data.data.refreshToken;
    });

    it('should validate access token', async () => {
      const response = await fetch(`${API_BASE_URL}/api/v1/auth/me`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        },
      });

      const data = await response.json();
      
      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.email).toBe(testUser.email);
    });

    it('should refresh access token', async () => {
      const response = await fetch(`${API_BASE_URL}/api/v1/auth/refresh`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          refreshToken: refreshToken,
        }),
      });

      const data = await response.json();
      
      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.accessToken).toBeDefined();
      expect(data.data.refreshToken).toBeDefined();
    });
  });

  describe('User Logout Flow', () => {
    let accessToken: string;

    beforeAll(async () => {
      // Login to get token
      const response = await fetch(`${API_BASE_URL}/api/v1/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: testUser.email,
          password: testUser.password,
        }),
      });

      const data = await response.json();
      accessToken = data.data.accessToken;
    });

    it('should logout successfully', async () => {
      const response = await fetch(`${API_BASE_URL}/api/v1/auth/logout`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        },
      });

      expect(response.status).toBe(200);
    });

    it('should reject requests with invalid token after logout', async () => {
      const response = await fetch(`${API_BASE_URL}/api/v1/auth/me`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        },
      });

      expect(response.status).toBe(401);
    });
  });
});
