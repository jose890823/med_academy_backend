import { ApiProperty } from '@nestjs/swagger';
import {
  IsUUID,
  IsNotEmpty,
  IsString,
  MaxLength,
  IsOptional,
} from 'class-validator';

/**
 * DTO para actualizar notas del estudiante en un módulo
 */
export class UpdateStudentNotesDto {
  @ApiProperty({
    example: '550e8400-e29b-41d4-a716-446655440000',
    description: 'ID del módulo',
  })
  @IsNotEmpty({ message: 'El ID del módulo es obligatorio' })
  @IsUUID('4', { message: 'El ID del módulo debe ser un UUID válido' })
  moduleId: string;

  @ApiProperty({
    example:
      'Revisar fórmula de velocidad en el minuto 15:30. Importante para el examen.',
    description: 'Notas del estudiante',
    required: false,
  })
  @IsOptional()
  @IsString({ message: 'Las notas deben ser texto' })
  @MaxLength(5000, { message: 'Las notas no pueden exceder 5000 caracteres' })
  notes?: string | null;
}
