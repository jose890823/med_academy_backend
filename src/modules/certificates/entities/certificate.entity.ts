import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
  BeforeInsert,
} from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';
import { User } from '../../auth/entities/user.entity';
import { Enrollment } from '../../enrollments/entities/enrollment.entity';
import { generateSystemCode } from '../../../common/utils/system-code-generator.util';

/**
 * Tipo de certificado
 */
export enum CertificateType {
  COURSE_COMPLETION = 'course_completion',
  WORKSHOP_ATTENDANCE = 'workshop_attendance',
  CERTIFICATION_EXAM = 'certification_exam',
  CONTINUING_EDUCATION = 'continuing_education',
}

/**
 * Estado del certificado
 */
export enum CertificateStatus {
  PENDING = 'pending',
  GENERATED = 'generated',
  REVOKED = 'revoked',
}

/**
 * Certificado emitido a un estudiante
 */
@Entity('certificates')
@Index(['certificateNumber'], { unique: true })
@Index(['verificationCode'], { unique: true })
@Index(['studentId'])
@Index(['enrollmentId'])
@Index(['status'])
@Index(['type'])
export class Certificate {
  @ApiProperty({
    example: '550e8400-e29b-41d4-a716-446655440000',
    description: 'ID único del certificado',
  })
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ApiProperty({
    example: 'CRT-260206-A3K7',
    description: 'Codigo unico legible del sistema',
  })
  @Column({ type: 'varchar', length: 20, unique: true, nullable: true })
  @Index()
  systemCode: string;

  @BeforeInsert()
  generateSystemCode() {
    if (!this.systemCode) {
      this.systemCode = generateSystemCode('Certificate');
    }
  }

  // ============================================
  // IDENTIFICADORES ÚNICOS
  // ============================================

  @ApiProperty({
    example: 'CERT-2026-001234',
    description: 'Número único del certificado (formato: CERT-YYYY-NNNNNN)',
  })
  @Column({ type: 'varchar', length: 50, unique: true })
  certificateNumber: string;

  @ApiProperty({
    example: 'ABC123XYZ',
    description: 'Código de verificación corto (para QR y validación manual)',
  })
  @Column({ type: 'varchar', length: 20, unique: true })
  verificationCode: string;

