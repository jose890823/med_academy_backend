import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  OneToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';
import { Enrollment } from '../../enrollments/entities/enrollment.entity';

/**
 * Estado del progreso general
 */
export enum ProgressStatus {
  NOT_STARTED = 'not_started',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
}

/**
 * Progreso general de un estudiante en su inscripción
 * Agregador de todo el progreso (módulos, evaluaciones, etc.)
 */
@Entity('enrollment_progress')
@Index(['enrollmentId'], { unique: true })
@Index(['status'])
@Index(['lastAccessedAt'])
export class EnrollmentProgress {
  @ApiProperty({
    example: '550e8400-e29b-41d4-a716-446655440000',
    description: 'ID único del progreso',
  })
  @PrimaryGeneratedColumn('uuid')
  id: string;

  // ============================================
  // RELACIÓN CON ENROLLMENT
  // ============================================

  @OneToOne(() => Enrollment, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'enrollmentId' })
  enrollment: Enrollment;

  @Column({ type: 'uuid', unique: true })
  enrollmentId: string;

  // ============================================
  // PROGRESO DE MÓDULOS
  // ============================================

  @ApiProperty({
    example: 5,
    description: 'Número de módulos completados',
  })
  @Column({ type: 'int', default: 0 })
  completedModulesCount: number;

  @ApiProperty({
    example: 10,
    description: 'Total de módulos del curso',
  })
  @Column({ type: 'int', default: 0 })
  totalModulesCount: number;

  // ============================================
  // PROGRESO DE EVALUACIONES
  // ============================================

  @ApiProperty({
    example: 3,
    description: 'Número de evaluaciones aprobadas',
  })
  @Column({ type: 'int', default: 0 })
  passedEvaluationsCount: number;

  @ApiProperty({
    example: 5,
    description: 'Total de evaluaciones del curso',
  })
  @Column({ type: 'int', default: 0 })
  totalEvaluationsCount: number;

  // ============================================
  // MÉTRICAS GENERALES
  // ============================================

  @ApiProperty({
    example: 65.5,
    description: 'Porcentaje de progreso general (0-100)',
  })
  @Column({ type: 'decimal', precision: 5, scale: 2, default: 0 })
  overallPercentage: number;

  @ApiProperty({
    example: 78.5,
    description: 'Promedio de calificaciones en evaluaciones',
  })
  @Column({ type: 'decimal', precision: 5, scale: 2, nullable: true })
  averageScore: number | null;

  @ApiProperty({
    example: 480,
    description: 'Tiempo total dedicado en minutos',
  })
  @Column({ type: 'int', default: 0 })
  totalTimeSpentMinutes: number;

  // ============================================
  // ESTADO Y FECHAS
  // ============================================

  @ApiProperty({
    example: 'in_progress',
    description: 'Estado del progreso',
    enum: ProgressStatus,
  })
  @Column({
    type: 'enum',
    enum: ProgressStatus,
    default: ProgressStatus.NOT_STARTED,
  })
  status: ProgressStatus;

  @ApiProperty({
    example: '2026-02-04T10:30:00.000Z',
    description: 'Fecha del primer acceso',
  })
  @Column({ type: 'timestamp', nullable: true })
  firstAccessedAt: Date | null;

  @ApiProperty({
    example: '2026-02-04T15:45:00.000Z',
    description: 'Fecha del último acceso',
  })
  @Column({ type: 'timestamp', nullable: true })
  lastAccessedAt: Date | null;

  @ApiProperty({
    example: '2026-05-15T10:00:00.000Z',
    description: 'Fecha de completitud (si aplica)',
  })
  @Column({ type: 'timestamp', nullable: true })
  completedAt: Date | null;

  // ============================================
  // ÚLTIMO CONTENIDO ACCEDIDO (para retomar)
  // ============================================

  @ApiProperty({
    example: 'module',
    description: 'Tipo del último contenido accedido',
  })
  @Column({ type: 'varchar', length: 50, nullable: true })
  lastContentType: string | null;

  @ApiProperty({
    example: '550e8400-e29b-41d4-a716-446655440000',
    description: 'ID del último contenido accedido',
  })
  @Column({ type: 'uuid', nullable: true })
  lastContentId: string | null;

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

  constructor(partial: Partial<EnrollmentProgress>) {
    Object.assign(this, partial);
  }

  // ============================================
  // MÉTODOS HELPER
  // ============================================

  /**
   * Calcula el porcentaje de módulos completados
   */
  get modulesPercentage(): number {
    if (this.totalModulesCount === 0) return 0;
    return Math.round(
      (this.completedModulesCount / this.totalModulesCount) * 100,
    );
  }

  /**
   * Calcula el porcentaje de evaluaciones aprobadas
   */
  get evaluationsPercentage(): number {
    if (this.totalEvaluationsCount === 0) return 0;
    return Math.round(
      (this.passedEvaluationsCount / this.totalEvaluationsCount) * 100,
    );
  }

  /**
   * Verifica si el progreso está completado
   */
  get isCompleted(): boolean {
    return this.status === ProgressStatus.COMPLETED;
  }

  /**
   * Verifica si ha iniciado
   */
  get hasStarted(): boolean {
    return this.status !== ProgressStatus.NOT_STARTED;
  }

  /**
   * Convierte tiempo a formato legible
   */
  get timeSpentFormatted(): string {
    const hours = Math.floor(this.totalTimeSpentMinutes / 60);
    const minutes = this.totalTimeSpentMinutes % 60;
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  }
}
