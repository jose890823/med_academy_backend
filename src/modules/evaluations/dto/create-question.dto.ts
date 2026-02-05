import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
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

/**
 * DTO para una opción de respuesta
 */
export class QuestionOptionDto {
  @ApiProperty({
    example: 'a',
    description: 'ID único de la opción',
  })
  @IsNotEmpty({ message: 'El id de la opción es obligatorio' })
  @IsString({ message: 'El id debe ser texto' })
  id: string;

  @ApiProperty({
    example: '1540 m/s',
    description: 'Texto de la opción',
  })
  @IsNotEmpty({ message: 'El texto de la opción es obligatorio' })
  @IsString({ message: 'El texto debe ser texto' })
  text: string;

  @ApiProperty({
    example: true,
    description: 'Si esta opción es la correcta',
  })
  @IsNotEmpty({ message: 'isCorrect es obligatorio' })
  isCorrect: boolean;
}

/**
 * DTO para crear una pregunta
 */
export class CreateQuestionDto {
  @ApiProperty({
    example: '550e8400-e29b-41d4-a716-446655440000',
    description: 'ID de la evaluación a la que pertenece',
  })
  @IsNotEmpty({ message: 'El evaluationId es obligatorio' })
  @IsUUID('4', { message: 'evaluationId debe ser un UUID válido' })
  evaluationId: string;

  @ApiProperty({
    example: '¿Cuál es la velocidad del sonido en tejido blando?',
    description: 'Texto de la pregunta',
  })
  @IsNotEmpty({ message: 'El texto de la pregunta es obligatorio' })
  @IsString({ message: 'questionText debe ser texto' })
  questionText: string;

  @ApiProperty({
    example: 'multiple_choice',
    description: 'Tipo de pregunta',
    enum: QuestionType,
  })
  @IsNotEmpty({ message: 'El tipo de pregunta es obligatorio' })
  @IsEnum(QuestionType, { message: 'Tipo de pregunta inválido' })
  questionType: QuestionType;

  @ApiPropertyOptional({
    description:
      'Opciones de respuesta (requerido para multiple_choice y true_false)',
    type: [QuestionOptionDto],
    example: [
      { id: 'a', text: '1540 m/s', isCorrect: true },
      { id: 'b', text: '1000 m/s', isCorrect: false },
      { id: 'c', text: '2000 m/s', isCorrect: false },
      { id: 'd', text: '3000 m/s', isCorrect: false },
    ],
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
  correctAnswer?: string;

  @ApiPropertyOptional({
    example: 10,
    description: 'Puntos que vale la pregunta',
    default: 10,
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
  hint?: string;

  @ApiPropertyOptional({
    example: 'La velocidad promedio del sonido en tejido blando es 1540 m/s',
    description: 'Explicación de la respuesta correcta',
  })
  @IsOptional()
  @IsString({ message: 'explanation debe ser texto' })
  explanation?: string;

  @ApiPropertyOptional({
    example: 'https://storage.example.com/images/doppler-wave.png',
    description: 'URL de imagen asociada a la pregunta',
  })
  @IsOptional()
  @IsUrl({}, { message: 'imageUrl debe ser una URL válida' })
  imageUrl?: string;

  @ApiPropertyOptional({
    example: 1,
    description: 'Orden de la pregunta',
    default: 0,
  })
  @IsOptional()
  @IsInt({ message: 'order debe ser un número entero' })
  @Min(0, { message: 'order no puede ser negativo' })
  order?: number;
}
