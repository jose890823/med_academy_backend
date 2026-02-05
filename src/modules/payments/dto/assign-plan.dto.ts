import { ApiProperty } from '@nestjs/swagger';
import {
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
} from 'class-validator';
import { SubscriptionPlan } from '../entities/subscription.entity';

export class AssignPlanDto {
  @ApiProperty({
    description: 'ID del usuario al que asignar el plan',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @IsUUID()
  @IsNotEmpty()
  userId: string;

  @ApiProperty({
    description: 'Tipo de plan a asignar',
    enum: SubscriptionPlan,
    example: SubscriptionPlan.CREATOR,
  })
  @IsEnum(SubscriptionPlan)
  @IsNotEmpty()
  planType: SubscriptionPlan;

  @ApiProperty({
    description: 'Notas opcionales sobre la asignacion',
    example: 'Plan asignado manualmente para pruebas',
    required: false,
  })
  @IsString()
  @IsOptional()
  notes?: string;
}

export class RemovePlanDto {
  @ApiProperty({
    description: 'ID del usuario al que remover el plan',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @IsUUID()
  @IsNotEmpty()
  userId: string;

  @ApiProperty({
    description: 'Razon de la cancelacion',
    example: 'Cancelado por administrador',
    required: false,
  })
  @IsString()
  @IsOptional()
  reason?: string;
}
