import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsNumber,
  IsBoolean,
  IsEnum,
  IsArray,
  IsUUID,
  Min,
  MaxLength,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { WorkshopLevel, RequirementType } from '../entities/workshop.entity';

/**
 * DTO para requisitos del workshop
 */
export class WorkshopRequirementDto {
  @ApiProperty({
    example: 'course_completed',
    description: 'Tipo de requisito',
    enum: RequirementType,
  })
  @IsNotEmpty({ message: 'El tipo de requisito es obligatorio' })
  @IsEnum(RequirementType, { message: 'Tipo de requisito no válido' })
  type: RequirementType;

  @ApiProperty({
    example: '550e8400-e29b-41d4-a716-446655440000',
    description: 'Valor del requisito (ID o texto)',
  })
  @IsString({ message: 'El valor debe ser texto' })
  value: string;

  @ApiProperty({
    example: 'Completar Vascular vCourse',
    description: 'Texto para mostrar en el frontend',
  })
  @IsNotEmpty({ message: 'El label es obligatorio' })
  @IsString({ message: 'El label debe ser texto' })
  @MaxLength(200, { message: 'El label no puede exceder 200 caracteres' })
  label: string;

  @ApiProperty({
    example: true,
    description: 'Indica si es obligatorio (true) o recomendado (false)',
  })
  @IsBoolean({ message: 'isRequired debe ser un booleano' })
  isRequired: boolean;
}

/**
 * DTO para crear un workshop
 */
export class CreateWorkshopDto {
  @ApiProperty({
    example: 'vascular-hands-on-workshop',
    description: 'Slug único para URLs',
  })
  @IsNotEmpty({ message: 'El slug es obligatorio' })
  @IsString({ message: 'El slug debe ser texto' })
  @MaxLength(255, { message: 'El slug no puede exceder 255 caracteres' })
  slug: string;

  @ApiProperty({
    example: 'Vascular Hands-On Workshop',
    description: 'Título del workshop',
  })
  @IsNotEmpty({ message: 'El título es obligatorio' })
  @IsString({ message: 'El título debe ser texto' })
  @MaxLength(255, { message: 'El título no puede exceder 255 caracteres' })
  title: string;

  @ApiPropertyOptional({
    example: 'Practical Training Session',
    description: 'Subtítulo del workshop',
  })
  @IsOptional()
  @IsString({ message: 'El subtítulo debe ser texto' })
  @MaxLength(255, { message: 'El subtítulo no puede exceder 255 caracteres' })
  subtitle?: string;

  @ApiProperty({
    example: 'Taller práctico de técnicas de ultrasonido vascular.',
    description: 'Descripción corta',
  })
  @IsNotEmpty({ message: 'La descripción corta es obligatoria' })
  @IsString({ message: 'La descripción debe ser texto' })
  @MaxLength(500, { message: 'La descripción no puede exceder 500 caracteres' })
  shortDescription: string;

  @ApiPropertyOptional({
    example: '<p>Descripción completa...</p>',
    description: 'Descripción completa HTML',
  })
  @IsOptional()
  @IsString({ message: 'La descripción completa debe ser texto' })
  fullDescription?: string;

  // ============================================
  // MEDIA
  // ============================================

  @ApiPropertyOptional({
    example: 'https://storage.example.com/thumbnail.jpg',
    description: 'URL del thumbnail',
  })
  @IsOptional()
  @IsString({ message: 'El thumbnail debe ser una URL' })
  thumbnail?: string;

  @ApiPropertyOptional({
    example: ['url1.jpg', 'url2.jpg'],
    description: 'URLs de galería',
  })
  @IsOptional()
  @IsArray({ message: 'La galería debe ser un array' })
  @IsString({ each: true, message: 'Cada URL debe ser texto' })
  gallery?: string[];

  // ============================================
  // PRECIOS
  // ============================================

  @ApiProperty({
    example: 350.0,
    description: 'Precio regular',
  })
  @IsNotEmpty({ message: 'El precio es obligatorio' })
  @IsNumber({}, { message: 'El precio debe ser un número' })
  @Min(0, { message: 'El precio no puede ser negativo' })
  regularPrice: number;

  @ApiPropertyOptional({
    example: 299.0,
    description: 'Precio de oferta',
  })
  @IsOptional()
  @IsNumber({}, { message: 'El precio de oferta debe ser un número' })
  @Min(0, { message: 'El precio no puede ser negativo' })
  salePrice?: number;

  @ApiPropertyOptional({
    example: 'USD',
    description: 'Moneda',
  })
  @IsOptional()
  @IsString({ message: 'La moneda debe ser texto' })
  @MaxLength(3, { message: 'La moneda debe ser código ISO de 3 caracteres' })
  currency?: string;

  @ApiPropertyOptional({
    example: true,
    description: 'Incluido al comprar curso asociado',
  })
  @IsOptional()
  @IsBoolean({ message: 'includedWithCourse debe ser un booleano' })
  includedWithCourse?: boolean;

  // ============================================
  // DURACIÓN Y CAPACIDAD
  // ============================================

  @ApiProperty({
    example: 480,
    description: 'Duración en minutos',
  })
  @IsNotEmpty({ message: 'La duración es obligatoria' })
  @IsNumber({}, { message: 'La duración debe ser un número' })
  @Min(1, { message: 'La duración debe ser mayor a 0' })
  durationMinutes: number;

