import {
  Injectable,
  Logger,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  Enrollment,
  EnrollmentStatus,
  PaymentStatus,
} from '../entities/enrollment.entity';
import {
  CreateEnrollmentDto,
  UpdateEnrollmentDto,
  EnrollmentQueryDto,
  AssignClassroomDto,
  EnrollmentIssueCertificateDto,
  SelfEnrollDto,
} from '../dto';
import { ErrorCodes } from '../../../common/dto';
import { CohortsService } from '../../courses/services/cohorts.service';
import { ClassroomsService } from '../../courses/services/classrooms.service';
import { ReferralCodesService } from '../../referrals/services/referral-codes.service';

@Injectable()
export class EnrollmentsService {
  private readonly logger = new Logger(EnrollmentsService.name);

  constructor(
    @InjectRepository(Enrollment)
    private readonly enrollmentRepository: Repository<Enrollment>,
    private readonly cohortsService: CohortsService,
    private readonly classroomsService: ClassroomsService,
    private readonly referralCodesService: ReferralCodesService,
  ) {}

  /**
   * Crear una nueva inscripción
   * @throws ConflictException si el estudiante ya está inscrito en la convocatoria
   * @throws NotFoundException si la convocatoria o aula no existe
   * @throws BadRequestException si la convocatoria no está abierta o no hay cupo
   */
  async create(
    dto: CreateEnrollmentDto,
    options?: { skipDateValidation?: boolean },
  ): Promise<Enrollment> {
    // Verificar que la convocatoria existe
    const cohort = await this.cohortsService.findById(dto.cohortId);

    // Para inscripciones admin, solo validar cupo (no fechas de inscripción)
    if (!options?.skipDateValidation && !cohort.isEnrollmentOpen) {
      throw new BadRequestException({
        code: ErrorCodes.COHORT_CLOSED,
        message: 'Las inscripciones para esta convocatoria no están abiertas',
      });
    }

    if (!cohort.hasAvailableSpots) {
      throw new BadRequestException({
        code: ErrorCodes.COHORT_FULL,
        message: 'La convocatoria no tiene cupos disponibles',
      });
    }

    // Verificar que el estudiante no esté ya inscrito
    const existing = await this.enrollmentRepository.findOne({
      where: { studentId: dto.studentId, cohortId: dto.cohortId },
    });

    if (existing) {
      throw new ConflictException({
        code: ErrorCodes.ENROLL_ALREADY_EXISTS,
        message: 'El estudiante ya está inscrito en esta convocatoria',
      });
    }

    // Si se especifica aula, verificar que existe y tiene cupo
    if (dto.classroomId) {
      const classroom = await this.classroomsService.findById(dto.classroomId);

      if (classroom.cohortId !== dto.cohortId) {
        throw new BadRequestException({
          code: ErrorCodes.VALIDATION_ERROR,
          message: 'El aula no pertenece a la convocatoria seleccionada',
        });
      }

      if (!classroom.hasAvailableSpots) {
        throw new BadRequestException({
          code: ErrorCodes.CLASSROOM_FULL,
          message: 'El aula no tiene cupos disponibles',
        });
      }
    }

    // Crear la inscripción
    const enrollment = this.enrollmentRepository.create({
      ...dto,
      accessStartDate: dto.accessStartDate || cohort.startDate,
      accessEndDate: dto.accessEndDate || null, // null = lifetime access por defecto
    });

    const saved = await this.enrollmentRepository.save(enrollment);

    // Incrementar contador de estudiantes en la convocatoria
    await this.cohortsService.incrementStudentCount(dto.cohortId);

    // Si tiene aula asignada, incrementar contador
    if (dto.classroomId) {
      await this.classroomsService.incrementStudentCount(dto.classroomId);
    }

    this.logger.log(
      `Inscripción creada: ${saved.id} (Estudiante: ${dto.studentId}, Convocatoria: ${dto.cohortId})`,
    );
    return saved;
  }

