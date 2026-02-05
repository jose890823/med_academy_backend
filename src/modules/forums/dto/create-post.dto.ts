import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsString,
  IsOptional,
  IsUUID,
  MinLength,
} from 'class-validator';

/**
 * DTO para crear un post (respuesta)
 */
export class CreatePostDto {
  @ApiProperty({
    example: '550e8400-e29b-41d4-a716-446655440000',
    description: 'ID de la discusión',
  })
  @IsNotEmpty({ message: 'discussionId es obligatorio' })
  @IsUUID('4', { message: 'discussionId debe ser un UUID válido' })
  discussionId: string;

  @ApiProperty({
    example: 'Excelente pregunta! Los artefactos de reverberación se caracterizan por...',
    description: 'Contenido del post (markdown soportado)',
    minLength: 10,
  })
  @IsNotEmpty({ message: 'El contenido es obligatorio' })
  @IsString({ message: 'El contenido debe ser texto' })
  @MinLength(10, { message: 'El contenido debe tener al menos 10 caracteres' })
  content: string;

  @ApiPropertyOptional({
    example: '550e8400-e29b-41d4-a716-446655440000',
    description: 'ID del post padre (para respuestas anidadas)',
  })
  @IsOptional()
  @IsUUID('4', { message: 'parentId debe ser un UUID válido' })
  parentId?: string;
}
