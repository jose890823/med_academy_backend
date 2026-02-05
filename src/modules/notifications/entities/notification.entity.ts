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
import { User } from '../../auth/entities/user.entity';

/**
 * Tipo de notificación
 */
export enum NotificationType {
  // Inscripciones
  ENROLLMENT_CREATED = 'enrollment_created',
  ENROLLMENT_CONFIRMED = 'enrollment_confirmed',
  ENROLLMENT_EXPIRED = 'enrollment_expired',
  ENROLLMENT_EXPIRING_SOON = 'enrollment_expiring_soon',

  // Pagos
  PAYMENT_RECEIVED = 'payment_received',
  PAYMENT_FAILED = 'payment_failed',
  PAYMENT_REMINDER = 'payment_reminder',
  REFUND_PROCESSED = 'refund_processed',

  // Evaluaciones
  EVALUATION_AVAILABLE = 'evaluation_available',
  EVALUATION_GRADED = 'evaluation_graded',
  EVALUATION_DEADLINE = 'evaluation_deadline',

  // Certificados
  CERTIFICATE_ISSUED = 'certificate_issued',
  CERTIFICATE_EXPIRING = 'certificate_expiring',

  // Workshops
  WORKSHOP_REMINDER = 'workshop_reminder',
  WORKSHOP_REGISTRATION = 'workshop_registration',
  WORKSHOP_CANCELLED = 'workshop_cancelled',
  WORKSHOP_CERTIFICATE = 'workshop_certificate',

  // Progreso
  ACHIEVEMENT_EARNED = 'achievement_earned',
  COURSE_COMPLETED = 'course_completed',
  MODULE_COMPLETED = 'module_completed',

  // Sistema
  SYSTEM_ANNOUNCEMENT = 'system_announcement',
  ACCOUNT_SECURITY = 'account_security',
  PASSWORD_CHANGED = 'password_changed',

  // Referidos
  REFERRAL_USED = 'referral_used',
  REFERRAL_REWARD = 'referral_reward',

  // General
  WELCOME = 'welcome',
  CUSTOM = 'custom',
}

/**
 * Canal de entrega de la notificación
 */
export enum NotificationChannel {
  IN_APP = 'in_app',
  EMAIL = 'email',
  SMS = 'sms',
  PUSH = 'push',
}

/**
 * Prioridad de la notificación
 */
export enum NotificationPriority {
  LOW = 'low',
  NORMAL = 'normal',
  HIGH = 'high',
  URGENT = 'urgent',
}

/**
 * Estado de la notificación
 */
export enum NotificationStatus {
  PENDING = 'pending',
  SENT = 'sent',
  DELIVERED = 'delivered',
  READ = 'read',
  FAILED = 'failed',
}

/**
 * Notificación enviada a un usuario
 */
@Entity('notifications')
@Index(['userId'])
@Index(['type'])
@Index(['status'])
@Index(['isRead'])
@Index(['createdAt'])
@Index(['userId', 'isRead'])
export class Notification {
  @ApiProperty({
    example: '550e8400-e29b-41d4-a716-446655440000',
    description: 'ID único de la notificación',
  })
  @PrimaryGeneratedColumn('uuid')
  id: string;

  // ============================================
  // USUARIO DESTINATARIO
  // ============================================

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column({ type: 'uuid' })
  userId: string;

  // ============================================
  // TIPO Y CANAL
  // ============================================

  @ApiProperty({
    example: 'enrollment_confirmed',
    description: 'Tipo de notificación',
    enum: NotificationType,
  })
  @Column({ type: 'enum', enum: NotificationType })
  type: NotificationType;

  @ApiProperty({
    example: 'in_app',
    description: 'Canal de entrega',
    enum: NotificationChannel,
  })
  @Column({ type: 'enum', enum: NotificationChannel, default: NotificationChannel.IN_APP })
  channel: NotificationChannel;

  @ApiProperty({
    example: 'normal',
    description: 'Prioridad',
    enum: NotificationPriority,
  })
  @Column({ type: 'enum', enum: NotificationPriority, default: NotificationPriority.NORMAL })
  priority: NotificationPriority;

