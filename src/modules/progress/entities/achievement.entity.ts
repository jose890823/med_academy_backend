import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';
import { User } from '../../auth/entities/user.entity';
import { Enrollment } from '../../enrollments/entities/enrollment.entity';

/**
 * Tipos de logros
 */
export enum AchievementType {
  // Progreso
  FIRST_MODULE_COMPLETED = 'first_module_completed',
  HALF_COURSE_COMPLETED = 'half_course_completed',
  COURSE_COMPLETED = 'course_completed',

  // Evaluaciones
  FIRST_EVALUATION_PASSED = 'first_evaluation_passed',
  ALL_EVALUATIONS_PASSED = 'all_evaluations_passed',
  PERFECT_SCORE = 'perfect_score',
  HIGH_ACHIEVER = 'high_achiever', // Promedio > 90%

  // Engagement
  EARLY_BIRD = 'early_bird', // Completó antes de tiempo
  CONSISTENT_LEARNER = 'consistent_learner', // Accede regularmente
  FAST_LEARNER = 'fast_learner', // Completó módulo en una sesión

  // Certificaciones
  CERTIFICATE_EARNED = 'certificate_earned',

  // Custom (para logros configurables)
  CUSTOM = 'custom',
}

/**
 * Categorías de logros
 */
export enum AchievementCategory {
  PROGRESS = 'progress',
  EVALUATION = 'evaluation',
  ENGAGEMENT = 'engagement',
  CERTIFICATION = 'certification',
  SPECIAL = 'special',
}

/**
 * Logro desbloqueado por un usuario
 */
@Entity('achievements')
@Index(['userId'])
@Index(['enrollmentId'])
@Index(['type'])
@Index(['category'])
@Index(['userId', 'type', 'enrollmentId'])
export class Achievement {
  @ApiProperty({
    example: '550e8400-e29b-41d4-a716-446655440000',
    description: 'ID único del logro',
  })
  @PrimaryGeneratedColumn('uuid')
  id: string;

  // ============================================
  // RELACIONES
  // ============================================

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column({ type: 'uuid' })
  userId: string;

  // Enrollment opcional (logros vinculados a un curso específico)
  @ManyToOne(() => Enrollment, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'enrollmentId' })
  enrollment: Enrollment | null;

  @Column({ type: 'uuid', nullable: true })
  enrollmentId: string | null;

  // ============================================
  // INFORMACIÓN DEL LOGRO
  // ============================================

  @ApiProperty({
    example: 'course_completed',
    description: 'Tipo de logro',
    enum: AchievementType,
  })
  @Column({ type: 'enum', enum: AchievementType })
  type: AchievementType;

  @ApiProperty({
    example: 'progress',
    description: 'Categoría del logro',
    enum: AchievementCategory,
  })
  @Column({ type: 'enum', enum: AchievementCategory })
  category: AchievementCategory;

  @ApiProperty({
    example: 'Curso Completado',
    description: 'Título del logro',
  })
  @Column({ type: 'varchar', length: 100 })
  title: string;

  @ApiProperty({
    example: 'Has completado exitosamente el curso de Vascular Sonography',
    description: 'Descripción del logro',
  })
  @Column({ type: 'text' })
  description: string;

  @ApiProperty({
    example: 'https://storage.example.com/achievements/course-completed.png',
    description: 'URL del icono/badge del logro',
    required: false,
  })
  @Column({ type: 'text', nullable: true })
  iconUrl: string | null;

  // ============================================
  // PUNTOS Y NIVEL
  // ============================================

  @ApiProperty({
    example: 100,
    description: 'Puntos otorgados por el logro',
  })
  @Column({ type: 'int', default: 0 })
  points: number;

  @ApiProperty({
    example: 'gold',
    description: 'Nivel del logro (bronze, silver, gold, platinum)',
    required: false,
  })
  @Column({ type: 'varchar', length: 20, nullable: true })
  level: string | null;

  // ============================================
  // METADATA (Flexible para datos adicionales)
  // ============================================

  @ApiProperty({
    example: { courseName: 'Vascular Sonography', score: 95 },
    description: 'Datos adicionales del logro',
    required: false,
  })
  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, any> | null;

  // ============================================
  // ESTADO
  // ============================================

  @ApiProperty({
    example: true,
    description: 'Indica si el logro está visible para el usuario',
  })
  @Column({ type: 'boolean', default: true })
  isVisible: boolean;

  @ApiProperty({
    example: false,
    description: 'Indica si el usuario ya vio la notificación del logro',
  })
  @Column({ type: 'boolean', default: false })
  notificationSeen: boolean;

  // ============================================
  // FECHAS
  // ============================================

  @ApiProperty({
    example: '2026-02-04T10:30:00.000Z',
    description: 'Fecha en que se obtuvo el logro',
  })
  @Column({ type: 'timestamp' })
  earnedAt: Date;

  @ApiProperty({ description: 'Fecha de creación' })
  @CreateDateColumn()
  createdAt: Date;

  // ============================================
  // CONSTRUCTOR
  // ============================================

  constructor(partial: Partial<Achievement>) {
    Object.assign(this, partial);
  }

  // ============================================
  // MÉTODOS HELPER
  // ============================================

  /**
   * Verifica si es un logro de curso específico
   */
  get isCourseSpecific(): boolean {
    return this.enrollmentId !== null;
  }

  /**
   * Verifica si es un logro de alto nivel
   */
  get isHighLevel(): boolean {
    return this.level === 'gold' || this.level === 'platinum';
  }
}
