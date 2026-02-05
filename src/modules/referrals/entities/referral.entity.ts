import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { User } from '../../auth/entities/user.entity';
import { ReferralCode } from './referral-code.entity';

/**
 * Estado del referido
 */
export enum ReferralStatus {
  PENDING = 'pending', // Referido registrado, pero no ha completado acción
  COMPLETED = 'completed', // Referido completó acción requerida (ej: primera compra)
  REWARDED = 'rewarded', // Recompensa entregada a ambos
  EXPIRED = 'expired', // Referido no completó en tiempo
  CANCELLED = 'cancelled', // Cancelado por admin
}

/**
 * Tipo de recompensa
 */
export enum RewardType {
  DISCOUNT_PERCENT = 'discount_percent', // Descuento porcentual
  DISCOUNT_FIXED = 'discount_fixed', // Descuento fijo en USD
  CREDIT = 'credit', // Crédito en cuenta
  FREE_ACCESS = 'free_access', // Acceso gratuito a recurso
}

/**
 * Referido - Registro de cada uso de código de referido
 */
@Entity('referrals')
@Index(['referrerId'])
@Index(['referredId'])
@Index(['referralCodeId'])
@Index(['status'])
@Index(['referrerId', 'referredId'], { unique: true }) // Un referidor solo puede referir una vez a cada persona
export class Referral {
  @ApiProperty({
    example: '550e8400-e29b-41d4-a716-446655440000',
    description: 'ID único del referido',
  })
  @PrimaryGeneratedColumn('uuid')
  id: string;

  // ============================================
  // RELACIONES - PARTICIPANTES
  // ============================================

  @ManyToOne(() => User, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'referrerId' })
  referrer: User | null;

  @ApiProperty({
    example: '550e8400-e29b-41d4-a716-446655440000',
    description: 'ID del usuario que refirió (referidor)',
  })
  @Column({ type: 'uuid' })
  referrerId: string;

  @ManyToOne(() => User, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'referredId' })
  referred: User | null;

  @ApiProperty({
    example: '550e8400-e29b-41d4-a716-446655440000',
    description: 'ID del usuario referido',
  })
  @Column({ type: 'uuid' })
  referredId: string;

  // ============================================
  // RELACIÓN - CÓDIGO USADO
  // ============================================

  @ManyToOne(() => ReferralCode, (code) => code.referrals, {
    onDelete: 'SET NULL',
    nullable: true,
  })
  @JoinColumn({ name: 'referralCodeId' })
  referralCode: ReferralCode | null;

  @ApiPropertyOptional({
    example: '550e8400-e29b-41d4-a716-446655440000',
    description: 'ID del código de referido usado',
  })
  @Column({ type: 'uuid', nullable: true })
  referralCodeId: string | null;

  @ApiProperty({
    example: 'JOHN2024',
    description: 'Código que se usó (se guarda como snapshot)',
  })
  @Column({ type: 'varchar', length: 20 })
  codeUsed: string;

  // ============================================
  // ESTADO
  // ============================================

  @ApiProperty({
    example: 'pending',
    description: 'Estado del referido',
    enum: ReferralStatus,
  })
  @Column({
    type: 'enum',
    enum: ReferralStatus,
    default: ReferralStatus.PENDING,
  })
  status: ReferralStatus;

  // ============================================
  // RECOMPENSA DEL REFERIDO (nuevo usuario)
  // ============================================

  @ApiProperty({
    example: 'discount_percent',
    description: 'Tipo de recompensa para el referido',
    enum: RewardType,
  })
  @Column({
    type: 'enum',
    enum: RewardType,
    default: RewardType.DISCOUNT_PERCENT,
  })
  referredRewardType: RewardType;

  @ApiProperty({
    example: 10,
    description: 'Valor de la recompensa para el referido',
  })
  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  referredRewardValue: number;

  @ApiProperty({
    example: false,
    description: 'Si el referido ya recibió su recompensa',
  })
  @Column({ type: 'boolean', default: false })
  referredRewarded: boolean;

  @ApiPropertyOptional({
    example: '2026-01-15T10:30:00.000Z',
    description: 'Fecha en que el referido recibió la recompensa',
  })
  @Column({ type: 'timestamp', nullable: true })
  referredRewardedAt: Date | null;

  // ============================================
  // RECOMPENSA DEL REFERIDOR (quien compartió)
  // ============================================

  @ApiProperty({
    example: 'credit',
    description: 'Tipo de recompensa para el referidor',
    enum: RewardType,
  })
  @Column({
    type: 'enum',
    enum: RewardType,
    default: RewardType.CREDIT,
  })
  referrerRewardType: RewardType;

  @ApiProperty({
    example: 50,
    description: 'Valor de la recompensa para el referidor',
  })
  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  referrerRewardValue: number;

  @ApiProperty({
    example: false,
    description: 'Si el referidor ya recibió su recompensa',
  })
  @Column({ type: 'boolean', default: false })
  referrerRewarded: boolean;

  @ApiPropertyOptional({
    example: '2026-01-20T14:00:00.000Z',
    description: 'Fecha en que el referidor recibió la recompensa',
  })
  @Column({ type: 'timestamp', nullable: true })
  referrerRewardedAt: Date | null;

  // ============================================
  // CONDICIÓN DE COMPLETADO
  // ============================================

  @ApiPropertyOptional({
    example: '550e8400-e29b-41d4-a716-446655440000',
    description: 'ID de la inscripción que completó el referido (si aplica)',
  })
  @Column({ type: 'uuid', nullable: true })
  completingEnrollmentId: string | null;

  @ApiPropertyOptional({
    example: '2026-01-15T10:00:00.000Z',
    description: 'Fecha en que se completó el referido',
  })
  @Column({ type: 'timestamp', nullable: true })
  completedAt: Date | null;

  // ============================================
  // EXPIRACIÓN
  // ============================================

  @ApiPropertyOptional({
    example: '2026-02-01T23:59:59.000Z',
    description: 'Fecha límite para completar el referido',
  })
  @Column({ type: 'timestamp', nullable: true })
  expiresAt: Date | null;

  // ============================================
  // NOTAS
  // ============================================

  @ApiPropertyOptional({
    example: 'Referido a través de redes sociales',
    description: 'Notas adicionales',
  })
  @Column({ type: 'text', nullable: true })
  notes: string | null;

  // ============================================
  // TIMESTAMPS
  // ============================================

  @ApiProperty({ description: 'Fecha de creación' })
  @CreateDateColumn()
  createdAt: Date;

  @ApiProperty({ description: 'Fecha de última actualización' })
  @UpdateDateColumn()
  updatedAt: Date;

  // ============================================
  // CONSTRUCTOR
  // ============================================

  constructor(partial: Partial<Referral>) {
    Object.assign(this, partial);
  }

  // ============================================
  // MÉTODOS HELPER
  // ============================================

  /**
   * Verifica si el referido ha expirado
   */
  get isExpired(): boolean {
    if (!this.expiresAt) return false;
    return (
      new Date() > this.expiresAt && this.status === ReferralStatus.PENDING
    );
  }

  /**
   * Verifica si ambas partes han sido recompensadas
   */
  get isFullyRewarded(): boolean {
    return this.referredRewarded && this.referrerRewarded;
  }

  /**
   * Verifica si el referido puede ser completado
   */
  get canBeCompleted(): boolean {
    return this.status === ReferralStatus.PENDING && !this.isExpired;
  }

  /**
   * Verifica si se pueden entregar recompensas
   */
  get canBeRewarded(): boolean {
    return this.status === ReferralStatus.COMPLETED && !this.isFullyRewarded;
  }
}
