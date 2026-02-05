import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsEmail,
  IsUUID,
  MaxLength,
} from 'class-validator';

/**
 * DTO para inscribirse a una sesión de workshop
 */
export class CreateRegistrationDto {
  @ApiProperty({
    example: '550e8400-e29b-41d4-a716-446655440000',
    description: 'ID de la sesión',
  })
  @IsNotEmpty({ message: 'El ID de la sesión es obligatorio' })
  @IsUUID('4', { message: 'El ID de la sesión debe ser un UUID válido' })
  sessionId: string;

  // ============================================
  // INFORMACIÓN DE CONTACTO
  // ============================================

  @ApiProperty({
    example: 'juan.perez@example.com',
    description: 'Email de contacto',
  })
  @IsNotEmpty({ message: 'El email es obligatorio' })
  @IsEmail({}, { message: 'El email debe ser válido' })
  contactEmail: string;

  @ApiPropertyOptional({
    example: '+1-305-555-1234',
    description: 'Teléfono de contacto',
  })
  @IsOptional()
  @IsString({ message: 'El teléfono debe ser texto' })
  @MaxLength(30, { message: 'El teléfono no puede exceder 30 caracteres' })
  contactPhone?: string;

  @ApiProperty({
    example: 'Juan',
    description: 'Nombre',
  })
  @IsNotEmpty({ message: 'El nombre es obligatorio' })
  @IsString({ message: 'El nombre debe ser texto' })
  @MaxLength(100, { message: 'El nombre no puede exceder 100 caracteres' })
  firstName: string;

  @ApiProperty({
    example: 'Pérez',
    description: 'Apellido',
  })
  @IsNotEmpty({ message: 'El apellido es obligatorio' })
  @IsString({ message: 'El apellido debe ser texto' })
  @MaxLength(100, { message: 'El apellido no puede exceder 100 caracteres' })
  lastName: string;

  // ============================================
  // INFORMACIÓN DE EMERGENCIA
  // ============================================

  @ApiPropertyOptional({
    example: 'María Pérez',
    description: 'Contacto de emergencia',
  })
  @IsOptional()
  @IsString({ message: 'El contacto debe ser texto' })
  @MaxLength(200, { message: 'El contacto no puede exceder 200 caracteres' })
  emergencyContactName?: string;

  @ApiPropertyOptional({
    example: '+1-305-555-5678',
    description: 'Teléfono de emergencia',
  })
  @IsOptional()
  @IsString({ message: 'El teléfono debe ser texto' })
  @MaxLength(30, { message: 'El teléfono no puede exceder 30 caracteres' })
  emergencyContactPhone?: string;

  // ============================================
  // REQUISITOS ESPECIALES
  // ============================================

  @ApiPropertyOptional({
    example: 'Vegetariano',
    description: 'Requisitos dietéticos',
  })
  @IsOptional()
  @IsString({ message: 'Los requisitos deben ser texto' })
  dietaryRequirements?: string;

  @ApiPropertyOptional({
    example: 'Silla de ruedas',
    description: 'Necesidades de accesibilidad',
  })
  @IsOptional()
  @IsString({ message: 'Las necesidades deben ser texto' })
  accessibilityNeeds?: string;

  @ApiPropertyOptional({
    example: 'Interesado en técnicas de Doppler',
    description: 'Notas adicionales',
  })
  @IsOptional()
  @IsString({ message: 'Las notas deben ser texto' })
  notes?: string;
}
