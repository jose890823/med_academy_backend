import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsOptional,
  IsUUID,
  IsEnum,
  IsBoolean,
  IsNumber,
  Min,
  Max,
} from 'class-validator';
import { Transform, Type } from 'class-transformer';
import { ReviewStatus } from '../entities/review.entity';

/**
 * DTO para consultar reviews
 */
export class ReviewQueryDto {
  @ApiPropertyOptional({
    example: '550e8400-e29b-41d4-a716-446655440000',
    description: 'Filtrar por curso',
  })
  @IsOptional()
  @IsUUID('4', { message: 'courseId debe ser un UUID válido' })
  courseId?: string;

  @ApiPropertyOptional({
    example: '550e8400-e29b-41d4-a716-446655440000',
    description: 'Filtrar por estudiante',
  })
  @IsOptional()
  @IsUUID('4', { message: 'studentId debe ser un UUID válido' })
  studentId?: string;

  @ApiPropertyOptional({
    example: 'approved',
    description: 'Filtrar por estado',
    enum: ReviewStatus,
  })
  @IsOptional()
  @IsEnum(ReviewStatus, { message: 'Estado inválido' })
  status?: ReviewStatus;

  @ApiPropertyOptional({
    example: 5,
    description: 'Filtrar por rating exacto',
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(5)
  rating?: number;

  @ApiPropertyOptional({
    example: 4,
    description: 'Filtrar por rating mínimo',
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(5)
  minRating?: number;

  @ApiPropertyOptional({
    example: true,
    description: 'Solo reviews verificados',
  })
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  verified?: boolean;

  @ApiPropertyOptional({
    example: true,
    description: 'Solo reviews destacados',
  })
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  featured?: boolean;

  @ApiPropertyOptional({
    example: true,
    description: 'Solo reviews con comentario',
  })
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  withComment?: boolean;

  @ApiPropertyOptional({
    example: 1,
    description: 'Página actual',
    default: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({
    example: 20,
    description: 'Elementos por página',
    default: 20,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(100)
  limit?: number = 20;

  @ApiPropertyOptional({
    example: 'createdAt',
    description: 'Campo para ordenar',
    enum: ['createdAt', 'rating', 'helpfulCount'],
    default: 'createdAt',
  })
  @IsOptional()
  sortBy?: string = 'createdAt';

  @ApiPropertyOptional({
    example: 'DESC',
    description: 'Dirección del ordenamiento',
    enum: ['ASC', 'DESC'],
    default: 'DESC',
  })
  @IsOptional()
  @IsEnum(['ASC', 'DESC'])
  sortOrder?: 'ASC' | 'DESC' = 'DESC';
}
