import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { DataSource } from 'typeorm';
import { createTestApp, getDataSource, closeTestApp } from './helpers/test-app.helper';
import { cleanDatabase } from './helpers/db.helper';
import { registerAndVerifyUser, loginUser, getAdminToken } from './helpers/auth.helper';
import { createCourseWithModules, enrollStudent } from './helpers/fixtures.helper';

describe('Enrollments (e2e)', () => {
  let app: INestApplication;
  let dataSource: DataSource;
  let adminToken: string;
  let studentId: string;
  let studentToken: string;
  let courseFixture: Awaited<ReturnType<typeof createCourseWithModules>>;

  const studentData = {
    email: 'student@example.com',
    password: 'Student@1234!',
    firstName: 'Jane',
    lastName: 'Student',
    phone: '+17861111111',
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

    // Setup admin and student
    adminToken = await getAdminToken(app);
    const student = await registerAndVerifyUser(app, dataSource, studentData);
    studentId = student.id;
    const tokens = await loginUser(app, studentData.email, studentData.password);
    studentToken = tokens.accessToken;

    // Create course with modules
    courseFixture = await createCourseWithModules(app, adminToken, dataSource);
  });

  // ============================================
  // ADMIN: CREATE ENROLLMENT
  // ============================================

  describe('POST /api/v1/admin/enrollments', () => {
    it('should create an enrollment (201)', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/admin/enrollments')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          studentId,
          cohortId: courseFixture.cohortId,
          accessStartDate: new Date().toISOString().split('T')[0],
        })
        .expect(201);

      const data = res.body.data || res.body;
      expect(data).toHaveProperty('id');
      expect(data.status).toBe('pending');
      expect(data.paymentStatus).toBe('pending');
    });

    it('should reject duplicate enrollment (409)', async () => {
      // Create first enrollment
      await request(app.getHttpServer())
        .post('/api/v1/admin/enrollments')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          studentId,
          cohortId: courseFixture.cohortId,
          accessStartDate: new Date().toISOString().split('T')[0],
        })
        .expect(201);

      // Try to create duplicate
      const res = await request(app.getHttpServer())
        .post('/api/v1/admin/enrollments')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          studentId,
          cohortId: courseFixture.cohortId,
          accessStartDate: new Date().toISOString().split('T')[0],
        });

      // Should be 409 or 400 (depends on implementation)
      expect([400, 409]).toContain(res.status);
    });
  });

  // ============================================
  // ADMIN: ACTIVATE ENROLLMENT
  // ============================================

  describe('Enrollment activation', () => {
    it('should record payment and activate enrollment', async () => {
      const enrollmentId = await enrollStudent(
        app, adminToken, studentId, courseFixture.cohortId,
      );

      // Verify enrollment is active
      const res = await request(app.getHttpServer())
        .get(`/api/v1/admin/enrollments/${enrollmentId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      const data = res.body.data || res.body;
      expect(data.status).toBe('active');
      expect(data.paymentStatus).toBe('completed');
    });
  });

  // ============================================
  // STUDENT: VIEW ENROLLMENTS
  // ============================================

  describe('Student enrollment queries', () => {
    let enrollmentId: string;

    beforeEach(async () => {
      enrollmentId = await enrollStudent(
        app, adminToken, studentId, courseFixture.cohortId,
      );
    });

    it('GET /api/v1/enrollments/my-enrollments - should list student enrollments', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/enrollments/my-enrollments')
        .set('Authorization', `Bearer ${studentToken}`)
        .expect(200);

      const data = res.body.data || res.body;
      expect(Array.isArray(data)).toBe(true);
      expect(data.length).toBeGreaterThanOrEqual(1);
    });

    it('GET /api/v1/enrollments/my-enrollments/active - should list active enrollments', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/enrollments/my-enrollments/active')
        .set('Authorization', `Bearer ${studentToken}`)
        .expect(200);

      const data = res.body.data || res.body;
      expect(Array.isArray(data)).toBe(true);
      expect(data.length).toBe(1);
    });

    it('GET /api/v1/enrollments/:id - should get own enrollment details', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/v1/enrollments/${enrollmentId}`)
        .set('Authorization', `Bearer ${studentToken}`)
        .expect(200);

      const data = res.body.data || res.body;
      expect(data.id).toBe(enrollmentId);
    });

    it('should reject unauthenticated access (401)', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/enrollments/my-enrollments')
        .expect(401);
    });
  });

  // ============================================
  // ADMIN: CANCEL ENROLLMENT
  // ============================================

  describe('PATCH /api/v1/admin/enrollments/:id/cancel', () => {
    it('should cancel an enrollment', async () => {
      const enrollmentId = await enrollStudent(
        app, adminToken, studentId, courseFixture.cohortId,
      );

      const res = await request(app.getHttpServer())
        .patch(`/api/v1/admin/enrollments/${enrollmentId}/cancel?reason=Test%20cancellation`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      const data = res.body.data || res.body;
      expect(data.status).toBe('cancelled');
    });
  });
});
