import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import {
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { EnrollmentsService } from './enrollments.service';
import {
  Enrollment,
  EnrollmentStatus,
  PaymentStatus,
} from '../entities/enrollment.entity';
import { CohortsService } from '../../courses/services/cohorts.service';
import { ClassroomsService } from '../../courses/services/classrooms.service';
import { ReferralCodesService } from '../../referrals/services/referral-codes.service';

describe('EnrollmentsService', () => {
  let service: EnrollmentsService;
  let enrollmentRepository: any;
  let cohortsService: any;
  let classroomsService: any;
  let referralCodesService: any;

  const studentId = '11111111-1111-1111-1111-111111111111';
  const cohortId = '22222222-2222-2222-2222-222222222222';
  const courseId = '33333333-3333-3333-3333-333333333333';
  const classroomId = '44444444-4444-4444-4444-444444444444';
  const enrollmentId = '55555555-5555-5555-5555-555555555555';

  const mockCohort = {
    id: cohortId,
    courseId,
    isEnrollmentOpen: true,
    hasAvailableSpots: true,
    startDate: new Date('2026-03-01'),
    course: { regularPrice: 500 },
  };

  const mockEnrollment = {
    id: enrollmentId,
    studentId,
    cohortId,
    status: EnrollmentStatus.PENDING,
    paymentStatus: PaymentStatus.PENDING,
    totalPaid: 0,
    discountApplied: 0,
    accessStartDate: new Date('2026-03-01'),
    accessEndDate: null,
    classroomId: null,
    notes: null,
    isAccessExpired: false,
    cohort: { courseId, course: { regularPrice: 500 } },
  } as any;

  // Mock query builder chain
  const mockQueryBuilder = {
    leftJoin: jest.fn().mockReturnThis(),
    leftJoinAndSelect: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    select: jest.fn().mockReturnThis(),
    addSelect: jest.fn().mockReturnThis(),
    groupBy: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    skip: jest.fn().mockReturnThis(),
    take: jest.fn().mockReturnThis(),
    getOne: jest.fn(),
    getMany: jest.fn(),
    getCount: jest.fn(),
    getRawMany: jest.fn(),
    getRawOne: jest.fn(),
  };

  beforeEach(async () => {
    const mockRepository = {
      findOne: jest.fn(),
      find: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
      count: jest.fn(),
      createQueryBuilder: jest.fn(() => mockQueryBuilder),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EnrollmentsService,
        {
          provide: getRepositoryToken(Enrollment),
          useValue: mockRepository,
        },
        {
          provide: CohortsService,
          useValue: {
            findById: jest.fn(),
            incrementStudentCount: jest.fn(),
            decrementStudentCount: jest.fn(),
          },
        },
        {
          provide: ClassroomsService,
          useValue: {
            findById: jest.fn(),
            incrementStudentCount: jest.fn(),
            decrementStudentCount: jest.fn(),
          },
        },
        {
          provide: ReferralCodesService,
          useValue: {
            validateCode: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<EnrollmentsService>(EnrollmentsService);
    enrollmentRepository = module.get(getRepositoryToken(Enrollment));
    cohortsService = module.get(CohortsService);
    classroomsService = module.get(ClassroomsService);
    referralCodesService = module.get(ReferralCodesService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  // ============================================
  // CREATE
  // ============================================

  describe('create', () => {
    const createDto = { studentId, cohortId };

    it('should create enrollment successfully', async () => {
      cohortsService.findById.mockResolvedValue(mockCohort);
      enrollmentRepository.findOne.mockResolvedValue(null);
      enrollmentRepository.create.mockReturnValue(mockEnrollment);
      enrollmentRepository.save.mockResolvedValue(mockEnrollment);

      const result = await service.create(createDto);

      expect(result).toEqual(mockEnrollment);
      expect(cohortsService.findById).toHaveBeenCalledWith(cohortId);
      expect(cohortsService.incrementStudentCount).toHaveBeenCalledWith(
        cohortId,
      );
    });

    it('should throw BadRequestException when cohort not open', async () => {
      cohortsService.findById.mockResolvedValue({
        ...mockCohort,
        isEnrollmentOpen: false,
      });

      await expect(service.create(createDto)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw BadRequestException when cohort is full', async () => {
      cohortsService.findById.mockResolvedValue({
        ...mockCohort,
        hasAvailableSpots: false,
      });

      await expect(service.create(createDto)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw ConflictException when student already enrolled', async () => {
      cohortsService.findById.mockResolvedValue(mockCohort);
      enrollmentRepository.findOne.mockResolvedValue(mockEnrollment);

      await expect(service.create(createDto)).rejects.toThrow(
        ConflictException,
      );
    });

    it('should validate classroom if provided', async () => {
      const dtoWithClassroom = { ...createDto, classroomId };
      cohortsService.findById.mockResolvedValue(mockCohort);
      enrollmentRepository.findOne.mockResolvedValue(null);
      classroomsService.findById.mockResolvedValue({
        id: classroomId,
        cohortId,
        hasAvailableSpots: true,
      });
      enrollmentRepository.create.mockReturnValue(mockEnrollment);
      enrollmentRepository.save.mockResolvedValue(mockEnrollment);

      await service.create(dtoWithClassroom);

      expect(classroomsService.findById).toHaveBeenCalledWith(classroomId);
      expect(classroomsService.incrementStudentCount).toHaveBeenCalledWith(
        classroomId,
      );
    });

    it('should throw if classroom belongs to different cohort', async () => {
      const dtoWithClassroom = { ...createDto, classroomId };
      cohortsService.findById.mockResolvedValue(mockCohort);
      enrollmentRepository.findOne.mockResolvedValue(null);
      classroomsService.findById.mockResolvedValue({
        id: classroomId,
        cohortId: 'different-cohort-id',
        hasAvailableSpots: true,
      });

      await expect(service.create(dtoWithClassroom)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  // ============================================
  // SELF-ENROLL
  // ============================================

  describe('selfEnroll', () => {
    const selfEnrollDto = { cohortId };

    it('should create self-enrollment with PENDING status', async () => {
      cohortsService.findById.mockResolvedValue(mockCohort);
      enrollmentRepository.findOne.mockResolvedValue(null);
      enrollmentRepository.create.mockReturnValue(mockEnrollment);
      enrollmentRepository.save.mockResolvedValue(mockEnrollment);

      const result = await service.selfEnroll(studentId, selfEnrollDto);

      expect(result).toEqual(mockEnrollment);
      expect(enrollmentRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          studentId,
          cohortId,
          status: EnrollmentStatus.PENDING,
          paymentStatus: PaymentStatus.PENDING,
        }),
      );
    });

    it('should apply referral discount', async () => {
      const dtoWithReferral = { cohortId, referralCode: 'REF123' };
      cohortsService.findById.mockResolvedValue(mockCohort);
      enrollmentRepository.findOne.mockResolvedValue(null);
      referralCodesService.validateCode.mockResolvedValue({
        valid: true,
        discount: 50,
        code: { id: 'referral-id' },
      });
      enrollmentRepository.create.mockReturnValue(mockEnrollment);
      enrollmentRepository.save.mockResolvedValue(mockEnrollment);

      await service.selfEnroll(studentId, dtoWithReferral);

      expect(referralCodesService.validateCode).toHaveBeenCalledWith(
        'REF123',
        studentId,
      );
      expect(enrollmentRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          discountApplied: 50,
          referralId: 'referral-id',
        }),
      );
    });

    it('should throw ConflictException if already enrolled', async () => {
      cohortsService.findById.mockResolvedValue(mockCohort);
      enrollmentRepository.findOne.mockResolvedValue(mockEnrollment);

      await expect(
        service.selfEnroll(studentId, selfEnrollDto),
      ).rejects.toThrow(ConflictException);
    });
  });

  // ============================================
  // HAS ACCESS
  // ============================================

  describe('hasAccess', () => {
    it('should return true for active enrollment with completed payment', async () => {
      const activeEnrollment = {
        ...mockEnrollment,
        status: EnrollmentStatus.ACTIVE,
        paymentStatus: PaymentStatus.COMPLETED,
        isAccessExpired: false,
      };
      mockQueryBuilder.getOne.mockResolvedValue(activeEnrollment);

      const result = await service.hasAccess(studentId, courseId);

      expect(result).toBe(true);
    });

    it('should return true for active enrollment with partial payment', async () => {
      const activeEnrollment = {
        ...mockEnrollment,
        status: EnrollmentStatus.ACTIVE,
        paymentStatus: PaymentStatus.PARTIAL,
        isAccessExpired: false,
      };
      mockQueryBuilder.getOne.mockResolvedValue(activeEnrollment);

      const result = await service.hasAccess(studentId, courseId);

      expect(result).toBe(true);
    });

    it('should return false when no enrollment found', async () => {
      mockQueryBuilder.getOne.mockResolvedValue(null);

      const result = await service.hasAccess(studentId, courseId);

      expect(result).toBe(false);
    });

    it('should return false when access has expired', async () => {
      const expiredEnrollment = {
        ...mockEnrollment,
        status: EnrollmentStatus.ACTIVE,
        paymentStatus: PaymentStatus.COMPLETED,
        isAccessExpired: true,
      };
      mockQueryBuilder.getOne.mockResolvedValue(expiredEnrollment);

      const result = await service.hasAccess(studentId, courseId);

      expect(result).toBe(false);
    });
  });

  // ============================================
  // ACTIVATE
  // ============================================

  describe('activate', () => {
    it('should activate enrollment with completed payment', async () => {
      const paidEnrollment = {
        ...mockEnrollment,
        paymentStatus: PaymentStatus.COMPLETED,
      };
      enrollmentRepository.findOne.mockResolvedValue(paidEnrollment);
      enrollmentRepository.save.mockResolvedValue({
        ...paidEnrollment,
        status: EnrollmentStatus.ACTIVE,
      });

      const result = await service.activate(enrollmentId);

      expect(result.status).toBe(EnrollmentStatus.ACTIVE);
    });

    it('should activate enrollment with partial payment', async () => {
      const partialPaid = {
        ...mockEnrollment,
        paymentStatus: PaymentStatus.PARTIAL,
      };
      enrollmentRepository.findOne.mockResolvedValue(partialPaid);
      enrollmentRepository.save.mockResolvedValue({
        ...partialPaid,
        status: EnrollmentStatus.ACTIVE,
      });

      const result = await service.activate(enrollmentId);

      expect(result.status).toBe(EnrollmentStatus.ACTIVE);
    });

    it('should throw BadRequestException without payment', async () => {
      const noPay = {
        ...mockEnrollment,
        paymentStatus: PaymentStatus.PENDING,
      };
      enrollmentRepository.findOne.mockResolvedValue(noPay);

      await expect(service.activate(enrollmentId)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  // ============================================
  // RECORD PAYMENT
  // ============================================

  describe('recordPayment', () => {
    it('should update totalPaid and mark as COMPLETED when full', async () => {
      const enrollment = {
        ...mockEnrollment,
        totalPaid: 0,
        discountApplied: 0,
      };
      enrollmentRepository.findOne.mockResolvedValue(enrollment);
      cohortsService.findById.mockResolvedValue(mockCohort);
      enrollmentRepository.save.mockImplementation((e) =>
        Promise.resolve(e),
      );

      const result = await service.recordPayment(enrollmentId, 500);

      expect(result.totalPaid).toBe(500);
      expect(result.paymentStatus).toBe(PaymentStatus.COMPLETED);
    });

    it('should mark as PARTIAL when amount is less than price', async () => {
      const enrollment = {
        ...mockEnrollment,
        totalPaid: 0,
        discountApplied: 0,
      };
      enrollmentRepository.findOne.mockResolvedValue(enrollment);
      cohortsService.findById.mockResolvedValue(mockCohort);
      enrollmentRepository.save.mockImplementation((e) =>
        Promise.resolve(e),
      );

      const result = await service.recordPayment(enrollmentId, 200);

      expect(result.totalPaid).toBe(200);
      expect(result.paymentStatus).toBe(PaymentStatus.PARTIAL);
    });
  });

  // ============================================
  // CANCEL
  // ============================================

  describe('cancel', () => {
    it('should cancel enrollment and decrement counters', async () => {
      const enrollment = {
        ...mockEnrollment,
        classroomId,
      };
      enrollmentRepository.findOne.mockResolvedValue(enrollment);
      enrollmentRepository.save.mockImplementation((e) =>
        Promise.resolve(e),
      );

      const result = await service.cancel(enrollmentId, 'Student request');

      expect(result.status).toBe(EnrollmentStatus.CANCELLED);
      expect(cohortsService.decrementStudentCount).toHaveBeenCalledWith(
        cohortId,
      );
      expect(classroomsService.decrementStudentCount).toHaveBeenCalledWith(
        classroomId,
      );
    });

    it('should include reason in notes', async () => {
      enrollmentRepository.findOne.mockResolvedValue({ ...mockEnrollment });
      enrollmentRepository.save.mockImplementation((e) =>
        Promise.resolve(e),
      );

      const result = await service.cancel(enrollmentId, 'Refund requested');

      expect(result.notes).toContain('Refund requested');
    });
  });

  // ============================================
  // FIND BY ID
  // ============================================

  describe('findById', () => {
    it('should return enrollment with relations', async () => {
      enrollmentRepository.findOne.mockResolvedValue(mockEnrollment);

      const result = await service.findById(enrollmentId);

      expect(result).toEqual(mockEnrollment);
    });

    it('should throw NotFoundException when not found', async () => {
      enrollmentRepository.findOne.mockResolvedValue(null);

      await expect(service.findById('invalid-id')).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
