import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';
import {
  Achievement,
  AchievementType,
  AchievementCategory,
} from '../entities/achievement.entity';
import { ErrorCodes } from '../../../common/dto';

/**
 * Configuración de logros por tipo
 */
const ACHIEVEMENT_CONFIG: Record<
  AchievementType,
  {
    title: string;
    description: string;
    category: AchievementCategory;
    points: number;
    level: string;
  }
> = {
  [AchievementType.FIRST_MODULE_COMPLETED]: {
    title: 'Primer Paso',
    description: 'Completaste tu primer módulo',
    category: AchievementCategory.PROGRESS,
    points: 10,
    level: 'bronze',
  },
  [AchievementType.HALF_COURSE_COMPLETED]: {
    title: 'A Medio Camino',
    description: 'Completaste el 50% del curso',
    category: AchievementCategory.PROGRESS,
    points: 50,
    level: 'silver',
  },
  [AchievementType.COURSE_COMPLETED]: {
    title: 'Curso Completado',
    description: 'Completaste el curso exitosamente',
    category: AchievementCategory.PROGRESS,
    points: 100,
    level: 'gold',
  },
  [AchievementType.FIRST_EVALUATION_PASSED]: {
    title: 'Primera Evaluación',
    description: 'Aprobaste tu primera evaluación',
    category: AchievementCategory.EVALUATION,
    points: 20,
    level: 'bronze',
  },
  [AchievementType.ALL_EVALUATIONS_PASSED]: {
    title: 'Evaluaciones Completas',
    description: 'Aprobaste todas las evaluaciones del curso',
    category: AchievementCategory.EVALUATION,
    points: 75,
    level: 'gold',
  },
  [AchievementType.PERFECT_SCORE]: {
    title: 'Puntaje Perfecto',
    description: 'Obtuviste 100% en una evaluación',
    category: AchievementCategory.EVALUATION,
    points: 50,
    level: 'platinum',
  },
  [AchievementType.HIGH_ACHIEVER]: {
    title: 'Alto Rendimiento',
    description: 'Mantuviste un promedio superior al 90%',
    category: AchievementCategory.EVALUATION,
    points: 75,
    level: 'gold',
  },
  [AchievementType.EARLY_BIRD]: {
    title: 'Madrugador',
    description: 'Completaste el curso antes de la fecha límite',
    category: AchievementCategory.ENGAGEMENT,
    points: 30,
    level: 'silver',
  },
  [AchievementType.CONSISTENT_LEARNER]: {
    title: 'Estudiante Constante',
    description: 'Accediste al curso regularmente durante 7 días seguidos',
    category: AchievementCategory.ENGAGEMENT,
    points: 25,
    level: 'bronze',
  },
  [AchievementType.FAST_LEARNER]: {
    title: 'Aprendizaje Rápido',
    description: 'Completaste un módulo en una sola sesión',
    category: AchievementCategory.ENGAGEMENT,
    points: 15,
    level: 'bronze',
  },
  [AchievementType.CERTIFICATE_EARNED]: {
    title: 'Certificado Obtenido',
    description: 'Obtuviste tu certificado de finalización',
    category: AchievementCategory.CERTIFICATION,
    points: 150,
    level: 'platinum',
  },
  [AchievementType.CUSTOM]: {
    title: 'Logro Especial',
    description: 'Has obtenido un logro especial',
    category: AchievementCategory.SPECIAL,
    points: 25,
    level: 'silver',
  },
};

@Injectable()
export class AchievementsService {
  private readonly logger = new Logger(AchievementsService.name);

