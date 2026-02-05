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
import { Cohort } from '../../courses/entities/cohort.entity';
import { Classroom } from '../../courses/entities/classroom.entity';

/**
 * Estado de pago de la inscripción
 */
export enum PaymentStatus {
  PENDING = 'pending',
  PARTIAL = 'partial',
  COMPLETED = 'completed',
  REFUNDED = 'refunded',
}

/**
 * Estado de la inscripción
 */
export enum EnrollmentStatus {
  PENDING = 'pending',
  ACTIVE = 'active',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
  EXPIRED = 'expired',
}

/**
 * Inscripción de un estudiante a una convocatoria
 */
@Entity('enrollments')
@Index(['studentId'])
@Index(['cohortId'])
@Index(['classroomId'])
@Index(['status'])
@Index(['paymentStatus'])
@Index(['studentId', 'cohortId'], { unique: true })
export class Enrollment {
  @ApiProperty({
    example: '550e8400-e29b-41d4-a716-446655440000',
    description: 'ID único de la inscripción',
  })
  @PrimaryGeneratedColumn('uuid')
  id: string;

  // ============================================
  // RELACIONES
  // ============================================

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'studentId' })
  student: User;

  @Column({ type: 'uuid' })
  studentId: string;

  @ManyToOne(() => Cohort, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'cohortId' })
  cohort: Cohort;

  @Column({ type: 'uuid' })
  cohortId: string;

  @ManyToOne(() => Classroom, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'classroomId' })
  classroom: Classroom | null;

  @Column({ type: 'uuid', nullable: true })
  classroomId: string | null;

  // ============================================
  // FECHAS DE ACCESO
  // ============================================

  @ApiProperty({
    example: '2026-03-01',
    description: 'Fecha de inicio de acceso al curso',
  })
  @Column({ type: 'date' })
  accessStartDate: Date;

  @ApiProperty({
    example: '2026-09-01',
    description: 'Fecha de fin de acceso (null = acceso de por vida)',
    required: false,
  })
  @Column({ type: 'date', nullable: true })
  accessEndDate: Date | null;

  // ============================================
  // ESTADO DE PAGO
  // ============================================

  @ApiProperty({
    example: 'completed',
    description: 'Estado del pago',
    enum: PaymentStatus,
  })
  @Column({ type: 'enum', enum: PaymentStatus, default: PaymentStatus.PENDING })
  paymentStatus: PaymentStatus;

  @ApiProperty({
    example: 265.0,
    description: 'Total pagado hasta el momento',
  })
  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  totalPaid: number;

  // ============================================
  // ESTADO DE INSCRIPCIÓN
  // ============================================

  @ApiProperty({
    example: 'active',
    description: 'Estado de la inscripción',
    enum: EnrollmentStatus,
  })
  @Column({
    type: 'enum',
    enum: EnrollmentStatus,
    default: EnrollmentStatus.PENDING,
  })
  status: EnrollmentStatus;

  // ============================================
  // CERTIFICADO
  // ============================================

  @ApiProperty({
    example: '2026-06-15T10:00:00.000Z',
    description: 'Fecha de emisión del certificado',
    required: false,
  })
  @Column({ type: 'timestamp', nullable: true })
  certificateIssuedAt: Date | null;

  @ApiProperty({
    example: 'https://certificates.ultrasoundmedacademy.com/abc123.pdf',
    description: 'URL del certificado generado',
    required: false,
  })
  @Column({ type: 'text', nullable: true })
  certificateUrl: string | null;

  // ============================================
  // REFERIDO Y DESCUENTO
  // ============================================

  @ApiProperty({
    example: '550e8400-e29b-41d4-a716-446655440000',
    description: 'ID del referido (si aplica)',
    required: false,
  })
  @Column({ type: 'uuid', nullable: true })
  referralId: string | null;

  @ApiProperty({
    example: 30.0,
    description: 'Descuento aplicado por referido',
    required: false,
  })
  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  discountApplied: number | null;

  // ============================================
  // NOTAS
  // ============================================

  @ApiProperty({
    example: 'Estudiante requiere atención especial',
    description: 'Notas administrativas',
    required: false,
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

  constructor(partial: Partial<Enrollment>) {
    Object.assign(this, partial);
  }

  // ============================================
  // MÉTODOS HELPER
  // ============================================

  /**
   * Verifica si el acceso ha expirado
   */
  get isAccessExpired(): boolean {
    if (this.accessEndDate === null) return false; // Lifetime access
    return new Date() > new Date(this.accessEndDate);
  }

  /**
   * Verifica si la inscripción está activa
   */
  get isActive(): boolean {
    return this.status === EnrollmentStatus.ACTIVE && !this.isAccessExpired;
  }

  /**
   * Verifica si el pago está completo
   */
  get isPaymentComplete(): boolean {
    return this.paymentStatus === PaymentStatus.COMPLETED;
  }

  /**
   * Verifica si tiene certificado emitido
   */
  get hasCertificate(): boolean {
    return this.certificateIssuedAt !== null && this.certificateUrl !== null;
  }
}
