import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { DataSource } from 'typeorm';

export interface RegisteredUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

/**
 * Registers a new user, reads OTP from DB, verifies email, returns user data.
 */
export async function registerAndVerifyUser(
  app: INestApplication,
  dataSource: DataSource,
  userData: {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
    phone: string;
  },
): Promise<RegisteredUser> {
  // Register
  const registerRes = await request(app.getHttpServer())
    .post('/api/auth/register')
    .send(userData)
    .expect(201);

  const regData = registerRes.body.data || registerRes.body;
  const userId = regData.user?.id || regData.id;

  // Read OTP directly from DB
  const [user] = await dataSource.query(
    'SELECT "otpCode" FROM users WHERE email = $1',
    [userData.email],
  );

  if (!user?.otpCode) {
    throw new Error(`No OTP found for user ${userData.email}`);
  }

  // Verify email
  await request(app.getHttpServer())
    .post('/api/auth/verify-email')
    .send({ email: userData.email, otpCode: user.otpCode })
    .expect(200);

  return {
    id: userId,
    email: userData.email,
    firstName: userData.firstName,
    lastName: userData.lastName,
  };
}

/**
 * Logs in a user and returns access + refresh tokens.
 */
export async function loginUser(
  app: INestApplication,
  email: string,
  password: string,
): Promise<AuthTokens> {
  const res = await request(app.getHttpServer())
    .post('/api/auth/login')
    .send({ email, password })
    .expect(200);

  const data = res.body.data || res.body;
  return {
    accessToken: data.accessToken,
    refreshToken: data.refreshToken,
  };
}

/**
 * Gets admin token by logging in as the super admin (created by SeederService).
 */
export async function getAdminToken(
  app: INestApplication,
): Promise<string> {
  const email = process.env.SUPER_ADMIN_EMAIL || 'admin@ultrasoundmedacademy.com';
  const password = process.env.SUPER_ADMIN_PASSWORD || 'Admin123!';

  const tokens = await loginUser(app, email, password);
  return tokens.accessToken;
}
