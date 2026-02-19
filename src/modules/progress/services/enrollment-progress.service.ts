import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  EnrollmentProgress,
  ProgressStatus,
} from '../entities/enrollment-progress.entity';
import {
  Enrollment,
  EnrollmentStatus,
} from '../../enrollments/entities/enrollment.entity';
import { ErrorCodes } from '../../../common/dto';

@Injectable()
export class EnrollmentProgressService {
  private readonly logger = new Logger(EnrollmentProgressService.name);

  constructor(
    @InjectRepository(EnrollmentProgress)
    private readonly progressRepository: Repository<EnrollmentProgress>,
  ) {}

  /**
   * Crear o obtener progreso de enrollment
   */
  async getOrCreate(enrollmentId: string): Promise<EnrollmentProgress> {
    let progress = await this.progressRepository.findOne({
      where: { enrollmentId },
    });

    if (!progress) {
      progress = this.progressRepository.create({
        enrollmentId,
        status: ProgressStatus.NOT_STARTED,
      });
      progress = await this.progressRepository.save(progress);
      this.logger.log(`Progreso creado para enrollment ${enrollmentId}`);
    }

    return progress;
  }

  /**
   * Obtener progreso por enrollment ID (auto-crea si no existe)
   */
  async findByEnrollmentId(enrollmentId: string): Promise<EnrollmentProgress> {
    let progress = await this.progressRepository.findOne({
      where: { enrollmentId },
      relations: [
        'enrollment',
        'enrollment.cohort',
        'enrollment.cohort.course',
      ],
    });

    if (!progress) {
      // Auto-crear progreso si no existe
      await this.getOrCreate(enrollmentId);
      // Recargar con relaciones
      progress = await this.progressRepository.findOne({
        where: { enrollmentId },
        relations: [
          'enrollment',
          'enrollment.cohort',
          'enrollment.cohort.course',
        ],
      });
    }

    return progress!;
  }

  /**
   * Obtener progreso por ID
   */
  async findById(id: string): Promise<EnrollmentProgress> {
    const progress = await this.progressRepository.findOne({
      where: { id },
      relations: [
        'enrollment',
        'enrollment.cohort',
        'enrollment.cohort.course',
      ],
    });

    if (!progress) {
      throw new NotFoundException({
        code: ErrorCodes.PROGRESS_NOT_FOUND,
        message: 'El progreso no fue encontrado',
      });
    }

    return progress;
  }

  /**
   * Inicializar contadores de módulos y evaluaciones
   */
  async initializeCounts(
    enrollmentId: string,
    totalModules: number,
    totalEvaluations: number,
  ): Promise<EnrollmentProgress> {
    const progress = await this.getOrCreate(enrollmentId);

    progress.totalModulesCount = totalModules;
    progress.totalEvaluationsCount = totalEvaluations;

    return this.progressRepository.save(progress);
  }

  /**
   * Registrar acceso al curso
   */
  async recordAccess(
    enrollmentId: string,
    contentType?: string,
    contentId?: string,
  ): Promise<EnrollmentProgress> {
    const progress = await this.getOrCreate(enrollmentId);
    const now = new Date();

    // Si es el primer acceso
    if (!progress.firstAccessedAt) {
      progress.firstAccessedAt = now;
      progress.status = ProgressStatus.IN_PROGRESS;
    }

    progress.lastAccessedAt = now;

    if (contentType && contentId) {
      progress.lastContentType = contentType;
      progress.lastContentId = contentId;
    }

    return this.progressRepository.save(progress);
  }

  /**
   * Incrementar módulos completados
   */
  async incrementCompletedModules(
    enrollmentId: string,
  ): Promise<EnrollmentProgress> {
    const progress = await this.getOrCreate(enrollmentId);

    progress.completedModulesCount += 1;
    await this.recalculatePercentage(progress);

    this.logger.log(
      `Módulo completado para enrollment ${enrollmentId}: ${progress.completedModulesCount}/${progress.totalModulesCount}`,
    );

    return this.progressRepository.save(progress);
  }

  /**
   * Incrementar evaluaciones aprobadas
   */
  async incrementPassedEvaluations(
    enrollmentId: string,
  ): Promise<EnrollmentProgress> {
    const progress = await this.getOrCreate(enrollmentId);

    progress.passedEvaluationsCount += 1;
    await this.recalculatePercentage(progress);

    this.logger.log(
      `Evaluación aprobada para enrollment ${enrollmentId}: ${progress.passedEvaluationsCount}/${progress.totalEvaluationsCount}`,
    );

    return this.progressRepository.save(progress);
  }

  /**
   * Actualizar promedio de calificaciones
   */
  async updateAverageScore(
    enrollmentId: string,
    averageScore: number,
  ): Promise<EnrollmentProgress> {
    const progress = await this.getOrCreate(enrollmentId);
    progress.averageScore = averageScore;
    return this.progressRepository.save(progress);
  }

  /**
   * Agregar tiempo dedicado
   */
  async addTimeSpent(
    enrollmentId: string,
    minutes: number,
  ): Promise<EnrollmentProgress> {
    const progress = await this.getOrCreate(enrollmentId);
    progress.totalTimeSpentMinutes += minutes;
    return this.progressRepository.save(progress);
  }

