import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { EvaluationAttempt } from './evaluation-attempt.entity';
import { Question } from './question.entity';

/**
 * Respuesta del estudiante a una pregunta
 */
@Entity('answers')
@Index(['attemptId'])
@Index(['questionId'])
@Index(['attemptId', 'questionId'], { unique: true })
export class Answer {
  @ApiProperty({
    example: '550e8400-e29b-41d4-a716-446655440000',
    description: 'ID único de la respuesta',
  })
  @PrimaryGeneratedColumn('uuid')
  id: string;

  // ============================================
  // RELACIONES
  // ============================================

  @ManyToOne(() => EvaluationAttempt, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'attemptId' })
  attempt: EvaluationAttempt;

  @Column({ type: 'uuid' })
  attemptId: string;

  @ManyToOne(() => Question, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'questionId' })
  question: Question;

  @Column({ type: 'uuid' })
  questionId: string;

  // ============================================
  // RESPUESTA
  // ============================================

  @ApiPropertyOptional({
    example: 'a',
    description:
      'ID de la opción seleccionada (para multiple_choice/true_false)',
  })
  @Column({ type: 'varchar', length: 50, nullable: true })
  selectedOptionId: string | null;

  @ApiPropertyOptional({
    example:
      'La velocidad del sonido en tejido blando es aproximadamente 1540 m/s',
    description: 'Texto de la respuesta (para short_answer/essay)',
  })
  @Column({ type: 'text', nullable: true })
  answerText: string | null;

  // ============================================
  // CALIFICACIÓN
  // ============================================

  @ApiPropertyOptional({
    example: 10,
    description: 'Puntos obtenidos (asignados por el instructor)',
  })
  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  pointsEarned: number | null;

  @ApiPropertyOptional({
    example: true,
    description: 'Si la respuesta es correcta',
  })
  @Column({ type: 'boolean', nullable: true })
  isCorrect: boolean | null;

  @ApiPropertyOptional({
    example: 'Buena explicación, pero falta mencionar la fórmula',
    description: 'Feedback específico del instructor para esta respuesta',
  })
  @Column({ type: 'text', nullable: true })
  feedback: string | null;

  // ============================================
  // TIMESTAMPS
  // ============================================

  @ApiProperty({ description: 'Fecha de creación' })
  @CreateDateColumn()
  createdAt: Date;

  // ============================================
  // CONSTRUCTOR
  // ============================================

  constructor(partial: Partial<Answer>) {
    Object.assign(this, partial);
  }

  // ============================================
  // MÉTODOS HELPER
  // ============================================

  /**
   * Verifica si la respuesta ha sido calificada
   */
  get isGraded(): boolean {
    return this.pointsEarned !== null;
  }

  /**
   * Verifica si tiene respuesta (algún valor)
   */
  get hasAnswer(): boolean {
    return (
      this.selectedOptionId !== null ||
      (this.answerText !== null && this.answerText.trim() !== '')
    );
  }
}
