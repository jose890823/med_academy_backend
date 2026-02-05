import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsOptional,
  IsString,
  IsArray,
  IsEnum,
  IsBoolean,
  MaxLength,
  MinLength,
} from 'class-validator';
import {
  DiscussionStatus,
  DiscussionType,
} from '../entities/discussion.entity';

/**
 * DTO para actualizar una discusión (autor)
 */
export class UpdateDiscussionDto {
  @ApiPropertyOptional({
    example: 'Título actualizado',
    description: 'Nuevo título de la discusión',
  })
  @IsOptional()
  @IsString({ message: 'El título debe ser texto' })
  @MinLength(10, { message: 'El título debe tener al menos 10 caracteres' })
  @MaxLength(255, { message: 'El título no debe exceder 255 caracteres' })
  title?: string;

  @ApiPropertyOptional({
    example: 'Contenido actualizado...',
    description: 'Nuevo contenido',
  })
  @IsOptional()
  @IsString({ message: 'El contenido debe ser texto' })
  @MinLength(20, { message: 'El contenido debe tener al menos 20 caracteres' })
  content?: string;

  @ApiPropertyOptional({
    example: ['nuevo-tag', 'actualizado'],
    description: 'Nuevas etiquetas',
  })
  @IsOptional()
  @IsArray({ message: 'tags debe ser un array' })
  @IsString({ each: true, message: 'Cada tag debe ser texto' })
  tags?: string[];
}

/**
 * DTO para moderar una discusión (admin)
 */
export class ModerateDiscussionDto {
  @ApiPropertyOptional({
    example: 'closed',
    description: 'Nuevo estado',
    enum: DiscussionStatus,
  })
  @IsOptional()
  @IsEnum(DiscussionStatus, { message: 'Estado inválido' })
  status?: DiscussionStatus;

  @ApiPropertyOptional({
    example: true,
    description: 'Fijar/desfijar la discusión',
  })
  @IsOptional()
  @IsBoolean({ message: 'isPinned debe ser booleano' })
  isPinned?: boolean;

  @ApiPropertyOptional({
    example: 'Cerrado por violación de normas de la comunidad',
    description: 'Razón de la moderación',
  })
  @IsOptional()
  @IsString()
  @MaxLength(500, { message: 'La razón no debe exceder 500 caracteres' })
  reason?: string;
}
