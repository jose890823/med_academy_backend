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
 * Tipos de actividad del estudiante
 */
export enum ActivityType {
  // Acceso
  COURSE_ACCESSED = 'course_accessed',
  MODULE_ACCESSED = 'module_accessed',

  // Video
  VIDEO_STARTED = 'video_started',
  VIDEO_PAUSED = 'video_paused',
  VIDEO_RESUMED = 'video_resumed',
  VIDEO_COMPLETED = 'video_completed',
  VIDEO_SEEKED = 'video_seeked',

  // Materiales
  MATERIAL_DOWNLOADED = 'material_downloaded',
  MATERIAL_VIEWED = 'material_viewed',

  // Evaluaciones
  EVALUATION_STARTED = 'evaluation_started',
  EVALUATION_SUBMITTED = 'evaluation_submitted',
  EVALUATION_GRADED = 'evaluation_graded',

  // Progreso
  MODULE_COMPLETED = 'module_completed',
  COURSE_COMPLETED = 'course_completed',

  // Notas
  NOTE_CREATED = 'note_created',
  NOTE_UPDATED = 'note_updated',

  // Logros
  ACHIEVEMENT_EARNED = 'achievement_earned',

  // Certificado
  CERTIFICATE_GENERATED = 'certificate_generated',
  CERTIFICATE_DOWNLOADED = 'certificate_downloaded',
}

/**
 * Tipo de entidad relacionada
 */
export enum EntityType {
  COURSE = 'course',
  MODULE = 'module',
  EVALUATION = 'evaluation',
  MATERIAL = 'material',
  VIDEO = 'video',
  ACHIEVEMENT = 'achievement',
  CERTIFICATE = 'certificate',
}

/**
 * Registro de actividad del estudiante
 * Útil para analytics, auditoría y regeneración de progreso
 */
@Entity('activity_logs')
@Index(['userId'])
@Index(['enrollmentId'])
@Index(['activityType'])
@Index(['entityType'])
@Index(['createdAt'])
@Index(['userId', 'enrollmentId', 'createdAt'])
export class ActivityLog {
  @ApiProperty({
    example: '550e8400-e29b-41d4-a716-446655440000',
    description: 'ID único del log',
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

  @ManyToOne(() => Enrollment, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'enrollmentId' })
  enrollment: Enrollment | null;

  @Column({ type: 'uuid', nullable: true })
  enrollmentId: string | null;

  // ============================================
  // INFORMACIÓN DE LA ACTIVIDAD
  // ============================================

  @ApiProperty({
    example: 'video_completed',
    description: 'Tipo de actividad',
    enum: ActivityType,
  })
  @Column({ type: 'enum', enum: ActivityType })
  activityType: ActivityType;

  @ApiProperty({
    example: 'module',
    description: 'Tipo de entidad relacionada',
    enum: EntityType,
  })
  @Column({ type: 'enum', enum: EntityType })
  entityType: EntityType;

  @ApiProperty({
    example: '550e8400-e29b-41d4-a716-446655440000',
    description: 'ID de la entidad relacionada',
  })
  @Column({ type: 'uuid' })
  entityId: string;

  // ============================================
  // METADATA (Flexible para datos adicionales)
  // ============================================

  @ApiProperty({
    example: {
      moduleTitle: 'Física Doppler',
      videoPosition: 1234,
      duration: 1800,
      percentage: 68.5,
    },
    description: 'Datos adicionales de la actividad',
    required: false,
  })
  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, any> | null;

  // ============================================
  // CONTEXTO
  // ============================================

  @ApiProperty({
    example: '192.168.1.1',
    description: 'IP del usuario',
    required: false,
  })
  @Column({ type: 'varchar', length: 45, nullable: true })
  ipAddress: string | null;

  @ApiProperty({
    example: 'Mozilla/5.0 ...',
    description: 'User agent del navegador',
    required: false,
  })
  @Column({ type: 'text', nullable: true })
  userAgent: string | null;

  @ApiProperty({
    example: 'desktop',
    description: 'Tipo de dispositivo (desktop, mobile, tablet)',
    required: false,
  })
  @Column({ type: 'varchar', length: 20, nullable: true })
  deviceType: string | null;

  // ============================================
  // TIMESTAMPS
  // ============================================

  @ApiProperty({ description: 'Fecha de la actividad' })
  @CreateDateColumn()
  createdAt: Date;

  // ============================================
  // CONSTRUCTOR
  // ============================================

  constructor(partial: Partial<ActivityLog>) {
    Object.assign(this, partial);
  }

  // ============================================
  // MÉTODOS HELPER
  // ============================================

  /**
   * Verifica si es una actividad de video
   */
  get isVideoActivity(): boolean {
    return this.activityType.startsWith('video_');
  }

  /**
   * Verifica si es una actividad de evaluación
   */
  get isEvaluationActivity(): boolean {
    return this.activityType.startsWith('evaluation_');
  }

  /**
   * Verifica si es una actividad de completitud
   */
  get isCompletionActivity(): boolean {
    return (
      this.activityType === ActivityType.MODULE_COMPLETED ||
      this.activityType === ActivityType.COURSE_COMPLETED ||
      this.activityType === ActivityType.VIDEO_COMPLETED
    );
  }
}
