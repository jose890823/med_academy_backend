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
} from 'typeorm';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Course } from '../../courses/entities/course.entity';
import { CourseModule } from '../../courses/entities/course-module.entity';

/**
 * Tipo de evaluación
 */
export enum EvaluationType {
  QUIZ = 'quiz',
  MIDTERM = 'midterm',
  FINAL_EXAM = 'final_exam',
  ASSIGNMENT = 'assignment',
  PRACTICAL = 'practical',
}

/**
 * Evaluación de un curso
 */
@Entity('evaluations')
@Index(['courseId'])
@Index(['moduleId'])
@Index(['isPublished'])
@Index(['type'])
export class Evaluation {
  @ApiProperty({
    example: '550e8400-e29b-41d4-a716-446655440000',
    description: 'ID único de la evaluación',
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

  @ManyToOne(() => CourseModule, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'moduleId' })
  module: CourseModule | null;

  @Column({ type: 'uuid', nullable: true })
  moduleId: string | null;

  // ============================================
  // INFORMACIÓN BÁSICA
  // ============================================

  @ApiProperty({
    example: 'Quiz 1: Física Doppler',
    description: 'Título de la evaluación',
  })
  @Column({ type: 'varchar', length: 255 })
  title: string;

  @ApiPropertyOptional({
    example: 'Evalúa los conocimientos básicos de física Doppler',
    description: 'Descripción de la evaluación',
  })
  @Column({ type: 'text', nullable: true })
  description: string | null;

  @ApiProperty({
    example: 'quiz',
    description: 'Tipo de evaluación',
    enum: EvaluationType,
  })
  @Column({ type: 'enum', enum: EvaluationType, default: EvaluationType.QUIZ })
  type: EvaluationType;

  // ============================================
  // CONFIGURACIÓN
  // ============================================

  @ApiProperty({
    example: 100,
    description: 'Puntos totales de la evaluación',
  })
  @Column({ type: 'int', default: 100 })
  totalPoints: number;

  @ApiProperty({
    example: 70,
    description: 'Puntos mínimos para aprobar',
  })
  @Column({ type: 'int', default: 70 })
  passingScore: number;

  @ApiProperty({
    example: 3,
    description: 'Número máximo de intentos permitidos',
  })
  @Column({ type: 'int', default: 1 })
  maxAttempts: number;

  @ApiPropertyOptional({
    example: 60,
    description: 'Límite de tiempo en minutos (null = sin límite)',
  })
  @Column({ type: 'int', nullable: true })
  timeLimitMinutes: number | null;

  // ============================================
  // ORDEN Y ESTADO
  // ============================================

  @ApiProperty({
    example: 1,
    description: 'Orden de la evaluación en el curso',
  })
  @Column({ type: 'int', default: 0 })
  order: number;

  @ApiProperty({
    example: true,
    description: 'Si la evaluación está publicada y visible para estudiantes',
  })
  @Column({ type: 'boolean', default: false })
  isPublished: boolean;

  // ============================================
  // OPCIONES ADICIONALES
  // ============================================

  @ApiProperty({
    example: true,
    description: 'Si se muestran las respuestas correctas después de calificar',
  })
  @Column({ type: 'boolean', default: true })
  showCorrectAnswers: boolean;

  @ApiProperty({
    example: false,
    description: 'Si las preguntas se muestran en orden aleatorio',
  })
  @Column({ type: 'boolean', default: false })
  shuffleQuestions: boolean;

  @ApiProperty({
    example: false,
    description: 'Si las opciones de respuesta se muestran en orden aleatorio',
  })
  @Column({ type: 'boolean', default: false })
  shuffleOptions: boolean;

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

  constructor(partial: Partial<Evaluation>) {
    Object.assign(this, partial);
  }

  // ============================================
  // MÉTODOS HELPER
  // ============================================

  /**
   * Verifica si la evaluación tiene límite de tiempo
   */
  get hasTimeLimit(): boolean {
    return this.timeLimitMinutes !== null && this.timeLimitMinutes > 0;
  }

  /**
   * Verifica si es un examen (midterm o final)
   */
  get isExam(): boolean {
    return this.type === EvaluationType.MIDTERM || this.type === EvaluationType.FINAL_EXAM;
  }

  /**
   * Obtiene el porcentaje mínimo para aprobar
   */
  get passingPercentage(): number {
    return (this.passingScore / this.totalPoints) * 100;
  }
}
