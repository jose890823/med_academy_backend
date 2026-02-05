import { ApiProperty } from '@nestjs/swagger';
import {
  IsUUID,
  IsNotEmpty,
  IsNumber,
  IsBoolean,
  IsOptional,
  Min,
  Max,
} from 'class-validator';

/**
 * DTO para actualizar el progreso de video
 */
export class UpdateVideoProgressDto {
  @ApiProperty({
    example: '550e8400-e29b-41d4-a716-446655440000',
    description: 'ID del módulo',
  })
  @IsNotEmpty({ message: 'El ID del módulo es obligatorio' })
  @IsUUID('4', { message: 'El ID del módulo debe ser un UUID válido' })
  moduleId: string;

  @ApiProperty({
    example: 1245,
    description: 'Posición actual del video en segundos',
  })
  @IsNotEmpty({ message: 'La posición del video es obligatoria' })
  @IsNumber({}, { message: 'La posición debe ser un número' })
  @Min(0, { message: 'La posición no puede ser negativa' })
  currentPosition: number;

  @ApiProperty({
    example: 1800,
    description: 'Duración total del video en segundos',
    required: false,
  })
  @IsOptional()
  @IsNumber({}, { message: 'La duración debe ser un número' })
  @Min(1, { message: 'La duración debe ser mayor a 0' })
  duration?: number;

  @ApiProperty({
    example: false,
    description: 'Indica si el video fue completado',
    required: false,
  })
  @IsOptional()
  @IsBoolean({ message: 'videoCompleted debe ser un booleano' })
  videoCompleted?: boolean;
}
