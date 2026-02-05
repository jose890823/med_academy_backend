import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsOptional,
  IsString,
  IsInt,
  Min,
  Max,
  MaxLength,
} from 'class-validator';

/**
 * DTO para actualizar un review
 */
export class UpdateReviewDto {
  @ApiPropertyOptional({
    example: 4,
    description: 'Nueva calificación (1-5)',
  })
  @IsOptional()
  @IsInt({ message: 'La calificación debe ser un número entero' })
  @Min(1, { message: 'La calificación mínima es 1' })
  @Max(5, { message: 'La calificación máxima es 5' })
  rating?: number;

  @ApiPropertyOptional({
    example: 'Actualicé mi review después de completar el curso',
    description: 'Nuevo título',
  })
  @IsOptional()
  @IsString({ message: 'El título debe ser texto' })
  @MaxLength(255, { message: 'El título no debe exceder 255 caracteres' })
  title?: string;

  @ApiPropertyOptional({
    example:
      'Después de completar todas las evaluaciones, puedo decir que es el mejor curso de física Doppler.',
    description: 'Nuevo comentario',
  })
  @IsOptional()
  @IsString({ message: 'El comentario debe ser texto' })
  @MaxLength(2000, { message: 'El comentario no debe exceder 2000 caracteres' })
  comment?: string;
}

/**
 * DTO para respuesta del instructor
 */
export class InstructorResponseDto {
  @ApiPropertyOptional({
    example:
      'Gracias por tu feedback, nos alegra que te haya gustado el curso!',
    description: 'Respuesta del instructor',
  })
  @IsOptional()
  @IsString({ message: 'La respuesta debe ser texto' })
  @MaxLength(1000, { message: 'La respuesta no debe exceder 1000 caracteres' })
  response?: string;
}

/**
 * DTO para moderar un review
 */
export class ModerateReviewDto {
  @ApiPropertyOptional({
    example: 'reject',
    description: 'Acción de moderación',
    enum: ['approve', 'reject', 'hide'],
  })
  @IsOptional()
  @IsString()
  action?: 'approve' | 'reject' | 'hide';

  @ApiPropertyOptional({
    example: 'Contenido inapropiado o spam',
    description: 'Razón del rechazo',
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;
}