  // ============================================
  // RELACIONES
  // ============================================

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'studentId' })
  student: User;

  @Column({ type: 'uuid' })
  studentId: string;

  @ManyToOne(() => Enrollment, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'enrollmentId' })
  enrollment: Enrollment | null;

  @Column({ type: 'uuid', nullable: true })
  enrollmentId: string | null;

  // ============================================
  // TIPO Y ESTADO
  // ============================================

  @ApiProperty({
    example: 'course_completion',
    description: 'Tipo de certificado',
    enum: CertificateType,
  })
  @Column({ type: 'enum', enum: CertificateType })
  type: CertificateType;

  @ApiProperty({
    example: 'generated',
    description: 'Estado del certificado',
    enum: CertificateStatus,
  })
  @Column({
    type: 'enum',
    enum: CertificateStatus,
    default: CertificateStatus.PENDING,
  })
  status: CertificateStatus;

  // ============================================
  // DATOS DEL ESTUDIANTE (snapshot al momento de emisión)
  // ============================================

  @ApiProperty({
    example: 'John',
    description: 'Nombre del estudiante al momento de emisión',
  })
  @Column({ type: 'varchar', length: 255 })
  studentFirstName: string;

  @ApiProperty({
    example: 'Doe',
    description: 'Apellido del estudiante al momento de emisión',
  })
  @Column({ type: 'varchar', length: 255 })
  studentLastName: string;

  @ApiProperty({
    example: 'john.doe@example.com',
    description: 'Email del estudiante al momento de emisión',
  })
  @Column({ type: 'varchar', length: 255 })
  studentEmail: string;

  // ============================================
  // DATOS DEL CURSO/PROGRAMA
  // ============================================

  @ApiProperty({
    example: 'Vascular Sonography Certification',
    description: 'Nombre del curso/programa',
  })
  @Column({ type: 'varchar', length: 500 })
  programName: string;

  @ApiProperty({
    example: 'A comprehensive program covering...',
    description: 'Descripción breve del programa',
    required: false,
  })
  @Column({ type: 'text', nullable: true })
  programDescription: string | null;

  @ApiProperty({
    example: 40,
    description: 'Horas de instrucción/créditos',
    required: false,
  })
  @Column({ type: 'decimal', precision: 6, scale: 2, nullable: true })
  instructionHours: number | null;

  @ApiProperty({
    example: 4.0,
    description: 'Créditos CME/CEU otorgados',
    required: false,
  })
  @Column({ type: 'decimal', precision: 6, scale: 2, nullable: true })
  cmeCredits: number | null;

  // ============================================
  // FECHAS
  // ============================================

  @ApiProperty({
    example: '2026-01-15',
    description: 'Fecha de inicio del programa',
    required: false,
  })
  @Column({ type: 'date', nullable: true })
  programStartDate: Date | null;

  @ApiProperty({
    example: '2026-06-15',
    description: 'Fecha de finalización del programa',
  })
  @Column({ type: 'date' })
  completionDate: Date;

  @ApiProperty({
    example: '2026-06-15T14:30:00.000Z',
    description: 'Fecha de emisión del certificado',
  })
  @Column({ type: 'timestamp' })
  issuedAt: Date;

  @ApiProperty({
    example: '2029-06-15',
    description: 'Fecha de expiración (null = no expira)',
    required: false,
  })
  @Column({ type: 'date', nullable: true })
  expiresAt: Date | null;

  // ============================================
  // CALIFICACIÓN
  // ============================================

  @ApiProperty({
    example: 92.5,
    description: 'Calificación final obtenida',
    required: false,
  })
  @Column({ type: 'decimal', precision: 5, scale: 2, nullable: true })
  finalGrade: number | null;

  @ApiProperty({
    example: 'Pass',
    description: 'Calificación como letra (Pass, Fail, A, B, etc.)',
    required: false,
  })
  @Column({ type: 'varchar', length: 20, nullable: true })
  gradeLabel: string | null;

  // ============================================
  // ARCHIVOS
  // ============================================

  @ApiProperty({
    example: 'https://storage.example.com/certificates/CERT-2026-001234.pdf',
    description: 'URL del PDF del certificado',
    required: false,
  })
  @Column({ type: 'text', nullable: true })
  pdfUrl: string | null;

  @ApiProperty({
    example: 'data:image/png;base64,...',
    description: 'QR code en base64 para verificación',
    required: false,
  })
  @Column({ type: 'text', nullable: true })
  qrCode: string | null;

  // ============================================
  // AUTORIDAD EMISORA
  // ============================================

  @ApiProperty({
    example: 'Ultrasound MedAcademy',
    description: 'Nombre de la institución emisora',
  })
  @Column({ type: 'varchar', length: 255, default: 'Ultrasound MedAcademy' })
  issuingAuthority: string;

  @ApiProperty({
    example: 'Dr. Jane Smith',
    description: 'Nombre del firmante autorizado',
    required: false,
  })
  @Column({ type: 'varchar', length: 255, nullable: true })
  authorizedSignatory: string | null;

  @ApiProperty({
    example: 'Director of Education',
    description: 'Título del firmante',
    required: false,
  })
  @Column({ type: 'varchar', length: 255, nullable: true })
  signatoryTitle: string | null;

  // ============================================
  // CERTIFICACIONES ASOCIADAS
  // ============================================

  @ApiProperty({
    example: ['ARDMS', 'ARRT'],
    description: 'Certificaciones profesionales asociadas',
    required: false,
  })
  @Column({ type: 'simple-array', nullable: true })
  associatedCertifications: string[] | null;

  // ============================================
  // REVOCACIÓN
  // ============================================

  @ApiProperty({
    example: '2026-08-01T10:00:00.000Z',
    description: 'Fecha de revocación (si aplica)',
    required: false,
  })
  @Column({ type: 'timestamp', nullable: true })
  revokedAt: Date | null;

  @ApiProperty({
    example: 'Academic misconduct',
    description: 'Razón de revocación',
    required: false,
  })
  @Column({ type: 'text', nullable: true })
  revocationReason: string | null;

  @Column({ type: 'uuid', nullable: true })
  revokedBy: string | null;

  // ============================================
  // METADATA
  // ============================================

  @ApiProperty({
    description: 'Metadata adicional del certificado',
    required: false,
  })
  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, any> | null;

  // ============================================
  // TIMESTAMPS
  // ============================================

  @ApiProperty({ description: 'Fecha de creación del registro' })
  @CreateDateColumn()
  createdAt: Date;

  @ApiProperty({ description: 'Fecha de última actualización' })
  @UpdateDateColumn()
  updatedAt: Date;

  // ============================================
  // CONSTRUCTOR
  // ============================================

  constructor(partial: Partial<Certificate>) {
    Object.assign(this, partial);
  }

  // ============================================
  // MÉTODOS HELPER
  // ============================================

  /**
   * Nombre completo del estudiante
   */
  get studentFullName(): string {
    return `${this.studentFirstName} ${this.studentLastName}`;
  }

  /**
   * Verifica si el certificado está activo
   */
  get isValid(): boolean {
    if (this.status !== CertificateStatus.GENERATED) return false;
    if (this.expiresAt && new Date() > new Date(this.expiresAt)) return false;
    return true;
  }

  /**
   * Verifica si el certificado ha expirado
   */
  get isExpired(): boolean {
    if (!this.expiresAt) return false;
    return new Date() > new Date(this.expiresAt);
  }

  /**
   * URL de verificación pública
   */
  get verificationUrl(): string {
    return `https://ultrasoundmedacademy.com/verify/${this.verificationCode}`;
  }
}
