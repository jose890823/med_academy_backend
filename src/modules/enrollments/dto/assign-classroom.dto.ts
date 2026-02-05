import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsUUID } from 'class-validator';

/**
 * DTO para asignar un aula a una inscripción
 */
export class AssignClassroomDto {
  @ApiProperty({
    example: '550e8400-e29b-41d4-a716-446655440000',
    description: 'ID del aula a asignar',
  })
  @IsNotEmpty({ message: 'El classroomId es obligatorio' })
  @IsUUID('4', { message: 'classroomId debe ser un UUID válido' })
  classroomId: string;
}
