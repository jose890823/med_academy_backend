import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { DataSource } from 'typeorm';
import { createTestApp, getDataSource, closeTestApp } from './helpers/test-app.helper';
import { cleanDatabase } from './helpers/db.helper';
import { registerAndVerifyUser, loginUser, getAdminToken } from './helpers/auth.helper';
import { createCourseWithModules, enrollStudent } from './helpers/fixtures.helper';

describe('Certificates (e2e)', () => {
  let app: INestApplication;
  let dataSource: DataSource;
  let adminToken: string;
  let studentId: string;
  let studentToken: string;
  let enrollmentId: string;

  const studentData = {
    email: 'certstudent@example.com',
    password: 'Student@1234!',
    firstName: 'Cert',
    lastName: 'Student',
    phone: '+17864444444',
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

    const courseFixture = await createCourseWithModules(app, adminToken, dataSource);
    enrollmentId = await enrollStudent(
      app, adminToken, studentId, courseFixture.cohortId,
    );

    // Initialize and complete progress
    await request(app.getHttpServer())
      .post(`/api/v1/admin/progress/enrollment/${enrollmentId}/initialize`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ totalModules: 3, totalEvaluations: 0 });

    for (const moduleId of courseFixture.moduleIds) {
      await request(app.getHttpServer())
        .post(`/api/v1/admin/progress/enrollment/${enrollmentId}/module/${moduleId}/complete`)
        .set('Authorization', `Bearer ${adminToken}`);
    }

    await request(app.getHttpServer())
      .post(`/api/v1/admin/progress/enrollment/${enrollmentId}/complete`)
      .set('Authorization', `Bearer ${adminToken}`);

    // Also update enrollment.status to 'completed' (progress endpoint only updates progress table)
    await dataSource.query(
      `UPDATE enrollments SET status = 'completed' WHERE id = $1`,
      [enrollmentId],
    );
  });

  // ============================================
  // ADMIN: ISSUE CERTIFICATE
  // ============================================

  describe('POST /api/v1/admin/certificates/issue', () => {
    it('should issue a certificate for completed enrollment', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/admin/certificates/issue')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          enrollmentId,
          type: 'course_completion',
          finalGrade: 95,
          gradeLabel: 'A',
          instructionHours: 40,
        })
        .expect(201);

      const data = res.body.data || res.body;
      expect(data).toHaveProperty('id');
      expect(data).toHaveProperty('certificateNumber');
      expect(data).toHaveProperty('verificationCode');
      expect(data.status).toBe('generated');
      expect(data.studentFirstName).toBe(studentData.firstName);
    });
  });

  // ============================================
  // PUBLIC: VERIFY CERTIFICATE
  // ============================================

  describe('GET /api/v1/certificates/verify/:code', () => {
    it('should verify a valid certificate', async () => {
      // Issue certificate
      const issueRes = await request(app.getHttpServer())
        .post('/api/v1/admin/certificates/issue')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          enrollmentId,
          type: 'course_completion',
          finalGrade: 90,
          gradeLabel: 'A',
        })
        .expect(201);

      const certData = issueRes.body.data || issueRes.body;
      const verificationCode = certData.verificationCode;

      // Verify publicly
      const res = await request(app.getHttpServer())
        .get(`/api/v1/certificates/verify/${verificationCode}`)
        .expect(200);

      const data = res.body.data || res.body;
      expect(data.valid).toBe(true);
      expect(data.certificate).toHaveProperty('certificateNumber');
      expect(data.certificate.studentFullName).toContain(studentData.firstName);
    });

    it('should return invalid for non-existent code', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/certificates/verify/INVALID-CODE-12345')
        .expect(200);

      const data = res.body.data || res.body;
      expect(data.valid).toBe(false);
    });
  });

  // ============================================
  // STUDENT: VIEW CERTIFICATES
  // ============================================

  describe('Student certificate access', () => {
    let certificateId: string;

    beforeEach(async () => {
      const issueRes = await request(app.getHttpServer())
        .post('/api/v1/admin/certificates/issue')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          enrollmentId,
          type: 'course_completion',
          finalGrade: 85,
          gradeLabel: 'B',
        })
        .expect(201);

      certificateId = issueRes.body.data?.id || issueRes.body.id;
    });

    it('GET /api/v1/certificates/my-certificates - should list student certificates', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/certificates/my-certificates')
        .set('Authorization', `Bearer ${studentToken}`)
        .expect(200);

      const data = res.body.data || res.body;
      expect(Array.isArray(data)).toBe(true);
      expect(data.length).toBeGreaterThanOrEqual(1);
    });

    it('GET /api/v1/certificates/:id - should get certificate details', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/v1/certificates/${certificateId}`)
        .set('Authorization', `Bearer ${studentToken}`)
        .expect(200);

      const data = res.body.data || res.body;
      expect(data.id).toBe(certificateId);
      expect(data).toHaveProperty('certificateNumber');
    });
  });

  // ============================================
  // ADMIN: REVOKE CERTIFICATE
  // ============================================

  describe('POST /api/v1/admin/certificates/:id/revoke', () => {
    it('should revoke a certificate', async () => {
      // Issue
      const issueRes = await request(app.getHttpServer())
        .post('/api/v1/admin/certificates/issue')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          enrollmentId,
          type: 'course_completion',
        })
        .expect(201);

      const certId = issueRes.body.data?.id || issueRes.body.id;

      // Revoke
      const res = await request(app.getHttpServer())
        .post(`/api/v1/admin/certificates/${certId}/revoke`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ reason: 'Academic dishonesty' })
        .expect(200);

      const data = res.body.data || res.body;
      expect(data.status).toBe('revoked');
    });
  });
});
