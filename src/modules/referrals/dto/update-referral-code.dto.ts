import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsInt,
  IsDate,
  IsNumber,
  IsBoolean,
  MaxLength,
  Min,
  Max,
} from 'class-validator';
import { Type } from 'class-transformer';

/**
 * DTO para actualizar un código de referido
 */
export class UpdateReferralCodeDto {
  @ApiPropertyOptional({
    example: 'Mi código actualizado',
    description: 'Descripción del código',
  })
  @IsOptional()
  @IsString({ message: 'La descripción debe ser una cadena de texto' })
  @MaxLength(255, { message: 'La descripción no puede exceder 255 caracteres' })
  description?: string;

  @ApiPropertyOptional({
    example: true,
    description: 'Si el código está activo',
  })
  @IsOptional()
  @IsBoolean({ message: 'isActive debe ser un booleano' })
  isActive?: boolean;

  @ApiPropertyOptional({
    example: 100,
    description: 'Máximo de usos permitidos',
  })
  @IsOptional()
  @IsInt({ message: 'El máximo de usos debe ser un número entero' })
  @Min(1, { message: 'El máximo de usos debe ser al menos 1' })
  maxUses?: number | null;

  @ApiPropertyOptional({
    example: '2026-12-31T23:59:59.000Z',
    description: 'Fecha de expiración del código',
  })
  @IsOptional()
  @Type(() => Date)
  @IsDate({ message: 'La fecha de expiración debe ser válida' })
  expiresAt?: Date | null;

  @ApiPropertyOptional({
    example: 15,
    description: 'Porcentaje de descuento para el referido',
  })
  @IsOptional()
  @IsNumber({}, { message: 'El descuento debe ser un número' })
  @Min(0, { message: 'El descuento no puede ser negativo' })
  @Max(100, { message: 'El descuento no puede exceder 100%' })
  referredDiscountPercent?: number;

  @ApiPropertyOptional({
    example: 75,
    description: 'Crédito en USD para el referidor',
  })
  @IsOptional()
  @IsNumber({}, { message: 'La recompensa debe ser un número' })
  @Min(0, { message: 'La recompensa no puede ser negativa' })
  referrerRewardAmount?: number;
}
