import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
  Index,
} from 'typeorm';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Enrollment } from '../../enrollments/entities/enrollment.entity';
import { Evaluation } from './evaluation.entity';
import { User } from '../../auth/entities/user.entity';

/**
 * Estado del intento de evaluación
 */
export enum AttemptStatus {
  IN_PROGRESS = 'in_progress',
  SUBMITTED = 'submitted',
  GRADED = 'graded',
}

/**
 * Intento de evaluación de un estudiante
 * IMPORTANTE: Las evaluaciones son calificadas MANUALMENTE por el instructor
 */
@Entity('evaluation_attempts')
@Index(['enrollmentId'])
@Index(['evaluationId'])
@Index(['status'])
@Index(['enrollmentId', 'evaluationId'])
export class EvaluationAttempt {
  @ApiProperty({
    example: '550e8400-e29b-41d4-a716-446655440000',
    description: 'ID único del intento',
  })
  @PrimaryGeneratedColumn('uuid')
  id: string;

  // ============================================
  // RELACIONES
  // ============================================

  @ManyToOne(() => Enrollment, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'enrollmentId' })
  enrollment: Enrollment;

  @Column({ type: 'uuid' })
  enrollmentId: string;

  @ManyToOne(() => Evaluation, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'evaluationId' })
  evaluation: Evaluation;

  @Column({ type: 'uuid' })
  evaluationId: string;

  // Instructor que calificó (REQUERIDO al calificar)
  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'gradedById' })
  gradedBy: User | null;

  @Column({ type: 'uuid', nullable: true })
  gradedById: string | null;

  // ============================================
  // RESULTADO (asignado por el instructor)
  // ============================================

  @ApiPropertyOptional({
    example: 85,
    description: 'Puntuación obtenida (asignada por el instructor)',
  })
  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  score: number | null;

  @ApiProperty({
    example: 100,
    description: 'Puntos totales de la evaluación',
  })
  @Column({ type: 'int' })
  totalPoints: number;

  @ApiPropertyOptional({
    example: 85.0,
    description: 'Porcentaje obtenido',
  })
  @Column({ type: 'decimal', precision: 5, scale: 2, nullable: true })
  percentage: number | null;

  @ApiPropertyOptional({
    example: true,
    description: 'Si aprobó la evaluación',
  })
  @Column({ type: 'boolean', nullable: true })
  passed: boolean | null;

  // ============================================
  // ESTADO
  // ============================================

  @ApiProperty({
    example: 'submitted',
    description: 'Estado del intento',
    enum: AttemptStatus,
  })
  @Column({
    type: 'enum',
    enum: AttemptStatus,
    default: AttemptStatus.IN_PROGRESS,
  })
  status: AttemptStatus;

  @ApiProperty({
    example: 1,
    description: 'Número de intento (1, 2, 3...)',
  })
  @Column({ type: 'int', default: 1 })
  attemptNumber: number;

  // ============================================
  // TIEMPOS
  // ============================================

  @ApiProperty({
    example: '2026-03-15T10:00:00.000Z',
    description: 'Fecha de inicio del intento',
  })
  @Column({ type: 'timestamp' })
  startedAt: Date;

  @ApiPropertyOptional({
    example: '2026-03-15T10:45:00.000Z',
    description: 'Fecha de envío del intento',
  })
  @Column({ type: 'timestamp', nullable: true })
  submittedAt: Date | null;

  @ApiPropertyOptional({
    example: '2026-03-16T14:30:00.000Z',
    description: 'Fecha de calificación',
  })
  @Column({ type: 'timestamp', nullable: true })
  gradedAt: Date | null;

  @ApiPropertyOptional({
    example: '2026-03-15T11:00:00.000Z',
    description: 'Fecha límite para enviar (si hay tiempo límite)',
  })
  @Column({ type: 'timestamp', nullable: true })
  expiresAt: Date | null;

  // ============================================
  // FEEDBACK DEL INSTRUCTOR
  // ============================================

  @ApiPropertyOptional({
    example:
      'Excelente trabajo en las preguntas de física Doppler. Revisa el tema de artefactos.',
    description: 'Retroalimentación del instructor',
  })
  @Column({ type: 'text', nullable: true })
  feedback: string | null;

  // ============================================
  // TIMESTAMPS
  // ============================================

  @ApiProperty({ description: 'Fecha de creación' })
  @CreateDateColumn()
  createdAt: Date;

  // ============================================
  // CONSTRUCTOR
  // ============================================

  constructor(partial: Partial<EvaluationAttempt>) {
    Object.assign(this, partial);
  }

  // ============================================
  // MÉTODOS HELPER
  // ============================================

  /**
   * Verifica si el intento está en progreso
   */
  get isInProgress(): boolean {
    return this.status === AttemptStatus.IN_PROGRESS;
  }

  /**
   * Verifica si el intento fue enviado
   */
  get isSubmitted(): boolean {
    return (
      this.status === AttemptStatus.SUBMITTED ||
      this.status === AttemptStatus.GRADED
    );
  }

  /**
   * Verifica si el intento fue calificado
   */
  get isGraded(): boolean {
    return this.status === AttemptStatus.GRADED;
  }

  /**
   * Verifica si el tiempo ha expirado
   */
  get isExpired(): boolean {
    if (!this.expiresAt) return false;
    return new Date() > new Date(this.expiresAt);
  }

  /**
   * Verifica si el intento puede ser enviado
   */
  get canSubmit(): boolean {
    return this.isInProgress && !this.isExpired;
  }

  /**
   * Calcula el tiempo transcurrido en minutos
   */
  get elapsedMinutes(): number {
    const end = this.submittedAt || new Date();
    const diffMs = end.getTime() - new Date(this.startedAt).getTime();
    return Math.floor(diffMs / 60000);
  }

  /**
   * Calcula el tiempo restante en minutos (si hay límite)
   */
  get remainingMinutes(): number | null {
    if (!this.expiresAt) return null;
    const diffMs = new Date(this.expiresAt).getTime() - new Date().getTime();
    return Math.max(0, Math.floor(diffMs / 60000));
  }
}
