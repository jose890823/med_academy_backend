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
import { Cohort } from './cohort.entity';
import { ClassroomInstructor } from './classroom-instructor.entity';

/**
 * Aula Virtual
 * Cada convocatoria puede tener múltiples aulas virtuales
 */
@Entity('classrooms')
@Index(['cohortId'])
@Index(['isActive'])
export class Classroom {
  @ApiProperty({
    example: '550e8400-e29b-41d4-a716-446655440000',
    description: 'ID único del aula',
  })
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ApiProperty({
    example: 'CLA-260206-A3K7',
    description: 'Codigo unico legible del sistema',
  })
  @Column({ type: 'varchar', length: 20, unique: true, nullable: true })
  @Index()
  systemCode: string;

  @BeforeInsert()
  generateSystemCode() {
    if (!this.systemCode) {
      this.systemCode = generateSystemCode('Classroom');
    }
  }

  @ApiProperty({
    example: 'Aula A',
    description: 'Nombre del aula',
  })
  @Column({ type: 'varchar', length: 100 })
  name: string;

  @ApiProperty({
    example: 30,
    description: 'Capacidad máxima de estudiantes',
  })
  @Column({ type: 'int', default: 30 })
  maxStudents: number;

  @ApiProperty({
    example: 15,
    description: 'Número actual de estudiantes asignados',
  })
  @Column({ type: 'int', default: 0 })
  currentStudents: number;

  // ============================================
  // HORARIO Y ACCESO
  // ============================================

  @ApiProperty({
    example: 'Lunes y Miércoles 7pm EST',
    description: 'Horario específico del aula',
    required: false,
  })
  @Column({ type: 'varchar', length: 200, nullable: true })
  schedule: string | null;

  @ApiProperty({
    example: 'https://zoom.us/j/123456789',
    description: 'URL de la reunión virtual (Zoom, Meet, etc.)',
    required: false,
  })
  @Column({ type: 'text', nullable: true })
  meetingUrl: string | null;

  @ApiProperty({
    example: '123456',
    description: 'ID de la reunión (si aplica)',
    required: false,
  })
  @Column({ type: 'varchar', length: 50, nullable: true })
  meetingId: string | null;

  @ApiProperty({
    example: 'abc123',
    description: 'Contraseña de la reunión (si aplica)',
    required: false,
  })
  @Column({ type: 'varchar', length: 50, nullable: true })
  meetingPassword: string | null;

  // ============================================
  // ESTADO
  // ============================================

  @ApiProperty({
    example: true,
    description: 'Indica si el aula está activa',
  })
  @Column({ type: 'boolean', default: true })
  isActive: boolean;

  // ============================================
  // RELACIONES
  // ============================================

  @ManyToOne(() => Cohort, (cohort) => cohort.classrooms, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'cohortId' })
  cohort: Cohort;

  @Column({ type: 'uuid' })
  cohortId: string;

  @OneToMany(() => ClassroomInstructor, (ci) => ci.classroom)
  instructors: ClassroomInstructor[];

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

  constructor(partial: Partial<Classroom>) {
    Object.assign(this, partial);
  }

  // ============================================
  // MÉTODOS HELPER
  // ============================================

  /**
   * Verifica si hay cupo disponible en el aula
   */
  get hasAvailableSpots(): boolean {
    return this.currentStudents < this.maxStudents;
  }

  /**
   * Obtiene los cupos disponibles
   */
  get availableSpots(): number {
    return Math.max(0, this.maxStudents - this.currentStudents);
  }

  /**
   * Verifica si el aula está llena
   */
  get isFull(): boolean {
    return this.currentStudents >= this.maxStudents;
  }
}
