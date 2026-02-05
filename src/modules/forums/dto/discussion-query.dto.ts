import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsOptional,
  IsUUID,
  IsEnum,
  IsBoolean,
  IsNumber,
  IsString,
  Min,
  Max,
} from 'class-validator';
import { Transform, Type } from 'class-transformer';
import {
  DiscussionStatus,
  DiscussionType,
} from '../entities/discussion.entity';

/**
 * DTO para consultar discusiones
 */
export class DiscussionQueryDto {
  @ApiPropertyOptional({
    example: '550e8400-e29b-41d4-a716-446655440000',
    description: 'Filtrar por curso (null = foro general)',
  })
  @IsOptional()
  @IsUUID('4', { message: 'courseId debe ser un UUID válido' })
  courseId?: string;

  @ApiPropertyOptional({
    example: '550e8400-e29b-41d4-a716-446655440000',
    description: 'Filtrar por autor',
  })
  @IsOptional()
  @IsUUID('4', { message: 'authorId debe ser un UUID válido' })
  authorId?: string;

  @ApiPropertyOptional({
    example: 'open',
    description: 'Filtrar por estado',
    enum: DiscussionStatus,
  })
  @IsOptional()
  @IsEnum(DiscussionStatus, { message: 'Estado inválido' })
  status?: DiscussionStatus;

  @ApiPropertyOptional({
    example: 'question',
    description: 'Filtrar por tipo',
    enum: DiscussionType,
  })
  @IsOptional()
  @IsEnum(DiscussionType, { message: 'Tipo inválido' })
  type?: DiscussionType;

  @ApiPropertyOptional({
    example: true,
    description: 'Solo discusiones fijadas',
  })
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  isPinned?: boolean;

  @ApiPropertyOptional({
    example: false,
    description: 'Solo discusiones sin resolver (para preguntas)',
  })
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  isResolved?: boolean;

  @ApiPropertyOptional({
    example: 'artefactos',
    description: 'Filtrar por tag',
  })
  @IsOptional()
  @IsString()
  tag?: string;

  @ApiPropertyOptional({
    example: 'doppler',
    description: 'Buscar en título y contenido',
  })
  @IsOptional()
  @IsString()
  search?: string;

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
    example: 'lastActivityAt',
    description: 'Campo para ordenar',
    enum: ['createdAt', 'lastActivityAt', 'postCount', 'viewCount'],
    default: 'lastActivityAt',
  })
  @IsOptional()
  @IsString()
  sortBy?: string = 'lastActivityAt';

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

/**
 * DTO para consultar posts de una discusión
 */
export class PostQueryDto {
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
    example: 50,
    description: 'Elementos por página',
    default: 50,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(100)
  limit?: number = 50;

  @ApiPropertyOptional({
    example: 'createdAt',
    description: 'Campo para ordenar',
    enum: ['createdAt', 'likeCount'],
    default: 'createdAt',
  })
  @IsOptional()
  @IsString()
  sortBy?: string = 'createdAt';

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
