import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsInt,
  IsNumber,
  IsEnum,
  IsUUID,
  IsDateString,
  Min,
  MaxLength,
} from 'class-validator';
import { Type } from 'class-transformer';
import { CohortStatus } from '../entities/cohort.entity';

/**
 * DTO para crear una convocatoria
 */
export class CreateCohortDto {
  @ApiProperty({
    example: '550e8400-e29b-41d4-a716-446655440000',
    description: 'ID del curso al que pertenece',
  })
  @IsNotEmpty({ message: 'El courseId es obligatorio' })
  @IsUUID('4', { message: 'courseId debe ser un UUID válido' })
  courseId: string;

  // ============================================
  // IDENTIFICACIÓN
  // ============================================

  @ApiProperty({
    example: 'Marzo 2026',
    description: 'Nombre de la convocatoria',
    maxLength: 100,
  })
  @IsNotEmpty({ message: 'El nombre es obligatorio' })
  @IsString({ message: 'El nombre debe ser texto' })
  @MaxLength(100, { message: 'El nombre no puede exceder 100 caracteres' })
  name: string;

  @ApiProperty({
    example: 'VASC-2026-03',
    description: 'Código único de la convocatoria',
    maxLength: 50,
  })
  @IsNotEmpty({ message: 'El código es obligatorio' })
  @IsString({ message: 'El código debe ser texto' })
  @MaxLength(50, { message: 'El código no puede exceder 50 caracteres' })
  code: string;

  // ============================================
  // FECHAS
  // ============================================

  @ApiProperty({
    example: '2026-02-01',
    description: 'Fecha de inicio de inscripciones (YYYY-MM-DD)',
  })
  @IsNotEmpty({ message: 'La fecha de inicio de inscripciones es obligatoria' })
  @IsDateString(
    {},
    { message: 'enrollmentStartDate debe ser una fecha válida (YYYY-MM-DD)' },
  )
  enrollmentStartDate: string;

  @ApiProperty({
    example: '2026-02-28',
    description: 'Fecha de fin de inscripciones (YYYY-MM-DD)',
  })
  @IsNotEmpty({ message: 'La fecha de fin de inscripciones es obligatoria' })
  @IsDateString(
    {},
    { message: 'enrollmentEndDate debe ser una fecha válida (YYYY-MM-DD)' },
  )
  enrollmentEndDate: string;

  @ApiProperty({
    example: '2026-03-01',
    description: 'Fecha de inicio del curso (YYYY-MM-DD)',
  })
  @IsNotEmpty({ message: 'La fecha de inicio del curso es obligatoria' })
  @IsDateString(
    {},
    { message: 'startDate debe ser una fecha válida (YYYY-MM-DD)' },
  )
  startDate: string;

  @ApiProperty({
    example: '2026-05-31',
    description: 'Fecha de fin del curso (YYYY-MM-DD)',
  })
  @IsNotEmpty({ message: 'La fecha de fin del curso es obligatoria' })
  @IsDateString(
    {},
    { message: 'endDate debe ser una fecha válida (YYYY-MM-DD)' },
  )
  endDate: string;

  // ============================================
  // CAPACIDAD
  // ============================================

  @ApiPropertyOptional({
    example: 100,
    description: 'Cupo máximo total de la convocatoria',
  })
  @IsOptional()
  @IsInt({ message: 'maxStudents debe ser un número entero' })
  @Min(1, { message: 'maxStudents debe ser al menos 1' })
  maxStudents?: number;

  // ============================================
  // PRECIOS (Override del curso)
  // ============================================

  @ApiPropertyOptional({
    example: 299.0,
    description: 'Precio especial para esta convocatoria (override del curso)',
  })
  @IsOptional()
  @IsNumber({}, { message: 'customPrice debe ser un número' })
  @Min(0, { message: 'customPrice debe ser mayor o igual a 0' })
  @Type(() => Number)
  customPrice?: number;

  @ApiPropertyOptional({
    example: 249.0,
    description: 'Precio de oferta especial para esta convocatoria',
  })
  @IsOptional()
  @IsNumber({}, { message: 'customSalePrice debe ser un número' })
  @Min(0, { message: 'customSalePrice debe ser mayor o igual a 0' })
  @Type(() => Number)
  customSalePrice?: number;

  // ============================================
  // ESTADO
  // ============================================

  @ApiPropertyOptional({
    example: 'draft',
    description: 'Estado de la convocatoria',
    enum: CohortStatus,
    default: CohortStatus.DRAFT,
  })
  @IsOptional()
  @IsEnum(CohortStatus, { message: 'Estado inválido' })
  status?: CohortStatus;
}
