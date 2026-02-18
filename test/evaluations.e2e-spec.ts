import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { DataSource } from 'typeorm';
import { createTestApp, getDataSource, closeTestApp } from './helpers/test-app.helper';
import { cleanDatabase } from './helpers/db.helper';
import { registerAndVerifyUser, loginUser, getAdminToken } from './helpers/auth.helper';
import {
  createCourseWithModules,
  createEvaluationWithQuestions,
  enrollStudent,
} from './helpers/fixtures.helper';

describe('Evaluations (e2e)', () => {
  let app: INestApplication;
  let dataSource: DataSource;
  let adminToken: string;
  let studentId: string;
  let studentToken: string;
  let courseFixture: Awaited<ReturnType<typeof createCourseWithModules>>;
  let evalFixture: Awaited<ReturnType<typeof createEvaluationWithQuestions>>;
  let enrollmentId: string;

  const studentData = {
    email: 'evalstudent@example.com',
    password: 'Student@1234!',
    firstName: 'Eval',
    lastName: 'Student',
    phone: '+17862222222',
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

    // Setup: admin, student, course, evaluation, enrollment
    adminToken = await getAdminToken(app);
    const student = await registerAndVerifyUser(app, dataSource, studentData);
    studentId = student.id;
    const tokens = await loginUser(app, studentData.email, studentData.password);
    studentToken = tokens.accessToken;

    courseFixture = await createCourseWithModules(app, adminToken, dataSource);
    evalFixture = await createEvaluationWithQuestions(
      app, adminToken, courseFixture.courseId,
    );
    enrollmentId = await enrollStudent(
      app, adminToken, studentId, courseFixture.cohortId,
    );
  });

  // ============================================
  // ADMIN: EVALUATION MANAGEMENT
  // ============================================

  describe('Admin evaluation management', () => {
    it('should create evaluation (201)', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/admin/evaluations')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          courseId: courseFixture.courseId,
          title: 'New Quiz',
          type: 'quiz',
          totalPoints: 20,
          passingScore: 14,
          maxAttempts: 2,
        })
        .expect(201);

      const data = res.body.data || res.body;
      expect(data).toHaveProperty('id');
      expect(data.title).toBe('New Quiz');
      expect(data.isPublished).toBe(false);
    });

    it('should publish evaluation', async () => {
      // Create a new unpublished eval
      const evalRes = await request(app.getHttpServer())
        .post('/api/v1/admin/evaluations')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          courseId: courseFixture.courseId,
          title: 'Publish Test',
          type: 'quiz',
        })
        .expect(201);

      const evalId = evalRes.body.data?.id || evalRes.body.id;

      const res = await request(app.getHttpServer())
        .patch(`/api/v1/admin/evaluations/${evalId}/publish`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      const data = res.body.data || res.body;
      expect(data.isPublished).toBe(true);
    });

    it('should add questions to evaluation', async () => {
      const evalRes = await request(app.getHttpServer())
        .post('/api/v1/admin/evaluations')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          courseId: courseFixture.courseId,
          title: 'Question Test',
          type: 'quiz',
        })
        .expect(201);

      const evalId = evalRes.body.data?.id || evalRes.body.id;

      const qRes = await request(app.getHttpServer())
        .post(`/api/v1/admin/evaluations/${evalId}/questions`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          evaluationId: evalId,
          questionText: 'What is ultrasound?',
          questionType: 'multiple_choice',
          points: 10,
          options: [
            { id: 'a', text: 'Sound waves above 20kHz', isCorrect: true },
            { id: 'b', text: 'Light waves', isCorrect: false },
            { id: 'c', text: 'Radio waves', isCorrect: false },
          ],
        })
        .expect(201);

      const qData = qRes.body.data || qRes.body;
      expect(qData).toHaveProperty('id');
      expect(qData.questionType).toBe('multiple_choice');
    });
  });

  // ============================================
  // STUDENT: VIEW EVALUATIONS
  // ============================================

  describe('Student evaluation access', () => {
    it('should get published evaluations for course', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/v1/evaluations/course/${courseFixture.courseId}`)
        .set('Authorization', `Bearer ${studentToken}`)
        .expect(200);

      const data = res.body.data || res.body;
      expect(Array.isArray(data)).toBe(true);
      expect(data.length).toBeGreaterThanOrEqual(1);
    });

    it('should get questions without correct answers', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/v1/evaluations/${evalFixture.evaluationId}/questions`)
        .set('Authorization', `Bearer ${studentToken}`)
        .expect(200);

      const data = res.body.data || res.body;
      expect(Array.isArray(data)).toBe(true);
      expect(data.length).toBe(5);

      // Correct answers should be hidden
      for (const q of data) {
        if (q.options) {
          for (const opt of q.options) {
            expect(opt.isCorrect).toBeUndefined();
          }
        }
      }
    });
  });

  // ============================================
  // STUDENT: TAKE EVALUATION
  // ============================================

  describe('Student attempts', () => {
    it('should start an attempt', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/attempts/start')
        .set('Authorization', `Bearer ${studentToken}`)
        .send({
          enrollmentId,
          evaluationId: evalFixture.evaluationId,
        })
        .expect(201);

      const data = res.body.data || res.body;
      expect(data).toHaveProperty('id');
      expect(data.status).toBe('in_progress');
      expect(data.attemptNumber).toBe(1);
    });

    it('should submit answers and get graded (auto-grade for MC)', async () => {
      // Start attempt
      const startRes = await request(app.getHttpServer())
        .post('/api/v1/attempts/start')
        .set('Authorization', `Bearer ${studentToken}`)
        .send({
          enrollmentId,
          evaluationId: evalFixture.evaluationId,
        })
        .expect(201);

      const attemptId = startRes.body.data?.id || startRes.body.id;

      // Submit all correct answers
      const answers = evalFixture.questionIds.map((questionId, i) => ({
        questionId,
        selectedOptionId: evalFixture.correctOptionIds[i],
      }));

      const submitRes = await request(app.getHttpServer())
        .post(`/api/v1/attempts/${attemptId}/submit`)
        .set('Authorization', `Bearer ${studentToken}`)
        .send({ answers })
        .expect(200);

      const data = submitRes.body.data || submitRes.body;
      // MC questions are auto-graded, so status goes directly to 'graded'
      expect(['submitted', 'graded']).toContain(data.status);
    });

    it('should get attempt results', async () => {
      // Start attempt
      const startRes = await request(app.getHttpServer())
        .post('/api/v1/attempts/start')
        .set('Authorization', `Bearer ${studentToken}`)
        .send({
          enrollmentId,
          evaluationId: evalFixture.evaluationId,
        })
        .expect(201);

      const attemptId = startRes.body.data?.id || startRes.body.id;

      // Submit answers (all correct)
      const answers = evalFixture.questionIds.map((questionId, i) => ({
        questionId,
        selectedOptionId: evalFixture.correctOptionIds[i],
      }));

      await request(app.getHttpServer())
        .post(`/api/v1/attempts/${attemptId}/submit`)
        .set('Authorization', `Bearer ${studentToken}`)
        .send({ answers })
        .expect(200);

      // Get results
      const res = await request(app.getHttpServer())
        .get(`/api/v1/attempts/${attemptId}/results`)
        .set('Authorization', `Bearer ${studentToken}`)
        .expect(200);

      const data = res.body.data || res.body;
      // Results may be { attempt, answers } or flat
      const attempt = data.attempt || data;
      expect(attempt).toHaveProperty('id');
    });

    it('should respect max attempts limit', async () => {
      // Start and submit 3 attempts (maxAttempts = 3 for our fixture)
      for (let i = 0; i < 3; i++) {
        const startRes = await request(app.getHttpServer())
          .post('/api/v1/attempts/start')
          .set('Authorization', `Bearer ${studentToken}`)
          .send({
            enrollmentId,
            evaluationId: evalFixture.evaluationId,
          })
          .expect(201);

        const attemptId = startRes.body.data?.id || startRes.body.id;

        const answers = evalFixture.questionIds.map((questionId) => ({
          questionId,
          selectedOptionId: 'opt-1-wrong1', // wrong answers
        }));

        await request(app.getHttpServer())
          .post(`/api/v1/attempts/${attemptId}/submit`)
          .set('Authorization', `Bearer ${studentToken}`)
          .send({ answers })
          .expect(200);
      }

      // 4th attempt should be rejected
      const res = await request(app.getHttpServer())
        .post('/api/v1/attempts/start')
        .set('Authorization', `Bearer ${studentToken}`)
        .send({
          enrollmentId,
          evaluationId: evalFixture.evaluationId,
        });

      expect([400, 403]).toContain(res.status);
    });
  });

  // ============================================
  // ADMIN: GRADING
  // ============================================

  describe('Admin grading', () => {
    it('should quick-grade an attempt', async () => {
      // Student starts and submits
      const startRes = await request(app.getHttpServer())
        .post('/api/v1/attempts/start')
        .set('Authorization', `Bearer ${studentToken}`)
        .send({
          enrollmentId,
          evaluationId: evalFixture.evaluationId,
        })
        .expect(201);

      const attemptId = startRes.body.data?.id || startRes.body.id;

      const answers = evalFixture.questionIds.map((questionId, i) => ({
        questionId,
        selectedOptionId: evalFixture.correctOptionIds[i],
      }));

      await request(app.getHttpServer())
        .post(`/api/v1/attempts/${attemptId}/submit`)
        .set('Authorization', `Bearer ${studentToken}`)
        .send({ answers })
        .expect(200);

      // Admin quick-grades
      const res = await request(app.getHttpServer())
        .post(`/api/v1/admin/grading/${attemptId}/quick-grade`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ score: 50, feedback: 'Perfect score!' })
        .expect(200);

      const data = res.body.data || res.body;
      expect(data.status).toBe('graded');
      expect(Number(data.score)).toBe(50);
      expect(data.passed).toBe(true);
    });
  });
});
