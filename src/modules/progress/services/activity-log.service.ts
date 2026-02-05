import {
  Injectable,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import {
  ActivityLog,
  ActivityType,
  EntityType,
} from '../entities/activity-log.entity';
import { LogActivityDto } from '../dto';

@Injectable()
export class ActivityLogService {
  private readonly logger = new Logger(ActivityLogService.name);

  constructor(
    @InjectRepository(ActivityLog)
    private readonly activityLogRepository: Repository<ActivityLog>,
  ) {}

  /**
   * Registrar una actividad
   */
  async logActivity(
    userId: string,
    dto: LogActivityDto,
    context?: {
      ipAddress?: string;
      userAgent?: string;
      deviceType?: string;
    },
  ): Promise<ActivityLog> {
    const activity = this.activityLogRepository.create({
      userId,
      enrollmentId: dto.enrollmentId || null,
      activityType: dto.activityType,
      entityType: dto.entityType,
      entityId: dto.entityId,
      metadata: dto.metadata || null,
      ipAddress: context?.ipAddress || null,
      userAgent: context?.userAgent || null,
      deviceType: context?.deviceType || null,
    });

    return this.activityLogRepository.save(activity);
  }

  /**
   * Registrar actividad de video
   */
  async logVideoActivity(
    userId: string,
    enrollmentId: string,
    moduleId: string,
    activityType: ActivityType,
    metadata?: Record<string, any>,
  ): Promise<ActivityLog> {
    return this.logActivity(userId, {
      enrollmentId,
      activityType,
      entityType: EntityType.VIDEO,
      entityId: moduleId,
      metadata,
    });
  }

  /**
   * Registrar acceso a módulo
   */
  async logModuleAccess(
    userId: string,
    enrollmentId: string,
    moduleId: string,
    metadata?: Record<string, any>,
  ): Promise<ActivityLog> {
    return this.logActivity(userId, {
      enrollmentId,
      activityType: ActivityType.MODULE_ACCESSED,
      entityType: EntityType.MODULE,
      entityId: moduleId,
      metadata,
    });
  }

  /**
   * Registrar completitud de módulo
   */
  async logModuleCompleted(
    userId: string,
    enrollmentId: string,
    moduleId: string,
    metadata?: Record<string, any>,
  ): Promise<ActivityLog> {
    return this.logActivity(userId, {
      enrollmentId,
      activityType: ActivityType.MODULE_COMPLETED,
      entityType: EntityType.MODULE,
      entityId: moduleId,
      metadata,
    });
  }

  /**
   * Registrar descarga de material
   */
  async logMaterialDownload(
    userId: string,
    enrollmentId: string,
    moduleId: string,
    materialIndex: number,
    metadata?: Record<string, any>,
  ): Promise<ActivityLog> {
    return this.logActivity(userId, {
      enrollmentId,
      activityType: ActivityType.MATERIAL_DOWNLOADED,
      entityType: EntityType.MATERIAL,
      entityId: moduleId,
      metadata: { materialIndex, ...metadata },
    });
  }

  /**
   * Obtener actividades de un usuario
   */
  async findByUserId(
    userId: string,
    options?: {
      limit?: number;
      offset?: number;
      activityType?: ActivityType;
      startDate?: Date;
      endDate?: Date;
    },
  ): Promise<ActivityLog[]> {
    const query = this.activityLogRepository
      .createQueryBuilder('activity')
      .where('activity.userId = :userId', { userId });

    if (options?.activityType) {
      query.andWhere('activity.activityType = :activityType', {
        activityType: options.activityType,
      });
    }

    if (options?.startDate && options?.endDate) {
      query.andWhere('activity.createdAt BETWEEN :startDate AND :endDate', {
        startDate: options.startDate,
        endDate: options.endDate,
      });
    }

    query.orderBy('activity.createdAt', 'DESC');

    if (options?.limit) {
      query.take(options.limit);
    }

    if (options?.offset) {
      query.skip(options.offset);
    }

    return query.getMany();
  }

  /**
   * Obtener actividades de un enrollment
   */
  async findByEnrollment(
    enrollmentId: string,
    options?: {
      limit?: number;
      activityTypes?: ActivityType[];
    },
  ): Promise<ActivityLog[]> {
    const query = this.activityLogRepository
      .createQueryBuilder('activity')
      .where('activity.enrollmentId = :enrollmentId', { enrollmentId });

    if (options?.activityTypes?.length) {
      query.andWhere('activity.activityType IN (:...types)', {
        types: options.activityTypes,
      });
    }

    query.orderBy('activity.createdAt', 'DESC');

    if (options?.limit) {
      query.take(options.limit);
    }

    return query.getMany();
  }

  /**
   * Obtener resumen de actividades por día
   */
  async getDailyActivitySummary(
    userId: string,
    days = 30,
  ): Promise<{ date: string; count: number }[]> {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const result = await this.activityLogRepository
      .createQueryBuilder('activity')
      .where('activity.userId = :userId', { userId })
      .andWhere('activity.createdAt >= :startDate', { startDate })
      .select("DATE(activity.createdAt) as date")
      .addSelect('COUNT(*) as count')
      .groupBy('DATE(activity.createdAt)')
      .orderBy('date', 'ASC')
      .getRawMany();

    return result.map((r) => ({
      date: r.date,
      count: parseInt(r.count),
    }));
  }

  /**
   * Obtener estadísticas de actividad
   */
  async getActivityStats(
    userId: string,
    enrollmentId?: string,
  ): Promise<{
    totalActivities: number;
    videosWatched: number;
    modulesAccessed: number;
    materialsDownloaded: number;
    evaluationsSubmitted: number;
  }> {
    const query = this.activityLogRepository
      .createQueryBuilder('activity')
      .where('activity.userId = :userId', { userId });

    if (enrollmentId) {
      query.andWhere('activity.enrollmentId = :enrollmentId', { enrollmentId });
    }

    query.select([
      'COUNT(*) as "totalActivities"',
      `SUM(CASE WHEN activity.activityType = '${ActivityType.VIDEO_COMPLETED}' THEN 1 ELSE 0 END) as "videosWatched"`,
      `SUM(CASE WHEN activity.activityType = '${ActivityType.MODULE_ACCESSED}' THEN 1 ELSE 0 END) as "modulesAccessed"`,
      `SUM(CASE WHEN activity.activityType = '${ActivityType.MATERIAL_DOWNLOADED}' THEN 1 ELSE 0 END) as "materialsDownloaded"`,
      `SUM(CASE WHEN activity.activityType = '${ActivityType.EVALUATION_SUBMITTED}' THEN 1 ELSE 0 END) as "evaluationsSubmitted"`,
    ]);

    const result = await query.getRawOne();

    return {
      totalActivities: parseInt(result?.totalActivities || '0'),
      videosWatched: parseInt(result?.videosWatched || '0'),
      modulesAccessed: parseInt(result?.modulesAccessed || '0'),
      materialsDownloaded: parseInt(result?.materialsDownloaded || '0'),
      evaluationsSubmitted: parseInt(result?.evaluationsSubmitted || '0'),
    };
  }

  /**
   * Verificar si el usuario ha accedido recientemente
   */
  async hasRecentActivity(
    userId: string,
    enrollmentId: string,
    withinMinutes = 30,
  ): Promise<boolean> {
    const cutoffTime = new Date();
    cutoffTime.setMinutes(cutoffTime.getMinutes() - withinMinutes);

    const count = await this.activityLogRepository.count({
      where: {
        userId,
        enrollmentId,
        createdAt: Between(cutoffTime, new Date()),
      },
    });

    return count > 0;
  }

  /**
   * Limpiar actividades antiguas (para mantenimiento)
   */
  async cleanupOldActivities(olderThanDays = 365): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);

    const result = await this.activityLogRepository
      .createQueryBuilder()
      .delete()
      .where('createdAt < :cutoffDate', { cutoffDate })
      .execute();

    this.logger.log(`Limpiadas ${result.affected} actividades antiguas`);

    return result.affected || 0;
  }
}
