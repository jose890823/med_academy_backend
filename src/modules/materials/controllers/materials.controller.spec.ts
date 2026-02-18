import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { MaterialsController } from './materials.controller';
import { MaterialsService } from '../services/materials.service';
import { EnrollmentsService } from '../../enrollments/services/enrollments.service';
import { CourseModule as CourseModuleEntity } from '../../courses/entities/course-module.entity';
import { MaterialStatus } from '../entities/material.entity';

describe('MaterialsController', () => {
  let controller: MaterialsController;
  let materialsService: any;
  let enrollmentsService: any;
  let courseModuleRepo: any;

  const studentId = '11111111-1111-1111-1111-111111111111';
  const courseId = '22222222-2222-2222-2222-222222222222';
  const moduleId = '33333333-3333-3333-3333-333333333333';
  const materialId = '44444444-4444-4444-4444-444444444444';

  const regularUser = {
    id: studentId,
    email: 'student@test.com',
    isAdmin: jest.fn().mockReturnValue(false),
  };

  const adminUser = {
    id: 'admin-id',
    email: 'admin@test.com',
    isAdmin: jest.fn().mockReturnValue(true),
  };

  const mockCourseModule = {
    id: moduleId,
    courseId,
    title: 'Module 1',
  };

  const publicMaterial = {
    id: materialId,
    name: 'Public Guide',
    isPublic: true,
    courseId,
    allowDownload: true,
    status: MaterialStatus.ACTIVE,
  };

  const privateMaterial = {
    id: materialId,
    name: 'Private Lecture',
    isPublic: false,
    courseId,
    allowDownload: true,
    status: MaterialStatus.ACTIVE,
  };

  const materialNoCourse = {
    id: materialId,
    name: 'Orphan Material',
    isPublic: false,
    courseId: null,
    allowDownload: true,
    status: MaterialStatus.ACTIVE,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [MaterialsController],
      providers: [
        {
          provide: MaterialsService,
          useValue: {
            findPublicByCourse: jest.fn(),
            findByModule: jest.fn(),
            findByCourse: jest.fn(),
            findById: jest.fn(),
            registerDownload: jest.fn(),
            getDownloadUrl: jest.fn(),
          },
        },
        {
          provide: EnrollmentsService,
          useValue: {
            hasAccess: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(CourseModuleEntity),
          useValue: {
            findOne: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<MaterialsController>(MaterialsController);
    materialsService = module.get(MaterialsService);
    enrollmentsService = module.get(EnrollmentsService);
    courseModuleRepo = module.get(getRepositoryToken(CourseModuleEntity));
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  // ============================================
  // PUBLIC MATERIALS
  // ============================================

  describe('getPublicMaterials', () => {
    it('should return public materials without auth check', async () => {
      materialsService.findPublicByCourse.mockResolvedValue([publicMaterial]);

      const result = await controller.getPublicMaterials(courseId);

      expect(result).toEqual([publicMaterial]);
      expect(enrollmentsService.hasAccess).not.toHaveBeenCalled();
    });
  });

  // ============================================
  // MODULE MATERIALS - ACCESS CONTROL
  // ============================================

  describe('getModuleMaterials', () => {
    it('should allow enrolled student to access module materials', async () => {
      courseModuleRepo.findOne.mockResolvedValue(mockCourseModule);
      enrollmentsService.hasAccess.mockResolvedValue(true);
      materialsService.findByModule.mockResolvedValue([privateMaterial]);

      const result = await controller.getModuleMaterials(
        moduleId,
        regularUser as any,
      );

      expect(result).toEqual([privateMaterial]);
      expect(enrollmentsService.hasAccess).toHaveBeenCalledWith(
        studentId,
        courseId,
      );
    });

    it('should deny non-enrolled student access to module materials', async () => {
      courseModuleRepo.findOne.mockResolvedValue(mockCourseModule);
      enrollmentsService.hasAccess.mockResolvedValue(false);

      await expect(
        controller.getModuleMaterials(moduleId, regularUser as any),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should allow admin access without enrollment', async () => {
      courseModuleRepo.findOne.mockResolvedValue(mockCourseModule);
      materialsService.findByModule.mockResolvedValue([privateMaterial]);

      const result = await controller.getModuleMaterials(
        moduleId,
        adminUser as any,
      );

      expect(result).toEqual([privateMaterial]);
      expect(enrollmentsService.hasAccess).not.toHaveBeenCalled();
    });

    it('should throw NotFoundException when module does not exist', async () => {
      courseModuleRepo.findOne.mockResolvedValue(null);

      await expect(
        controller.getModuleMaterials(moduleId, regularUser as any),
      ).rejects.toThrow(NotFoundException);
    });
  });

  // ============================================
  // COURSE MATERIALS - ACCESS CONTROL
  // ============================================

  describe('getCourseMaterials', () => {
    it('should allow enrolled student access', async () => {
      enrollmentsService.hasAccess.mockResolvedValue(true);
      materialsService.findByCourse.mockResolvedValue([privateMaterial]);

      const result = await controller.getCourseMaterials(
        courseId,
        regularUser as any,
      );

      expect(result).toEqual([privateMaterial]);
      expect(enrollmentsService.hasAccess).toHaveBeenCalledWith(
        studentId,
        courseId,
      );
    });

    it('should deny non-enrolled student', async () => {
      enrollmentsService.hasAccess.mockResolvedValue(false);

      await expect(
        controller.getCourseMaterials(courseId, regularUser as any),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should allow admin without enrollment', async () => {
      materialsService.findByCourse.mockResolvedValue([privateMaterial]);

      const result = await controller.getCourseMaterials(
        courseId,
        adminUser as any,
      );

      expect(result).toEqual([privateMaterial]);
      expect(enrollmentsService.hasAccess).not.toHaveBeenCalled();
    });
  });

  // ============================================
  // FIND BY ID - ACCESS CONTROL
  // ============================================

  describe('findById', () => {
    it('should return public material without access check', async () => {
      materialsService.findById.mockResolvedValue(publicMaterial);

      const result = await controller.findById(
        materialId,
        regularUser as any,
      );

      expect(result).toEqual(publicMaterial);
      expect(enrollmentsService.hasAccess).not.toHaveBeenCalled();
    });

    it('should check enrollment for private material with course', async () => {
      materialsService.findById.mockResolvedValue(privateMaterial);
      enrollmentsService.hasAccess.mockResolvedValue(true);

      const result = await controller.findById(
        materialId,
        regularUser as any,
      );

      expect(result).toEqual(privateMaterial);
      expect(enrollmentsService.hasAccess).toHaveBeenCalledWith(
        studentId,
        courseId,
      );
    });

    it('should deny non-enrolled student for private material', async () => {
      materialsService.findById.mockResolvedValue(privateMaterial);
      enrollmentsService.hasAccess.mockResolvedValue(false);

      await expect(
        controller.findById(materialId, regularUser as any),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should deny non-admin for material without course', async () => {
      materialsService.findById.mockResolvedValue(materialNoCourse);

      await expect(
        controller.findById(materialId, regularUser as any),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should allow admin for material without course', async () => {
      materialsService.findById.mockResolvedValue(materialNoCourse);

      const result = await controller.findById(
        materialId,
        adminUser as any,
      );

      expect(result).toEqual(materialNoCourse);
    });
  });

  // ============================================
  // DOWNLOAD - ACCESS CONTROL
  // ============================================

  describe('download', () => {
    const downloadResult = {
      url: 'https://storage.example.com/file.pdf',
      filename: 'file.pdf',
      mimeType: 'application/pdf',
    };

    it('should allow download for enrolled student', async () => {
      materialsService.findById.mockResolvedValue(privateMaterial);
      enrollmentsService.hasAccess.mockResolvedValue(true);
      materialsService.registerDownload.mockResolvedValue(privateMaterial);
      materialsService.getDownloadUrl.mockResolvedValue(downloadResult);

      const result = await controller.download(
        materialId,
        regularUser as any,
      );

      expect(result).toEqual(downloadResult);
      expect(materialsService.registerDownload).toHaveBeenCalledWith(
        materialId,
      );
    });

    it('should deny download for non-enrolled student', async () => {
      materialsService.findById.mockResolvedValue(privateMaterial);
      enrollmentsService.hasAccess.mockResolvedValue(false);

      await expect(
        controller.download(materialId, regularUser as any),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should deny download when material is not downloadable', async () => {
      const nonDownloadable = { ...privateMaterial, allowDownload: false };
      materialsService.findById.mockResolvedValue(nonDownloadable);

      await expect(
        controller.download(materialId, regularUser as any),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should allow download of public material without enrollment', async () => {
      materialsService.findById.mockResolvedValue(publicMaterial);
      materialsService.registerDownload.mockResolvedValue(publicMaterial);
      materialsService.getDownloadUrl.mockResolvedValue(downloadResult);

      const result = await controller.download(
        materialId,
        regularUser as any,
      );

      expect(result).toEqual(downloadResult);
      expect(enrollmentsService.hasAccess).not.toHaveBeenCalled();
    });

    it('should allow admin download without enrollment', async () => {
      materialsService.findById.mockResolvedValue(privateMaterial);
      materialsService.registerDownload.mockResolvedValue(privateMaterial);
      materialsService.getDownloadUrl.mockResolvedValue(downloadResult);

      const result = await controller.download(
        materialId,
        adminUser as any,
      );

      expect(result).toEqual(downloadResult);
      expect(enrollmentsService.hasAccess).not.toHaveBeenCalled();
    });
  });
});
