import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsBoolean,
  IsInt,
  IsNumber,
  IsEnum,
  IsUUID,
  IsArray,
  Min,
  MaxLength,
} from 'class-validator';
import { Type } from 'class-transformer';
import { CourseModality, CourseLevel, CourseLanguage, CourseStatus } from '../entities/course.entity';

/**
 * DTO para crear un curso
 */
export class CreateCourseDto {
  // ============================================
  // INFORMACIÓN BÁSICA
  // ============================================

  @ApiProperty({
    example: 'Vascular Sonography vCourse',
    description: 'Título del curso',
    maxLength: 255,
  })
  @IsNotEmpty({ message: 'El título es obligatorio' })
  @IsString({ message: 'El título debe ser texto' })
  @MaxLength(255, { message: 'El título no puede exceder 255 caracteres' })
  title: string;

  @ApiProperty({
    example: 'vascular-sonography-vcourse',
    description: 'Slug único para URLs amigables',
    maxLength: 255,
  })
  @IsNotEmpty({ message: 'El slug es obligatorio' })
  @IsString({ message: 'El slug debe ser texto' })
  @MaxLength(255, { message: 'El slug no puede exceder 255 caracteres' })
  slug: string;

  @ApiPropertyOptional({
    example: 'Complete Registry Review',
    description: 'Subtítulo del curso',
    maxLength: 255,
  })
  @IsOptional()
  @IsString({ message: 'El subtítulo debe ser texto' })
  @MaxLength(255, { message: 'El subtítulo no puede exceder 255 caracteres' })
  subtitle?: string;

  @ApiProperty({
    example: 'Programa completo de preparación para el examen de certificación vascular.',
    description: 'Descripción corta para listados',
    maxLength: 500,
  })
  @IsNotEmpty({ message: 'La descripción corta es obligatoria' })
  @IsString({ message: 'La descripción corta debe ser texto' })
  @MaxLength(500, { message: 'La descripción corta no puede exceder 500 caracteres' })
  shortDescription: string;

  @ApiPropertyOptional({
    example: '<p>Descripción completa del curso...</p>',
    description: 'Descripción completa (rich text/HTML)',
  })
  @IsOptional()
  @IsString({ message: 'La descripción completa debe ser texto' })
  fullDescription?: string;

  // ============================================
  // MEDIA
  // ============================================

  @ApiPropertyOptional({
    example: 'https://storage.example.com/courses/vascular-thumbnail.jpg',
    description: 'URL de la imagen thumbnail',
  })
  @IsOptional()
  @IsString({ message: 'El thumbnail debe ser texto (URL)' })
  thumbnail?: string;

  @ApiPropertyOptional({
    example: ['url1.jpg', 'url2.jpg'],
    description: 'URLs de imágenes de galería',
    type: [String],
  })
  @IsOptional()
  @IsArray({ message: 'La galería debe ser un array' })
  @IsString({ each: true, message: 'Cada URL de galería debe ser texto' })
  gallery?: string[];

  @ApiPropertyOptional({
    example: 'https://vimeo.com/123456789',
    description: 'URL del video promocional',
  })
  @IsOptional()
  @IsString({ message: 'El video promocional debe ser texto (URL)' })
  promoVideoUrl?: string;

  // ============================================
  // PRECIOS
  // ============================================

  @ApiProperty({
    example: 345.0,
    description: 'Precio regular del curso',
  })
  @IsNotEmpty({ message: 'El precio regular es obligatorio' })
  @IsNumber({}, { message: 'El precio regular debe ser un número' })
  @Min(0, { message: 'El precio regular debe ser mayor o igual a 0' })
  @Type(() => Number)
  regularPrice: number;

  @ApiPropertyOptional({
    example: 265.0,
    description: 'Precio de oferta (null si no hay oferta)',
  })
  @IsOptional()
  @IsNumber({}, { message: 'El precio de oferta debe ser un número' })
  @Min(0, { message: 'El precio de oferta debe ser mayor o igual a 0' })
  @Type(() => Number)
  salePrice?: number;

  @ApiPropertyOptional({
    example: 'USD',
    description: 'Moneda del precio',
    default: 'USD',
  })
  @IsOptional()
  @IsString({ message: 'La moneda debe ser texto' })
  @MaxLength(3, { message: 'La moneda no puede exceder 3 caracteres' })
  currency?: string;

  // ============================================
  // FINANCIAMIENTO
  // ============================================

  @ApiPropertyOptional({
    example: true,
    description: 'Permite pago en cuotas',
    default: false,
  })
  @IsOptional()
  @IsBoolean({ message: 'allowInstallments debe ser booleano' })
  allowInstallments?: boolean;

  @ApiPropertyOptional({
    example: 6,
    description: 'Número máximo de cuotas',
  })
  @IsOptional()
  @IsInt({ message: 'maxInstallments debe ser un número entero' })
  @Min(1, { message: 'maxInstallments debe ser al menos 1' })
  maxInstallments?: number;