  @ApiProperty({
    example: 'sent',
    description: 'Estado de la notificación',
    enum: NotificationStatus,
  })
  @Column({ type: 'enum', enum: NotificationStatus, default: NotificationStatus.PENDING })
  status: NotificationStatus;

  // ============================================
  // CONTENIDO
  // ============================================

  @ApiProperty({
    example: 'Inscripción confirmada',
    description: 'Título de la notificación',
  })
  @Column({ type: 'varchar', length: 255 })
  title: string;

  @ApiProperty({
    example: 'Tu inscripción al curso Vascular Sonography ha sido confirmada.',
    description: 'Mensaje de la notificación',
  })
  @Column({ type: 'text' })
  message: string;

  @ApiProperty({
    example: '/courses/vascular-sonography',
    description: 'URL de acción (opcional)',
    required: false,
  })
  @Column({ type: 'varchar', length: 500, nullable: true })
  actionUrl: string | null;

  @ApiProperty({
    example: 'Ver curso',
    description: 'Texto del botón de acción',
    required: false,
  })
  @Column({ type: 'varchar', length: 100, nullable: true })
  actionText: string | null;

  @ApiProperty({
    example: 'graduation-cap',
    description: 'Icono de la notificación (nombre del icono)',
    required: false,
  })
  @Column({ type: 'varchar', length: 50, nullable: true })
  icon: string | null;

  // ============================================
  // ESTADO DE LECTURA
  // ============================================

  @ApiProperty({
    example: false,
    description: 'Si la notificación ha sido leída',
  })
  @Column({ type: 'boolean', default: false })
  isRead: boolean;

  @ApiProperty({
    example: '2026-02-05T10:00:00.000Z',
    description: 'Fecha de lectura',
    required: false,
  })
  @Column({ type: 'timestamp', nullable: true })
  readAt: Date | null;

  // ============================================
  // ENTREGA
  // ============================================

  @ApiProperty({
    example: '2026-02-05T10:00:00.000Z',
    description: 'Fecha de envío',
    required: false,
  })
  @Column({ type: 'timestamp', nullable: true })
  sentAt: Date | null;

  @ApiProperty({
    example: '2026-02-05T10:00:05.000Z',
    description: 'Fecha de entrega confirmada',
    required: false,
  })
  @Column({ type: 'timestamp', nullable: true })
  deliveredAt: Date | null;

  @ApiProperty({
    example: 'Email bounced',
    description: 'Razón de fallo (si aplica)',
    required: false,
  })
  @Column({ type: 'text', nullable: true })
  failureReason: string | null;

  @ApiProperty({
    example: 0,
    description: 'Número de reintentos',
  })
  @Column({ type: 'int', default: 0 })
  retryCount: number;

  // ============================================
  // METADATA Y REFERENCIA
  // ============================================

  @ApiProperty({
    example: '550e8400-e29b-41d4-a716-446655440000',
    description: 'ID de la entidad relacionada (enrollment, certificate, etc.)',
    required: false,
  })
  @Column({ type: 'uuid', nullable: true })
  referenceId: string | null;

  @ApiProperty({
    example: 'enrollment',
    description: 'Tipo de entidad relacionada',
    required: false,
  })
  @Column({ type: 'varchar', length: 50, nullable: true })
  referenceType: string | null;

  @ApiProperty({
    description: 'Metadata adicional',
    required: false,
  })
  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, any> | null;

  // ============================================
  // EXPIRACIÓN
  // ============================================

  @ApiProperty({
    example: '2026-02-12T10:00:00.000Z',
    description: 'Fecha de expiración de la notificación',
    required: false,
  })
  @Column({ type: 'timestamp', nullable: true })
  expiresAt: Date | null;

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

  constructor(partial: Partial<Notification>) {
    Object.assign(this, partial);
  }

  // ============================================
  // MÉTODOS HELPER
  // ============================================

  /**
   * Verifica si la notificación ha expirado
   */
  get isExpired(): boolean {
    if (!this.expiresAt) return false;
    return new Date() > new Date(this.expiresAt);
  }

  /**
   * Marca como leída
   */
  markAsRead(): void {
    this.isRead = true;
    this.readAt = new Date();
    this.status = NotificationStatus.READ;
  }
}
