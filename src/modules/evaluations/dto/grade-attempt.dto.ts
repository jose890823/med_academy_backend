import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  IsNumber,
  IsArray,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

/**
 * DTO para calificar una respuesta individual
 */
export class GradeAnswerDto {
  @ApiProperty({
    example: '550e8400-e29b-41d4-a716-446655440000',
    description: 'ID de la respuesta',
  })
  @IsNotEmpty({ message: 'El answerId es obligatorio' })
  @IsUUID('4', { message: 'answerId debe ser un UUID válido' })
  answerId: string;

  @ApiProperty({
    example: 8,
    description: 'Puntos otorgados',
  })
  @IsNotEmpty({ message: 'pointsEarned es obligatorio' })
  @IsNumber({}, { message: 'pointsEarned debe ser un número' })
  @Min(0, { message: 'pointsEarned no puede ser negativo' })
  pointsEarned: number;

  @ApiPropertyOptional({
    example: 'Buena explicación, pero falta mencionar la fórmula',
    description: 'Feedback específico para esta respuesta',
  })
  @IsOptional()
  @IsString({ message: 'feedback debe ser texto' })
  feedback?: string;
}

/**
 * DTO para calificar un intento completo
 * IMPORTANTE: Las evaluaciones son calificadas MANUALMENTE por el instructor
 */
export class GradeAttemptDto {
  @ApiProperty({
    description: 'Calificaciones de cada respuesta',
    type: [GradeAnswerDto],
  })
  @IsArray({ message: 'grades debe ser un array' })
  @ValidateNested({ each: true })
  @Type(() => GradeAnswerDto)
  grades: GradeAnswerDto[];

  @ApiPropertyOptional({
    example: 'Excelente trabajo en las preguntas de física Doppler. Revisa el tema de artefactos.',
    description: 'Retroalimentación general del instructor',
  })
  @IsOptional()
  @IsString({ message: 'feedback debe ser texto' })
  feedback?: string;
}

/**
 * DTO para calificación rápida (solo puntaje total)
 */
export class QuickGradeDto {
  @ApiProperty({
    example: 85,
    description: 'Puntuación total obtenida',
  })
  @IsNotEmpty({ message: 'score es obligatorio' })
  @IsNumber({}, { message: 'score debe ser un número' })
  @Min(0, { message: 'score no puede ser negativo' })
  score: number;

  @ApiPropertyOptional({
    example: 'Buen trabajo general',
    description: 'Retroalimentación del instructor',
  })
  @IsOptional()
  @IsString({ message: 'feedback debe ser texto' })
  feedback?: string;
}
