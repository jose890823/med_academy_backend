import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  IsArray,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

/**
 * DTO para una respuesta individual
 */
export class AnswerDto {
  @ApiProperty({
    example: '550e8400-e29b-41d4-a716-446655440000',
    description: 'ID de la pregunta',
  })
  @IsNotEmpty({ message: 'El questionId es obligatorio' })
  @IsUUID('4', { message: 'questionId debe ser un UUID válido' })
  questionId: string;

  @ApiPropertyOptional({
    example: 'a',
    description:
      'ID de la opción seleccionada (para multiple_choice/true_false)',
  })
  @IsOptional()
  @IsString({ message: 'selectedOptionId debe ser texto' })
  selectedOptionId?: string;

  @ApiPropertyOptional({
    example:
      'La velocidad del sonido en tejido blando es aproximadamente 1540 m/s',
    description: 'Texto de la respuesta (para short_answer/essay)',
  })
  @IsOptional()
  @IsString({ message: 'answerText debe ser texto' })
  answerText?: string;
}

/**
 * DTO para enviar respuestas de un intento
 */
export class SubmitAnswersDto {
  @ApiProperty({
    description: 'Lista de respuestas',
    type: [AnswerDto],
  })
  @IsArray({ message: 'answers debe ser un array' })
  @ValidateNested({ each: true })
  @Type(() => AnswerDto)
  answers: AnswerDto[];
}

/**
 * DTO para guardar una respuesta individual (auto-guardado)
 */
export class SaveAnswerDto {
  @ApiProperty({
    example: '550e8400-e29b-41d4-a716-446655440000',
    description: 'ID de la pregunta',
  })
  @IsNotEmpty({ message: 'El questionId es obligatorio' })
  @IsUUID('4', { message: 'questionId debe ser un UUID válido' })
  questionId: string;

  @ApiPropertyOptional({
    example: 'a',
    description: 'ID de la opción seleccionada',
  })
  @IsOptional()
  @IsString({ message: 'selectedOptionId debe ser texto' })
  selectedOptionId?: string;

  @ApiPropertyOptional({
    example: 'Mi respuesta...',
    description: 'Texto de la respuesta',
  })
  @IsOptional()
  @IsString({ message: 'answerText debe ser texto' })
  answerText?: string;
}
