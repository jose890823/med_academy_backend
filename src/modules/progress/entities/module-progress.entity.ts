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
import { ApiProperty } from '@nestjs/swagger';
import { Enrollment } from '../../enrollments/entities/enrollment.entity';
import { CourseModule } from '../../courses/entities/course-module.entity';

/**
 * Estado del progreso del módulo
 */
export enum ModuleProgressStatus {
  NOT_STARTED = 'not_started',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
}

/**
 * Progreso de un estudiante en un módulo específico
 */
@Entity('module_progress')
@Index(['enrollmentId'])
@Index(['moduleId'])
@Index(['enrollmentId', 'moduleId'], { unique: true })
@Index(['status'])
export class ModuleProgress {
  @ApiProperty({
    example: '550e8400-e29b-41d4-a716-446655440000',
    description: 'ID único del progreso del módulo',
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

  @ManyToOne(() => CourseModule, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'moduleId' })
  module: CourseModule;

  @Column({ type: 'uuid' })
  moduleId: string;

  // ============================================
  // ESTADO
  // ============================================

  @ApiProperty({
    example: 'in_progress',
    description: 'Estado del progreso del módulo',
    enum: ModuleProgressStatus,
  })
  @Column({ type: 'enum', enum: ModuleProgressStatus, default: ModuleProgressStatus.NOT_STARTED })
  status: ModuleProgressStatus;

  // ============================================
  // PROGRESO DE VIDEO
  // ============================================

  @ApiProperty({
    example: true,
    description: 'Indica si el video fue visto completamente',
  })
  @Column({ type: 'boolean', default: false })
  videoWatched: boolean;

  @ApiProperty({
    example: 75.5,
    description: 'Porcentaje del video visto (0-100)',
  })
  @Column({ type: 'decimal', precision: 5, scale: 2, default: 0 })
  videoProgress: number;

  @ApiProperty({
    example: 1245,
    description: 'Última posición del video en segundos',
  })
  @Column({ type: 'int', default: 0 })
  videoLastPosition: number;

  @ApiProperty({
    example: 1800,
    description: 'Duración total del video en segundos',
  })
  @Column({ type: 'int', nullable: true })
  videoDuration: number | null;

  // ============================================
  // MATERIALES
  // ============================================

  @ApiProperty({
    example: [0, 2],
    description: 'Índices de materiales descargados/vistos',
    type: [Number],
  })
  @Column({ type: 'simple-array', nullable: true })
  materialsViewed: string[] | null;

  @ApiProperty({
    example: 3,
    description: 'Total de materiales disponibles',
  })
  @Column({ type: 'int', default: 0 })
  totalMaterials: number;

  // ============================================
  // TIEMPO Y ACCESOS
  // ============================================

  @ApiProperty({
    example: 45,
    description: 'Tiempo dedicado al módulo en minutos',
  })
  @Column({ type: 'int', default: 0 })
  timeSpentMinutes: number;

  @ApiProperty({
    example: 3,
    description: 'Número de veces que accedió al módulo',
  })
  @Column({ type: 'int', default: 0 })
  accessCount: number;

  // ============================================
  // FECHAS
  // ============================================

  @ApiProperty({
    example: '2026-02-01T10:00:00.000Z',
    description: 'Fecha del primer acceso',
  })
  @Column({ type: 'timestamp', nullable: true })
  startedAt: Date | null;

  @ApiProperty({
    example: '2026-02-05T15:30:00.000Z',
    description: 'Fecha de completitud',
  })
  @Column({ type: 'timestamp', nullable: true })
  completedAt: Date | null;

  @ApiProperty({
    example: '2026-02-04T14:00:00.000Z',
    description: 'Último acceso al módulo',
  })
  @Column({ type: 'timestamp', nullable: true })
  lastAccessedAt: Date | null;

  // ============================================
  // NOTAS DEL ESTUDIANTE (opcional)
  // ============================================

  @ApiProperty({
    example: 'Revisar fórmula de velocidad en el minuto 15:30',
    description: 'Notas personales del estudiante',
    required: false,
  })
  @Column({ type: 'text', nullable: true })
  studentNotes: string | null;

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

  constructor(partial: Partial<ModuleProgress>) {
    Object.assign(this, partial);
  }

  // ============================================
  // MÉTODOS HELPER
  // ============================================

  /**
   * Verifica si el módulo está completado
   */
  get isCompleted(): boolean {
    return this.status === ModuleProgressStatus.COMPLETED;
  }

  /**
   * Verifica si el módulo ha sido iniciado
   */
  get hasStarted(): boolean {
    return this.status !== ModuleProgressStatus.NOT_STARTED;
  }

  /**
   * Calcula el porcentaje de materiales vistos
   */
  get materialsPercentage(): number {
    if (this.totalMaterials === 0) return 100; // Si no hay materiales, consideramos completo
    const viewedCount = this.materialsViewed?.length || 0;
    return Math.round((viewedCount / this.totalMaterials) * 100);
  }

  /**
   * Calcula el progreso total del módulo
   * Combina video (70%) + materiales (30%)
   */
  get overallProgress(): number {
    const videoWeight = 0.7;
    const materialsWeight = 0.3;

    const videoScore = this.videoWatched ? 100 : this.videoProgress;
    const materialsScore = this.materialsPercentage;

    return Math.round(videoScore * videoWeight + materialsScore * materialsWeight);
  }

  /**
   * Verifica si el video tiene progreso guardado
   */
  get hasVideoProgress(): boolean {
    return this.videoLastPosition > 0;
  }

  /**
   * Convierte tiempo a formato legible
   */
  get timeSpentFormatted(): string {
    const hours = Math.floor(this.timeSpentMinutes / 60);
    const minutes = this.timeSpentMinutes % 60;
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  }
}
