import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsUUID,
  MinLength,
  MaxLength,
  Matches,
} from 'class-validator';

/**
 * DTO para validar un código de referido
 */
export class ValidateReferralCodeDto {
  @ApiProperty({
    example: 'JOHN2024',
    description: 'Código de referido a validar',
  })
  @IsNotEmpty({ message: 'El código de referido es obligatorio' })
  @IsString({ message: 'El código debe ser una cadena de texto' })
  @MinLength(4, { message: 'El código debe tener al menos 4 caracteres' })
  @MaxLength(20, { message: 'El código no puede exceder 20 caracteres' })
  @Matches(/^[A-Z0-9]+$/i, {
    message: 'El código solo puede contener letras y números',
  })
  code: string;
}

/**
 * DTO para aplicar un código de referido al registrarse
 */
export class ApplyReferralCodeDto {
  @ApiProperty({
    example: 'JOHN2024',
    description: 'Código de referido a aplicar',
  })
  @IsNotEmpty({ message: 'El código de referido es obligatorio' })
  @IsString({ message: 'El código debe ser una cadena de texto' })
  @MinLength(4, { message: 'El código debe tener al menos 4 caracteres' })
  @MaxLength(20, { message: 'El código no puede exceder 20 caracteres' })
  code: string;

  @ApiProperty({
    example: '550e8400-e29b-41d4-a716-446655440000',
    description: 'ID del usuario que está usando el código (referido)',
  })
  @IsNotEmpty({ message: 'El ID del usuario referido es obligatorio' })
  @IsUUID('4', { message: 'El ID del usuario debe ser un UUID válido' })
  referredUserId: string;
}

/**
 * DTO para completar un referido (después de que el referido hizo una compra)
 */
export class CompleteReferralDto {
  @ApiProperty({
    example: '550e8400-e29b-41d4-a716-446655440000',
    description: 'ID del referido a completar',
  })
  @IsNotEmpty({ message: 'El ID del referido es obligatorio' })
  @IsUUID('4', { message: 'El ID debe ser un UUID válido' })
  referralId: string;

  @ApiPropertyOptional({
    example: '550e8400-e29b-41d4-a716-446655440000',
    description: 'ID de la inscripción que completó el referido',
  })
  @IsOptional()
  @IsUUID('4', { message: 'El ID de inscripción debe ser un UUID válido' })
  enrollmentId?: string;

  @ApiPropertyOptional({
    example: 'Primera compra completada',
    description: 'Notas adicionales',
  })
  @IsOptional()
  @IsString({ message: 'Las notas deben ser una cadena de texto' })
  @MaxLength(500, { message: 'Las notas no pueden exceder 500 caracteres' })
  notes?: string;
}
