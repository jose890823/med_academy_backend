import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsOptional,
  IsString,
  IsUUID,
  IsEnum,
  IsInt,
  IsBoolean,
  Min,
  Max,
  MaxLength,
} from 'class-validator';
import { EvaluationType } from '../entities/evaluation.entity';

/**
 * DTO para actualizar una evaluación
 */
export class UpdateEvaluationDto {
  @ApiPropertyOptional({
    example: '550e8400-e29b-41d4-a716-446655440000',
    description: 'ID del módulo al que pertenece',
  })
  @IsOptional()
  @IsUUID('4', { message: 'moduleId debe ser un UUID válido' })
  moduleId?: string | null;

  @ApiPropertyOptional({
    example: 'Quiz 1: Física Doppler',
    description: 'Título de la evaluación',
  })
  @IsOptional()
  @IsString({ message: 'El título debe ser texto' })
  @MaxLength(255, { message: 'El título no puede exceder 255 caracteres' })
  title?: string;

  @ApiPropertyOptional({
    example: 'Evalúa los conocimientos básicos de física Doppler',
    description: 'Descripción de la evaluación',
  })
  @IsOptional()
  @IsString({ message: 'La descripción debe ser texto' })
  description?: string | null;

  @ApiPropertyOptional({
    example: 'quiz',
    description: 'Tipo de evaluación',
    enum: EvaluationType,
  })
  @IsOptional()
  @IsEnum(EvaluationType, { message: 'Tipo de evaluación inválido' })
  type?: EvaluationType;

  @ApiPropertyOptional({
    example: 100,
    description: 'Puntos totales de la evaluación',
  })
  @IsOptional()
  @IsInt({ message: 'totalPoints debe ser un número entero' })
  @Min(1, { message: 'totalPoints debe ser al menos 1' })
  totalPoints?: number;

  @ApiPropertyOptional({
    example: 70,
    description: 'Puntos mínimos para aprobar',
  })
  @IsOptional()
  @IsInt({ message: 'passingScore debe ser un número entero' })
  @Min(0, { message: 'passingScore no puede ser negativo' })
  passingScore?: number;

  @ApiPropertyOptional({
    example: 3,
    description: 'Número máximo de intentos permitidos',
  })
  @IsOptional()
  @IsInt({ message: 'maxAttempts debe ser un número entero' })
  @Min(1, { message: 'maxAttempts debe ser al menos 1' })
  @Max(10, { message: 'maxAttempts no puede ser mayor a 10' })
  maxAttempts?: number;

  @ApiPropertyOptional({
    example: 60,
    description: 'Límite de tiempo en minutos',
  })
  @IsOptional()
  @IsInt({ message: 'timeLimitMinutes debe ser un número entero' })
  @Min(1, { message: 'timeLimitMinutes debe ser al menos 1 minuto' })
  timeLimitMinutes?: number | null;

  @ApiPropertyOptional({
    example: 1,
    description: 'Orden de la evaluación en el curso',
  })
  @IsOptional()
  @IsInt({ message: 'order debe ser un número entero' })
  @Min(0, { message: 'order no puede ser negativo' })
  order?: number;

  @ApiPropertyOptional({
    example: true,
    description: 'Si se muestran las respuestas correctas después de calificar',
  })
  @IsOptional()
  @IsBoolean({ message: 'showCorrectAnswers debe ser booleano' })
  showCorrectAnswers?: boolean;

  @ApiPropertyOptional({
    example: false,
    description: 'Si las preguntas se muestran en orden aleatorio',
  })
  @IsOptional()
  @IsBoolean({ message: 'shuffleQuestions debe ser booleano' })
  shuffleQuestions?: boolean;

  @ApiPropertyOptional({
    example: false,
    description: 'Si las opciones se muestran en orden aleatorio',
  })
  @IsOptional()
  @IsBoolean({ message: 'shuffleOptions debe ser booleano' })
  shuffleOptions?: boolean;
}
