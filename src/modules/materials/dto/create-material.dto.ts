import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  IsEnum,
  IsBoolean,
  IsNumber,
  IsUrl,
  Min,
  MaxLength,
  IsObject,
} from 'class-validator';
import { MaterialType, StorageProvider } from '../entities/material.entity';

/**
 * DTO para crear un material
 */
export class CreateMaterialDto {
  @ApiProperty({
    example: 'Guía de Física Doppler',
    description: 'Nombre del material',
  })
  @IsNotEmpty({ message: 'El nombre es obligatorio' })
  @IsString({ message: 'El nombre debe ser texto' })
  @MaxLength(255, { message: 'El nombre no debe exceder 255 caracteres' })
  name: string;

  @ApiPropertyOptional({
    example: 'Documento PDF con los fundamentos de la física Doppler.',
    description: 'Descripción del material',
  })
  @IsOptional()
  @IsString({ message: 'La descripción debe ser texto' })
  description?: string;

  @ApiProperty({
    example: 'pdf',
    description: 'Tipo de material',
    enum: MaterialType,
  })
  @IsNotEmpty({ message: 'El tipo es obligatorio' })
  @IsEnum(MaterialType, { message: 'Tipo de material inválido' })
  type: MaterialType;

  @ApiProperty({
    example: 'https://s3.amazonaws.com/bucket/materials/doppler-guide.pdf',
    description: 'URL del archivo',
  })
  @IsNotEmpty({ message: 'La URL es obligatoria' })
  @IsUrl({}, { message: 'La URL debe tener formato válido' })
  url: string;

  @ApiPropertyOptional({
    example: 's3',
    description: 'Proveedor de almacenamiento',
    enum: StorageProvider,
  })
  @IsOptional()
  @IsEnum(StorageProvider, { message: 'Proveedor de almacenamiento inválido' })
  storageProvider?: StorageProvider;

  @ApiPropertyOptional({
    example: 'materials/courses/123/doppler-guide.pdf',
    description: 'Ruta/key en el almacenamiento',
  })
  @IsOptional()
  @IsString()
  storagePath?: string;

  @ApiPropertyOptional({
    example: 'guia-fisica-doppler.pdf',
    description: 'Nombre original del archivo',
  })
  @IsOptional()
  @IsString()
  originalFilename?: string;

  @ApiPropertyOptional({
    example: 'application/pdf',
    description: 'MIME type del archivo',
  })
  @IsOptional()
  @IsString()
  mimeType?: string;

  @ApiPropertyOptional({
    example: 2048576,
    description: 'Tamaño del archivo en bytes',
  })
  @IsOptional()
  @IsNumber({}, { message: 'El tamaño debe ser un número' })
  @Min(0)
  sizeBytes?: number;

  @ApiPropertyOptional({
    example: 45,
    description: 'Duración en minutos (para video/audio)',
  })
  @IsOptional()
  @IsNumber({}, { message: 'La duración debe ser un número' })
  @Min(0)
  durationMinutes?: number;

  @ApiPropertyOptional({
    example: 15,
    description: 'Número de páginas (para documentos)',
  })
  @IsOptional()
  @IsNumber({}, { message: 'El número de páginas debe ser un número' })
  @Min(0)
  pageCount?: number;

  @ApiPropertyOptional({
    example: { width: 1920, height: 1080 },
    description: 'Metadatos adicionales',
  })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;

  @ApiPropertyOptional({
    example: 'https://s3.amazonaws.com/bucket/thumbnails/thumb.jpg',
    description: 'URL de la miniatura',
  })
  @IsOptional()
  @IsUrl({}, { message: 'La URL del thumbnail debe tener formato válido' })
  thumbnailUrl?: string;

  // ============================================
  // RELACIONES
  // ============================================

  @ApiPropertyOptional({
    example: '550e8400-e29b-41d4-a716-446655440000',
    description: 'ID del curso al que pertenece',
  })
  @IsOptional()
  @IsUUID('4', { message: 'courseId debe ser un UUID válido' })
  courseId?: string;

  @ApiPropertyOptional({
    example: '550e8400-e29b-41d4-a716-446655440000',
    description: 'ID del módulo al que pertenece',
  })
  @IsOptional()
  @IsUUID('4', { message: 'moduleId debe ser un UUID válido' })
  moduleId?: string;

  // ============================================
  // OPCIONES
  // ============================================

  @ApiPropertyOptional({
    example: 1,
    description: 'Orden del material',
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  order?: number;

  @ApiPropertyOptional({
    example: false,
    description: 'Si el material es público',
  })
  @IsOptional()
  @IsBoolean({ message: 'isPublic debe ser booleano' })
  isPublic?: boolean;

  @ApiPropertyOptional({
    example: true,
    description: 'Si permite descarga',
  })
  @IsOptional()
  @IsBoolean({ message: 'allowDownload debe ser booleano' })
  allowDownload?: boolean;
}
