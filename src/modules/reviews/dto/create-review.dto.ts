import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  IsInt,
  Min,
  Max,
  MaxLength,
} from 'class-validator';

/**
 * DTO para crear un review
 */
export class CreateReviewDto {
  @ApiProperty({
    example: '550e8400-e29b-41d4-a716-446655440000',
    description: 'ID del curso a calificar',
  })
  @IsNotEmpty({ message: 'El courseId es obligatorio' })
  @IsUUID('4', { message: 'courseId debe ser un UUID válido' })
  courseId: string;

  @ApiProperty({
    example: 5,
    description: 'Calificación de 1 a 5 estrellas',
    minimum: 1,
    maximum: 5,
  })
  @IsNotEmpty({ message: 'La calificación es obligatoria' })
  @IsInt({ message: 'La calificación debe ser un número entero' })
  @Min(1, { message: 'La calificación mínima es 1' })
  @Max(5, { message: 'La calificación máxima es 5' })
  rating: number;

  @ApiPropertyOptional({
    example: 'Excelente curso',
    description: 'Título del review',
  })
  @IsOptional()
  @IsString({ message: 'El título debe ser texto' })
  @MaxLength(255, { message: 'El título no debe exceder 255 caracteres' })
  title?: string;

  @ApiPropertyOptional({
    example: 'El curso es muy completo, cubre todos los temas de física Doppler con excelentes ejemplos prácticos.',
    description: 'Comentario detallado',
  })
  @IsOptional()
  @IsString({ message: 'El comentario debe ser texto' })
  @MaxLength(2000, { message: 'El comentario no debe exceder 2000 caracteres' })
  comment?: string;
}
