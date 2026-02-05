import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  IsUrl,
  IsNumber,
  Min,
} from 'class-validator';

/**
 * DTO para crear una sesión de checkout para un curso
 */
export class CreateCourseCheckoutDto {
  @ApiProperty({
    example: '550e8400-e29b-41d4-a716-446655440000',
    description: 'ID de la inscripción (enrollment)',
  })
  @IsNotEmpty({ message: 'El ID de la inscripción es obligatorio' })
  @IsUUID('4', { message: 'El ID de la inscripción debe ser un UUID válido' })
  enrollmentId: string;

  @ApiProperty({
    example: 'https://example.com/checkout/success',
    description: 'URL de redirección después de pago exitoso',
  })
  @IsNotEmpty({ message: 'La URL de éxito es obligatoria' })
  @IsUrl({}, { message: 'La URL de éxito debe ser una URL válida' })
  successUrl: string;

  @ApiProperty({
    example: 'https://example.com/checkout/cancel',
    description: 'URL de redirección si se cancela el pago',
  })
  @IsNotEmpty({ message: 'La URL de cancelación es obligatoria' })
  @IsUrl({}, { message: 'La URL de cancelación debe ser una URL válida' })
  cancelUrl: string;

  @ApiPropertyOptional({
    example: 265.0,
    description:
      'Monto a pagar (si es diferente al precio total). Útil para pagos parciales.',
  })
  @IsOptional()
  @IsNumber({}, { message: 'El monto debe ser un número' })
  @Min(1, { message: 'El monto mínimo es $1' })
  amount?: number;

  @ApiPropertyOptional({
    example: 'Pago inicial del curso',
    description: 'Descripción personalizada del pago',
  })
  @IsOptional()
  @IsString()
  description?: string;
}

/**
 * DTO para crear checkout de curso para un usuario específico (admin)
 */
export class CreateCourseCheckoutAdminDto extends CreateCourseCheckoutDto {
  @ApiProperty({
    example: '550e8400-e29b-41d4-a716-446655440001',
    description: 'ID del estudiante (solo para admin)',
  })
  @IsNotEmpty({ message: 'El ID del estudiante es obligatorio' })
  @IsUUID('4', { message: 'El ID del estudiante debe ser un UUID válido' })
  studentId: string;
}
