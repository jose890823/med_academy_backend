import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsOptional,
  IsUUID,
  IsDateString,
  IsNumber,
  IsString,
  IsEnum,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';
import { EnrollmentStatus, PaymentStatus } from '../entities/enrollment.entity';

/**
 * DTO para actualizar una inscripción
 */
export class UpdateEnrollmentDto {
  @ApiPropertyOptional({
    example: '550e8400-e29b-41d4-a716-446655440000',
    description: 'ID del aula',
  })
  @IsOptional()
  @IsUUID('4', { message: 'classroomId debe ser un UUID válido' })
  classroomId?: string;

  @ApiPropertyOptional({
    example: '2026-03-01',
    description: 'Fecha de inicio de acceso',
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
    example: 'active',
    description: 'Estado de la inscripción',
    enum: EnrollmentStatus,
  })
  @IsOptional()
  @IsEnum(EnrollmentStatus, { message: 'Estado de inscripción inválido' })
  status?: EnrollmentStatus;

  @ApiPropertyOptional({
    example: 'completed',
    description: 'Estado del pago',
    enum: PaymentStatus,
  })
  @IsOptional()
  @IsEnum(PaymentStatus, { message: 'Estado de pago inválido' })
  paymentStatus?: PaymentStatus;

  @ApiPropertyOptional({
    example: 265.0,
    description: 'Total pagado',
  })
  @IsOptional()
  @IsNumber({}, { message: 'totalPaid debe ser un número' })
  @Min(0, { message: 'totalPaid debe ser mayor o igual a 0' })
  @Type(() => Number)
  totalPaid?: number;

  @ApiPropertyOptional({
    example: 'Notas actualizadas',
    description: 'Notas administrativas',
  })
  @IsOptional()
  @IsString({ message: 'notes debe ser texto' })
  notes?: string;
}
