import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsOptional,
  IsEnum,
  IsUUID,
  IsString,
  IsInt,
  Min,
  Max,
} from 'class-validator';
import { Type } from 'class-transformer';
import {
  CertificateType,
  CertificateStatus,
} from '../entities/certificate.entity';

/**
 * DTO para filtrar certificados
 */
export class CertificateQueryDto {
  @ApiPropertyOptional({
    example: '550e8400-e29b-41d4-a716-446655440000',
    description: 'Filtrar por ID de estudiante',
  })
  @IsOptional()
  @IsUUID('4')
  studentId?: string;

  @ApiPropertyOptional({
    example: '550e8400-e29b-41d4-a716-446655440000',
    description: 'Filtrar por ID de inscripción',
  })
  @IsOptional()
  @IsUUID('4')
  enrollmentId?: string;

  @ApiPropertyOptional({
    example: 'course_completion',
    description: 'Filtrar por tipo de certificado',
    enum: CertificateType,
  })
  @IsOptional()
  @IsEnum(CertificateType)
  type?: CertificateType;

  @ApiPropertyOptional({
    example: 'generated',
    description: 'Filtrar por estado',
    enum: CertificateStatus,
  })
  @IsOptional()
  @IsEnum(CertificateStatus)
  status?: CertificateStatus;

  @ApiPropertyOptional({
    example: 'vascular',
    description: 'Buscar por nombre del programa',
  })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({
    example: 1,
    description: 'Página (default: 1)',
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({
    example: 20,
    description: 'Elementos por página (default: 20, max: 100)',
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 20;
}
