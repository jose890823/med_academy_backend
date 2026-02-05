import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsOptional,
  IsUUID,
  IsDateString,
  IsNumber,
  IsString,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';

/**
 * DTO para crear una inscripción
 */
export class CreateEnrollmentDto {
  @ApiProperty({
    example: '550e8400-e29b-41d4-a716-446655440000',
    description: 'ID del estudiante',
  })
  @IsNotEmpty({ message: 'El studentId es obligatorio' })
  @IsUUID('4', { message: 'studentId debe ser un UUID válido' })
  studentId: string;

  @ApiProperty({
    example: '550e8400-e29b-41d4-a716-446655440000',
    description: 'ID de la convocatoria',
  })
  @IsNotEmpty({ message: 'El cohortId es obligatorio' })
  @IsUUID('4', { message: 'cohortId debe ser un UUID válido' })
  cohortId: string;

  @ApiPropertyOptional({
    example: '550e8400-e29b-41d4-a716-446655440000',
    description: 'ID del aula (opcional, se puede asignar después)',
  })
  @IsOptional()
  @IsUUID('4', { message: 'classroomId debe ser un UUID válido' })
  classroomId?: string;

  @ApiPropertyOptional({
    example: '2026-03-01',
    description:
      'Fecha de inicio de acceso (default: fecha de inicio de la convocatoria)',
  })
  @IsOptional()
  @IsDateString(
    {},
    { message: 'accessStartDate debe ser una fecha válida (YYYY-MM-DD)' },
  )
  accessStartDate?: string;

  @ApiPropertyOptional({
    example: '2026-09-01',
    description: 'Fecha de fin de acceso (null = acceso de por vida)',
  })
  @IsOptional()
  @IsDateString(
    {},
    { message: 'accessEndDate debe ser una fecha válida (YYYY-MM-DD)' },
  )
  accessEndDate?: string;

  @ApiPropertyOptional({
    example: '550e8400-e29b-41d4-a716-446655440000',
    description: 'ID del referido (si aplica descuento)',
  })
  @IsOptional()
  @IsUUID('4', { message: 'referralId debe ser un UUID válido' })
  referralId?: string;

  @ApiPropertyOptional({
    example: 30.0,
    description: 'Descuento aplicado por referido',
  })
  @IsOptional()
  @IsNumber({}, { message: 'discountApplied debe ser un número' })
  @Min(0, { message: 'discountApplied debe ser mayor o igual a 0' })
  @Type(() => Number)
  discountApplied?: number;

  @ApiPropertyOptional({
    example: 'Inscripción especial por convenio',
    description: 'Notas administrativas',
  })
  @IsOptional()
  @IsString({ message: 'notes debe ser texto' })
  notes?: string;
}
