import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
  OneToMany,
} from 'typeorm';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { User } from '../../auth/entities/user.entity';
import { Referral } from './referral.entity';

/**
 * Código de referido de un usuario
 * Cada usuario puede tener uno o más códigos de referido
 */
@Entity('referral_codes')
@Index(['code'], { unique: true })
@Index(['userId'])
@Index(['isActive'])
export class ReferralCode {
  @ApiProperty({
    example: '550e8400-e29b-41d4-a716-446655440000',
    description: 'ID único del código de referido',
  })
  @PrimaryGeneratedColumn('uuid')
  id: string;

  // ============================================
  // RELACIONES
  // ============================================

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User;

  @ApiProperty({
    example: '550e8400-e29b-41d4-a716-446655440000',
    description: 'ID del usuario dueño del código',
  })
  @Column({ type: 'uuid' })
  userId: string;

  @OneToMany(() => Referral, (referral) => referral.referralCode)
  referrals: Referral[];

  // ============================================
  // CÓDIGO
  // ============================================

  @ApiProperty({
    example: 'JOHN2024',
    description: 'Código único de referido',
  })
  @Column({ type: 'varchar', length: 20, unique: true })
  code: string;

  @ApiPropertyOptional({
    example: 'Mi código personal para amigos',
    description: 'Descripción opcional del código',
  })
  @Column({ type: 'varchar', length: 255, nullable: true })
  description: string | null;

  // ============================================
  // CONFIGURACIÓN
  // ============================================

  @ApiProperty({
    example: true,
    description: 'Si el código está activo',
  })
  @Column({ type: 'boolean', default: true })
  isActive: boolean;

  @ApiProperty({
    example: 5,
    description: 'Número de veces que se ha usado el código',
  })
  @Column({ type: 'int', default: 0 })
  usageCount: number;

  @ApiPropertyOptional({
    example: 100,
    description: 'Máximo de usos permitidos (null = ilimitado)',
  })
  @Column({ type: 'int', nullable: true })
  maxUses: number | null;

  @ApiPropertyOptional({
    example: '2026-12-31T23:59:59.000Z',
    description: 'Fecha de expiración del código (null = no expira)',
  })
  @Column({ type: 'timestamp', nullable: true })
  expiresAt: Date | null;

  // ============================================
  // RECOMPENSA CONFIGURADA
  // ============================================

  @ApiProperty({
    example: 10,
    description: 'Porcentaje de descuento para el referido',
  })
  @Column({ type: 'decimal', precision: 5, scale: 2, default: 10 })
  referredDiscountPercent: number;

  @ApiProperty({
    example: 50,
    description: 'Crédito en USD para el referidor por cada referido completado',
  })
  @Column({ type: 'decimal', precision: 10, scale: 2, default: 50 })
  referrerRewardAmount: number;

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

  constructor(partial: Partial<ReferralCode>) {
    Object.assign(this, partial);
  }

  // ============================================
  // MÉTODOS HELPER
  // ============================================

  /**
   * Verifica si el código ha expirado
   */
  get isExpired(): boolean {
    if (!this.expiresAt) return false;
    return new Date() > this.expiresAt;
  }

  /**
   * Verifica si el código ha alcanzado el límite de usos
   */
  get hasReachedMaxUses(): boolean {
    if (!this.maxUses) return false;
    return this.usageCount >= this.maxUses;
  }

  /**
   * Verifica si el código es válido para usar
   */
  get isValid(): boolean {
    return this.isActive && !this.isExpired && !this.hasReachedMaxUses;
  }

  /**
   * Usos restantes
   */
  get remainingUses(): number | null {
    if (!this.maxUses) return null;
    return Math.max(0, this.maxUses - this.usageCount);
  }
}
