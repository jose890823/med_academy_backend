import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsUUID,
  IsOptional,
  IsString,
  IsNumber,
  IsDate,
  IsArray,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';

/**
 * DTO para emitir certificado de workshop
 */
export class IssueWorkshopCertificateDto {
  @ApiProperty({
    example: '550e8400-e29b-41d4-a716-446655440000',
    description: 'ID de la inscripción al workshop',
  })
  @IsNotEmpty({ message: 'El ID de inscripción es obligatorio' })
  @IsUUID('4', { message: 'El ID debe ser un UUID válido' })
  workshopRegistrationId: string;

  @ApiPropertyOptional({
    example: 8,
    description: 'Horas de asistencia/instrucción',
  })
  @IsOptional()
  @IsNumber({}, { message: 'Las horas deben ser un número' })
  @Min(0)
  instructionHours?: number;

  @ApiPropertyOptional({
    example: 1.0,
    description: 'Créditos CME/CEU otorgados',
  })
  @IsOptional()
  @IsNumber({}, { message: 'Los créditos deben ser un número' })
  @Min(0)
  cmeCredits?: number;

  @ApiPropertyOptional({
    example: '2026-06-15',
    description: 'Fecha de finalización (default: fecha del workshop)',
  })
  @IsOptional()
  @IsDate({ message: 'La fecha debe ser válida' })
  @Type(() => Date)
  completionDate?: Date;

  @ApiPropertyOptional({
    example: ['ARDMS'],
    description: 'Certificaciones profesionales asociadas',
  })
  @IsOptional()
  @IsArray()
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
}
