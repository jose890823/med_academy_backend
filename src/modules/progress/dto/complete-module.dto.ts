import { ApiProperty } from '@nestjs/swagger';
import {
  IsUUID,
  IsNotEmpty,
} from 'class-validator';

/**
 * DTO para marcar un módulo como completado
 */
export class CompleteModuleDto {
  @ApiProperty({
    example: '550e8400-e29b-41d4-a716-446655440000',
    description: 'ID del módulo a completar',
  })
  @IsNotEmpty({ message: 'El ID del módulo es obligatorio' })
  @IsUUID('4', { message: 'El ID del módulo debe ser un UUID válido' })
  moduleId: string;
}
