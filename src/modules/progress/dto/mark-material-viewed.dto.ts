import { ApiProperty } from '@nestjs/swagger';
import {
  IsUUID,
  IsNotEmpty,
  IsNumber,
  Min,
} from 'class-validator';

/**
 * DTO para marcar un material como visto/descargado
 */
export class MarkMaterialViewedDto {
  @ApiProperty({
    example: '550e8400-e29b-41d4-a716-446655440000',
    description: 'ID del módulo',
  })
  @IsNotEmpty({ message: 'El ID del módulo es obligatorio' })
  @IsUUID('4', { message: 'El ID del módulo debe ser un UUID válido' })
  moduleId: string;

  @ApiProperty({
    example: 0,
    description: 'Índice del material en el array de materiales',
  })
  @IsNotEmpty({ message: 'El índice del material es obligatorio' })
  @IsNumber({}, { message: 'El índice debe ser un número' })
  @Min(0, { message: 'El índice no puede ser negativo' })
  materialIndex: number;
}
