import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
  Index,
  BeforeInsert,
} from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';
import { generateSystemCode } from '../../../common/utils/system-code-generator.util';
import { Course } from './course.entity';
import { Classroom } from './classroom.entity';

/**
 * Estado de la convocatoria
 */
export enum CohortStatus {
  DRAFT = 'draft',
  OPEN = 'open',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
}

/**
 * Convocatoria/Cohorte de un curso
 * Un curso puede tener múltiples convocatorias (ediciones)
 */
@Entity('cohorts')
@Index(['courseId'])
@Index(['status'])
@Index(['code'], { unique: true })
@Index(['startDate'])
@Index(['enrollmentStartDate', 'enrollmentEndDate'])
export class Cohort {
  @ApiProperty({
    example: '550e8400-e29b-41d4-a716-446655440000',
    description: 'ID único de la convocatoria',
  })
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ApiProperty({
    example: 'COH-260206-A3K7',
    description: 'Codigo unico legible del sistema',
  })
  @Column({ type: 'varchar', length: 20, unique: true, nullable: true })
  @Index()
  systemCode: string;

  @BeforeInsert()
  generateSystemCode() {
    if (!this.systemCode) {
      this.systemCode = generateSystemCode('Cohort');
    }
  }

  // ============================================
  // IDENTIFICACIÓN
  // ============================================

  @ApiProperty({
    example: 'Marzo 2026',
    description: 'Nombre de la convocatoria',
  })
  @Column({ type: 'varchar', length: 100 })
  name: string;

  @ApiProperty({
    example: 'VASC-2026-03',
    description: 'Código único de la convocatoria',
  })
  @Column({ type: 'varchar', length: 50, unique: true })
  code: string;

  // ============================================
  // FECHAS
  // ============================================

  @ApiProperty({
    example: '2026-02-01',
    description: 'Fecha de inicio de inscripciones',
  })
  @Column({ type: 'date' })
  enrollmentStartDate: Date;

  @ApiProperty({
    example: '2026-02-28',
    description: 'Fecha de fin de inscripciones',
  })
  @Column({ type: 'date' })
  enrollmentEndDate: Date;

  @ApiProperty({
    example: '2026-03-01',
    description: 'Fecha de inicio del curso',
  })
  @Column({ type: 'date' })
  startDate: Date;

  @ApiProperty({
    example: '2026-05-31',
    description: 'Fecha de fin del curso',
  })
  @Column({ type: 'date' })
  endDate: Date;

  // ============================================
  // CAPACIDAD
  // ============================================

  @ApiProperty({
    example: 100,
    description: 'Cupo máximo total de la convocatoria',
    required: false,
  })
  @Column({ type: 'int', nullable: true })
  maxStudents: number | null;

  @ApiProperty({
    example: 45,
    description: 'Número actual de estudiantes inscritos',
  })
  @Column({ type: 'int', default: 0 })
  currentStudents: number;

  // ============================================
  // PRECIOS (Override del curso)
  // ============================================

  @ApiProperty({
    example: 299.0,
    description: 'Precio especial para esta convocatoria (override del curso)',
    required: false,
  })
  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  customPrice: number | null;

  @ApiProperty({
    example: 249.0,
    description: 'Precio de oferta especial para esta convocatoria',
    required: false,
  })
  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  customSalePrice: number | null;

  // ============================================
  // ESTADO
  // ============================================

  @ApiProperty({
    example: 'open',
    description: 'Estado de la convocatoria',
    enum: CohortStatus,
  })
  @Column({ type: 'enum', enum: CohortStatus, default: CohortStatus.DRAFT })
  status: CohortStatus;

  // ============================================
  // RELACIONES
  // ============================================

  @ManyToOne(() => Course, (course) => course.cohorts, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'courseId' })
  course: Course;

  @Column({ type: 'uuid' })
  courseId: string;

  @OneToMany(() => Classroom, (classroom) => classroom.cohort)
  classrooms: Classroom[];

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

  constructor(partial: Partial<Cohort>) {
    Object.assign(this, partial);
  }

  // ============================================
  // MÉTODOS HELPER
  // ============================================

  /**
   * Verifica si las inscripciones están abiertas
   */
  get isEnrollmentOpen(): boolean {
    const now = new Date();
    return (
      this.status === CohortStatus.OPEN &&
      now >= new Date(this.enrollmentStartDate) &&
      now <= new Date(this.enrollmentEndDate)
    );
  }

  /**
   * Verifica si hay cupo disponible
   */
  get hasAvailableSpots(): boolean {
    if (this.maxStudents === null) return true;
    return this.currentStudents < this.maxStudents;
  }

  /**
   * Obtiene los cupos disponibles
   */
  get availableSpots(): number | null {
    if (this.maxStudents === null) return null;
    return Math.max(0, this.maxStudents - this.currentStudents);
  }

  /**
   * Verifica si el curso está en progreso
   */
  get isInProgress(): boolean {
    return this.status === CohortStatus.IN_PROGRESS;
  }
}
