import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsInt,
  IsDate,
  IsNumber,
  IsBoolean,
  MinLength,
  MaxLength,
  Min,
  Max,
  Matches,
} from 'class-validator';
import { Type } from 'class-transformer';

/**
 * DTO para crear un código de referido
 */
export class CreateReferralCodeDto {
  @ApiPropertyOptional({
    example: 'JOHN2024',
    description: 'Código personalizado (si no se provee, se genera automáticamente)',
    minLength: 4,
    maxLength: 20,
  })
  @IsOptional()
  @IsString({ message: 'El código debe ser una cadena de texto' })
  @MinLength(4, { message: 'El código debe tener al menos 4 caracteres' })
  @MaxLength(20, { message: 'El código no puede exceder 20 caracteres' })
  @Matches(/^[A-Z0-9]+$/, {
    message: 'El código solo puede contener letras mayúsculas y números',
  })
  code?: string;

  @ApiPropertyOptional({
    example: 'Mi código para amigos y familia',
    description: 'Descripción opcional del código',
  })
  @IsOptional()
  @IsString({ message: 'La descripción debe ser una cadena de texto' })
  @MaxLength(255, { message: 'La descripción no puede exceder 255 caracteres' })
  description?: string;

  @ApiPropertyOptional({
    example: 100,
    description: 'Máximo de usos permitidos (null = ilimitado)',
  })
  @IsOptional()
  @IsInt({ message: 'El máximo de usos debe ser un número entero' })
  @Min(1, { message: 'El máximo de usos debe ser al menos 1' })
  maxUses?: number;

  @ApiPropertyOptional({
    example: '2026-12-31T23:59:59.000Z',
    description: 'Fecha de expiración del código',
  })
  @IsOptional()
  @Type(() => Date)
  @IsDate({ message: 'La fecha de expiración debe ser válida' })
  expiresAt?: Date;

  @ApiPropertyOptional({
    example: 10,
    description: 'Porcentaje de descuento para el referido (0-100)',
    default: 10,
  })
  @IsOptional()
  @IsNumber({}, { message: 'El descuento debe ser un número' })
  @Min(0, { message: 'El descuento no puede ser negativo' })
  @Max(100, { message: 'El descuento no puede exceder 100%' })
  referredDiscountPercent?: number;

  @ApiPropertyOptional({
    example: 50,
    description: 'Crédito en USD para el referidor por cada referido completado',
    default: 50,
  })
  @IsOptional()
  @IsNumber({}, { message: 'La recompensa debe ser un número' })
  @Min(0, { message: 'La recompensa no puede ser negativa' })
  referrerRewardAmount?: number;
}

/**
 * DTO para crear código de referido por admin (incluye userId)
 */
export class AdminCreateReferralCodeDto extends CreateReferralCodeDto {
  @ApiProperty({
    example: '550e8400-e29b-41d4-a716-446655440000',
    description: 'ID del usuario dueño del código',
  })
  @IsString({ message: 'El ID del usuario es obligatorio' })
  userId: string;

  @ApiPropertyOptional({
    example: true,
    description: 'Si el código está activo',
    default: true,
  })
  @IsOptional()
  @IsBoolean({ message: 'isActive debe ser un booleano' })
  isActive?: boolean;
}
