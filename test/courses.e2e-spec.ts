import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { DataSource } from 'typeorm';
import { createTestApp, getDataSource, closeTestApp } from './helpers/test-app.helper';
import { cleanDatabase } from './helpers/db.helper';
import { getAdminToken } from './helpers/auth.helper';

describe('Courses (e2e)', () => {
  let app: INestApplication;
  let dataSource: DataSource;
  let adminToken: string;

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
    adminToken = await getAdminToken(app);
  });

  // ============================================
  // ADMIN: CREATE CATEGORY
  // ============================================

  describe('POST /api/v1/admin/categories', () => {
    it('should create a category (201)', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/admin/categories')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'Vascular Sonography',
          slug: 'vascular-sonography',
          description: 'Vascular ultrasound programs',
          isActive: true,
        })
        .expect(201);

      const data = res.body.data || res.body;
      expect(data).toHaveProperty('id');
      expect(data.name).toBe('Vascular Sonography');
      expect(data.slug).toBe('vascular-sonography');
    });

    it('should reject without auth (401)', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/admin/categories')
        .send({ name: 'Test', slug: 'test' })
        .expect(401);
    });
  });

  // ============================================
  // ADMIN: CREATE COURSE
  // ============================================

  describe('POST /api/v1/admin/courses', () => {
    let categoryId: string;

    beforeEach(async () => {
      const catRes = await request(app.getHttpServer())
        .post('/api/v1/admin/categories')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'Test Category',
          slug: 'test-category',
          isActive: true,
        })
        .expect(201);

      categoryId = catRes.body.data?.id || catRes.body.id;
    });

    it('should create a course (201)', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/admin/courses')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          title: 'Vascular Sonography Basics',
          slug: 'vascular-sonography-basics',
          shortDescription: 'Learn the fundamentals of vascular sonography',
          regularPrice: 265,
          categoryId,
        })
        .expect(201);

      const data = res.body.data || res.body;
      expect(data).toHaveProperty('id');
      expect(data.title).toBe('Vascular Sonography Basics');
      expect(data.status).toBe('draft');
    });

    it('should reject course with invalid data (400)', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/admin/courses')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          // missing required fields: title, slug, shortDescription, regularPrice
        })
        .expect(400);
    });
  });

  // ============================================
  // ADMIN: CREATE COHORT + CHANGE STATUS
  // ============================================

  describe('Cohort management', () => {
    let courseId: string;

    beforeEach(async () => {
      // Create category + course
      const catRes = await request(app.getHttpServer())
        .post('/api/v1/admin/categories')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: 'Cat', slug: `cat-${Date.now()}`, isActive: true })
        .expect(201);

      const courseRes = await request(app.getHttpServer())
        .post('/api/v1/admin/courses')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          title: 'Course for Cohort Test',
          slug: `course-cohort-${Date.now()}`,
          shortDescription: 'Test course',
          regularPrice: 100,
          categoryId: catRes.body.data?.id || catRes.body.id,
        })
        .expect(201);

      courseId = courseRes.body.data?.id || courseRes.body.id;
    });

    it('should create a cohort (201)', async () => {
      const today = new Date().toISOString().split('T')[0];
      const startDate = new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0];
      const endDate = new Date(Date.now() + 180 * 86400000).toISOString().split('T')[0];

      const res = await request(app.getHttpServer())
        .post('/api/v1/admin/cohorts')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          courseId,
          name: 'Spring 2026',
          code: `SPRING-${Date.now()}`,
          enrollmentStartDate: today,
          enrollmentEndDate: startDate,
          startDate,
          endDate,
          maxStudents: 25,
        })
        .expect(201);

      const data = res.body.data || res.body;
      expect(data).toHaveProperty('id');
      expect(data.name).toBe('Spring 2026');
      expect(data.status).toBe('draft');
    });

    it('should publish course and open cohort', async () => {
      // Publish course
      await request(app.getHttpServer())
        .patch(`/api/v1/admin/courses/${courseId}/status?status=published`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      // Create cohort (enrollmentEndDate must be <= startDate)
      const today = new Date().toISOString().split('T')[0];
      const startDate = new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0];
      const endDate = new Date(Date.now() + 180 * 86400000).toISOString().split('T')[0];

      const cohortRes = await request(app.getHttpServer())
        .post('/api/v1/admin/cohorts')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          courseId,
          name: 'Open Cohort',
          code: `OPEN-${Date.now()}`,
          enrollmentStartDate: today,
          enrollmentEndDate: startDate,
          startDate,
          endDate,
        })
        .expect(201);

      const cohortId = cohortRes.body.data?.id || cohortRes.body.id;

      // Open cohort
      const openRes = await request(app.getHttpServer())
        .patch(`/api/v1/admin/cohorts/${cohortId}/status?status=open`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      const data = openRes.body.data || openRes.body;
      expect(data.status).toBe('open');
    });
  });

  // ============================================
  // PUBLIC: QUERY COURSES
  // ============================================

  describe('Public course queries', () => {
    beforeEach(async () => {
      // Create a published course
      const catRes = await request(app.getHttpServer())
        .post('/api/v1/admin/categories')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: 'Public Cat', slug: `public-cat-${Date.now()}`, isActive: true })
        .expect(201);

      const courseRes = await request(app.getHttpServer())
        .post('/api/v1/admin/courses')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          title: 'Published Course',
          slug: `published-course-${Date.now()}`,
          shortDescription: 'A published course for testing',
          regularPrice: 200,
          categoryId: catRes.body.data?.id || catRes.body.id,
          status: 'draft',
        })
        .expect(201);

      const courseId = courseRes.body.data?.id || courseRes.body.id;

      // Publish
      await request(app.getHttpServer())
        .patch(`/api/v1/admin/courses/${courseId}/status?status=published`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);
    });

    it('GET /api/v1/courses - should list published courses', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/courses')
        .expect(200);

      const data = res.body.data || res.body;
      expect(Array.isArray(data)).toBe(true);
      expect(data.length).toBeGreaterThanOrEqual(1);
    });

    it('GET /api/v1/categories - should list active categories', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/categories')
        .expect(200);

      const data = res.body.data || res.body;
      expect(Array.isArray(data)).toBe(true);
      expect(data.length).toBeGreaterThanOrEqual(1);
    });
  });
});
