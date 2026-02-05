import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  EnrollmentProgress,
  ProgressStatus,
} from '../entities/enrollment-progress.entity';
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
   * Obtener progreso por enrollment ID
   */
  async findByEnrollmentId(enrollmentId: string): Promise<EnrollmentProgress> {
    const progress = await this.progressRepository.findOne({
      where: { enrollmentId },
      relations: [
        'enrollment',
        'enrollment.cohort',
        'enrollment.cohort.course',
      ],
    });

    if (!progress) {
      throw new NotFoundException({
        code: ErrorCodes.PROGRESS_NOT_FOUND,
        message: 'El progreso de inscripción no fue encontrado',
      });
    }

    return progress;
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
    totalEnrollments: number;
    completedCourses: number;
    inProgressCourses: number;
    totalTimeSpent: number;
    averageProgress: number;
  }> {
    const stats = await this.progressRepository
      .createQueryBuilder('progress')
      .innerJoin('progress.enrollment', 'enrollment')
      .where('enrollment.studentId = :studentId', { studentId })
      .select([
        'COUNT(progress.id) as "totalEnrollments"',
        'SUM(CASE WHEN progress.status = :completed THEN 1 ELSE 0 END) as "completedCourses"',
        'SUM(CASE WHEN progress.status = :inProgress THEN 1 ELSE 0 END) as "inProgressCourses"',
        'SUM(progress.totalTimeSpentMinutes) as "totalTimeSpent"',
        'AVG(progress.overallPercentage) as "averageProgress"',
      ])
      .setParameters({
        completed: ProgressStatus.COMPLETED,
        inProgress: ProgressStatus.IN_PROGRESS,
      })
      .getRawOne();

    return {
      totalEnrollments: parseInt(stats?.totalEnrollments || '0'),
      completedCourses: parseInt(stats?.completedCourses || '0'),
      inProgressCourses: parseInt(stats?.inProgressCourses || '0'),
      totalTimeSpent: parseInt(stats?.totalTimeSpent || '0'),
      averageProgress: parseFloat(stats?.averageProgress || '0'),
    };
  }

  /**
   * Obtener cursos recientes de un estudiante
   */
  async getRecentCourses(
    studentId: string,
    limit = 5,
  ): Promise<EnrollmentProgress[]> {
    return this.progressRepository.find({
      where: {
        enrollment: { studentId },
      },
      relations: [
        'enrollment',
        'enrollment.cohort',
        'enrollment.cohort.course',
      ],
      order: { lastAccessedAt: 'DESC' },
      take: limit,
    });
  }
}
