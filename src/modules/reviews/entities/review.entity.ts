import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
  Unique,
} from 'typeorm';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Course } from '../../courses/entities/course.entity';
import { User } from '../../auth/entities/user.entity';

/**
 * Estado de la review
 */
export enum ReviewStatus {
  PENDING = 'pending', // Pendiente de moderación
  APPROVED = 'approved', // Aprobada y visible
  REJECTED = 'rejected', // Rechazada por moderación
  HIDDEN = 'hidden', // Oculta por el usuario o admin
}

/**
 * Review de un curso por un estudiante
 */
@Entity('reviews')
@Index(['courseId'])
@Index(['studentId'])
@Index(['status'])
@Index(['rating'])
@Index(['createdAt'])
@Unique(['courseId', 'studentId']) // Un review por estudiante por curso
export class Review {
  @ApiProperty({
    example: '550e8400-e29b-41d4-a716-446655440000',
    description: 'ID único del review',
  })
  @PrimaryGeneratedColumn('uuid')
  id: string;

  // ============================================
  // RELACIONES
  // ============================================

  @ManyToOne(() => Course, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'courseId' })
  course: Course;

  @Column({ type: 'uuid' })
  courseId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'studentId' })
  student: User;

  @Column({ type: 'uuid' })
  studentId: string;

  // ============================================
  // CALIFICACIÓN
  // ============================================

  @ApiProperty({
    example: 5,
    description: 'Calificación de 1 a 5 estrellas',
    minimum: 1,
    maximum: 5,
  })
  @Column({ type: 'smallint' })
  rating: number;

  @ApiPropertyOptional({
    example: 'Excelente curso, muy completo y bien explicado.',
    description: 'Comentario del estudiante',
  })
  @Column({ type: 'text', nullable: true })
  comment: string | null;

  @ApiPropertyOptional({
    example: 'El contenido de física Doppler fue lo mejor del curso.',
    description: 'Título del review',
  })
  @Column({ type: 'varchar', length: 255, nullable: true })
  title: string | null;

  // ============================================
  // ESTADO Y MODERACIÓN
  // ============================================

  @ApiProperty({
    example: 'approved',
    description: 'Estado del review',
    enum: ReviewStatus,
  })
  @Column({ type: 'enum', enum: ReviewStatus, default: ReviewStatus.APPROVED })
  status: ReviewStatus;

  @ApiPropertyOptional({
    example: 'Contenido inapropiado',
    description: 'Razón de rechazo (si aplica)',
  })
  @Column({ type: 'text', nullable: true })
  rejectionReason: string | null;

  @ApiPropertyOptional({
    description: 'Moderador que aprobó/rechazó',
  })
  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'moderatedById' })
  moderatedBy: User | null;

  @Column({ type: 'uuid', nullable: true })
  moderatedById: string | null;

  @ApiPropertyOptional({ description: 'Fecha de moderación' })
  @Column({ type: 'timestamp', nullable: true })
  moderatedAt: Date | null;

  // ============================================
  // ENGAGEMENT
  // ============================================

  @ApiProperty({
    example: 12,
    description: 'Número de votos de utilidad',
  })
  @Column({ type: 'int', default: 0 })
  helpfulCount: number;

  @ApiProperty({
    example: false,
    description: 'Si el review está destacado',
  })
  @Column({ type: 'boolean', default: false })
  isFeatured: boolean;

  // ============================================
  // RESPUESTA DEL INSTRUCTOR
  // ============================================

  @ApiPropertyOptional({
    example: 'Gracias por tu feedback, nos alegra que te haya gustado!',
    description: 'Respuesta del instructor',
  })
  @Column({ type: 'text', nullable: true })
  instructorResponse: string | null;

  @ApiPropertyOptional({ description: 'Fecha de respuesta del instructor' })
  @Column({ type: 'timestamp', nullable: true })
  respondedAt: Date | null;

  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'respondedById' })
  respondedBy: User | null;

  @Column({ type: 'uuid', nullable: true })
  respondedById: string | null;

  // ============================================
  // VERIFICACIÓN
  // ============================================

  @ApiProperty({
    example: true,
    description: 'Si el estudiante completó el curso (verificado)',
  })
  @Column({ type: 'boolean', default: false })
  isVerifiedPurchase: boolean;

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

  constructor(partial: Partial<Review>) {
    Object.assign(this, partial);
  }

  // ============================================
  // MÉTODOS HELPER
  // ============================================

  /**
   * Verifica si el review está visible
   */
  get isVisible(): boolean {
    return this.status === ReviewStatus.APPROVED;
  }

  /**
   * Verifica si tiene respuesta del instructor
   */
  get hasResponse(): boolean {
    return !!this.instructorResponse;
  }

  /**
   * Incrementa el contador de votos de utilidad
   */
  incrementHelpfulCount(): void {
    this.helpfulCount += 1;
  }
}
