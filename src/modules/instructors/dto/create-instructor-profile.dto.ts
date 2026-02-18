import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsString,
  IsOptional,
  IsUUID,
  IsArray,
  IsEnum,
  IsInt,
  IsUrl,
  IsEmail,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { Transform } from 'class-transformer';
import { Type } from 'class-transformer';
import {
  InstructorSpecialty,
  InstructorCertification,
} from '../entities/instructor-profile.entity';

/**
 * DTO para educación
 */
export class EducationDto {
  @ApiProperty({
    example: 'Bachelor of Science in Diagnostic Medical Sonography',
  })
  @IsString()
  degree: string;

  @ApiProperty({ example: 'Florida State University' })
  @IsString()
  institution: string;

  @ApiProperty({ example: 2015 })
  @IsInt()
  @Min(1950)
  year: number;
}

/**
 * DTO para experiencia laboral
 */
export class WorkExperienceDto {
  @ApiProperty({ example: 'Lead Vascular Sonographer' })
  @IsString()
  position: string;

  @ApiProperty({ example: 'Mayo Clinic' })
  @IsString()
  organization: string;

  @ApiProperty({ example: 2018 })
  @IsInt()
  @Min(1950)
  startYear: number;

  @ApiPropertyOptional({ example: null })
  @IsOptional()
  @IsInt()
  @Min(1950)
  endYear?: number | null;

  @ApiProperty({ example: true })
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  current?: boolean;
}

/**
 * DTO para crear perfil de instructor
 */
export class CreateInstructorProfileDto {
  @ApiProperty({
    example: '550e8400-e29b-41d4-a716-446655440000',
    description: 'ID del usuario a asociar',
  })
  @IsNotEmpty({ message: 'userId es obligatorio' })
  @IsUUID('4', { message: 'userId debe ser un UUID válido' })
  userId: string;

  @ApiProperty({
    example: 'Dr. Sarah Johnson',
    description: 'Nombre público/profesional',
  })
  @IsNotEmpty({ message: 'El nombre es obligatorio' })
  @IsString()
  @MaxLength(255, { message: 'El nombre no debe exceder 255 caracteres' })
  displayName: string;

  @ApiPropertyOptional({
    example: 'PhD, RDMS, RVT',
    description: 'Título profesional',
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  title?: string;

  @ApiPropertyOptional({
    example:
      'Vascular sonography specialist with 15+ years of clinical experience.',
    description: 'Biografía corta (resumen)',
  })
  @IsOptional()
  @IsString()
  @MaxLength(500, {
    message: 'La biografía corta no debe exceder 500 caracteres',
  })
  shortBio?: string;

  @ApiPropertyOptional({
    example:
      'Dr. Sarah Johnson es una experta reconocida en ecografía vascular...',
    description: 'Biografía completa',
  })
  @IsOptional()
  @IsString()
  fullBio?: string;

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
}