  /**
   * Marcar como completado
   */
  async markAsCompleted(enrollmentId: string): Promise<EnrollmentProgress> {
    const progress = await this.getOrCreate(enrollmentId);

    progress.status = ProgressStatus.COMPLETED;
    progress.completedAt = new Date();
    progress.overallPercentage = 100;

    this.logger.log(`Curso completado para enrollment ${enrollmentId}`);

    return this.progressRepository.save(progress);
  }

  /**
   * Recalcular porcentaje de progreso
   */
  private async recalculatePercentage(
    progress: EnrollmentProgress,
  ): Promise<void> {
    // Peso: 60% módulos, 40% evaluaciones
    const modulesWeight = 0.6;
    const evaluationsWeight = 0.4;

    const modulesPercentage =
      progress.totalModulesCount > 0
        ? (progress.completedModulesCount / progress.totalModulesCount) * 100
        : 0;

    const evaluationsPercentage =
      progress.totalEvaluationsCount > 0
        ? (progress.passedEvaluationsCount / progress.totalEvaluationsCount) *
          100
        : 0;

    // Si no hay evaluaciones, todo el peso va a módulos
    if (progress.totalEvaluationsCount === 0) {
      progress.overallPercentage = modulesPercentage;
    } else {
      progress.overallPercentage =
        modulesPercentage * modulesWeight +
        evaluationsPercentage * evaluationsWeight;
    }

    // Verificar si está completado
    if (
      progress.completedModulesCount >= progress.totalModulesCount &&
      progress.passedEvaluationsCount >= progress.totalEvaluationsCount &&
      progress.totalModulesCount > 0
    ) {
      progress.status = ProgressStatus.COMPLETED;
      progress.completedAt = new Date();
    }
  }

  /**
   * Obtener estadísticas de un estudiante
   */
  async getStudentStats(studentId: string): Promise<{
    enrolledCourses: number;
    completedCourses: number;
    inProgressCourses: number;
    certificates: number;
    averageScore: number;
    totalStudyHours: number;
  }> {
    const enrollmentRepo =
      this.progressRepository.manager.getRepository(Enrollment);

    const stats = await enrollmentRepo
      .createQueryBuilder('enrollment')
      .leftJoin('enrollment.progress', 'progress')
      .where('enrollment.studentId = :studentId', { studentId })
      .andWhere('enrollment.status IN (:...statuses)', {
        statuses: [EnrollmentStatus.ACTIVE, EnrollmentStatus.COMPLETED],
      })
      .select([
        'COUNT(enrollment.id) as "totalEnrollments"',
        'SUM(CASE WHEN progress.status = :completed THEN 1 ELSE 0 END) as "completedCourses"',
        'SUM(CASE WHEN progress.status = :inProgress THEN 1 ELSE 0 END) as "inProgressCourses"',
        'SUM(CASE WHEN enrollment."certificateIssuedAt" IS NOT NULL THEN 1 ELSE 0 END) as "certificates"',
        'COALESCE(SUM(progress.totalTimeSpentMinutes), 0) as "totalTimeSpent"',
        'AVG(progress.averageScore) as "averageScore"',
      ])
      .setParameters({
        completed: ProgressStatus.COMPLETED,
        inProgress: ProgressStatus.IN_PROGRESS,
      })
      .getRawOne();

    const totalMinutes = parseInt(stats?.totalTimeSpent || '0');

    return {
      enrolledCourses: parseInt(stats?.totalEnrollments || '0'),
      completedCourses: parseInt(stats?.completedCourses || '0'),
      inProgressCourses: parseInt(stats?.inProgressCourses || '0'),
      certificates: parseInt(stats?.certificates || '0'),
      averageScore: parseFloat(
        parseFloat(stats?.averageScore || '0').toFixed(1),
      ),
      totalStudyHours: parseFloat((totalMinutes / 60).toFixed(1)),
    };
  }

  /**
   * Obtener cursos recientes de un estudiante
   */
  async getRecentCourses(
    studentId: string,
    limit = 5,
  ): Promise<
    {
      enrollmentId: string;
      courseTitle: string;
      cohortName: string;
      progress: number;
      lastAccessedAt: Date | null;
      thumbnailUrl: string | null;
    }[]
  > {
    const enrollmentRepo =
      this.progressRepository.manager.getRepository(Enrollment);

    const enrollments = await enrollmentRepo
      .createQueryBuilder('enrollment')
      .leftJoinAndSelect('enrollment.progress', 'progress')
      .innerJoinAndSelect('enrollment.cohort', 'cohort')
      .innerJoinAndSelect('cohort.course', 'course')
      .where('enrollment.studentId = :studentId', { studentId })
      .andWhere('enrollment.status IN (:...statuses)', {
        statuses: [EnrollmentStatus.ACTIVE, EnrollmentStatus.COMPLETED],
      })
      .orderBy('progress.lastAccessedAt', 'DESC', 'NULLS LAST')
      .addOrderBy('enrollment.createdAt', 'DESC')
      .take(limit)
      .getMany();

    return enrollments.map((e) => ({
      enrollmentId: e.id,
      courseTitle: e.cohort?.course?.title || '',
      cohortName: e.cohort?.name || '',
      progress: parseFloat(String(e.progress?.overallPercentage || 0)),
      lastAccessedAt: e.progress?.lastAccessedAt || null,
      thumbnailUrl: e.cohort?.course?.thumbnail || null,
    }));
  }
}