  @ApiProperty({
    example: '8 horas (9:00 AM - 5:00 PM)',
    description: 'Duración para mostrar',
  })
  @IsNotEmpty({ message: 'El texto de duración es obligatorio' })
  @IsString({ message: 'El texto de duración debe ser texto' })
  @MaxLength(100, { message: 'El texto no puede exceder 100 caracteres' })
  durationDisplay: string;

  @ApiPropertyOptional({
    example: 8,
    description: 'Capacidad máxima por sesión',
  })
  @IsOptional()
  @IsNumber({}, { message: 'La capacidad debe ser un número' })
  @Min(1, { message: 'La capacidad debe ser al menos 1' })
  maxParticipants?: number;

  @ApiPropertyOptional({
    example: 4,
    description: 'Mínimo de participantes',
  })
  @IsOptional()
  @IsNumber({}, { message: 'El mínimo debe ser un número' })
  @Min(1, { message: 'El mínimo debe ser al menos 1' })
  minParticipants?: number;

  // ============================================
  // REQUISITOS
  // ============================================

  @ApiPropertyOptional({
    type: [WorkshopRequirementDto],
    description: 'Requisitos/prerrequisitos del workshop',
  })
  @IsOptional()
  @IsArray({ message: 'Los requisitos deben ser un array' })
  @ValidateNested({ each: true })
  @Type(() => WorkshopRequirementDto)
  requirements?: WorkshopRequirementDto[];

  // ============================================
  // CONTENIDO
  // ============================================

  @ApiPropertyOptional({
    example: ['Practicar técnicas de Doppler'],
    description: 'Objetivos de aprendizaje',
  })
  @IsOptional()
  @IsArray({ message: 'Los objetivos deben ser un array' })
  @IsString({ each: true, message: 'Cada objetivo debe ser texto' })
  objectives?: string[];

  @ApiPropertyOptional({
    example: ['Equipo de ultrasonido', 'Material de estudio'],
    description: 'Qué incluye',
  })
  @IsOptional()
  @IsArray({ message: 'includes debe ser un array' })
  @IsString({ each: true, message: 'Cada item debe ser texto' })
  includes?: string[];

  @ApiPropertyOptional({
    example: ['Ropa cómoda', 'Libreta'],
    description: 'Qué debe traer el participante',
  })
  @IsOptional()
  @IsArray({ message: 'whatToBring debe ser un array' })
  @IsString({ each: true, message: 'Cada item debe ser texto' })
  whatToBring?: string[];

  // ============================================
  // CERTIFICACIÓN
  // ============================================

  @ApiPropertyOptional({
    example: true,
    description: 'Otorga certificado',
  })
  @IsOptional()
  @IsBoolean({ message: 'hasCertificate debe ser un booleano' })
  hasCertificate?: boolean;

  @ApiPropertyOptional({
    example: 8,
    description: 'Horas CME certificadas',
  })
  @IsOptional()
  @IsNumber({}, { message: 'certifiedHours debe ser un número' })
  @Min(0, { message: 'Las horas no pueden ser negativas' })
  certifiedHours?: number;

  // ============================================
  // CATEGORIZACIÓN
  // ============================================

  @ApiPropertyOptional({
    example: 'intermediate',
    description: 'Nivel del workshop',
    enum: WorkshopLevel,
  })
  @IsOptional()
  @IsEnum(WorkshopLevel, { message: 'Nivel no válido' })
  level?: WorkshopLevel;

  @ApiPropertyOptional({
    example: ['hands-on', 'vascular'],
    description: 'Tags',
  })
  @IsOptional()
  @IsArray({ message: 'Los tags deben ser un array' })
  @IsString({ each: true, message: 'Cada tag debe ser texto' })
  tags?: string[];

  @ApiPropertyOptional({
    example: '550e8400-e29b-41d4-a716-446655440000',
    description: 'ID de la categoría',
  })
  @IsOptional()
  @IsUUID('4', { message: 'El ID de categoría debe ser un UUID válido' })
  categoryId?: string;

  @ApiPropertyOptional({
    example: '550e8400-e29b-41d4-a716-446655440000',
    description: 'ID del instructor principal',
  })
  @IsOptional()
  @IsUUID('4', { message: 'El ID de instructor debe ser un UUID válido' })
  mainInstructorId?: string;

  @ApiPropertyOptional({
    example: '550e8400-e29b-41d4-a716-446655440000',
    description: 'ID del curso asociado',
  })
  @IsOptional()
  @IsUUID('4', { message: 'El ID de curso debe ser un UUID válido' })
  associatedCourseId?: string;

  // ============================================
  // POLÍTICAS
  // ============================================

  @ApiPropertyOptional({
    example: 'Cancelación gratuita hasta 7 días antes.',
    description: 'Política de cancelación',
  })
  @IsOptional()
  @IsString({ message: 'La política debe ser texto' })
  cancellationPolicy?: string;

  @ApiPropertyOptional({
    example: 7,
    description: 'Días para cancelar sin penalización',
  })
  @IsOptional()
  @IsNumber({}, { message: 'cancellationDays debe ser un número' })
  @Min(0, { message: 'Los días no pueden ser negativos' })
  cancellationDays?: number;
}
