import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsArray,
  IsEnum,
  IsInt,
  IsUrl,
  IsEmail,
  IsBoolean,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { InstructorSpecialty, InstructorCertification } from '../entities/instructor-profile.entity';
import { EducationDto, WorkExperienceDto } from './create-instructor-profile.dto';

/**
 * DTO para actualizar perfil de instructor
 */
export class UpdateInstructorProfileDto {
  @ApiPropertyOptional({
    example: 'Dr. Sarah Johnson',
    description: 'Nombre público/profesional',
  })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  displayName?: string;

  @ApiPropertyOptional({
    example: 'PhD, RDMS, RVT',
    description: 'Título profesional',
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  title?: string;

  @ApiPropertyOptional({
    example: 'Vascular sonography specialist with 15+ years of clinical experience.',
    description: 'Biografía corta',
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  shortBio?: string;

  @ApiPropertyOptional({
    example: 'Dr. Sarah Johnson es una experta reconocida...',
    description: 'Biografía completa',
  })
  @IsOptional()
  @IsString()
  fullBio?: string;

  @ApiPropertyOptional({
    example: 'https://example.com/avatar.jpg',
    description: 'URL de foto de perfil',
  })
  @IsOptional()
  @IsUrl({}, { message: 'URL de avatar inválida' })
  avatarUrl?: string;

  @ApiPropertyOptional({
    example: 'https://example.com/cover.jpg',
    description: 'URL de foto de portada',
  })
  @IsOptional()
  @IsUrl({}, { message: 'URL de portada inválida' })
  coverImageUrl?: string;

  @ApiPropertyOptional({
    example: 'https://youtube.com/watch?v=xxx',
    description: 'URL de video de presentación',
  })
  @IsOptional()
  @IsUrl({}, { message: 'URL de video inválida' })
  introVideoUrl?: string;

  @ApiPropertyOptional({
    example: ['vascular', 'general'],
    description: 'Especialidades',
    enum: InstructorSpecialty,
    isArray: true,
  })
  @IsOptional()
  @IsArray()
  @IsEnum(InstructorSpecialty, { each: true })
  specialties?: InstructorSpecialty[];

  @ApiPropertyOptional({
    example: ['ARDMS', 'RVT'],
    description: 'Certificaciones',
    enum: InstructorCertification,
    isArray: true,
  })
  @IsOptional()
  @IsArray()
  @IsEnum(InstructorCertification, { each: true })
  certifications?: InstructorCertification[];

  @ApiPropertyOptional({
    example: 15,
    description: 'Años de experiencia',
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  yearsOfExperience?: number;

  @ApiPropertyOptional({
    description: 'Educación formal',
    type: [EducationDto],
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => EducationDto)
  education?: EducationDto[];

  @ApiPropertyOptional({
    description: 'Experiencia laboral',
    type: [WorkExperienceDto],
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => WorkExperienceDto)
  workExperience?: WorkExperienceDto[];

  @ApiPropertyOptional({
    example: 'https://linkedin.com/in/sarahjohnson',
    description: 'URL de LinkedIn',
  })
  @IsOptional()
  @IsUrl({}, { message: 'URL de LinkedIn inválida' })
  linkedinUrl?: string;

  @ApiPropertyOptional({
    example: 'https://twitter.com/drsjohnson',
    description: 'URL de Twitter',
  })
  @IsOptional()
  @IsUrl({}, { message: 'URL de Twitter inválida' })
  twitterUrl?: string;

  @ApiPropertyOptional({
    example: 'https://drsarahjohnson.com',
    description: 'Sitio web personal',
  })
  @IsOptional()
  @IsUrl({}, { message: 'URL de sitio web inválida' })
  websiteUrl?: string;

  @ApiPropertyOptional({
    example: 'contact@drsarahjohnson.com',
    description: 'Email público',
  })
  @IsOptional()
  @IsEmail({}, { message: 'Email inválido' })
  publicEmail?: string;

  @ApiPropertyOptional({
    example: true,
    description: 'Perfil activo',
  })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({
    example: true,
    description: 'Instructor destacado',
  })
  @IsOptional()
  @IsBoolean()
  isFeatured?: boolean;

  @ApiPropertyOptional({
    example: 1,
    description: 'Orden de visualización',
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  sortOrder?: number;
}
