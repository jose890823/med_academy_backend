import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsInt, IsEnum, IsUUID, Min, Max } from 'class-validator';
import { Type, Transform } from 'class-transformer';
import { EnrollmentStatus, PaymentStatus } from '../entities/enrollment.entity';

/**
 * DTO para filtrar y paginar inscripciones
 */
export class EnrollmentQueryDto {
  // ============================================
  // PAGINACIÓN
  // ============================================

  @ApiPropertyOptional({
    example: 1,
    description: 'Número de página',
    default: 1,
  })
  @IsOptional()
  @IsInt({ message: 'page debe ser un número entero' })
  @Min(1, { message: 'page debe ser al menos 1' })
  @Type(() => Number)
  page?: number = 1;

  @ApiPropertyOptional({
    example: 20,
    description: 'Elementos por página',
    default: 20,
  })
  @IsOptional()
  @IsInt({ message: 'limit debe ser un número entero' })
  @Min(1, { message: 'limit debe ser al menos 1' })
  @Max(100, { message: 'limit no puede exceder 100' })
  @Type(() => Number)
  limit?: number = 20;

  // ============================================
  // FILTROS
  // ============================================

  @ApiPropertyOptional({
    example: '550e8400-e29b-41d4-a716-446655440000',
    description: 'Filtrar por estudiante',
  })
  @IsOptional()
  @IsUUID('4', { message: 'studentId debe ser un UUID válido' })
  studentId?: string;

  @ApiPropertyOptional({
    example: '550e8400-e29b-41d4-a716-446655440000',
    description: 'Filtrar por convocatoria',
  })
  @IsOptional()
  @IsUUID('4', { message: 'cohortId debe ser un UUID válido' })
  cohortId?: string;

  @ApiPropertyOptional({
    example: '550e8400-e29b-41d4-a716-446655440000',
    description: 'Filtrar por aula',
  })
  @IsOptional()
  @IsUUID('4', { message: 'classroomId debe ser un UUID válido' })
  classroomId?: string;

  @ApiPropertyOptional({
    example: '550e8400-e29b-41d4-a716-446655440000',
    description: 'Filtrar por curso (a través de la convocatoria)',
  })
  @IsOptional()
  @IsUUID('4', { message: 'courseId debe ser un UUID válido' })
  courseId?: string;

  @ApiPropertyOptional({
    example: 'active',
    description: 'Filtrar por estado de inscripción',
    enum: EnrollmentStatus,
  })
  @IsOptional()
  @IsEnum(EnrollmentStatus, { message: 'Estado de inscripción inválido' })
  status?: EnrollmentStatus;

  @ApiPropertyOptional({
    example: 'completed',
    description: 'Filtrar por estado de pago',
    enum: PaymentStatus,
  })
  @IsOptional()
  @IsEnum(PaymentStatus, { message: 'Estado de pago inválido' })
  paymentStatus?: PaymentStatus;

  @ApiPropertyOptional({
    example: true,
    description: 'Filtrar solo inscripciones con certificado',
  })
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  hasCertificate?: boolean;

  // ============================================
  // ORDENAMIENTO
  // ============================================

  @ApiPropertyOptional({
    example: 'createdAt',
    description: 'Campo para ordenar',
    enum: ['createdAt', 'accessStartDate', 'totalPaid'],
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
  @IsEnum(['ASC', 'DESC'], { message: 'sortOrder debe ser ASC o DESC' })
  sortOrder?: 'ASC' | 'DESC' = 'DESC';
}
