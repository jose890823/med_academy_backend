import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsOptional,
  IsUUID,
  IsEnum,
  IsBoolean,
  IsInt,
  IsString,
  Min,
  Max,
} from 'class-validator';
import { Transform, Type } from 'class-transformer';
import { EvaluationType } from '../entities/evaluation.entity';
import { AttemptStatus } from '../entities/evaluation-attempt.entity';

/**
 * DTO para consulta de evaluaciones con paginación y filtros
 */
export class EvaluationQueryDto {
  @ApiPropertyOptional({
    example: 1,
    description: 'Número de página',
    default: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'page debe ser un número entero' })
  @Min(1, { message: 'page debe ser al menos 1' })
  page?: number;

  @ApiPropertyOptional({
    example: 20,
    description: 'Elementos por página',
    default: 20,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'limit debe ser un número entero' })
  @Min(1, { message: 'limit debe ser al menos 1' })
  @Max(100, { message: 'limit no puede ser mayor a 100' })
  limit?: number;

  @ApiPropertyOptional({
    example: '550e8400-e29b-41d4-a716-446655440000',
    description: 'Filtrar por ID de curso',
  })
  @IsOptional()
  @IsUUID('4', { message: 'courseId debe ser un UUID válido' })
  courseId?: string;

  @ApiPropertyOptional({
    example: '550e8400-e29b-41d4-a716-446655440000',
    description: 'Filtrar por ID de módulo',
  })
  @IsOptional()
  @IsUUID('4', { message: 'moduleId debe ser un UUID válido' })
  moduleId?: string;

  @ApiPropertyOptional({
    example: 'quiz',
    description: 'Filtrar por tipo de evaluación',
    enum: EvaluationType,
  })
  @IsOptional()
  @IsEnum(EvaluationType, { message: 'Tipo de evaluación inválido' })
  type?: EvaluationType;

  @ApiPropertyOptional({
    example: true,
    description: 'Filtrar por estado de publicación',
  })
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean({ message: 'isPublished debe ser booleano' })
  isPublished?: boolean;

  @ApiPropertyOptional({
    example: 'createdAt',
    description: 'Campo por el que ordenar',
    enum: ['createdAt', 'order', 'title', 'type'],
  })
  @IsOptional()
  @IsString()
  sortBy?: string;

  @ApiPropertyOptional({
    example: 'ASC',
    description: 'Dirección del ordenamiento',
    enum: ['ASC', 'DESC'],
  })
  @IsOptional()
  @IsEnum(['ASC', 'DESC'], { message: 'sortOrder debe ser ASC o DESC' })
  sortOrder?: 'ASC' | 'DESC';
}

/**
 * DTO para consulta de intentos con paginación y filtros
 */
export class AttemptQueryDto {
  @ApiPropertyOptional({
    example: 1,
    description: 'Número de página',
    default: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'page debe ser un número entero' })
  @Min(1, { message: 'page debe ser al menos 1' })
  page?: number;

  @ApiPropertyOptional({
    example: 20,
    description: 'Elementos por página',
    default: 20,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'limit debe ser un número entero' })
  @Min(1, { message: 'limit debe ser al menos 1' })
  @Max(100, { message: 'limit no puede ser mayor a 100' })
  limit?: number;

  @ApiPropertyOptional({
    example: '550e8400-e29b-41d4-a716-446655440000',
    description: 'Filtrar por ID de inscripción',
  })
  @IsOptional()
  @IsUUID('4', { message: 'enrollmentId debe ser un UUID válido' })
  enrollmentId?: string;

  @ApiPropertyOptional({
    example: '550e8400-e29b-41d4-a716-446655440000',
    description: 'Filtrar por ID de evaluación',
  })
  @IsOptional()
  @IsUUID('4', { message: 'evaluationId debe ser un UUID válido' })
  evaluationId?: string;

  @ApiPropertyOptional({
    example: 'submitted',
    description: 'Filtrar por estado del intento',
    enum: AttemptStatus,
  })
  @IsOptional()
  @IsEnum(AttemptStatus, { message: 'Estado de intento inválido' })
  status?: AttemptStatus;

  @ApiPropertyOptional({
    example: true,
    description: 'Filtrar solo intentos aprobados',
  })
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean({ message: 'passed debe ser booleano' })
  passed?: boolean;

  @ApiPropertyOptional({
    example: 'createdAt',
    description: 'Campo por el que ordenar',
    enum: ['createdAt', 'submittedAt', 'gradedAt', 'score'],
  })
  @IsOptional()
  @IsString()
  sortBy?: string;

  @ApiPropertyOptional({
    example: 'DESC',
    description: 'Dirección del ordenamiento',
    enum: ['ASC', 'DESC'],
  })
  @IsOptional()
  @IsEnum(['ASC', 'DESC'], { message: 'sortOrder debe ser ASC o DESC' })
  sortOrder?: 'ASC' | 'DESC';
}
