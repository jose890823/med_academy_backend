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
import { WorkshopSession } from './workshop-session.entity';

/**
 * Estado de la inscripción
 */
export enum RegistrationStatus {
  PENDING = 'pending',           // Pendiente de pago
  CONFIRMED = 'confirmed',       // Confirmada y pagada
  WAITLIST = 'waitlist',         // En lista de espera
  CANCELLED = 'cancelled',       // Cancelada por el usuario
  REFUNDED = 'refunded',         // Reembolsada
  NO_SHOW = 'no_show',           // No se presentó
  ATTENDED = 'attended',         // Asistió al workshop
}

/**
 * Estado de pago de la inscripción
 */
export enum RegistrationPaymentStatus {
  PENDING = 'pending',
  COMPLETED = 'completed',
  REFUNDED = 'refunded',
  FAILED = 'failed',
}

/**
 * Inscripción a una sesión de workshop
 */
@Entity('workshop_registrations')
@Index(['sessionId'])
@Index(['userId'])
@Index(['status'])
@Index(['userId', 'sessionId'], { unique: true })
export class WorkshopRegistration {
  @ApiProperty({
    example: '550e8400-e29b-41d4-a716-446655440000',
    description: 'ID único de la inscripción',
  })
  @PrimaryGeneratedColumn('uuid')
  id: string;

  // ============================================
  // RELACIONES
  // ============================================

