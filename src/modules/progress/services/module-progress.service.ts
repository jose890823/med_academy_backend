import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  ModuleProgress,
  ModuleProgressStatus,
} from '../entities/module-progress.entity';
import { EnrollmentProgressService } from './enrollment-progress.service';
import { ErrorCodes } from '../../../common/dto';
import {
  UpdateVideoProgressDto,
  MarkMaterialViewedDto,
  UpdateStudentNotesDto,
} from '../dto';

@Injectable()
export class ModuleProgressService {
  private readonly logger = new Logger(ModuleProgressService.name);

  constructor(
    @InjectRepository(ModuleProgress)
    private readonly moduleProgressRepository: Repository<ModuleProgress>,
    private readonly enrollmentProgressService: EnrollmentProgressService,
  ) {}

  /**
   * Crear o obtener progreso de módulo
   */
  async getOrCreate(
    enrollmentId: string,
    moduleId: string,
  ): Promise<ModuleProgress> {
    let progress = await this.moduleProgressRepository.findOne({
      where: { enrollmentId, moduleId },
    });

    if (!progress) {
      progress = this.moduleProgressRepository.create({
        enrollmentId,
        moduleId,
        status: ModuleProgressStatus.NOT_STARTED,
      });
      progress = await this.moduleProgressRepository.save(progress);
      this.logger.log(
        `Progreso de módulo creado: enrollment ${enrollmentId}, module ${moduleId}`,
      );
    }

    return progress;
  }

  /**
   * Obtener progreso de un módulo
   */
  async findByEnrollmentAndModule(
    enrollmentId: string,
    moduleId: string,
  ): Promise<ModuleProgress> {
    const progress = await this.moduleProgressRepository.findOne({
      where: { enrollmentId, moduleId },
      relations: ['module'],
    });

    if (!progress) {
      throw new NotFoundException({
        code: ErrorCodes.PROGRESS_NOT_FOUND,
        message: 'El progreso del módulo no fue encontrado',
      });
    }

    return progress;
  }

  /**
   * Obtener todos los progresos de módulos de un enrollment
   */
  async findAllByEnrollment(enrollmentId: string): Promise<ModuleProgress[]> {
    return this.moduleProgressRepository.find({
      where: { enrollmentId },
      relations: ['module'],
      order: { module: { order: 'ASC' } },
    });
  }

  /**
   * Registrar acceso al módulo
   */
  async recordAccess(
    enrollmentId: string,
    moduleId: string,
  ): Promise<ModuleProgress> {
    const progress = await this.getOrCreate(enrollmentId, moduleId);
    const now = new Date();

    // Si es el primer acceso
    if (!progress.startedAt) {
      progress.startedAt = now;
      progress.status = ModuleProgressStatus.IN_PROGRESS;
    }

    progress.lastAccessedAt = now;
    progress.accessCount += 1;

    // Registrar acceso en enrollment progress
    await this.enrollmentProgressService.recordAccess(
      enrollmentId,
      'module',
      moduleId,
    );

    return this.moduleProgressRepository.save(progress);
  }

  /**
   * Actualizar progreso de video
   */
  async updateVideoProgress(
    enrollmentId: string,
    dto: UpdateVideoProgressDto,
  ): Promise<ModuleProgress> {
    const progress = await this.getOrCreate(enrollmentId, dto.moduleId);

    // Actualizar posición
    progress.videoLastPosition = dto.currentPosition;

    // Actualizar duración si se proporciona
    if (dto.duration) {
      progress.videoDuration = dto.duration;
    }

    // Calcular porcentaje de video visto
    if (progress.videoDuration && progress.videoDuration > 0) {
      progress.videoProgress = Math.min(
        100,
        (dto.currentPosition / progress.videoDuration) * 100,
      );
    }

    // Marcar como visto completamente si aplica
    if (dto.videoCompleted || progress.videoProgress >= 95) {
      progress.videoWatched = true;
      progress.videoProgress = 100;
    }

    // Actualizar estado si no ha iniciado
    if (progress.status === ModuleProgressStatus.NOT_STARTED) {
      progress.status = ModuleProgressStatus.IN_PROGRESS;
      progress.startedAt = new Date();
    }

    progress.lastAccessedAt = new Date();

    const saved = await this.moduleProgressRepository.save(progress);

    // Verificar si el módulo está completado
    await this.checkAndMarkComplete(progress);

    return saved;
  }

