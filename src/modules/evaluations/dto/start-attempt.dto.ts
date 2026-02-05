import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsUUID } from 'class-validator';

/**
 * DTO para iniciar un intento de evaluación
 */
export class StartAttemptDto {
  @ApiProperty({
    example: '550e8400-e29b-41d4-a716-446655440000',
    description: 'ID de la inscripción del estudiante',
  })
  @IsNotEmpty({ message: 'El enrollmentId es obligatorio' })
  @IsUUID('4', { message: 'enrollmentId debe ser un UUID válido' })
  enrollmentId: string;

  @ApiProperty({
    example: '550e8400-e29b-41d4-a716-446655440000',
    description: 'ID de la evaluación',
  })
  @IsNotEmpty({ message: 'El evaluationId es obligatorio' })
  @IsUUID('4', { message: 'evaluationId debe ser un UUID válido' })
  evaluationId: string;
}
