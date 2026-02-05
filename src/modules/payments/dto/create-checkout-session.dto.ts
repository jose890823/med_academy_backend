import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsString,
  IsEnum,
  IsOptional,
  IsUUID,
  IsNumber,
  Min,
} from 'class-validator';
import {
  SubscriptionPlan,
  InitialPaymentType,
} from '../entities/subscription.entity';

export class CreateCheckoutSessionDto {
  @ApiProperty({
    description: 'ID del usuario que inicia el checkout',
    example: '550e8400-e29b-41d4-a716-446655440001',
  })
  @IsNotEmpty()
  @IsUUID()
  userId: string;

  @ApiPropertyOptional({
    description: 'Tipo de plan seleccionado',
    enum: SubscriptionPlan,
    example: SubscriptionPlan.CREATOR,
  })
  @IsOptional()
  @IsEnum(SubscriptionPlan)
  planType?: SubscriptionPlan;

  @ApiPropertyOptional({
    description: 'Tipo de pago inicial (único o fraccionado)',
    enum: InitialPaymentType,
    example: InitialPaymentType.SINGLE,
  })
  @IsOptional()
  @IsEnum(InitialPaymentType)
  initialPaymentType?: InitialPaymentType;

  @ApiProperty({
    description: 'URL a la que redirigir después de un pago exitoso',
    example: 'https://echomeddx.com/checkout/success',
  })
  @IsNotEmpty()
  @IsString()
  successUrl: string;

  @ApiProperty({
    description: 'URL a la que redirigir si el usuario cancela',
    example: 'https://echomeddx.com/checkout/cancel',
  })
  @IsNotEmpty()
  @IsString()
  cancelUrl: string;

  @ApiPropertyOptional({
    description: 'Precio mensual en USD',
    example: 24.0,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  monthlyPrice?: number;

  @ApiPropertyOptional({
    description: 'Monto del pago inicial en USD',
    example: 199.0,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  initialPaymentAmount?: number;

  @ApiPropertyOptional({
    description: 'Metadata adicional para el checkout',
    example: { referralCode: 'ABC123' },
  })
  @IsOptional()
  metadata?: Record<string, string>;
}
