import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsOptional,
  IsString,
  IsEnum,
  IsInt,
  IsArray,
  IsUrl,
  Min,
  ValidateNested,
  ArrayMinSize,
} from 'class-validator';
import { Type } from 'class-transformer';
import { QuestionType } from '../entities/question.entity';
import { QuestionOptionDto } from './create-question.dto';

/**
 * DTO para actualizar una pregunta
 */
export class UpdateQuestionDto {
  @ApiPropertyOptional({
    example: '¿Cuál es la velocidad del sonido en tejido blando?',
    description: 'Texto de la pregunta',
  })
  @IsOptional()
  @IsString({ message: 'questionText debe ser texto' })
  questionText?: string;

  @ApiPropertyOptional({
    example: 'multiple_choice',
    description: 'Tipo de pregunta',
    enum: QuestionType,
  })
  @IsOptional()
  @IsEnum(QuestionType, { message: 'Tipo de pregunta inválido' })
  questionType?: QuestionType;

  @ApiPropertyOptional({
    description: 'Opciones de respuesta',
    type: [QuestionOptionDto],
  })
  @IsOptional()
  @IsArray({ message: 'options debe ser un array' })
  @ValidateNested({ each: true })
  @Type(() => QuestionOptionDto)
  @ArrayMinSize(2, { message: 'Debe haber al menos 2 opciones' })
  options?: QuestionOptionDto[];

  @ApiPropertyOptional({
    example: '1540 m/s',
    description: 'Respuesta correcta (para short_answer)',
  })
  @IsOptional()
  @IsString({ message: 'correctAnswer debe ser texto' })
  correctAnswer?: string | null;

  @ApiPropertyOptional({
    example: 10,
    description: 'Puntos que vale la pregunta',
  })
  @IsOptional()
  @IsInt({ message: 'points debe ser un número entero' })
  @Min(1, { message: 'points debe ser al menos 1' })
  points?: number;

  @ApiPropertyOptional({
    example: 'Recuerda la fórmula de velocidad en medios acústicos',
    description: 'Pista para el estudiante',
  })
  @IsOptional()
  @IsString({ message: 'hint debe ser texto' })
  hint?: string | null;

  @ApiPropertyOptional({
    example: 'La velocidad promedio del sonido en tejido blando es 1540 m/s',
    description: 'Explicación de la respuesta correcta',
  })
  @IsOptional()
  @IsString({ message: 'explanation debe ser texto' })
  explanation?: string | null;

  @ApiPropertyOptional({
    example: 'https://storage.example.com/images/doppler-wave.png',
    description: 'URL de imagen asociada a la pregunta',
  })
  @IsOptional()
  @IsUrl({}, { message: 'imageUrl debe ser una URL válida' })
  imageUrl?: string | null;

  @ApiPropertyOptional({
    example: 1,
    description: 'Orden de la pregunta',
  })
  @IsOptional()
  @IsInt({ message: 'order debe ser un número entero' })
  @Min(0, { message: 'order no puede ser negativo' })
  order?: number;
}
