import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsEnum,
  IsBoolean,
  MaxLength,
} from 'class-validator';
import { ReferralStatus } from '../entities/referral.entity';

/**
 * DTO para actualizar el estado de un referido (Admin)
 */
export class UpdateReferralStatusDto {
  @ApiProperty({
    example: 'completed',
    description: 'Nuevo estado del referido',
    enum: ReferralStatus,
  })
  @IsEnum(ReferralStatus, { message: 'Estado inválido' })
  status: ReferralStatus;

  @ApiPropertyOptional({
    example: 'Completado manualmente por admin',
    description: 'Notas sobre el cambio de estado',
  })
  @IsOptional()
  @IsString({ message: 'Las notas deben ser una cadena de texto' })
  @MaxLength(500, { message: 'Las notas no pueden exceder 500 caracteres' })
  notes?: string;
}

/**
 * DTO para marcar recompensa como entregada
 */
export class MarkRewardDeliveredDto {
  @ApiProperty({
    example: 'referrer',
    description: 'A quién se entregó la recompensa',
    enum: ['referrer', 'referred', 'both'],
  })
  @IsEnum(['referrer', 'referred', 'both'], {
    message: 'El tipo debe ser: referrer, referred, o both',
  })
  rewardTo: 'referrer' | 'referred' | 'both';

  @ApiPropertyOptional({
    example: 'Crédito aplicado a cuenta',
    description: 'Notas sobre la entrega de recompensa',
  })
  @IsOptional()
  @IsString({ message: 'Las notas deben ser una cadena de texto' })
  @MaxLength(500, { message: 'Las notas no pueden exceder 500 caracteres' })
  notes?: string;
}

/**
 * DTO para configuración global de referidos
 */
export class ReferralConfigDto {
  @ApiPropertyOptional({
    example: 10,
    description: 'Porcentaje de descuento por defecto para referidos',
  })
  @IsOptional()
  defaultReferredDiscountPercent?: number;

  @ApiPropertyOptional({
    example: 50,
    description: 'Recompensa por defecto para referidores (USD)',
  })
  @IsOptional()
  defaultReferrerRewardAmount?: number;

  @ApiPropertyOptional({
    example: 30,
    description: 'Días para que expire un referido pendiente',
  })
  @IsOptional()
  referralExpirationDays?: number;

  @ApiPropertyOptional({
    example: true,
    description: 'Si el programa de referidos está activo',
  })
  @IsOptional()
  @IsBoolean({ message: 'isActive debe ser un booleano' })
  isActive?: boolean;
}
