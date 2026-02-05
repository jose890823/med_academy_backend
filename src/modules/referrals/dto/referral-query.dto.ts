import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsOptional,
  IsInt,
  IsEnum,
  IsUUID,
  IsBoolean,
  Min,
  Max,
} from 'class-validator';
import { Type, Transform } from 'class-transformer';
import { ReferralStatus } from '../entities/referral.entity';

/**
 * DTO para consultar códigos de referido
 */
export class ReferralCodeQueryDto {
  @ApiPropertyOptional({
    example: 1,
    description: 'Página a consultar',
    default: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'La página debe ser un número entero' })
  @Min(1, { message: 'La página debe ser al menos 1' })
  page?: number = 1;

  @ApiPropertyOptional({
    example: 20,
    description: 'Elementos por página',
    default: 20,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'El límite debe ser un número entero' })
  @Min(1, { message: 'El límite debe ser al menos 1' })
  @Max(100, { message: 'El límite no puede exceder 100' })
  limit?: number = 20;

  @ApiPropertyOptional({
    example: '550e8400-e29b-41d4-a716-446655440000',
    description: 'Filtrar por usuario dueño',
  })
  @IsOptional()
  @IsUUID('4', { message: 'El ID de usuario debe ser un UUID válido' })
  userId?: string;

  @ApiPropertyOptional({
    example: true,
    description: 'Filtrar por códigos activos/inactivos',
  })
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean({ message: 'isActive debe ser un booleano' })
  isActive?: boolean;
}

/**
 * DTO para consultar referidos
 */
export class ReferralQueryDto {
  @ApiPropertyOptional({
    example: 1,
    description: 'Página a consultar',
    default: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'La página debe ser un número entero' })
  @Min(1, { message: 'La página debe ser al menos 1' })
  page?: number = 1;

  @ApiPropertyOptional({
    example: 20,
    description: 'Elementos por página',
    default: 20,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'El límite debe ser un número entero' })
  @Min(1, { message: 'El límite debe ser al menos 1' })
  @Max(100, { message: 'El límite no puede exceder 100' })
  limit?: number = 20;

  @ApiPropertyOptional({
    example: '550e8400-e29b-41d4-a716-446655440000',
    description: 'Filtrar por referidor',
  })
  @IsOptional()
  @IsUUID('4', { message: 'El ID de referidor debe ser un UUID válido' })
  referrerId?: string;

  @ApiPropertyOptional({
    example: '550e8400-e29b-41d4-a716-446655440000',
    description: 'Filtrar por referido',
  })
  @IsOptional()
  @IsUUID('4', { message: 'El ID de referido debe ser un UUID válido' })
  referredId?: string;

  @ApiPropertyOptional({
    example: 'pending',
    description: 'Filtrar por estado',
    enum: ReferralStatus,
  })
  @IsOptional()
  @IsEnum(ReferralStatus, { message: 'Estado inválido' })
  status?: ReferralStatus;

  @ApiPropertyOptional({
    example: '550e8400-e29b-41d4-a716-446655440000',
    description: 'Filtrar por código de referido',
  })
  @IsOptional()
  @IsUUID('4', { message: 'El ID del código debe ser un UUID válido' })
  referralCodeId?: string;
}
