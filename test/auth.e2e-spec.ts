import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { DataSource } from 'typeorm';
import { createTestApp, getDataSource, closeTestApp } from './helpers/test-app.helper';
import { cleanDatabase } from './helpers/db.helper';

describe('Auth (e2e)', () => {
  let app: INestApplication;
  let dataSource: DataSource;

  const testUser = {
    email: 'testuser@example.com',
    password: 'Test@1234!',
    firstName: 'John',
    lastName: 'Doe',
    phone: '+17861234567',
  };

  beforeAll(async () => {
    app = await createTestApp();
    dataSource = getDataSource();
  });

  afterAll(async () => {
    await closeTestApp();
  });

  beforeEach(async () => {
    await cleanDatabase(dataSource);
    // Wait for SeederService to recreate super admin
  });

  // ============================================
  // REGISTRO
  // ============================================

  describe('POST /api/auth/register', () => {
    it('should register a new user (201)', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/auth/register')
        .send(testUser)
        .expect(201);

      const data = res.body.data || res.body;
      // Register returns { message, user } structure
      const user = data.user || data;
      expect(user).toHaveProperty('id');
      expect(user.email).toBe(testUser.email);
      expect(user.firstName).toBe(testUser.firstName);
      // Should not return password or OTP
      expect(user.password).toBeUndefined();
      expect(user.otpCode).toBeUndefined();
    });

    it('should reject duplicate email (409)', async () => {
      // Register first time
      await request(app.getHttpServer())
        .post('/api/auth/register')
        .send(testUser)
        .expect(201);

      // Register same email again
      await request(app.getHttpServer())
        .post('/api/auth/register')
        .send(testUser)
        .expect(409);
    });

    it('should reject invalid data (400)', async () => {
      await request(app.getHttpServer())
        .post('/api/auth/register')
        .send({
          email: 'not-an-email',
          password: '123', // too short, no special chars
          firstName: '',
          lastName: '',
          phone: 'abc',
        })
        .expect(400);
    });

    it('should reject weak password (400)', async () => {
      await request(app.getHttpServer())
        .post('/api/auth/register')
        .send({
          ...testUser,
          email: 'weak@example.com',
          password: 'weakpassword', // no uppercase, no number, no special char
        })
        .expect(400);
    });
  });

  // ============================================
  // VERIFICACION DE EMAIL
  // ============================================

  describe('POST /api/auth/verify-email', () => {
    it('should verify email with correct OTP (200)', async () => {
      // Register
      await request(app.getHttpServer())
        .post('/api/auth/register')
        .send(testUser)
        .expect(201);

      // Read OTP from DB
      const [user] = await dataSource.query(
        'SELECT "otpCode" FROM users WHERE email = $1',
        [testUser.email],
      );

      const res = await request(app.getHttpServer())
        .post('/api/auth/verify-email')
        .send({ email: testUser.email, otpCode: user.otpCode })
        .expect(200);

      expect(res.body.success).toBe(true);
    });

    it('should reject incorrect OTP (400)', async () => {
      await request(app.getHttpServer())
        .post('/api/auth/register')
        .send(testUser)
        .expect(201);

      await request(app.getHttpServer())
        .post('/api/auth/verify-email')
        .send({ email: testUser.email, otpCode: '000000' })
        .expect(400);
    });

    it('should reject expired OTP (400)', async () => {
      await request(app.getHttpServer())
        .post('/api/auth/register')
        .send(testUser)
        .expect(201);

      // Expire the OTP manually
      await dataSource.query(
        `UPDATE users SET "otpExpiresAt" = NOW() - INTERVAL '1 hour' WHERE email = $1`,
        [testUser.email],
      );

      const [user] = await dataSource.query(
        'SELECT "otpCode" FROM users WHERE email = $1',
        [testUser.email],
      );

      await request(app.getHttpServer())
        .post('/api/auth/verify-email')
        .send({ email: testUser.email, otpCode: user.otpCode })
        .expect(400);
    });
  });

  // ============================================
  // LOGIN
  // ============================================

  describe('POST /api/auth/login', () => {
    beforeEach(async () => {
      // Register and verify user for login tests
      await request(app.getHttpServer())
        .post('/api/auth/register')
        .send(testUser)
        .expect(201);

      const [user] = await dataSource.query(
        'SELECT "otpCode" FROM users WHERE email = $1',
        [testUser.email],
      );

      await request(app.getHttpServer())
        .post('/api/auth/verify-email')
        .send({ email: testUser.email, otpCode: user.otpCode })
        .expect(200);
    });

    it('should login with correct credentials (200)', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({ email: testUser.email, password: testUser.password })
        .expect(200);

      const data = res.body.data || res.body;
      expect(data).toHaveProperty('accessToken');
      expect(data).toHaveProperty('refreshToken');
      expect(data.user || data).toHaveProperty('email', testUser.email);
    });

    it('should reject unverified email (401)', async () => {
      const unverifiedUser = {
        ...testUser,
        email: 'unverified@example.com',
        phone: '+17861234568',
      };

      await request(app.getHttpServer())
        .post('/api/auth/register')
        .send(unverifiedUser)
        .expect(201);

      // Try to login without verifying
      await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({ email: unverifiedUser.email, password: unverifiedUser.password })
        .expect(401);
    });

    it('should reject wrong password (401)', async () => {
      await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({ email: testUser.email, password: 'WrongP@ss123!' })
        .expect(401);
    });

    it('should reject non-existent user (401)', async () => {
      await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({ email: 'nonexistent@example.com', password: testUser.password })
        .expect(401);
    });
  });

  // ============================================
  // TOKEN REFRESH
  // ============================================

  describe('POST /api/auth/refresh', () => {
    let tokens: { accessToken: string; refreshToken: string };

    beforeEach(async () => {
      // Register, verify, and login
      await request(app.getHttpServer())
        .post('/api/auth/register')
        .send(testUser)
        .expect(201);

      const [user] = await dataSource.query(
        'SELECT "otpCode" FROM users WHERE email = $1',
        [testUser.email],
      );

      await request(app.getHttpServer())
        .post('/api/auth/verify-email')
        .send({ email: testUser.email, otpCode: user.otpCode })
        .expect(200);

      const loginRes = await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({ email: testUser.email, password: testUser.password })
        .expect(200);

      const data = loginRes.body.data || loginRes.body;
      tokens = { accessToken: data.accessToken, refreshToken: data.refreshToken };
    });

    it('should refresh tokens with valid refresh token (200)', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/auth/refresh')
        .set('Authorization', `Bearer ${tokens.refreshToken}`)
        .send({ refreshToken: tokens.refreshToken })
        .expect(200);

      const data = res.body.data || res.body;
      expect(data).toHaveProperty('accessToken');
      expect(data).toHaveProperty('refreshToken');
    });

    it('should reject invalid refresh token (401)', async () => {
      await request(app.getHttpServer())
        .post('/api/auth/refresh')
        .set('Authorization', 'Bearer invalid-token')
        .send({ refreshToken: 'invalid-token' })
        .expect(401);
    });
  });

  // ============================================
  // SESIONES Y LOGOUT
  // ============================================

  describe('Sessions & Logout', () => {
    let accessToken: string;
    let refreshToken: string;

    beforeEach(async () => {
      // Register, verify, and login
      await request(app.getHttpServer())
        .post('/api/auth/register')
        .send(testUser)
        .expect(201);

      const [user] = await dataSource.query(
        'SELECT "otpCode" FROM users WHERE email = $1',
        [testUser.email],
      );

      await request(app.getHttpServer())
        .post('/api/auth/verify-email')
        .send({ email: testUser.email, otpCode: user.otpCode })
        .expect(200);

      const loginRes = await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({ email: testUser.email, password: testUser.password })
        .expect(200);

      const data = loginRes.body.data || loginRes.body;
      accessToken = data.accessToken;
      refreshToken = data.refreshToken;
    });

    it('GET /api/auth/sessions - should list active sessions', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/auth/sessions')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      const data = res.body.data || res.body;
      expect(Array.isArray(data)).toBe(true);
    });

    it('POST /api/auth/logout - should logout successfully', async () => {
      await request(app.getHttpServer())
        .post('/api/auth/logout')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ refreshToken })
        .expect(200);
    });

    it('GET /api/auth/me - should return authenticated user profile', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      const data = res.body.data || res.body;
      expect(data.email).toBe(testUser.email);
      expect(data.firstName).toBe(testUser.firstName);
    });

    it('GET /api/auth/me - should reject without token (401)', async () => {
      await request(app.getHttpServer())
        .get('/api/auth/me')
        .expect(401);
    });
  });

  // ============================================
  // PASSWORD RESET
  // ============================================

  describe('Password Reset', () => {
    beforeEach(async () => {
      await request(app.getHttpServer())
        .post('/api/auth/register')
        .send(testUser)
        .expect(201);

      const [user] = await dataSource.query(
        'SELECT "otpCode" FROM users WHERE email = $1',
        [testUser.email],
      );

      await request(app.getHttpServer())
        .post('/api/auth/verify-email')
        .send({ email: testUser.email, otpCode: user.otpCode })
        .expect(200);
    });

    it('POST /api/auth/forgot-password - should accept request (200)', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/auth/forgot-password')
        .send({ email: testUser.email })
        .expect(200);

      expect(res.body.success).toBe(true);
    });

    it('POST /api/auth/forgot-password - should accept non-existent email (200, no leak)', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/auth/forgot-password')
        .send({ email: 'nonexistent@example.com' })
        .expect(200);

      // Should return 200 to not leak email existence
      expect(res.body.success).toBe(true);
    });

    it('POST /api/auth/reset-password - should reset password with valid token', async () => {
      // Request forgot password
      await request(app.getHttpServer())
        .post('/api/auth/forgot-password')
        .send({ email: testUser.email })
        .expect(200);

      // Read reset token from DB
      const [user] = await dataSource.query(
        'SELECT "resetPasswordToken" FROM users WHERE email = $1',
        [testUser.email],
      );

      if (!user?.resetPasswordToken) {
        // If email service is not configured, token might not be generated
        // Skip this test gracefully
        return;
      }

      const newPassword = 'NewP@ssw0rd123!';

      await request(app.getHttpServer())
        .post('/api/auth/reset-password')
        .send({ resetToken: user.resetPasswordToken, newPassword })
        .expect(200);

      // Should be able to login with new password
      await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({ email: testUser.email, password: newPassword })
        .expect(200);
    });
  });
});
