import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString, IsUUID } from 'class-validator';

/**
 * DTO para que un estudiante se inscriba a sí mismo en un cohort abierto
 */
export class SelfEnrollDto {
  @ApiProperty({
    example: '550e8400-e29b-41d4-a716-446655440000',
    description: 'ID del cohort (convocatoria) abierto',
  })
  @IsNotEmpty({ message: 'El cohortId es obligatorio' })
  @IsUUID('4', { message: 'cohortId debe ser un UUID válido' })
  cohortId: string;

  @ApiPropertyOptional({
    example: 'REF-ABC123',
    description: 'Código de referido para obtener descuento',
  })
  @IsOptional()
  @IsString({ message: 'El código de referido debe ser una cadena de texto' })
  referralCode?: string;
}
