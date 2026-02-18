import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { DataSource } from 'typeorm';

export interface CourseFixture {
  categoryId: string;
  courseId: string;
  courseSlug: string;
  cohortId: string;
  cohortCode: string;
  moduleIds: string[];
}

export interface EvaluationFixture {
  evaluationId: string;
  questionIds: string[];
  correctOptionIds: string[]; // correct option id for each question
}

/**
 * Creates a full course structure via admin API:
 * category + course (published) + cohort (open) + 3 modules (via DB).
 */
export async function createCourseWithModules(
  app: INestApplication,
  adminToken: string,
  dataSource: DataSource,
): Promise<CourseFixture> {
  const timestamp = Date.now();

  // 1. Create category
  const catRes = await request(app.getHttpServer())
    .post('/api/v1/admin/categories')
    .set('Authorization', `Bearer ${adminToken}`)
    .send({
      name: `Test Category ${timestamp}`,
      slug: `test-category-${timestamp}`,
      description: 'Category for E2E tests',
      isActive: true,
    })
    .expect(201);

  const categoryId = catRes.body.data?.id || catRes.body.id;

  // 2. Create course
  const courseRes = await request(app.getHttpServer())
    .post('/api/v1/admin/courses')
    .set('Authorization', `Bearer ${adminToken}`)
    .send({
      title: `Test Course ${timestamp}`,
      slug: `test-course-${timestamp}`,
      shortDescription: 'A test course for E2E testing',
      regularPrice: 100,
      categoryId,
      status: 'draft',
    })
    .expect(201);

  const courseId = courseRes.body.data?.id || courseRes.body.id;
  const courseSlug = courseRes.body.data?.slug || courseRes.body.slug || `test-course-${timestamp}`;

  // 3. Publish course
  await request(app.getHttpServer())
    .patch(`/api/v1/admin/courses/${courseId}/status?status=published`)
    .set('Authorization', `Bearer ${adminToken}`)
    .expect(200);

  // 4. Create cohort (enrollmentEndDate must be <= startDate)
  const cohortCode = `COHORT-${timestamp}`;
  const today = new Date();
  const startDate = new Date(today);
  startDate.setDate(startDate.getDate() + 30);
  const endDate = new Date(today);
  endDate.setMonth(endDate.getMonth() + 6);

  const cohortRes = await request(app.getHttpServer())
    .post('/api/v1/admin/cohorts')
    .set('Authorization', `Bearer ${adminToken}`)
    .send({
      courseId,
      name: `Test Cohort ${timestamp}`,
      code: cohortCode,
      enrollmentStartDate: today.toISOString().split('T')[0],
      enrollmentEndDate: startDate.toISOString().split('T')[0],
      startDate: startDate.toISOString().split('T')[0],
      endDate: endDate.toISOString().split('T')[0],
      maxStudents: 30,
      status: 'draft',
    })
    .expect(201);

  const cohortId = cohortRes.body.data?.id || cohortRes.body.id;

  // 5. Open cohort
  await request(app.getHttpServer())
    .patch(`/api/v1/admin/cohorts/${cohortId}/status?status=open`)
    .set('Authorization', `Bearer ${adminToken}`)
    .expect(200);

  // 6. Create 3 course modules directly via DB (no API for modules)
  const moduleIds: string[] = [];
  for (let i = 1; i <= 3; i++) {
    const result = await dataSource.query(
      `INSERT INTO course_modules ("courseId", "title", "description", "order", "isPublished")
       VALUES ($1, $2, $3, $4, true) RETURNING id`,
      [courseId, `Module ${i}: Test Topic ${i}`, `Description for module ${i}`, i],
    );
    moduleIds.push(result[0].id);
  }

  return { categoryId, courseId, courseSlug, cohortId, cohortCode, moduleIds };
}

/**
 * Creates an evaluation with 5 multiple choice questions via admin API.
 */
export async function createEvaluationWithQuestions(
  app: INestApplication,
  adminToken: string,
  courseId: string,
): Promise<EvaluationFixture> {
  // 1. Create evaluation
  const evalRes = await request(app.getHttpServer())
    .post('/api/v1/admin/evaluations')
    .set('Authorization', `Bearer ${adminToken}`)
    .send({
      courseId,
      title: 'Final Exam - E2E Test',
      description: 'Auto-generated evaluation for testing',
      type: 'final_exam',
      totalPoints: 50,
      passingScore: 30,
      maxAttempts: 3,
      timeLimitMinutes: 60,
    })
    .expect(201);

  const evaluationId = evalRes.body.data?.id || evalRes.body.id;

  // 2. Create 5 multiple choice questions
  const questionIds: string[] = [];
  const correctOptionIds: string[] = [];

  for (let i = 1; i <= 5; i++) {
    const correctId = `opt-${i}-correct`;
    const qRes = await request(app.getHttpServer())
      .post(`/api/v1/admin/evaluations/${evaluationId}/questions`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        evaluationId,
        questionText: `Question ${i}: What is the answer?`,
        questionType: 'multiple_choice',
        points: 10,
        order: i,
        options: [
          { id: correctId, text: `Correct answer for Q${i}`, isCorrect: true },
          { id: `opt-${i}-wrong1`, text: `Wrong answer 1 for Q${i}`, isCorrect: false },
          { id: `opt-${i}-wrong2`, text: `Wrong answer 2 for Q${i}`, isCorrect: false },
          { id: `opt-${i}-wrong3`, text: `Wrong answer 3 for Q${i}`, isCorrect: false },
        ],
      })
      .expect(201);

    questionIds.push(qRes.body.data?.id || qRes.body.id);
    correctOptionIds.push(correctId);
  }

  // 3. Publish evaluation
  await request(app.getHttpServer())
    .patch(`/api/v1/admin/evaluations/${evaluationId}/publish`)
    .set('Authorization', `Bearer ${adminToken}`)
    .expect(200);

  return { evaluationId, questionIds, correctOptionIds };
}

/**
 * Enrolls a student via admin API: create enrollment + record payment + activate.
 */
export async function enrollStudent(
  app: INestApplication,
  adminToken: string,
  studentId: string,
  cohortId: string,
): Promise<string> {
  const today = new Date();

  // 1. Create enrollment
  const enrollRes = await request(app.getHttpServer())
    .post('/api/v1/admin/enrollments')
    .set('Authorization', `Bearer ${adminToken}`)
    .send({
      studentId,
      cohortId,
      accessStartDate: today.toISOString().split('T')[0],
    })
    .expect(201);

  const enrollmentId = enrollRes.body.data?.id || enrollRes.body.id;

  // 2. Record payment
  await request(app.getHttpServer())
    .patch(`/api/v1/admin/enrollments/${enrollmentId}/record-payment?amount=100`)
    .set('Authorization', `Bearer ${adminToken}`)
    .expect(200);

  // 3. Activate enrollment
  await request(app.getHttpServer())
    .patch(`/api/v1/admin/enrollments/${enrollmentId}/activate`)
    .set('Authorization', `Bearer ${adminToken}`)
    .expect(200);

  return enrollmentId;
}
