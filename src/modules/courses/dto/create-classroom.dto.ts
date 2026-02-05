import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsBoolean,
  IsInt,
  IsUUID,
  Min,
  MaxLength,
} from 'class-validator';

/**
 * DTO para crear un aula virtual
 */
export class CreateClassroomDto {
  @ApiProperty({
    example: '550e8400-e29b-41d4-a716-446655440000',
    description: 'ID de la convocatoria a la que pertenece',
  })
  @IsNotEmpty({ message: 'El cohortId es obligatorio' })
  @IsUUID('4', { message: 'cohortId debe ser un UUID válido' })
  cohortId: string;

  @ApiProperty({
    example: 'Aula A',
    description: 'Nombre del aula',
    maxLength: 100,
  })
  @IsNotEmpty({ message: 'El nombre es obligatorio' })
  @IsString({ message: 'El nombre debe ser texto' })
  @MaxLength(100, { message: 'El nombre no puede exceder 100 caracteres' })
  name: string;

  @ApiPropertyOptional({
    example: 30,
    description: 'Capacidad máxima de estudiantes',
    default: 30,
  })
  @IsOptional()
  @IsInt({ message: 'maxStudents debe ser un número entero' })
  @Min(1, { message: 'maxStudents debe ser al menos 1' })
  maxStudents?: number;

  // ============================================
  // HORARIO Y ACCESO
  // ============================================

  @ApiPropertyOptional({
    example: 'Lunes y Miércoles 7pm EST',
    description: 'Horario específico del aula',
    maxLength: 200,
  })
  @IsOptional()
  @IsString({ message: 'El horario debe ser texto' })
  @MaxLength(200, { message: 'El horario no puede exceder 200 caracteres' })
  schedule?: string;

  @ApiPropertyOptional({
    example: 'https://zoom.us/j/123456789',
    description: 'URL de la reunión virtual (Zoom, Meet, etc.)',
  })
  @IsOptional()
  @IsString({ message: 'La URL de la reunión debe ser texto' })
  meetingUrl?: string;

  @ApiPropertyOptional({
    example: '123456',
    description: 'ID de la reunión (si aplica)',
    maxLength: 50,
  })
  @IsOptional()
  @IsString({ message: 'El ID de la reunión debe ser texto' })
  @MaxLength(50, {
    message: 'El ID de la reunión no puede exceder 50 caracteres',
  })
  meetingId?: string;

  @ApiPropertyOptional({
    example: 'abc123',
    description: 'Contraseña de la reunión (si aplica)',
    maxLength: 50,
  })
  @IsOptional()
  @IsString({ message: 'La contraseña de la reunión debe ser texto' })
  @MaxLength(50, {
    message: 'La contraseña de la reunión no puede exceder 50 caracteres',
  })
  meetingPassword?: string;

  // ============================================
  // ESTADO
  // ============================================

  @ApiPropertyOptional({
    example: true,
    description: 'Indica si el aula está activa',
    default: true,
  })
  @IsOptional()
  @IsBoolean({ message: 'isActive debe ser booleano' })
  isActive?: boolean;
}