  @ManyToOne(() => WorkshopSession, (session) => session.registrations, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'sessionId' })
  session: WorkshopSession;

  @Column({ type: 'uuid' })
  sessionId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column({ type: 'uuid' })
  userId: string;

  // ============================================
  // ESTADO
  // ============================================

  @ApiProperty({
    example: 'confirmed',
    description: 'Estado de la inscripción',
    enum: RegistrationStatus,
  })
  @Column({ type: 'enum', enum: RegistrationStatus, default: RegistrationStatus.PENDING })
  status: RegistrationStatus;

  @ApiProperty({
    example: 'completed',
    description: 'Estado del pago',
    enum: RegistrationPaymentStatus,
  })
  @Column({ type: 'enum', enum: RegistrationPaymentStatus, default: RegistrationPaymentStatus.PENDING })
  paymentStatus: RegistrationPaymentStatus;

  // ============================================
  // PAGO
  // ============================================

  @ApiProperty({
    example: 350.0,
    description: 'Monto pagado',
  })
  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  amountPaid: number;

  @ApiProperty({
    example: 'pi_abc123',
    description: 'ID del PaymentIntent de Stripe',
    required: false,
  })
  @Column({ type: 'varchar', length: 100, nullable: true })
  stripePaymentIntentId: string | null;

  @ApiProperty({
    example: 50.0,
    description: 'Descuento aplicado',
  })
  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  discountApplied: number;

  @ApiProperty({
    example: 'Descuento estudiante vCourse',
    description: 'Razón del descuento',
    required: false,
  })
  @Column({ type: 'varchar', length: 200, nullable: true })
  discountReason: string | null;

  // ============================================
  // INFORMACIÓN DE CONTACTO (snapshot)
  // ============================================

  @ApiProperty({
    example: 'juan.perez@example.com',
    description: 'Email de contacto al momento de inscripción',
  })
  @Column({ type: 'varchar', length: 255 })
  contactEmail: string;

  @ApiProperty({
    example: '+1-305-555-1234',
    description: 'Teléfono de contacto',
    required: false,
  })
  @Column({ type: 'varchar', length: 30, nullable: true })
  contactPhone: string | null;

  @ApiProperty({
    example: 'Juan',
    description: 'Nombre al momento de inscripción',
  })
  @Column({ type: 'varchar', length: 100 })
  firstName: string;

  @ApiProperty({
    example: 'Pérez',
    description: 'Apellido al momento de inscripción',
  })
  @Column({ type: 'varchar', length: 100 })
  lastName: string;

  // ============================================
  // INFORMACIÓN DE EMERGENCIA
  // ============================================

  @ApiProperty({
    example: 'María Pérez',
    description: 'Nombre de contacto de emergencia',
    required: false,
  })
  @Column({ type: 'varchar', length: 200, nullable: true })
  emergencyContactName: string | null;

  @ApiProperty({
    example: '+1-305-555-5678',
    description: 'Teléfono de emergencia',
    required: false,
  })
  @Column({ type: 'varchar', length: 30, nullable: true })
  emergencyContactPhone: string | null;

  // ============================================
  // REQUISITOS ESPECIALES
  // ============================================

  @ApiProperty({
    example: 'Vegetariano, alergia a nueces',
    description: 'Requisitos dietéticos',
    required: false,
  })
  @Column({ type: 'text', nullable: true })
  dietaryRequirements: string | null;

  @ApiProperty({
    example: 'Necesito silla ergonómica',
    description: 'Necesidades de accesibilidad',
    required: false,
  })
  @Column({ type: 'text', nullable: true })
  accessibilityNeeds: string | null;

  @ApiProperty({
    example: 'Interesado especialmente en técnicas de Doppler',
    description: 'Notas adicionales del participante',
    required: false,
  })
  @Column({ type: 'text', nullable: true })
  notes: string | null;

  // ============================================
  // LISTA DE ESPERA
  // ============================================

  @ApiProperty({
    example: 1,
    description: 'Posición en lista de espera (null si no está en lista)',
    required: false,
  })
  @Column({ type: 'int', nullable: true })
  waitlistPosition: number | null;

  @ApiProperty({
    example: '2026-03-01T10:00:00.000Z',
    description: 'Fecha en que se agregó a lista de espera',
    required: false,
  })
  @Column({ type: 'timestamp', nullable: true })
  waitlistAddedAt: Date | null;

  // ============================================
  // ASISTENCIA
  // ============================================

  @ApiProperty({
    example: '2026-03-15T09:05:00.000Z',
    description: 'Fecha/hora de check-in',
    required: false,
  })
  @Column({ type: 'timestamp', nullable: true })
  checkedInAt: Date | null;

  @ApiProperty({
    example: '550e8400-e29b-41d4-a716-446655440000',
    description: 'ID del admin que hizo el check-in',
    required: false,
  })
  @Column({ type: 'uuid', nullable: true })
  checkedInBy: string | null;

  // ============================================
  // CERTIFICADO
  // ============================================

  @ApiProperty({
    example: '2026-03-15T18:00:00.000Z',
    description: 'Fecha de emisión del certificado',
    required: false,
  })
  @Column({ type: 'timestamp', nullable: true })
  certificateIssuedAt: Date | null;

  @ApiProperty({
    example: 'https://certificates.example.com/workshop-abc123.pdf',
    description: 'URL del certificado',
    required: false,
  })
  @Column({ type: 'text', nullable: true })
  certificateUrl: string | null;

  // ============================================
  // CANCELACIÓN
  // ============================================

  @ApiProperty({
    example: '2026-03-10T15:00:00.000Z',
    description: 'Fecha de cancelación',
    required: false,
  })
  @Column({ type: 'timestamp', nullable: true })
  cancelledAt: Date | null;

  @ApiProperty({
    example: 'Conflicto de agenda',
    description: 'Razón de cancelación',
    required: false,
  })
  @Column({ type: 'text', nullable: true })
  cancellationReason: string | null;

  @ApiProperty({
    example: 350.0,
    description: 'Monto reembolsado',
  })
  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  refundAmount: number;

  // ============================================
  // NOTAS ADMIN
  // ============================================

  @ApiProperty({
    example: 'VIP - trato especial',
    description: 'Notas internas del admin',
    required: false,
  })
  @Column({ type: 'text', nullable: true })
  adminNotes: string | null;

  // ============================================
  // TIMESTAMPS
  // ============================================

  @ApiProperty({ description: 'Fecha de inscripción' })
  @CreateDateColumn()
  createdAt: Date;

  @ApiProperty({ description: 'Fecha de última actualización' })
  @UpdateDateColumn()
  updatedAt: Date;

  // ============================================
  // CONSTRUCTOR
  // ============================================

  constructor(partial: Partial<WorkshopRegistration>) {
    Object.assign(this, partial);
  }

  // ============================================
  // MÉTODOS HELPER
  // ============================================

  /**
   * Verifica si está confirmado
   */
  get isConfirmed(): boolean {
    return this.status === RegistrationStatus.CONFIRMED;
  }

  /**
   * Verifica si está en lista de espera
   */
  get isOnWaitlist(): boolean {
    return this.status === RegistrationStatus.WAITLIST;
  }

  /**
   * Verifica si puede ser cancelado
   */
  get canCancel(): boolean {
    return (
      this.status === RegistrationStatus.PENDING ||
      this.status === RegistrationStatus.CONFIRMED ||
      this.status === RegistrationStatus.WAITLIST
    );
  }

  /**
   * Verifica si asistió
   */
  get hasAttended(): boolean {
    return this.status === RegistrationStatus.ATTENDED;
  }

  /**
   * Verifica si tiene certificado
   */
  get hasCertificate(): boolean {
    return this.certificateIssuedAt !== null && this.certificateUrl !== null;
  }

  /**
   * Verifica si el pago está completo
   */
  get isPaid(): boolean {
    return this.paymentStatus === RegistrationPaymentStatus.COMPLETED;
  }

  /**
   * Nombre completo del participante
   */
  get fullName(): string {
    return `${this.firstName} ${this.lastName}`;
  }
}