  /**
   * Auto-inscripción de un estudiante en un cohort abierto
   * @throws ConflictException si ya está inscrito en el curso
   * @throws NotFoundException si el cohort no existe
   * @throws BadRequestException si el cohort no está abierto o no hay cupo
   */
  async selfEnroll(
    studentId: string,
    dto: SelfEnrollDto,
  ): Promise<Enrollment> {
    // Verificar que la convocatoria existe y está abierta
    const cohort = await this.cohortsService.findById(dto.cohortId);

    if (!cohort.isEnrollmentOpen) {
      throw new BadRequestException({
        code: ErrorCodes.COHORT_CLOSED,
        message: 'Las inscripciones para esta convocatoria no están abiertas',
      });
    }

    if (!cohort.hasAvailableSpots) {
      throw new BadRequestException({
        code: ErrorCodes.COHORT_FULL,
        message: 'La convocatoria no tiene cupos disponibles',
      });
    }

    // Verificar que el estudiante no tenga ya una inscripción activa en este cohort
    const existing = await this.enrollmentRepository.findOne({
      where: { studentId, cohortId: dto.cohortId },
    });

    if (existing) {
      throw new ConflictException({
        code: ErrorCodes.ENROLL_ALREADY_EXISTS,
        message: 'Ya estás inscrito en esta convocatoria',
      });
    }

    // Validar código de referido si se proporciona
    let discountApplied = 0;
    let referralId: string | undefined;

    if (dto.referralCode) {
      const referralResult = await this.referralCodesService.validateCode(
        dto.referralCode,
        studentId,
      );

      if (referralResult.valid && referralResult.discount) {
        discountApplied = referralResult.discount;
        referralId = referralResult.code?.id;
      }
    }

    // Crear la inscripción con estado PENDING
    const enrollment = this.enrollmentRepository.create({
      studentId,
      cohortId: dto.cohortId,
      accessStartDate: cohort.startDate,
      accessEndDate: null,
      status: EnrollmentStatus.PENDING,
      paymentStatus: PaymentStatus.PENDING,
      discountApplied,
      referralId,
    });

    const saved = await this.enrollmentRepository.save(enrollment);

    // Incrementar contador de estudiantes en la convocatoria
    await this.cohortsService.incrementStudentCount(dto.cohortId);

    this.logger.log(
      `Auto-inscripción creada: ${saved.id} (Estudiante: ${studentId}, Convocatoria: ${dto.cohortId})`,
    );
    return saved;
  }

