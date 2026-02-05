import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsBoolean,
  IsInt,
  Min,
  MaxLength,
} from 'class-validator';

/**
 * DTO para crear una categoría
 */
export class CreateCategoryDto {
  @ApiProperty({
    example: 'Vascular Sonography',
    description: 'Nombre de la categoría',
    maxLength: 100,
  })
  @IsNotEmpty({ message: 'El nombre es obligatorio' })
  @IsString({ message: 'El nombre debe ser texto' })
  @MaxLength(100, { message: 'El nombre no puede exceder 100 caracteres' })
  name: string;

  @ApiProperty({
    example: 'vascular-sonography',
    description: 'Slug único para URLs amigables',
    maxLength: 100,
  })
  @IsNotEmpty({ message: 'El slug es obligatorio' })
  @IsString({ message: 'El slug debe ser texto' })
  @MaxLength(100, { message: 'El slug no puede exceder 100 caracteres' })
  slug: string;

  @ApiPropertyOptional({
    example: 'Programas especializados en sonografía vascular',
    description: 'Descripción de la categoría',
  })
  @IsOptional()
  @IsString({ message: 'La descripción debe ser texto' })
  description?: string;

  @ApiPropertyOptional({
    example: 'lucide:heart-pulse',
    description: 'Icono de la categoría (formato: provider:icon-name)',
    maxLength: 100,
  })
  @IsOptional()
  @IsString({ message: 'El icono debe ser texto' })
  @MaxLength(100, { message: 'El icono no puede exceder 100 caracteres' })
  icon?: string;

  @ApiPropertyOptional({
    example: 1,
    description: 'Orden de visualización',
    default: 0,
  })
  @IsOptional()
  @IsInt({ message: 'El orden debe ser un número entero' })
  @Min(0, { message: 'El orden debe ser mayor o igual a 0' })
  order?: number;

  @ApiPropertyOptional({
    example: true,
    description: 'Indica si la categoría está activa',
    default: true,
  })
  @IsOptional()
  @IsBoolean({ message: 'isActive debe ser booleano' })
  isActive?: boolean;
}
