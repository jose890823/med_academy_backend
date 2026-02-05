import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsString,
  IsOptional,
  IsUUID,
  IsArray,
  IsEnum,
  MaxLength,
  MinLength,
} from 'class-validator';
import { DiscussionType } from '../entities/discussion.entity';

/**
 * DTO para crear una discusión
 */
export class CreateDiscussionDto {
  @ApiProperty({
    example: '¿Cómo interpretar artefactos en ecografía vascular?',
    description: 'Título de la discusión',
    minLength: 10,
    maxLength: 255,
  })
  @IsNotEmpty({ message: 'El título es obligatorio' })
  @IsString({ message: 'El título debe ser texto' })
  @MinLength(10, { message: 'El título debe tener al menos 10 caracteres' })
  @MaxLength(255, { message: 'El título no debe exceder 255 caracteres' })
  title: string;

  @ApiProperty({
    example:
      'Tengo dudas sobre cómo distinguir los artefactos de reverberación de los de espejo en estudios de carótida...',
    description: 'Contenido del primer post',
    minLength: 20,
  })
  @IsNotEmpty({ message: 'El contenido es obligatorio' })
  @IsString({ message: 'El contenido debe ser texto' })
  @MinLength(20, { message: 'El contenido debe tener al menos 20 caracteres' })
  content: string;

  @ApiPropertyOptional({
    example: 'question',
    description: 'Tipo de discusión',
    enum: DiscussionType,
    default: DiscussionType.DISCUSSION,
  })
  @IsOptional()
  @IsEnum(DiscussionType, { message: 'Tipo de discusión inválido' })
  type?: DiscussionType;

  @ApiPropertyOptional({
    example: '550e8400-e29b-41d4-a716-446655440000',
    description: 'ID del curso (null = foro general)',
  })
  @IsOptional()
  @IsUUID('4', { message: 'courseId debe ser un UUID válido' })
  courseId?: string;

  @ApiPropertyOptional({
    example: ['artefactos', 'ecografía vascular', 'doppler'],
    description: 'Etiquetas de la discusión',
  })
  @IsOptional()
  @IsArray({ message: 'tags debe ser un array' })
  @IsString({ each: true, message: 'Cada tag debe ser texto' })
  tags?: string[];
}
