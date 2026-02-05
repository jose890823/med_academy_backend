import {
  Injectable,
  Logger,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ReferralCode } from '../entities/referral-code.entity';
import {
  CreateReferralCodeDto,
  AdminCreateReferralCodeDto,
  UpdateReferralCodeDto,
  ReferralCodeQueryDto,
} from '../dto';
import { ErrorCodes } from '../../../common/dto';

@Injectable()
export class ReferralCodesService {
  private readonly logger = new Logger(ReferralCodesService.name);

  constructor(
    @InjectRepository(ReferralCode)
    private readonly referralCodeRepository: Repository<ReferralCode>,
  ) {}

  // ============================================
  // OPERACIONES DE LECTURA
  // ============================================

  /**
   * Obtener todos los códigos con paginación
   */
  async findAll(query: ReferralCodeQueryDto) {
    const { page = 1, limit = 20, userId, isActive } = query;
    const skip = (page - 1) * limit;

    const queryBuilder = this.referralCodeRepository
      .createQueryBuilder('code')
      .leftJoinAndSelect('code.user', 'user')
      .orderBy('code.createdAt', 'DESC');

    if (userId) {
      queryBuilder.andWhere('code.userId = :userId', { userId });
    }

    if (isActive !== undefined) {
      queryBuilder.andWhere('code.isActive = :isActive', { isActive });
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
   * Obtener código por ID
   */
  async findById(id: string): Promise<ReferralCode> {
    const code = await this.referralCodeRepository.findOne({
      where: { id },
      relations: ['user', 'referrals'],
    });

    if (!code) {
      throw new NotFoundException({
        code: ErrorCodes.REFERRAL_CODE_INVALID,
        message: 'Código de referido no encontrado',
      });
    }

    return code;
  }

  /**
   * Obtener código por código string
   */
  async findByCode(codeString: string): Promise<ReferralCode | null> {
    return this.referralCodeRepository.findOne({
      where: { code: codeString.toUpperCase() },
      relations: ['user'],
    });
  }

  /**
   * Obtener códigos de un usuario
   */
  async findByUserId(userId: string): Promise<ReferralCode[]> {
    return this.referralCodeRepository.find({
      where: { userId },
      relations: ['referrals'],
      order: { createdAt: 'DESC' },
    });
  }

  /**
   * Validar si un código es válido para usar
   */
  async validateCode(
    codeString: string,
    referredUserId?: string,
  ): Promise<{
    valid: boolean;
    code?: ReferralCode;
    error?: string;
    discount?: number;
  }> {
    const code = await this.findByCode(codeString);

    if (!code) {
      return { valid: false, error: 'Código no encontrado' };
    }

    if (!code.isActive) {
      return { valid: false, error: 'Código inactivo' };
    }

    if (code.isExpired) {
      return { valid: false, error: 'Código expirado' };
    }

    if (code.hasReachedMaxUses) {
      return { valid: false, error: 'Código ha alcanzado el límite de usos' };
    }

    // Verificar que no sea auto-referido
    if (referredUserId && code.userId === referredUserId) {
      return {
        valid: false,
        error: 'No puedes usar tu propio código de referido',
      };
    }

    return {
      valid: true,
      code,
      discount: Number(code.referredDiscountPercent),
    };
  }

  // ============================================
  // OPERACIONES DE ESCRITURA
  // ============================================

  /**
   * Crear código de referido para un usuario
   */
  async create(
    userId: string,
    dto: CreateReferralCodeDto,
  ): Promise<ReferralCode> {
    const code = dto.code?.toUpperCase() || this.generateCode();

    // Verificar que el código no exista
    const existing = await this.findByCode(code);
    if (existing) {
      throw new ConflictException({
        code: ErrorCodes.REFERRAL_CODE_INVALID,
        message: 'El código ya está en uso',
      });
    }

    const referralCode = this.referralCodeRepository.create({
      userId,
      code,
      description: dto.description,
      maxUses: dto.maxUses,
      expiresAt: dto.expiresAt,
      referredDiscountPercent: dto.referredDiscountPercent ?? 10,
      referrerRewardAmount: dto.referrerRewardAmount ?? 50,
    });

    const saved = await this.referralCodeRepository.save(referralCode);
    this.logger.log(
      `Código de referido creado: ${code} para usuario ${userId}`,
    );

    return saved;
  }

  /**
   * Crear código por admin (puede especificar userId)
   */
  async adminCreate(dto: AdminCreateReferralCodeDto): Promise<ReferralCode> {
    const code = dto.code?.toUpperCase() || this.generateCode();

    // Verificar que el código no exista
    const existing = await this.findByCode(code);
    if (existing) {
      throw new ConflictException({
        code: ErrorCodes.REFERRAL_CODE_INVALID,
        message: 'El código ya está en uso',
      });
    }

    const referralCode = this.referralCodeRepository.create({
      userId: dto.userId,
      code,
      description: dto.description,
      isActive: dto.isActive ?? true,
      maxUses: dto.maxUses,
      expiresAt: dto.expiresAt,
      referredDiscountPercent: dto.referredDiscountPercent ?? 10,
      referrerRewardAmount: dto.referrerRewardAmount ?? 50,
    });

    const saved = await this.referralCodeRepository.save(referralCode);
    this.logger.log(
      `Código de referido creado por admin: ${code} para usuario ${dto.userId}`,
    );

    return saved;
  }

  /**
   * Actualizar código
   */
  async update(id: string, dto: UpdateReferralCodeDto): Promise<ReferralCode> {
    const code = await this.findById(id);

    Object.assign(code, dto);
    const updated = await this.referralCodeRepository.save(code);

    this.logger.log(`Código de referido actualizado: ${code.code}`);
    return updated;
  }

  /**
   * Incrementar contador de uso
   */
  async incrementUsage(id: string): Promise<void> {
    await this.referralCodeRepository.increment({ id }, 'usageCount', 1);
    this.logger.debug(`Uso incrementado para código ${id}`);
  }

  /**
   * Desactivar código
   */
  async deactivate(id: string): Promise<ReferralCode> {
    const code = await this.findById(id);
    code.isActive = false;

    const updated = await this.referralCodeRepository.save(code);
    this.logger.log(`Código de referido desactivado: ${code.code}`);

    return updated;
  }

  /**
   * Activar código
   */
  async activate(id: string): Promise<ReferralCode> {
    const code = await this.findById(id);
    code.isActive = true;

    const updated = await this.referralCodeRepository.save(code);
    this.logger.log(`Código de referido activado: ${code.code}`);

    return updated;
  }

  /**
   * Eliminar código
   */
  async delete(id: string): Promise<void> {
    const code = await this.findById(id);

    if (code.usageCount > 0) {
      throw new BadRequestException({
        code: ErrorCodes.REFERRAL_ALREADY_USED,
        message: 'No se puede eliminar un código que ya ha sido usado',
      });
    }

    await this.referralCodeRepository.remove(code);
    this.logger.log(`Código de referido eliminado: ${code.code}`);
  }

  // ============================================
  // UTILIDADES
  // ============================================

  /**
   * Genera un código aleatorio único
   */
  private generateCode(): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = '';
    for (let i = 0; i < 8; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
  }

  /**
   * Verificar si un usuario tiene al menos un código activo
   */
  async userHasActiveCode(userId: string): Promise<boolean> {
    const count = await this.referralCodeRepository.count({
      where: { userId, isActive: true },
    });
    return count > 0;
  }

  /**
   * Obtener estadísticas de códigos de un usuario
   */
  async getUserCodeStats(userId: string) {
    const codes = await this.findByUserId(userId);

    const totalReferrals = codes.reduce(
      (sum, code) => sum + code.usageCount,
      0,
    );
    const activeCodes = codes.filter((c) => c.isValid).length;

    return {
      totalCodes: codes.length,
      activeCodes,
      inactiveCodes: codes.length - activeCodes,
      totalReferrals,
    };
  }
}