  constructor(
    @InjectRepository(Achievement)
    private readonly achievementRepository: Repository<Achievement>,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  /**
   * Otorgar un logro a un usuario
   */
  async grantAchievement(
    userId: string,
    type: AchievementType,
    enrollmentId?: string,
    metadata?: Record<string, any>,
  ): Promise<Achievement | null> {
    // Verificar si ya tiene este logro (para el mismo enrollment si aplica)
    const existing = await this.achievementRepository.findOne({
      where: {
        userId,
        type,
        ...(enrollmentId ? { enrollmentId } : {}),
      },
    });

    if (existing) {
      this.logger.debug(`Usuario ${userId} ya tiene logro ${type}`);
      return null;
    }

    const config = ACHIEVEMENT_CONFIG[type];

    const achievement = this.achievementRepository.create({
      userId,
      type,
      enrollmentId: enrollmentId || null,
      category: config.category,
      title: config.title,
      description: config.description,
      points: config.points,
      level: config.level,
      metadata: metadata || null,
      earnedAt: new Date(),
    });

    const saved = await this.achievementRepository.save(achievement);

    this.logger.log(`Logro otorgado: ${type} a usuario ${userId}`);

    // Emitir evento
    this.eventEmitter.emit('achievement.earned', {
      achievement: saved,
      userId,
    });

    return saved;
  }

  /**
   * Otorgar logro personalizado
   */
  async grantCustomAchievement(
    userId: string,
    title: string,
    description: string,
    options?: {
      enrollmentId?: string;
      points?: number;
      level?: string;
      iconUrl?: string;
      metadata?: Record<string, any>;
    },
  ): Promise<Achievement> {
    const achievement = this.achievementRepository.create({
      userId,
      type: AchievementType.CUSTOM,
      category: AchievementCategory.SPECIAL,
      title,
      description,
      enrollmentId: options?.enrollmentId || null,
      points: options?.points || 25,
      level: options?.level || 'silver',
      iconUrl: options?.iconUrl || null,
      metadata: options?.metadata || null,
      earnedAt: new Date(),
    });

    const saved = await this.achievementRepository.save(achievement);

    this.logger.log(
      `Logro personalizado otorgado: ${title} a usuario ${userId}`,
    );

    this.eventEmitter.emit('achievement.earned', {
      achievement: saved,
      userId,
    });

    return saved;
  }

  /**
   * Obtener todos los logros de un usuario
   */
  async findByUserId(userId: string): Promise<Achievement[]> {
    return this.achievementRepository.find({
      where: { userId, isVisible: true },
      order: { earnedAt: 'DESC' },
    });
  }

  /**
   * Obtener logros de un enrollment específico
   */
  async findByEnrollment(enrollmentId: string): Promise<Achievement[]> {
    return this.achievementRepository.find({
      where: { enrollmentId, isVisible: true },
      order: { earnedAt: 'DESC' },
    });
  }

  /**
   * Obtener logro por ID
   */
  async findById(id: string): Promise<Achievement> {
    const achievement = await this.achievementRepository.findOne({
      where: { id },
    });

    if (!achievement) {
      throw new NotFoundException({
        code: ErrorCodes.ACHIEVEMENT_NOT_FOUND,
        message: 'El logro no fue encontrado',
      });
    }

    return achievement;
  }

  /**
   * Obtener logros nuevos (no vistos)
   */
  async getUnseenAchievements(userId: string): Promise<Achievement[]> {
    return this.achievementRepository.find({
      where: { userId, notificationSeen: false, isVisible: true },
      order: { earnedAt: 'DESC' },
    });
  }

  /**
   * Marcar logros como vistos
   */
  async markAsSeen(achievementIds: string[]): Promise<void> {
    await this.achievementRepository.update(achievementIds, {
      notificationSeen: true,
    });
  }

  /**
   * Obtener puntos totales de un usuario
   */
  async getTotalPoints(userId: string): Promise<number> {
    const result = await this.achievementRepository
      .createQueryBuilder('achievement')
      .where('achievement.userId = :userId', { userId })
      .select('SUM(achievement.points)', 'total')
      .getRawOne();

    return parseInt(result?.total || '0');
  }

  /**
   * Obtener estadísticas de logros de un usuario
   */
  async getUserAchievementStats(userId: string): Promise<{
    totalAchievements: number;
    totalPoints: number;
    byCategory: Record<string, number>;
    byLevel: Record<string, number>;
    recentAchievements: Achievement[];
  }> {
    const achievements = await this.findByUserId(userId);

    const byCategory: Record<string, number> = {};
    const byLevel: Record<string, number> = {};
    let totalPoints = 0;

    achievements.forEach((a) => {
      totalPoints += a.points;
      byCategory[a.category] = (byCategory[a.category] || 0) + 1;
      if (a.level) {
        byLevel[a.level] = (byLevel[a.level] || 0) + 1;
      }
    });

    return {
      totalAchievements: achievements.length,
      totalPoints,
      byCategory,
      byLevel,
      recentAchievements: achievements.slice(0, 5),
    };
  }

  /**
   * Verificar y otorgar logros de progreso
   */
  async checkProgressAchievements(
    userId: string,
    enrollmentId: string,
    completedModules: number,
    totalModules: number,
  ): Promise<Achievement[]> {
    const achievements: Achievement[] = [];

    // Primer módulo completado
    if (completedModules === 1) {
      const achievement = await this.grantAchievement(
        userId,
        AchievementType.FIRST_MODULE_COMPLETED,
        enrollmentId,
      );
      if (achievement) achievements.push(achievement);
    }

    // Mitad del curso
    if (totalModules > 1 && completedModules === Math.ceil(totalModules / 2)) {
      const achievement = await this.grantAchievement(
        userId,
        AchievementType.HALF_COURSE_COMPLETED,
        enrollmentId,
      );
      if (achievement) achievements.push(achievement);
    }

    // Curso completado
    if (completedModules >= totalModules && totalModules > 0) {
      const achievement = await this.grantAchievement(
        userId,
        AchievementType.COURSE_COMPLETED,
        enrollmentId,
      );
      if (achievement) achievements.push(achievement);
    }

    return achievements;
  }

  /**
   * Verificar y otorgar logros de evaluación
   */
  async checkEvaluationAchievements(
    userId: string,
    enrollmentId: string,
    score: number,
    isPerfect: boolean,
    passedCount: number,
    totalEvaluations: number,
  ): Promise<Achievement[]> {
    const achievements: Achievement[] = [];

    // Primera evaluación aprobada
    if (passedCount === 1) {
      const achievement = await this.grantAchievement(
        userId,
        AchievementType.FIRST_EVALUATION_PASSED,
        enrollmentId,
      );
      if (achievement) achievements.push(achievement);
    }

    // Puntaje perfecto
    if (isPerfect) {
      const achievement = await this.grantAchievement(
        userId,
        AchievementType.PERFECT_SCORE,
        enrollmentId,
        { score },
      );
      if (achievement) achievements.push(achievement);
    }

    // Todas las evaluaciones aprobadas
    if (passedCount >= totalEvaluations && totalEvaluations > 0) {
      const achievement = await this.grantAchievement(
        userId,
        AchievementType.ALL_EVALUATIONS_PASSED,
        enrollmentId,
      );
      if (achievement) achievements.push(achievement);
    }

    return achievements;
  }
}
