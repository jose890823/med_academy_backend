import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsOptional,
  IsEnum,
  IsBoolean,
  IsNumber,
  IsString,
  Min,
  Max,
} from 'class-validator';
import { Transform, Type } from 'class-transformer';
import { InstructorSpecialty, InstructorCertification } from '../entities/instructor-profile.entity';

/**
 * DTO para consultar perfiles de instructores
 */
export class InstructorQueryDto {
  @ApiPropertyOptional({
    example: 'vascular',
    description: 'Filtrar por especialidad',
    enum: InstructorSpecialty,
  })
  @IsOptional()
  @IsEnum(InstructorSpecialty, { message: 'Especialidad inválida' })
  specialty?: InstructorSpecialty;

  @ApiPropertyOptional({
    example: 'ARDMS',
    description: 'Filtrar por certificación',
    enum: InstructorCertification,
  })
  @IsOptional()
  @IsEnum(InstructorCertification, { message: 'Certificación inválida' })
  certification?: InstructorCertification;

  @ApiPropertyOptional({
    example: true,
    description: 'Solo instructores destacados',
  })
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  isFeatured?: boolean;

  @ApiPropertyOptional({
    example: true,
    description: 'Solo perfiles activos',
    default: true,
  })
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({
    example: 'Sarah',
    description: 'Buscar por nombre',
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
    example: 'sortOrder',
    description: 'Campo para ordenar',
    enum: ['sortOrder', 'displayName', 'courseCount', 'studentCount', 'averageRating', 'createdAt'],
    default: 'sortOrder',
  })
  @IsOptional()
  @IsString()
  sortBy?: string = 'sortOrder';

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
