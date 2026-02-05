import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsUUID,
  IsOptional,
  IsString,
  IsNumber,
  IsEnum,
  IsDate,
  IsArray,
  Min,
  Max,
} from 'class-validator';
import { Type } from 'class-transformer';
import { CertificateType } from '../entities/certificate.entity';

/**
 * DTO para emitir un certificado
 */
export class IssueCertificateDto {
  @ApiProperty({
    example: '550e8400-e29b-41d4-a716-446655440000',
    description: 'ID de la inscripción (enrollment) asociada',
  })
  @IsNotEmpty({ message: 'El ID de inscripción es obligatorio' })
  @IsUUID('4', { message: 'El ID de inscripción debe ser un UUID válido' })
  enrollmentId: string;

  @ApiProperty({
    example: 'course_completion',
    description: 'Tipo de certificado',
    enum: CertificateType,
  })
  @IsNotEmpty({ message: 'El tipo de certificado es obligatorio' })
  @IsEnum(CertificateType, { message: 'Tipo de certificado no válido' })
  type: CertificateType;

  @ApiPropertyOptional({
    example: 92.5,
    description: 'Calificación final obtenida (0-100)',
  })
  @IsOptional()
  @IsNumber({}, { message: 'La calificación debe ser un número' })
  @Min(0, { message: 'La calificación mínima es 0' })
  @Max(100, { message: 'La calificación máxima es 100' })
  finalGrade?: number;

  @ApiPropertyOptional({
    example: 'Pass',
    description: 'Calificación como etiqueta',
  })
  @IsOptional()
  @IsString({ message: 'La etiqueta debe ser texto' })
  gradeLabel?: string;

  @ApiPropertyOptional({
    example: '2026-06-15',
    description: 'Fecha de finalización (default: hoy)',
  })
  @IsOptional()
  @IsDate({ message: 'La fecha de finalización debe ser válida' })
  @Type(() => Date)
  completionDate?: Date;

  @ApiPropertyOptional({
    example: 40,
    description: 'Horas de instrucción',
  })
  @IsOptional()
  @IsNumber({}, { message: 'Las horas deben ser un número' })
  @Min(0)
  instructionHours?: number;

  @ApiPropertyOptional({
    example: 4.0,
    description: 'Créditos CME/CEU',
  })
  @IsOptional()
  @IsNumber({}, { message: 'Los créditos deben ser un número' })
  @Min(0)
  cmeCredits?: number;

  @ApiPropertyOptional({
    example: '2029-06-15',
    description: 'Fecha de expiración (null = no expira)',
  })
  @IsOptional()
  @IsDate({ message: 'La fecha de expiración debe ser válida' })
  @Type(() => Date)
  expiresAt?: Date;

  @ApiPropertyOptional({
    example: ['ARDMS', 'ARRT'],
    description: 'Certificaciones profesionales asociadas',
  })
  @IsOptional()
  @IsArray({ message: 'Las certificaciones deben ser un array' })
  @IsString({ each: true })
  associatedCertifications?: string[];

  @ApiPropertyOptional({
    example: 'Dr. Jane Smith',
    description: 'Nombre del firmante autorizado',
  })
  @IsOptional()
  @IsString()
  authorizedSignatory?: string;

  @ApiPropertyOptional({
    example: 'Director of Education',
    description: 'Título del firmante',
  })
  @IsOptional()
  @IsString()
  signatoryTitle?: string;

  @ApiPropertyOptional({
    description: 'Metadata adicional',
  })
  @IsOptional()
  metadata?: Record<string, any>;
}
