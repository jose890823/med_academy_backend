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
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Evaluation } from './evaluation.entity';
import { generateSystemCode } from '../../../common/utils/system-code-generator.util';

/**
 * Tipo de pregunta
 */
export enum QuestionType {
  MULTIPLE_CHOICE = 'multiple_choice',
  TRUE_FALSE = 'true_false',
  SHORT_ANSWER = 'short_answer',
  ESSAY = 'essay',
}

/**
 * Opción de respuesta para preguntas de opción múltiple
 */
export interface QuestionOption {
  id: string;
  text: string;
  isCorrect: boolean;
}

/**
 * Pregunta de una evaluación
 */
@Entity('questions')
@Index(['evaluationId'])
@Index(['questionType'])
export class Question {
  @ApiProperty({
    example: '550e8400-e29b-41d4-a716-446655440000',
    description: 'ID único de la pregunta',
  })
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ApiProperty({
    example: 'QST-260206-A3K7',
    description: 'Codigo unico legible del sistema',
  })
  @Column({ type: 'varchar', length: 20, unique: true, nullable: true })
  @Index()
  systemCode: string;

  @BeforeInsert()
  generateSystemCode() {
    if (!this.systemCode) {
      this.systemCode = generateSystemCode('Question');
    }
  }

  // ============================================
  // RELACIONES
  // ============================================

  @ManyToOne(() => Evaluation, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'evaluationId' })
  evaluation: Evaluation;

  @Column({ type: 'uuid' })
  evaluationId: string;

  // ============================================
  // CONTENIDO
  // ============================================

  @ApiProperty({
    example: '¿Cuál es la velocidad del sonido en tejido blando?',
    description: 'Texto de la pregunta',
  })
  @Column({ type: 'text' })
  questionText: string;

  @ApiProperty({
    example: 'multiple_choice',
    description: 'Tipo de pregunta',
    enum: QuestionType,
  })
  @Column({
    type: 'enum',
    enum: QuestionType,
    default: QuestionType.MULTIPLE_CHOICE,
  })
  questionType: QuestionType;

  // ============================================
  // OPCIONES (para multiple choice y true/false)
  // ============================================

  @ApiPropertyOptional({
    description: 'Opciones de respuesta (para multiple_choice y true_false)',
    example: [
      { id: 'a', text: '1540 m/s', isCorrect: true },
      { id: 'b', text: '1000 m/s', isCorrect: false },
      { id: 'c', text: '2000 m/s', isCorrect: false },
      { id: 'd', text: '3000 m/s', isCorrect: false },
    ],
  })
  @Column({ type: 'jsonb', nullable: true })
  options: QuestionOption[] | null;

  @ApiPropertyOptional({
    example: '1540 m/s',
    description: 'Respuesta correcta (para short_answer)',
  })
  @Column({ type: 'text', nullable: true })
  correctAnswer: string | null;

  // ============================================
  // PUNTUACIÓN
  // ============================================

  @ApiProperty({
    example: 10,
    description: 'Puntos que vale la pregunta',
  })
  @Column({ type: 'int', default: 10 })
  points: number;

  // ============================================
  // AYUDA Y EXPLICACIÓN
  // ============================================

  @ApiPropertyOptional({
    example: 'Recuerda la fórmula de velocidad en medios acústicos',
    description: 'Pista para el estudiante',
  })
  @Column({ type: 'text', nullable: true })
  hint: string | null;

  @ApiPropertyOptional({
    example: 'La velocidad promedio del sonido en tejido blando es 1540 m/s',
    description:
      'Explicación de la respuesta correcta (mostrada después de calificar)',
  })
  @Column({ type: 'text', nullable: true })
  explanation: string | null;

  // ============================================
  // MEDIA (opcional)
  // ============================================

  @ApiPropertyOptional({
    example: 'https://storage.example.com/images/doppler-wave.png',
    description: 'URL de imagen asociada a la pregunta',
  })
  @Column({ type: 'text', nullable: true })
  imageUrl: string | null;

  // ============================================
  // ORDEN
  // ============================================

  @ApiProperty({
    example: 1,
    description: 'Orden de la pregunta en la evaluación',
  })
  @Column({ type: 'int', default: 0 })
  order: number;

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

  constructor(partial: Partial<Question>) {
    Object.assign(this, partial);
  }

  // ============================================
  // MÉTODOS HELPER
  // ============================================

  /**
   * Verifica si la pregunta tiene opciones
   */
  get hasOptions(): boolean {
    return (
      this.questionType === QuestionType.MULTIPLE_CHOICE ||
      this.questionType === QuestionType.TRUE_FALSE
    );
  }

  /**
   * Verifica si la pregunta requiere calificación manual
   */
  get requiresManualGrading(): boolean {
    return (
      this.questionType === QuestionType.SHORT_ANSWER ||
      this.questionType === QuestionType.ESSAY
    );
  }

  /**
   * Obtiene la opción correcta (para multiple choice)
   */
  get correctOption(): QuestionOption | null {
    if (!this.options) return null;
    return this.options.find((opt) => opt.isCorrect) || null;
  }

  /**
   * Verifica si una respuesta es correcta (para auto-calificación)
   */
  isAnswerCorrect(selectedOptionId: string): boolean {
    if (
      this.questionType === QuestionType.TRUE_FALSE ||
      this.questionType === QuestionType.MULTIPLE_CHOICE
    ) {
      const correctOpt = this.correctOption;
      return correctOpt ? correctOpt.id === selectedOptionId : false;
    }
    return false; // Short answer y essay requieren calificación manual
  }
}