  @ApiPropertyOptional({
    example: 0,
    description: 'Tasa de interés para cuotas (%)',
    default: 0,
  })
  @IsOptional()
  @IsNumber({}, { message: 'La tasa de interés debe ser un número' })
  @Min(0, { message: 'La tasa de interés debe ser mayor o igual a 0' })
  @Type(() => Number)
  installmentInterestRate?: number;

  // ============================================
  // MODALIDAD
  // ============================================

  @ApiPropertyOptional({
    example: 'virtual',
    description: 'Modalidad del curso',
    enum: CourseModality,
    default: CourseModality.VIRTUAL,
  })
  @IsOptional()
  @IsEnum(CourseModality, { message: 'Modalidad inválida' })
  modality?: CourseModality;

  @ApiPropertyOptional({
    example: 'Campus Virtual',
    description: 'Plataforma donde se imparte',
  })
  @IsOptional()
  @IsString({ message: 'La plataforma debe ser texto' })
  @MaxLength(100, { message: 'La plataforma no puede exceder 100 caracteres' })
  platform?: string;

  // ============================================
  // DURACIÓN
  // ============================================

  @ApiPropertyOptional({
    example: 4,
    description: 'Número total de sesiones',
    default: 1,
  })
  @IsOptional()
  @IsInt({ message: 'totalSessions debe ser un número entero' })
  @Min(1, { message: 'totalSessions debe ser al menos 1' })
  totalSessions?: number;

  @ApiPropertyOptional({
    example: 120,
    description: 'Duración de cada sesión en minutos',
    default: 60,
  })
  @IsOptional()
  @IsInt({ message: 'sessionDurationMinutes debe ser un número entero' })
  @Min(1, { message: 'sessionDurationMinutes debe ser al menos 1' })
  sessionDurationMinutes?: number;

  @ApiPropertyOptional({
    example: 12,
    description: 'Total de horas académicas',
    default: 1,
  })
  @IsOptional()
  @IsInt({ message: 'totalAcademicHours debe ser un número entero' })
  @Min(1, { message: 'totalAcademicHours debe ser al menos 1' })
  totalAcademicHours?: number;

  @ApiPropertyOptional({
    example: '1 sesión por semana',
    description: 'Frecuencia de las sesiones',
  })
  @IsOptional()
  @IsString({ message: 'La frecuencia debe ser texto' })
  @MaxLength(100, { message: 'La frecuencia no puede exceder 100 caracteres' })
  frequency?: string;

  @ApiPropertyOptional({
    example: true,
    description: 'Acceso de por vida al comprar',
    default: true,
  })
  @IsOptional()
  @IsBoolean({ message: 'lifetimeAccess debe ser booleano' })
  lifetimeAccess?: boolean;

  // ============================================
  // CERTIFICACIÓN
  // ============================================

  @ApiPropertyOptional({
    example: true,
    description: 'El curso otorga certificado',
    default: false,
  })
  @IsOptional()
  @IsBoolean({ message: 'hasCertificate debe ser booleano' })
  hasCertificate?: boolean;

  @ApiPropertyOptional({
    example: 'Certificate of Completion',
    description: 'Tipo de certificado',
  })
  @IsOptional()
  @IsString({ message: 'El tipo de certificado debe ser texto' })
  @MaxLength(100, { message: 'El tipo de certificado no puede exceder 100 caracteres' })
  certificateType?: string;

  @ApiPropertyOptional({
    example: 12,
    description: 'Horas certificadas',
  })
  @IsOptional()
  @IsInt({ message: 'certifiedHours debe ser un número entero' })
  @Min(1, { message: 'certifiedHours debe ser al menos 1' })
  certifiedHours?: number;

  @ApiPropertyOptional({
    example: ['ARDMS', 'CCI', 'ARRT'],
    description: 'Certificaciones para las que prepara',
    type: [String],
  })
  @IsOptional()
  @IsArray({ message: 'preparesFor debe ser un array' })
  @IsString({ each: true, message: 'Cada certificación debe ser texto' })
  preparesFor?: string[];

  // ============================================
  // CONTENIDO
  // ============================================

  @ApiPropertyOptional({
    example: ['Dominar técnicas de Doppler', 'Identificar patologías vasculares'],
    description: 'Objetivos de aprendizaje',
    type: [String],
  })
  @IsOptional()
  @IsArray({ message: 'objectives debe ser un array' })
  @IsString({ each: true, message: 'Cada objetivo debe ser texto' })
  objectives?: string[];

  @ApiPropertyOptional({
    example: 'Metodología práctica con casos reales',
    description: 'Descripción de la metodología',
  })
  @IsOptional()
  @IsString({ message: 'La metodología debe ser texto' })
  methodology?: string;

