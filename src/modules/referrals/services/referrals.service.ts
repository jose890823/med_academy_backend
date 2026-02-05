import {
  Injectable,
  Logger,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';
import {
  Referral,
  ReferralStatus,
  RewardType,
} from '../entities/referral.entity';
import { ReferralCodesService } from './referral-codes.service';
import {
  ApplyReferralCodeDto,
  CompleteReferralDto,
  UpdateReferralStatusDto,
  MarkRewardDeliveredDto,
  ReferralQueryDto,
} from '../dto';
import { ErrorCodes } from '../../../common/dto';

@Injectable()
export class ReferralsService {
  private readonly logger = new Logger(ReferralsService.name);

  // Configuración por defecto (en un sistema real, esto vendría de la BD)
  private readonly DEFAULT_EXPIRATION_DAYS = 30;

  constructor(
    @InjectRepository(Referral)
    private readonly referralRepository: Repository<Referral>,
    private readonly referralCodesService: ReferralCodesService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  // ============================================
  // OPERACIONES DE LECTURA
  // ============================================

  /**
   * Obtener todos los referidos con paginación
   */
  async findAll(query: ReferralQueryDto) {
    const {
      page = 1,
      limit = 20,
      referrerId,
      referredId,
      status,
      referralCodeId,
    } = query;
    const skip = (page - 1) * limit;

    const queryBuilder = this.referralRepository
      .createQueryBuilder('referral')
      .leftJoinAndSelect('referral.referrer', 'referrer')
      .leftJoinAndSelect('referral.referred', 'referred')
      .leftJoinAndSelect('referral.referralCode', 'code')
      .orderBy('referral.createdAt', 'DESC');

    if (referrerId) {
      queryBuilder.andWhere('referral.referrerId = :referrerId', {
        referrerId,
      });
    }

    if (referredId) {
      queryBuilder.andWhere('referral.referredId = :referredId', {
        referredId,
      });
    }

    if (status) {
      queryBuilder.andWhere('referral.status = :status', { status });
    }

    if (referralCodeId) {
      queryBuilder.andWhere('referral.referralCodeId = :referralCodeId', {
        referralCodeId,
      });
    }

    const [data, total] = await queryBuilder
      .skip(skip)
      .take(limit)
      .getManyAndCount();

    return {
      data,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasNextPage: page * limit < total,
        hasPrevPage: page > 1,
      },
    };
  }

  /**
   * Obtener referido por ID
   */
  async findById(id: string): Promise<Referral> {
    const referral = await this.referralRepository.findOne({
      where: { id },
      relations: ['referrer', 'referred', 'referralCode'],
    });

    if (!referral) {
      throw new NotFoundException({
        code: ErrorCodes.NOT_FOUND,
        message: 'Referido no encontrado',
      });
    }

    return referral;
  }

  /**
   * Obtener referidos de un usuario (como referidor)
   */
  async findByReferrer(referrerId: string): Promise<Referral[]> {
    return this.referralRepository.find({
      where: { referrerId },
      relations: ['referred', 'referralCode'],
      order: { createdAt: 'DESC' },
    });
  }

  /**
   * Verificar si un usuario ya fue referido
   */
  async wasUserReferred(userId: string): Promise<boolean> {
    const referral = await this.referralRepository.findOne({
      where: { referredId: userId },
    });
    return !!referral;
  }

  /**
   * Obtener estadísticas de referidos de un usuario
   */
  async getUserStats(userId: string) {
    const referrals = await this.findByReferrer(userId);

    const stats = {
      totalReferrals: referrals.length,
      pendingReferrals: 0,
      completedReferrals: 0,
      rewardedReferrals: 0,
      totalEarnings: 0,
      pendingEarnings: 0,
    };

    for (const ref of referrals) {
      switch (ref.status) {
        case ReferralStatus.PENDING:
          stats.pendingReferrals++;
          break;
        case ReferralStatus.COMPLETED:
          stats.completedReferrals++;
          stats.pendingEarnings += Number(ref.referrerRewardValue);
          break;
        case ReferralStatus.REWARDED:
          stats.rewardedReferrals++;
          stats.totalEarnings += Number(ref.referrerRewardValue);
          break;
      }
    }

    return stats;
  }

  // ============================================
  // OPERACIONES DE ESCRITURA
  // ============================================

  /**
   * Aplicar código de referido (crear nuevo referido)
   */
  async applyReferralCode(dto: ApplyReferralCodeDto): Promise<Referral> {
    const { code, referredUserId } = dto;

    // Validar que el usuario no haya sido referido antes
    const wasReferred = await this.wasUserReferred(referredUserId);
    if (wasReferred) {
      throw new ConflictException({
        code: ErrorCodes.REFERRAL_ALREADY_USED,
        message: 'Este usuario ya fue referido anteriormente',
      });
    }

    // Validar el código
    const validation = await this.referralCodesService.validateCode(
      code,
      referredUserId,
    );
    if (!validation.valid || !validation.code) {
      throw new BadRequestException({
        code: ErrorCodes.REFERRAL_CODE_INVALID,
        message: validation.error || 'Código inválido',
      });
    }

    const referralCode = validation.code;

    // Verificar que no sea auto-referido
    if (referralCode.userId === referredUserId) {
      throw new BadRequestException({
        code: ErrorCodes.REFERRAL_SELF_REFERRAL,
        message: 'No puedes usar tu propio código de referido',
      });
    }

    // Crear el referido
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + this.DEFAULT_EXPIRATION_DAYS);

    const referral = this.referralRepository.create({
      referrerId: referralCode.userId,
      referredId: referredUserId,
      referralCodeId: referralCode.id,
      codeUsed: referralCode.code,
      status: ReferralStatus.PENDING,
      referredRewardType: RewardType.DISCOUNT_PERCENT,
      referredRewardValue: referralCode.referredDiscountPercent,
      referrerRewardType: RewardType.CREDIT,
      referrerRewardValue: referralCode.referrerRewardAmount,
      expiresAt,
    });

    const saved = await this.referralRepository.save(referral);

    // Incrementar contador de uso del código
    await this.referralCodesService.incrementUsage(referralCode.id);

    this.logger.log(
      `Referido creado: ${referredUserId} referido por ${referralCode.userId} con código ${referralCode.code}`,
    );

    // Emitir evento
    this.eventEmitter.emit('referral.created', {
      referralId: saved.id,
      referrerId: saved.referrerId,
      referredId: saved.referredId,
      code: referralCode.code,
    });

    return saved;
  }

  /**
   * Completar un referido (cuando el referido hace su primera compra)
   */
  async completeReferral(dto: CompleteReferralDto): Promise<Referral> {
    const referral = await this.findById(dto.referralId);

    if (referral.status !== ReferralStatus.PENDING) {
      throw new BadRequestException({
        code: ErrorCodes.VALIDATION_ERROR,
        message: `El referido no puede ser completado (estado actual: ${referral.status})`,
      });
    }

    if (referral.isExpired) {
      // Marcar como expirado
      referral.status = ReferralStatus.EXPIRED;
      await this.referralRepository.save(referral);

      throw new BadRequestException({
        code: ErrorCodes.VALIDATION_ERROR,
        message: 'El referido ha expirado',
      });
    }

    referral.status = ReferralStatus.COMPLETED;
    referral.completedAt = new Date();
    referral.completingEnrollmentId = dto.enrollmentId || null;

    if (dto.notes) {
      referral.notes = dto.notes;
    }

    const saved = await this.referralRepository.save(referral);

    this.logger.log(`Referido completado: ${referral.id}`);

    // Emitir evento
    this.eventEmitter.emit('referral.completed', {
      referralId: saved.id,
      referrerId: saved.referrerId,
      referredId: saved.referredId,
      referrerRewardValue: saved.referrerRewardValue,
    });

    return saved;
  }

  /**
   * Completar referido por ID del usuario referido
   */
  async completeByReferredUser(
    referredUserId: string,
    enrollmentId?: string,
  ): Promise<Referral | null> {
    const referral = await this.referralRepository.findOne({
      where: { referredId: referredUserId, status: ReferralStatus.PENDING },
    });

    if (!referral) {
      this.logger.debug(
        `No se encontró referido pendiente para usuario ${referredUserId}`,
      );
      return null;
    }

    return this.completeReferral({
      referralId: referral.id,
      enrollmentId,
      notes: 'Completado automáticamente por primera inscripción',
    });
  }

  /**
   * Actualizar estado de referido (Admin)
   */
  async updateStatus(
    id: string,
    dto: UpdateReferralStatusDto,
  ): Promise<Referral> {
    const referral = await this.findById(id);

    referral.status = dto.status;

    if (dto.notes) {
      referral.notes = referral.notes
        ? `${referral.notes}\n${dto.notes}`
        : dto.notes;
    }

    if (dto.status === ReferralStatus.COMPLETED && !referral.completedAt) {
      referral.completedAt = new Date();
    }

    const saved = await this.referralRepository.save(referral);
    this.logger.log(`Estado de referido actualizado: ${id} -> ${dto.status}`);

    return saved;
  }

  /**
   * Marcar recompensa como entregada
   */
  async markRewardDelivered(
    id: string,
    dto: MarkRewardDeliveredDto,
  ): Promise<Referral> {
    const referral = await this.findById(id);

    if (
      referral.status !== ReferralStatus.COMPLETED &&
      referral.status !== ReferralStatus.REWARDED
    ) {
      throw new BadRequestException({
        code: ErrorCodes.VALIDATION_ERROR,
        message: 'El referido debe estar completado para entregar recompensas',
      });
    }

    const now = new Date();

    if (dto.rewardTo === 'referrer' || dto.rewardTo === 'both') {
      referral.referrerRewarded = true;
      referral.referrerRewardedAt = now;
    }

    if (dto.rewardTo === 'referred' || dto.rewardTo === 'both') {
      referral.referredRewarded = true;
      referral.referredRewardedAt = now;
    }

    // Si ambos fueron recompensados, cambiar estado a REWARDED
    if (referral.isFullyRewarded) {
      referral.status = ReferralStatus.REWARDED;
    }

    if (dto.notes) {
      referral.notes = referral.notes
        ? `${referral.notes}\n${dto.notes}`
        : dto.notes;
    }

    const saved = await this.referralRepository.save(referral);
    this.logger.log(
      `Recompensa entregada para referido ${id} a ${dto.rewardTo}`,
    );

    // Emitir evento
    this.eventEmitter.emit('referral.rewarded', {
      referralId: saved.id,
      rewardTo: dto.rewardTo,
    });

    return saved;
  }

  /**
   * Cancelar referido
   */
  async cancel(id: string, reason?: string): Promise<Referral> {
    const referral = await this.findById(id);

    if (referral.status === ReferralStatus.REWARDED) {
      throw new BadRequestException({
        code: ErrorCodes.VALIDATION_ERROR,
        message: 'No se puede cancelar un referido que ya fue recompensado',
      });
    }

    referral.status = ReferralStatus.CANCELLED;
    referral.notes = reason
      ? referral.notes
        ? `${referral.notes}\nCancelado: ${reason}`
        : `Cancelado: ${reason}`
      : referral.notes;

    const saved = await this.referralRepository.save(referral);
    this.logger.log(`Referido cancelado: ${id}`);

    return saved;
  }

  // ============================================
  // ESTADÍSTICAS GLOBALES (ADMIN)
  // ============================================

  /**
   * Obtener estadísticas globales del programa de referidos
   */
  async getGlobalStats() {
    const [
      totalReferrals,
      pendingReferrals,
      completedReferrals,
      rewardedReferrals,
      expiredReferrals,
      cancelledReferrals,
    ] = await Promise.all([
      this.referralRepository.count(),
      this.referralRepository.count({
        where: { status: ReferralStatus.PENDING },
      }),
      this.referralRepository.count({
        where: { status: ReferralStatus.COMPLETED },
      }),
      this.referralRepository.count({
        where: { status: ReferralStatus.REWARDED },
      }),
      this.referralRepository.count({
        where: { status: ReferralStatus.EXPIRED },
      }),
      this.referralRepository.count({
        where: { status: ReferralStatus.CANCELLED },
      }),
    ]);

    // Calcular totales de recompensas
    const rewardStats = await this.referralRepository
      .createQueryBuilder('referral')
      .select('SUM(referral.referrerRewardValue)', 'totalReferrerRewards')
      .addSelect(
        'SUM(CASE WHEN referral.referrerRewarded = true THEN referral.referrerRewardValue ELSE 0 END)',
        'paidReferrerRewards',
      )
      .where('referral.status IN (:...statuses)', {
        statuses: [ReferralStatus.COMPLETED, ReferralStatus.REWARDED],
      })
      .getRawOne();

    return {
      totalReferrals,
      byStatus: {
        pending: pendingReferrals,
        completed: completedReferrals,
        rewarded: rewardedReferrals,
        expired: expiredReferrals,
        cancelled: cancelledReferrals,
      },
      conversionRate:
        totalReferrals > 0
          ? (
              ((completedReferrals + rewardedReferrals) / totalReferrals) *
              100
            ).toFixed(2)
          : '0',
      rewards: {
        totalOwed: Number(rewardStats?.totalReferrerRewards || 0),
        totalPaid: Number(rewardStats?.paidReferrerRewards || 0),
        pending:
          Number(rewardStats?.totalReferrerRewards || 0) -
          Number(rewardStats?.paidReferrerRewards || 0),
      },
    };
  }

  /**
   * Obtener top referidores
   */
  async getTopReferrers(limit: number = 10) {
    return this.referralRepository
      .createQueryBuilder('referral')
      .leftJoinAndSelect('referral.referrer', 'referrer')
      .select('referral.referrerId', 'userId')
      .addSelect('referrer.firstName', 'firstName')
      .addSelect('referrer.lastName', 'lastName')
      .addSelect('referrer.email', 'email')
      .addSelect('COUNT(*)', 'totalReferrals')
      .addSelect(
        'SUM(CASE WHEN referral.status IN (:...completed) THEN 1 ELSE 0 END)',
        'completedReferrals',
      )
      .addSelect(
        'SUM(CASE WHEN referral.referrerRewarded = true THEN referral.referrerRewardValue ELSE 0 END)',
        'totalEarnings',
      )
      .setParameter('completed', [
        ReferralStatus.COMPLETED,
        ReferralStatus.REWARDED,
      ])
      .groupBy('referral.referrerId')
      .addGroupBy('referrer.id')
      .orderBy('totalReferrals', 'DESC')
      .limit(limit)
      .getRawMany();
  }
}
