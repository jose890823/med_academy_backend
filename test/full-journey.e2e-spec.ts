import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { DataSource } from 'typeorm';
import { createTestApp, getDataSource, closeTestApp } from './helpers/test-app.helper';
import { cleanDatabase } from './helpers/db.helper';
import { getAdminToken } from './helpers/auth.helper';

/**
 * Full student journey E2E test:
 * Register → Verify Email → Login → Admin creates course → Enroll →
 * View course → Complete modules → Take evaluation → Get certificate
 */
describe('Full Student Journey (e2e)', () => {
  let app: INestApplication;
  let dataSource: DataSource;

  beforeAll(async () => {
    app = await createTestApp();
    dataSource = getDataSource();
  });

  afterAll(async () => {
    await closeTestApp();
  });

  beforeEach(async () => {
    await cleanDatabase(dataSource);
  });

  it('should complete the entire student journey end-to-end', async () => {
    const timestamp = Date.now();

    // ============================================
    // 1. REGISTER NEW STUDENT
    // ============================================
    const studentData = {
      email: `journey-student-${timestamp}@example.com`,
      password: 'Journey@1234!',
      firstName: 'Journey',
      lastName: 'Student',
      phone: '+17869999999',
    };

    const registerRes = await request(app.getHttpServer())
      .post('/api/auth/register')
      .send(studentData)
      .expect(201);

    const regData = registerRes.body.data || registerRes.body;
    const studentId = regData.user?.id || regData.id;
    expect(studentId).toBeDefined();

    // ============================================
    // 2. VERIFY EMAIL WITH OTP
    // ============================================
    const [userRow] = await dataSource.query(
      'SELECT "otpCode" FROM users WHERE email = $1',
      [studentData.email],
    );
    expect(userRow.otpCode).toBeDefined();

    await request(app.getHttpServer())
      .post('/api/auth/verify-email')
      .send({ email: studentData.email, otpCode: userRow.otpCode })
      .expect(200);

    // ============================================
    // 3. LOGIN AND GET TOKENS
    // ============================================
    const loginRes = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ email: studentData.email, password: studentData.password })
      .expect(200);

    const loginData = loginRes.body.data || loginRes.body;
    const studentAccessToken = loginData.accessToken;
    expect(studentAccessToken).toBeDefined();

    // ============================================
    // 4. ADMIN CREATES COURSE WITH MODULES AND EVALUATION
    // ============================================
    const adminToken = await getAdminToken(app);

    // Create category
    const catRes = await request(app.getHttpServer())
      .post('/api/v1/admin/categories')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        name: `Journey Category ${timestamp}`,
        slug: `journey-category-${timestamp}`,
        isActive: true,
      })
      .expect(201);

    const categoryId = catRes.body.data?.id || catRes.body.id;

    // Create course
    const courseRes = await request(app.getHttpServer())
      .post('/api/v1/admin/courses')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        title: `Journey Course ${timestamp}`,
        slug: `journey-course-${timestamp}`,
        shortDescription: 'Full journey test course',
        regularPrice: 200,
        categoryId,
      })
      .expect(201);

    const courseId = courseRes.body.data?.id || courseRes.body.id;

    // Publish course
    await request(app.getHttpServer())
      .patch(`/api/v1/admin/courses/${courseId}/status?status=published`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    // Create cohort (enrollmentEndDate must be <= startDate)
    const today = new Date().toISOString().split('T')[0];
    const startDate = new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0];
    const futureDate = new Date(Date.now() + 180 * 86400000).toISOString().split('T')[0];

    const cohortRes = await request(app.getHttpServer())
      .post('/api/v1/admin/cohorts')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        courseId,
        name: `Journey Cohort ${timestamp}`,
        code: `JC-${timestamp}`,
        enrollmentStartDate: today,
        enrollmentEndDate: startDate,
        startDate,
        endDate: futureDate,
      })
      .expect(201);

    const cohortId = cohortRes.body.data?.id || cohortRes.body.id;

    // Open cohort
    await request(app.getHttpServer())
      .patch(`/api/v1/admin/cohorts/${cohortId}/status?status=open`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    // Create 3 course modules via DB
    const moduleIds: string[] = [];
    for (let i = 1; i <= 3; i++) {
      const result = await dataSource.query(
        `INSERT INTO course_modules ("courseId", "title", "description", "order", "isPublished")
         VALUES ($1, $2, $3, $4, true) RETURNING id`,
        [courseId, `Journey Module ${i}`, `Module ${i} description`, i],
      );
      moduleIds.push(result[0].id);
    }

    // Create evaluation with 3 questions
    const evalRes = await request(app.getHttpServer())
      .post('/api/v1/admin/evaluations')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        courseId,
        title: 'Journey Final Exam',
        type: 'final_exam',
        totalPoints: 30,
        passingScore: 20,
        maxAttempts: 2,
      })
      .expect(201);

    const evaluationId = evalRes.body.data?.id || evalRes.body.id;

    // Add 3 questions
    const questionIds: string[] = [];
    const correctOptionIds: string[] = [];

    for (let i = 1; i <= 3; i++) {
      const correctId = `journey-opt-${i}-correct`;
      const qRes = await request(app.getHttpServer())
        .post(`/api/v1/admin/evaluations/${evaluationId}/questions`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          evaluationId,
          questionText: `Journey Q${i}: What is the answer?`,
          questionType: 'multiple_choice',
          points: 10,
          order: i,
          options: [
            { id: correctId, text: `Correct for Q${i}`, isCorrect: true },
            { id: `journey-opt-${i}-wrong`, text: `Wrong for Q${i}`, isCorrect: false },
          ],
        })
        .expect(201);

      questionIds.push(qRes.body.data?.id || qRes.body.id);
      correctOptionIds.push(correctId);
    }

    // Publish evaluation
    await request(app.getHttpServer())
      .patch(`/api/v1/admin/evaluations/${evaluationId}/publish`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    // ============================================
    // 5. ADMIN ENROLLS STUDENT
    // ============================================
    const enrollRes = await request(app.getHttpServer())
      .post('/api/v1/admin/enrollments')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        studentId,
        cohortId,
        accessStartDate: today,
      })
      .expect(201);

    const enrollmentId = enrollRes.body.data?.id || enrollRes.body.id;

    // Record payment
    await request(app.getHttpServer())
      .patch(`/api/v1/admin/enrollments/${enrollmentId}/record-payment?amount=200`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    // Activate
    await request(app.getHttpServer())
      .patch(`/api/v1/admin/enrollments/${enrollmentId}/activate`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    // ============================================
    // 6. STUDENT VIEWS ENROLLMENTS
    // ============================================
    const myEnrollRes = await request(app.getHttpServer())
      .get('/api/v1/enrollments/my-enrollments')
      .set('Authorization', `Bearer ${studentAccessToken}`)
      .expect(200);

    const myEnrollments = myEnrollRes.body.data || myEnrollRes.body;
    expect(Array.isArray(myEnrollments)).toBe(true);
    expect(myEnrollments.length).toBeGreaterThanOrEqual(1);

    // ============================================
    // 7. INITIALIZE AND COMPLETE MODULES
    // ============================================
    await request(app.getHttpServer())
      .post(`/api/v1/admin/progress/enrollment/${enrollmentId}/initialize`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ totalModules: 3, totalEvaluations: 1 })
      .expect(200);

    for (const moduleId of moduleIds) {
      await request(app.getHttpServer())
        .post(`/api/v1/progress/enrollment/${enrollmentId}/complete-module`)
        .set('Authorization', `Bearer ${studentAccessToken}`)
        .send({ moduleId })
        .expect(200);
    }

    // ============================================
    // 8. STUDENT TAKES EVALUATION
    // ============================================
    const attemptRes = await request(app.getHttpServer())
      .post('/api/v1/attempts/start')
      .set('Authorization', `Bearer ${studentAccessToken}`)
      .send({ enrollmentId, evaluationId })
      .expect(201);

    const attemptId = attemptRes.body.data?.id || attemptRes.body.id;

    // Submit all correct answers
    const answers = questionIds.map((questionId, i) => ({
      questionId,
      selectedOptionId: correctOptionIds[i],
    }));

    await request(app.getHttpServer())
      .post(`/api/v1/attempts/${attemptId}/submit`)
      .set('Authorization', `Bearer ${studentAccessToken}`)
      .send({ answers })
      .expect(200);

    // Admin quick-grades
    await request(app.getHttpServer())
      .post(`/api/v1/admin/grading/${attemptId}/quick-grade`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ score: 30, feedback: 'Excellent work!' })
      .expect(200);

    // ============================================
    // 9. ADMIN COMPLETES ENROLLMENT AND ISSUES CERTIFICATE
    // ============================================
    await request(app.getHttpServer())
      .post(`/api/v1/admin/progress/enrollment/${enrollmentId}/complete`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    // Also update enrollment.status (progress endpoint only updates progress table)
    await dataSource.query(
      `UPDATE enrollments SET status = 'completed' WHERE id = $1`,
      [enrollmentId],
    );

    const certRes = await request(app.getHttpServer())
      .post('/api/v1/admin/certificates/issue')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        enrollmentId,
        type: 'course_completion',
        finalGrade: 100,
        gradeLabel: 'A',
        instructionHours: 40,
      })
      .expect(201);

    const certData = certRes.body.data || certRes.body;
    expect(certData).toHaveProperty('certificateNumber');
    expect(certData).toHaveProperty('verificationCode');

    // ============================================
    // 10. STUDENT VIEWS CERTIFICATE
    // ============================================
    const myCertsRes = await request(app.getHttpServer())
      .get('/api/v1/certificates/my-certificates')
      .set('Authorization', `Bearer ${studentAccessToken}`)
      .expect(200);

    const myCerts = myCertsRes.body.data || myCertsRes.body;
    expect(Array.isArray(myCerts)).toBe(true);
    expect(myCerts.length).toBe(1);

    // ============================================
    // 11. PUBLIC VERIFICATION
    // ============================================
    const verifyRes = await request(app.getHttpServer())
      .get(`/api/v1/certificates/verify/${certData.verificationCode}`)
      .expect(200);

    const verifyData = verifyRes.body.data || verifyRes.body;
    expect(verifyData.valid).toBe(true);
    expect(verifyData.certificate.studentFullName).toContain('Journey');
  });
});
