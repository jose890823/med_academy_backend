import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsOptional,
  IsInt,
  IsEnum,
  IsString,
  IsBoolean,
  IsUUID,
  Min,
  Max,
} from 'class-validator';
import { Type, Transform } from 'class-transformer';
import {
  CourseStatus,
  CourseModality,
  CourseLevel,
  CourseLanguage,
} from '../entities/course.entity';

/**
 * DTO para filtrar y paginar cursos
 */
export class CourseQueryDto {
  // ============================================
  // PAGINACIÓN
  // ============================================

  @ApiPropertyOptional({
    example: 1,
    description: 'Número de página',
    default: 1,
  })
  @IsOptional()
  @IsInt({ message: 'page debe ser un número entero' })
  @Min(1, { message: 'page debe ser al menos 1' })
  @Type(() => Number)
  page?: number = 1;

  @ApiPropertyOptional({
    example: 20,
    description: 'Elementos por página',
    default: 20,
  })
  @IsOptional()
  @IsInt({ message: 'limit debe ser un número entero' })
  @Min(1, { message: 'limit debe ser al menos 1' })
  @Max(100, { message: 'limit no puede exceder 100' })
  @Type(() => Number)
  limit?: number = 20;

  // ============================================
  // FILTROS
  // ============================================

  @ApiPropertyOptional({
    example: 'vascular',
    description: 'Búsqueda por texto (título, descripción)',
  })
  @IsOptional()
  @IsString({ message: 'search debe ser texto' })
  search?: string;

  @ApiPropertyOptional({
    example: 'published',
    description: 'Filtrar por estado',
    enum: CourseStatus,
  })
  @IsOptional()
  @IsEnum(CourseStatus, { message: 'Estado inválido' })
  status?: CourseStatus;

  @ApiPropertyOptional({
    example: 'virtual',
    description: 'Filtrar por modalidad',
    enum: CourseModality,
  })
  @IsOptional()
  @IsEnum(CourseModality, { message: 'Modalidad inválida' })
  modality?: CourseModality;

  @ApiPropertyOptional({
    example: 'intermediate',
    description: 'Filtrar por nivel',
    enum: CourseLevel,
  })
  @IsOptional()
  @IsEnum(CourseLevel, { message: 'Nivel inválido' })
  level?: CourseLevel;

  @ApiPropertyOptional({
    example: 'en',
    description: 'Filtrar por idioma',
    enum: CourseLanguage,
  })
  @IsOptional()
  @IsEnum(CourseLanguage, { message: 'Idioma inválido' })
  language?: CourseLanguage;

  @ApiPropertyOptional({
    example: '550e8400-e29b-41d4-a716-446655440000',
    description: 'Filtrar por categoría',
  })
  @IsOptional()
  @IsUUID('4', { message: 'categoryId debe ser un UUID válido' })
  categoryId?: string;

  @ApiPropertyOptional({
    example: true,
    description: 'Filtrar solo cursos destacados',
  })
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean({ message: 'isFeatured debe ser booleano' })
  isFeatured?: boolean;

  // ============================================
  // ORDENAMIENTO
  // ============================================

  @ApiPropertyOptional({
    example: 'createdAt',
    description: 'Campo para ordenar',
    enum: ['createdAt', 'title', 'regularPrice', 'order'],
    default: 'order',
  })
  @IsOptional()
  @IsString({ message: 'sortBy debe ser texto' })
  sortBy?: string = 'order';

  @ApiPropertyOptional({
    example: 'ASC',
    description: 'Dirección del ordenamiento',
    enum: ['ASC', 'DESC'],
    default: 'ASC',
  })
  @IsOptional()
  @IsEnum(['ASC', 'DESC'], { message: 'sortOrder debe ser ASC o DESC' })
  sortOrder?: 'ASC' | 'DESC' = 'ASC';
}

/**
 * DTO para filtrar categorías
 */
export class CategoryQueryDto {
  @ApiPropertyOptional({
    example: 1,
    description: 'Número de página',
    default: 1,
  })
  @IsOptional()
  @IsInt({ message: 'page debe ser un número entero' })
  @Min(1, { message: 'page debe ser al menos 1' })
  @Type(() => Number)
  page?: number = 1;

  @ApiPropertyOptional({
    example: 20,
    description: 'Elementos por página',
    default: 20,
  })
  @IsOptional()
  @IsInt({ message: 'limit debe ser un número entero' })
  @Min(1, { message: 'limit debe ser al menos 1' })
  @Max(100, { message: 'limit no puede exceder 100' })
  @Type(() => Number)
  limit?: number = 20;

  @ApiPropertyOptional({
    example: true,
    description: 'Filtrar solo categorías activas',
    default: true,
  })
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean({ message: 'isActive debe ser booleano' })
  isActive?: boolean;
}

/**
 * DTO para filtrar convocatorias
 */
export class CohortQueryDto {
  @ApiPropertyOptional({
    example: 1,
    description: 'Número de página',
    default: 1,
  })
  @IsOptional()
  @IsInt({ message: 'page debe ser un número entero' })
  @Min(1, { message: 'page debe ser al menos 1' })
  @Type(() => Number)
  page?: number = 1;

  @ApiPropertyOptional({
    example: 20,
    description: 'Elementos por página',
    default: 20,
  })
  @IsOptional()
  @IsInt({ message: 'limit debe ser un número entero' })
  @Min(1, { message: 'limit debe ser al menos 1' })
  @Max(100, { message: 'limit no puede exceder 100' })
  @Type(() => Number)
  limit?: number = 20;

  @ApiPropertyOptional({
    example: '550e8400-e29b-41d4-a716-446655440000',
    description: 'Filtrar por curso',
  })
  @IsOptional()
  @IsUUID('4', { message: 'courseId debe ser un UUID válido' })
  courseId?: string;

  @ApiPropertyOptional({
    example: 'open',
    description: 'Filtrar por estado',
  })
  @IsOptional()
  @IsString({ message: 'status debe ser texto' })
  status?: string;
}