  /**
   * Marcar material como visto
   */
  async markMaterialViewed(
    enrollmentId: string,
    dto: MarkMaterialViewedDto,
  ): Promise<ModuleProgress> {
    const progress = await this.getOrCreate(enrollmentId, dto.moduleId);

    // Inicializar array si no existe
    if (!progress.materialsViewed) {
      progress.materialsViewed = [];
    }

    // Agregar índice si no existe
    const indexStr = dto.materialIndex.toString();
    if (!progress.materialsViewed.includes(indexStr)) {
      progress.materialsViewed.push(indexStr);
    }

    // Actualizar estado si no ha iniciado
    if (progress.status === ModuleProgressStatus.NOT_STARTED) {
      progress.status = ModuleProgressStatus.IN_PROGRESS;
      progress.startedAt = new Date();
    }

    progress.lastAccessedAt = new Date();

    const saved = await this.moduleProgressRepository.save(progress);

    // Verificar si el módulo está completado
    await this.checkAndMarkComplete(progress);

    return saved;
  }

  /**
   * Actualizar notas del estudiante
   */
  async updateStudentNotes(
    enrollmentId: string,
    dto: UpdateStudentNotesDto,
  ): Promise<ModuleProgress> {
    const progress = await this.getOrCreate(enrollmentId, dto.moduleId);

    progress.studentNotes = dto.notes ?? null;
    progress.lastAccessedAt = new Date();

    return this.moduleProgressRepository.save(progress);
  }

  /**
   * Marcar módulo como completado manualmente
   */
  async markAsCompleted(
    enrollmentId: string,
    moduleId: string,
  ): Promise<ModuleProgress> {
    const progress = await this.getOrCreate(enrollmentId, moduleId);

    if (progress.status !== ModuleProgressStatus.COMPLETED) {
      progress.status = ModuleProgressStatus.COMPLETED;
      progress.completedAt = new Date();
      progress.videoWatched = true;
      progress.videoProgress = 100;

      await this.moduleProgressRepository.save(progress);

      // Incrementar contador en enrollment progress
      await this.enrollmentProgressService.incrementCompletedModules(
        enrollmentId,
      );

      this.logger.log(
        `Módulo ${moduleId} completado para enrollment ${enrollmentId}`,
      );
    }

    return progress;
  }

  /**
   * Agregar tiempo dedicado al módulo
   */
  async addTimeSpent(
    enrollmentId: string,
    moduleId: string,
    minutes: number,
  ): Promise<ModuleProgress> {
    const progress = await this.getOrCreate(enrollmentId, moduleId);

    progress.timeSpentMinutes += minutes;
    progress.lastAccessedAt = new Date();

    // También agregar al enrollment progress
    await this.enrollmentProgressService.addTimeSpent(enrollmentId, minutes);

    return this.moduleProgressRepository.save(progress);
  }

  /**
   * Verificar y marcar como completado si cumple criterios
   */
  private async checkAndMarkComplete(progress: ModuleProgress): Promise<void> {
    // Criterios para completar:
    // 1. Video visto completamente (o no hay video)
    // 2. Todos los materiales vistos (o no hay materiales)

    const videoComplete = progress.videoWatched || !progress.videoDuration;
    const materialsComplete =
      progress.totalMaterials === 0 ||
      (progress.materialsViewed?.length || 0) >= progress.totalMaterials;

    if (
      videoComplete &&
      materialsComplete &&
      progress.status !== ModuleProgressStatus.COMPLETED
    ) {
      progress.status = ModuleProgressStatus.COMPLETED;
      progress.completedAt = new Date();

      await this.moduleProgressRepository.save(progress);

      // Incrementar contador en enrollment progress
      await this.enrollmentProgressService.incrementCompletedModules(
        progress.enrollmentId,
      );

      this.logger.log(
        `Módulo ${progress.moduleId} auto-completado para enrollment ${progress.enrollmentId}`,
      );
    }
  }

  /**
   * Obtener resumen de progreso de módulos
   */
  async getModulesSummary(enrollmentId: string): Promise<{
    total: number;
    completed: number;
    inProgress: number;
    notStarted: number;
  }> {
    const modules = await this.findAllByEnrollment(enrollmentId);

    return {
      total: modules.length,
      completed: modules.filter(
        (m) => m.status === ModuleProgressStatus.COMPLETED,
      ).length,
      inProgress: modules.filter(
        (m) => m.status === ModuleProgressStatus.IN_PROGRESS,
      ).length,
      notStarted: modules.filter(
        (m) => m.status === ModuleProgressStatus.NOT_STARTED,
      ).length,
    };
  }

  /**
   * Obtener siguiente módulo a ver
   */
  async getNextModule(enrollmentId: string): Promise<ModuleProgress | null> {
    // Buscar módulo en progreso
    const inProgress = await this.moduleProgressRepository.findOne({
      where: { enrollmentId, status: ModuleProgressStatus.IN_PROGRESS },
      relations: ['module'],
      order: { module: { order: 'ASC' } },
    });

    if (inProgress) return inProgress;

    // Buscar primer módulo no iniciado
    const notStarted = await this.moduleProgressRepository.findOne({
      where: { enrollmentId, status: ModuleProgressStatus.NOT_STARTED },
      relations: ['module'],
      order: { module: { order: 'ASC' } },
    });

    return notStarted;
  }
}