  /**
   * Obtener todas las inscripciones con paginación y filtros
   */
  async findAll(query: EnrollmentQueryDto): Promise<{
    data: Enrollment[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
      hasNextPage: boolean;
      hasPrevPage: boolean;
    };
  }> {
    const {
      page = 1,
      limit = 20,
      studentId,
      cohortId,
      classroomId,
      courseId,
      status,
      paymentStatus,
      hasCertificate,
      sortBy = 'createdAt',
      sortOrder = 'DESC',
    } = query;

    const queryBuilder = this.enrollmentRepository
      .createQueryBuilder('enrollment')
      .leftJoinAndSelect('enrollment.student', 'student')
      .leftJoinAndSelect('enrollment.cohort', 'cohort')
      .leftJoinAndSelect('cohort.course', 'course')
      .leftJoinAndSelect('enrollment.classroom', 'classroom');

    // Filtros
    if (studentId) {
      queryBuilder.andWhere('enrollment.studentId = :studentId', { studentId });
    }

    if (cohortId) {
      queryBuilder.andWhere('enrollment.cohortId = :cohortId', { cohortId });
    }

    if (classroomId) {
      queryBuilder.andWhere('enrollment.classroomId = :classroomId', {
        classroomId,
      });
    }

    if (courseId) {
      queryBuilder.andWhere('cohort.courseId = :courseId', { courseId });
    }

    if (status) {
      queryBuilder.andWhere('enrollment.status = :status', { status });
    }

    if (paymentStatus) {
      queryBuilder.andWhere('enrollment.paymentStatus = :paymentStatus', {
        paymentStatus,
      });
    }

    if (hasCertificate !== undefined) {
      if (hasCertificate) {
        queryBuilder.andWhere('enrollment.certificateUrl IS NOT NULL');
      } else {
        queryBuilder.andWhere('enrollment.certificateUrl IS NULL');
      }
    }

    // Ordenamiento
    const validSortFields = ['createdAt', 'accessStartDate', 'totalPaid'];
    const sortField = validSortFields.includes(sortBy) ? sortBy : 'createdAt';
    queryBuilder.orderBy(`enrollment.${sortField}`, sortOrder);

    // Paginación
    const total = await queryBuilder.getCount();
    const totalPages = Math.ceil(total / limit);

    queryBuilder.skip((page - 1) * limit).take(limit);

    const data = await queryBuilder.getMany();

    return {
      data,
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1,
      },
    };
  }

  /**
   * Obtener inscripciones de un estudiante
   */
  async findByStudent(studentId: string): Promise<Enrollment[]> {
    return this.enrollmentRepository.find({
      where: { studentId },
      relations: ['cohort', 'cohort.course', 'classroom', 'progress'],
      order: { createdAt: 'DESC' },
    });
  }

  /**
   * Obtener inscripciones activas de un estudiante
   */
  async findActiveByStudent(studentId: string): Promise<Enrollment[]> {
    return this.enrollmentRepository.find({
      where: { studentId, status: EnrollmentStatus.ACTIVE },
      relations: ['cohort', 'cohort.course', 'classroom', 'progress'],
      order: { accessStartDate: 'ASC' },
    });
  }

  /**
   * Obtener inscripciones de una convocatoria
   */
  async findByCohort(cohortId: string): Promise<Enrollment[]> {
    return this.enrollmentRepository.find({
      where: { cohortId },
      relations: ['student', 'classroom'],
      order: { createdAt: 'DESC' },
    });
  }

  /**
   * Obtener inscripciones de un aula
   */
  async findByClassroom(classroomId: string): Promise<Enrollment[]> {
    return this.enrollmentRepository.find({
      where: { classroomId },
      relations: ['student', 'cohort'],
      order: { createdAt: 'DESC' },
    });
  }

  /**
   * Obtener una inscripción por ID
   * @throws NotFoundException si no existe
   */
  async findById(id: string): Promise<Enrollment> {
    const enrollment = await this.enrollmentRepository.findOne({
      where: { id },
      relations: ['student', 'cohort', 'cohort.course', 'cohort.course.modules', 'classroom'],
    });

    if (!enrollment) {
      throw new NotFoundException({
        code: ErrorCodes.ENROLL_NOT_FOUND,
        message: 'La inscripción no fue encontrada',
      });
    }

    return enrollment;
  }

  /**
   * Verificar si un estudiante tiene acceso a un curso
   */
  async hasAccess(studentId: string, courseId: string): Promise<boolean> {
    const enrollment = await this.enrollmentRepository
      .createQueryBuilder('enrollment')
      .leftJoin('enrollment.cohort', 'cohort')
      .where('enrollment.studentId = :studentId', { studentId })
      .andWhere('cohort.courseId = :courseId', { courseId })
      .andWhere('enrollment.status = :status', {
        status: EnrollmentStatus.ACTIVE,
      })
      .andWhere('enrollment.paymentStatus IN (:...paymentStatuses)', {
        paymentStatuses: [PaymentStatus.COMPLETED, PaymentStatus.PARTIAL],
      })
      .getOne();

    if (!enrollment) return false;

    // Verificar si no ha expirado
    return !enrollment.isAccessExpired;
  }

  /**
   * Actualizar una inscripción
   * @throws NotFoundException si no existe
   */
  async update(id: string, dto: UpdateEnrollmentDto): Promise<Enrollment> {
    const enrollment = await this.findById(id);

    // Si se cambia el aula, validar
    if (dto.classroomId && dto.classroomId !== enrollment.classroomId) {
      const newClassroom = await this.classroomsService.findById(
        dto.classroomId,
      );

      if (newClassroom.cohortId !== enrollment.cohortId) {
        throw new BadRequestException({
          code: ErrorCodes.VALIDATION_ERROR,
          message: 'El aula no pertenece a la convocatoria de la inscripción',
        });
      }

      if (!newClassroom.hasAvailableSpots) {
        throw new BadRequestException({
          code: ErrorCodes.CLASSROOM_FULL,
          message: 'El aula no tiene cupos disponibles',
        });
      }

      // Decrementar contador del aula anterior si tenía
      if (enrollment.classroomId) {
        await this.classroomsService.decrementStudentCount(
          enrollment.classroomId,
        );
      }

      // Incrementar contador del aula nueva
      await this.classroomsService.incrementStudentCount(dto.classroomId);
    }

    Object.assign(enrollment, dto);
    const updated = await this.enrollmentRepository.save(enrollment);

    this.logger.log(`Inscripción actualizada: ${updated.id}`);
    return updated;
  }

  /**
   * Asignar un aula a una inscripción
   */
  async assignClassroom(
    id: string,
    dto: AssignClassroomDto,
  ): Promise<Enrollment> {
    const enrollment = await this.findById(id);

    if (enrollment.classroomId === dto.classroomId) {
      return enrollment; // Ya está asignada a esa aula
    }

    const classroom = await this.classroomsService.findById(dto.classroomId);

    if (classroom.cohortId !== enrollment.cohortId) {
      throw new BadRequestException({
        code: ErrorCodes.VALIDATION_ERROR,
        message: 'El aula no pertenece a la convocatoria de la inscripción',
      });
    }

    if (!classroom.hasAvailableSpots) {
      throw new BadRequestException({
        code: ErrorCodes.CLASSROOM_FULL,
        message: 'El aula no tiene cupos disponibles',
      });
    }

    // Decrementar contador del aula anterior si tenía
    if (enrollment.classroomId) {
      await this.classroomsService.decrementStudentCount(
        enrollment.classroomId,
      );
    }

    // Incrementar contador del aula nueva
    await this.classroomsService.incrementStudentCount(dto.classroomId);

    enrollment.classroomId = dto.classroomId;
    const updated = await this.enrollmentRepository.save(enrollment);

    this.logger.log(
      `Aula asignada: Inscripción ${id} → Aula ${dto.classroomId}`,
    );
    return updated;
  }

  /**
   * Cambiar estado de una inscripción
   */
  async updateStatus(
    id: string,
    status: EnrollmentStatus,
  ): Promise<Enrollment> {
    const enrollment = await this.findById(id);
    const previousStatus = enrollment.status;

    enrollment.status = status;
    const updated = await this.enrollmentRepository.save(enrollment);

    this.logger.log(
      `Inscripción ${id} cambiada de ${previousStatus} a ${status}`,
    );
    return updated;
  }

  /**
   * Activar inscripción (después de pago completado)
   */
  async activate(
    id: string,
    options?: { skipPaymentCheck?: boolean },
  ): Promise<Enrollment> {
    const enrollment = await this.findById(id);

    if (
      !options?.skipPaymentCheck &&
      enrollment.paymentStatus !== PaymentStatus.COMPLETED &&
      enrollment.paymentStatus !== PaymentStatus.PARTIAL
    ) {
      throw new BadRequestException({
        code: ErrorCodes.PAYMENT_REQUIRED,
        message:
          'Se requiere al menos un pago parcial para activar la inscripción',
      });
    }

    enrollment.status = EnrollmentStatus.ACTIVE;
    const updated = await this.enrollmentRepository.save(enrollment);

    this.logger.log(`Inscripción activada: ${id}`);
    return updated;
  }

  /**
   * Cancelar inscripción
   */
  async cancel(id: string, reason?: string): Promise<Enrollment> {
    const enrollment = await this.findById(id);

    enrollment.status = EnrollmentStatus.CANCELLED;
    if (reason) {
      enrollment.notes = enrollment.notes
        ? `${enrollment.notes}\n[Cancelación]: ${reason}`
        : `[Cancelación]: ${reason}`;
    }

    const updated = await this.enrollmentRepository.save(enrollment);

    // Decrementar contadores
    await this.cohortsService.decrementStudentCount(enrollment.cohortId);
    if (enrollment.classroomId) {
      await this.classroomsService.decrementStudentCount(
        enrollment.classroomId,
      );
    }

    this.logger.log(`Inscripción cancelada: ${id}`);
    return updated;
  }

  /**
   * Emitir certificado
   */
  async issueCertificate(
    id: string,
    dto: EnrollmentIssueCertificateDto,
  ): Promise<Enrollment> {
    const enrollment = await this.findById(id);

    if (
      enrollment.status !== EnrollmentStatus.ACTIVE &&
      enrollment.status !== EnrollmentStatus.COMPLETED
    ) {
      throw new BadRequestException({
        code: ErrorCodes.VALIDATION_ERROR,
        message:
          'Solo se puede emitir certificado a inscripciones activas o completadas',
      });
    }

    enrollment.certificateUrl = dto.certificateUrl;
    enrollment.certificateIssuedAt = new Date();
    enrollment.status = EnrollmentStatus.COMPLETED;

    if (dto.notes) {
      enrollment.notes = enrollment.notes
        ? `${enrollment.notes}\n[Certificado]: ${dto.notes}`
        : `[Certificado]: ${dto.notes}`;
    }

    const updated = await this.enrollmentRepository.save(enrollment);

    this.logger.log(`Certificado emitido: Inscripción ${id}`);
    return updated;
  }

  /**
   * Registrar pago
   */
  async recordPayment(id: string, amount: number): Promise<Enrollment> {
    const enrollment = await this.findById(id);

    enrollment.totalPaid = Number(enrollment.totalPaid) + amount;

    // Obtener precio del curso
    const cohort = await this.cohortsService.findById(enrollment.cohortId);
    const coursePrice = cohort.customPrice || cohort.course?.regularPrice || 0;
    const finalPrice =
      Number(coursePrice) - Number(enrollment.discountApplied || 0);

    // Actualizar estado de pago
    if (enrollment.totalPaid >= finalPrice) {
      enrollment.paymentStatus = PaymentStatus.COMPLETED;
    } else if (enrollment.totalPaid > 0) {
      enrollment.paymentStatus = PaymentStatus.PARTIAL;
    }

    const updated = await this.enrollmentRepository.save(enrollment);

    this.logger.log(
      `Pago registrado: Inscripción ${id}, Monto: ${amount}, Total: ${updated.totalPaid}`,
    );
    return updated;
  }

  /**
   * Obtener estadísticas de inscripciones
   */
  async getStats(): Promise<{
    total: number;
    byStatus: Record<string, number>;
    byPaymentStatus: Record<string, number>;
    totalRevenue: number;
  }> {
    const total = await this.enrollmentRepository.count();

    const byStatusResult = await this.enrollmentRepository
      .createQueryBuilder('enrollment')
      .select('enrollment.status', 'status')
      .addSelect('COUNT(*)', 'count')
      .groupBy('enrollment.status')
      .getRawMany();

    const byStatus: Record<string, number> = {};
    byStatusResult.forEach((row) => {
      byStatus[row.status] = parseInt(row.count);
    });

    const byPaymentResult = await this.enrollmentRepository
      .createQueryBuilder('enrollment')
      .select('enrollment.paymentStatus', 'paymentStatus')
      .addSelect('COUNT(*)', 'count')
      .groupBy('enrollment.paymentStatus')
      .getRawMany();

    const byPaymentStatus: Record<string, number> = {};
    byPaymentResult.forEach((row) => {
      byPaymentStatus[row.paymentStatus] = parseInt(row.count);
    });

    const revenueResult = await this.enrollmentRepository
      .createQueryBuilder('enrollment')
      .select('SUM(enrollment.totalPaid)', 'total')
      .getRawOne();

    return {
      total,
      byStatus,
      byPaymentStatus,
      totalRevenue: parseFloat(revenueResult?.total || '0'),
    };
  }
}