  @ApiPropertyOptional({
    example: ['Video lectures', 'Quizzes', 'Study guides'],
    description: 'Recursos incluidos',
    type: [String],
  })
  @IsOptional()
  @IsArray({ message: 'includedResources debe ser un array' })
  @IsString({ each: true, message: 'Cada recurso debe ser texto' })
  includedResources?: string[];

  @ApiPropertyOptional({
    example: ['Internet estable', 'Navegador actualizado'],
    description: 'Requisitos técnicos',
    type: [String],
  })
  @IsOptional()
  @IsArray({ message: 'technicalRequirements debe ser un array' })
  @IsString({ each: true, message: 'Cada requisito debe ser texto' })
  technicalRequirements?: string[];

  @ApiPropertyOptional({
    example: ['Conocimientos básicos de anatomía'],
    description: 'Prerrequisitos',
    type: [String],
  })
  @IsOptional()
  @IsArray({ message: 'prerequisites debe ser un array' })
  @IsString({ each: true, message: 'Cada prerrequisito debe ser texto' })
  prerequisites?: string[];

  @ApiPropertyOptional({
    example: 'Profesionales de la salud interesados en sonografía vascular',
    description: 'Audiencia objetivo',
  })
  @IsOptional()
  @IsString({ message: 'targetAudience debe ser texto' })
  targetAudience?: string;

  // ============================================
  // MÉTRICAS
  // ============================================

  @ApiPropertyOptional({
    example: 34,
    description: 'Número de video lectures',
    default: 0,
  })
  @IsOptional()
  @IsInt({ message: 'videoLecturesCount debe ser un número entero' })
  @Min(0, { message: 'videoLecturesCount debe ser mayor o igual a 0' })
  videoLecturesCount?: number;

  @ApiPropertyOptional({
    example: 6,
    description: 'Número de quizzes',
    default: 0,
  })
  @IsOptional()
  @IsInt({ message: 'quizzesCount debe ser un número entero' })
  @Min(0, { message: 'quizzesCount debe ser mayor o igual a 0' })
  quizzesCount?: number;

  @ApiPropertyOptional({
    example: true,
    description: 'Tiene examen final',
    default: false,
  })
  @IsOptional()
  @IsBoolean({ message: 'hasExam debe ser booleano' })
  hasExam?: boolean;

  // ============================================
  // CATEGORIZACIÓN
  // ============================================

  @ApiPropertyOptional({
    example: '550e8400-e29b-41d4-a716-446655440000',
    description: 'ID de la categoría',
  })
  @IsOptional()
  @IsUUID('4', { message: 'categoryId debe ser un UUID válido' })
  categoryId?: string;

  @ApiPropertyOptional({
    example: ['sonography', 'vascular', 'certification'],
    description: 'Tags del curso',
    type: [String],
  })
  @IsOptional()
  @IsArray({ message: 'tags debe ser un array' })
  @IsString({ each: true, message: 'Cada tag debe ser texto' })
  tags?: string[];

  @ApiPropertyOptional({
    example: 'intermediate',
    description: 'Nivel del curso',
    enum: CourseLevel,
    default: CourseLevel.BEGINNER,
  })
  @IsOptional()
  @IsEnum(CourseLevel, { message: 'Nivel inválido' })
  level?: CourseLevel;

  @ApiPropertyOptional({
    example: 'en',
    description: 'Idioma del curso',
    enum: CourseLanguage,
    default: CourseLanguage.EN,
  })
  @IsOptional()
  @IsEnum(CourseLanguage, { message: 'Idioma inválido' })
  language?: CourseLanguage;

  // ============================================
  // INSTRUCTOR
  // ============================================

  @ApiPropertyOptional({
    example: '550e8400-e29b-41d4-a716-446655440000',
    description: 'ID del instructor principal',
  })
  @IsOptional()
  @IsUUID('4', { message: 'mainInstructorId debe ser un UUID válido' })
  mainInstructorId?: string;

  // ============================================
  // ESTADO
  // ============================================

  @ApiPropertyOptional({
    example: 'draft',
    description: 'Estado del curso',
    enum: CourseStatus,
    default: CourseStatus.DRAFT,
  })
  @IsOptional()
  @IsEnum(CourseStatus, { message: 'Estado inválido' })
  status?: CourseStatus;

  @ApiPropertyOptional({
    example: false,
    description: 'Curso destacado',
    default: false,
  })
  @IsOptional()
  @IsBoolean({ message: 'isFeatured debe ser booleano' })
  isFeatured?: boolean;

  @ApiPropertyOptional({
    example: 1,
    description: 'Orden en listados',
    default: 0,
  })
  @IsOptional()
  @IsInt({ message: 'El orden debe ser un número entero' })
  @Min(0, { message: 'El orden debe ser mayor o igual a 0' })
  order?: number;
}
