import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { DataSource } from 'typeorm';
import { createTestApp, getDataSource, closeTestApp } from './helpers/test-app.helper';
import { cleanDatabase } from './helpers/db.helper';
import { registerAndVerifyUser, loginUser, getAdminToken } from './helpers/auth.helper';
import { createCourseWithModules, enrollStudent } from './helpers/fixtures.helper';

describe('Progress (e2e)', () => {
  let app: INestApplication;
  let dataSource: DataSource;
  let adminToken: string;
  let studentId: string;
  let studentToken: string;
  let courseFixture: Awaited<ReturnType<typeof createCourseWithModules>>;
  let enrollmentId: string;

  const studentData = {
    email: 'progressstudent@example.com',
    password: 'Student@1234!',
    firstName: 'Progress',
    lastName: 'Student',
    phone: '+17863333333',
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

    adminToken = await getAdminToken(app);
    const student = await registerAndVerifyUser(app, dataSource, studentData);
    studentId = student.id;
    const tokens = await loginUser(app, studentData.email, studentData.password);
    studentToken = tokens.accessToken;

    courseFixture = await createCourseWithModules(app, adminToken, dataSource);
    enrollmentId = await enrollStudent(
      app, adminToken, studentId, courseFixture.cohortId,
    );
  });

  // ============================================
  // ADMIN: INITIALIZE PROGRESS
  // ============================================

  describe('Progress initialization', () => {
    it('should initialize progress for enrollment', async () => {
      const res = await request(app.getHttpServer())
        .post(`/api/v1/admin/progress/enrollment/${enrollmentId}/initialize`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ totalModules: 3, totalEvaluations: 0 })
        .expect(200);

      const data = res.body.data || res.body;
      expect(data).toHaveProperty('enrollmentId', enrollmentId);
      expect(data.status).toBe('not_started');
      expect(data.totalModulesCount).toBeGreaterThanOrEqual(0);
    });
  });

  // ============================================
  // STUDENT: VIEW PROGRESS
  // ============================================

  describe('Student progress queries', () => {
    beforeEach(async () => {
      // Initialize progress
      await request(app.getHttpServer())
        .post(`/api/v1/admin/progress/enrollment/${enrollmentId}/initialize`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ totalModules: 3, totalEvaluations: 0 });
    });

    it('should get enrollment progress', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/v1/progress/enrollment/${enrollmentId}`)
        .set('Authorization', `Bearer ${studentToken}`)
        .expect(200);

      const data = res.body.data || res.body;
      expect(data).toHaveProperty('enrollmentId');
      expect(data).toHaveProperty('overallPercentage');
      expect(data).toHaveProperty('status');
    });

    it('should get module progress list', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/v1/progress/enrollment/${enrollmentId}/modules`)
        .set('Authorization', `Bearer ${studentToken}`)
        .expect(200);

      const data = res.body.data || res.body;
      expect(Array.isArray(data)).toBe(true);
    });
  });

  // ============================================
  // STUDENT: COMPLETE MODULES
  // ============================================

  describe('Module completion', () => {
    beforeEach(async () => {
      await request(app.getHttpServer())
        .post(`/api/v1/admin/progress/enrollment/${enrollmentId}/initialize`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ totalModules: 3, totalEvaluations: 0 });
    });

    it('should complete a module', async () => {
      const moduleId = courseFixture.moduleIds[0];

      const res = await request(app.getHttpServer())
        .post(`/api/v1/progress/enrollment/${enrollmentId}/complete-module`)
        .set('Authorization', `Bearer ${studentToken}`)
        .send({ moduleId })
        .expect(200);

      const data = res.body.data || res.body;
      expect(data.status).toBe('completed');
    });

    it('should update overall percentage when modules completed', async () => {
      // Complete first module
      await request(app.getHttpServer())
        .post(`/api/v1/progress/enrollment/${enrollmentId}/complete-module`)
        .set('Authorization', `Bearer ${studentToken}`)
        .send({ moduleId: courseFixture.moduleIds[0] })
        .expect(200);

      // Check enrollment progress updated
      const res = await request(app.getHttpServer())
        .get(`/api/v1/progress/enrollment/${enrollmentId}`)
        .set('Authorization', `Bearer ${studentToken}`)
        .expect(200);

      const data = res.body.data || res.body;
      expect(Number(data.overallPercentage)).toBeGreaterThan(0);
    });
  });

  // ============================================
  // ADMIN: COMPLETE ENROLLMENT
  // ============================================

  describe('Admin progress management', () => {
    beforeEach(async () => {
      await request(app.getHttpServer())
        .post(`/api/v1/admin/progress/enrollment/${enrollmentId}/initialize`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ totalModules: 3, totalEvaluations: 0 });
    });

    it('should complete a module for student via admin', async () => {
      const moduleId = courseFixture.moduleIds[0];

      const res = await request(app.getHttpServer())
        .post(`/api/v1/admin/progress/enrollment/${enrollmentId}/module/${moduleId}/complete`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      const data = res.body.data || res.body;
      expect(data.status).toBe('completed');
    });

    it('should mark enrollment as completed', async () => {
      // Complete all modules first
      for (const moduleId of courseFixture.moduleIds) {
        await request(app.getHttpServer())
          .post(`/api/v1/admin/progress/enrollment/${enrollmentId}/module/${moduleId}/complete`)
          .set('Authorization', `Bearer ${adminToken}`);
      }

      const res = await request(app.getHttpServer())
        .post(`/api/v1/admin/progress/enrollment/${enrollmentId}/complete`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      const data = res.body.data || res.body;
      expect(data.status).toBe('completed');
    });
  });
});
