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
import { MaterialType, MaterialStatus } from '../entities/material.entity';

/**
 * DTO para filtrar y paginar materiales
 */
export class MaterialQueryDto {
  @ApiPropertyOptional({
    example: '550e8400-e29b-41d4-a716-446655440000',
    description: 'Filtrar por curso',
  })
  @IsOptional()
  @IsUUID('4', { message: 'courseId debe ser un UUID válido' })
  courseId?: string;

  @ApiPropertyOptional({
    example: '550e8400-e29b-41d4-a716-446655440000',
    description: 'Filtrar por módulo',
  })
  @IsOptional()
  @IsUUID('4', { message: 'moduleId debe ser un UUID válido' })
  moduleId?: string;

  @ApiPropertyOptional({
    example: 'pdf',
    description: 'Filtrar por tipo de material',
    enum: MaterialType,
  })
  @IsOptional()
  @IsEnum(MaterialType, { message: 'Tipo de material inválido' })
  type?: MaterialType;

  @ApiPropertyOptional({
    example: 'active',
    description: 'Filtrar por estado',
    enum: MaterialStatus,
  })
  @IsOptional()
  @IsEnum(MaterialStatus, { message: 'Estado inválido' })
  status?: MaterialStatus;

  @ApiPropertyOptional({
    example: true,
    description: 'Filtrar solo públicos',
  })
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  isPublic?: boolean;

  @ApiPropertyOptional({
    example: 1,
    description: 'Página actual (1-indexed)',
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
    example: 'order',
    description: 'Campo para ordenar',
    enum: ['order', 'name', 'createdAt', 'downloadCount', 'type'],
    default: 'order',
  })
  @IsOptional()
  sortBy?: string = 'order';

  @ApiPropertyOptional({
    example: 'ASC',
    description: 'Dirección del ordenamiento',
    enum: ['ASC', 'DESC'],
    default: 'ASC',
  })
  @IsOptional()
  @IsEnum(['ASC', 'DESC'])
  sortOrder?: 'ASC' | 'DESC' = 'ASC';
}
