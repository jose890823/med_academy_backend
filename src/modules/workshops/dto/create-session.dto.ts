import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsNumber,
  IsBoolean,
  IsUUID,
  IsDateString,
  Min,
  MaxLength,
} from 'class-validator';

/**
 * DTO para crear una sesión de workshop
 */
export class CreateSessionDto {
  @ApiProperty({
    example: '550e8400-e29b-41d4-a716-446655440000',
    description: 'ID del workshop',
  })
  @IsNotEmpty({ message: 'El ID del workshop es obligatorio' })
  @IsUUID('4', { message: 'El ID del workshop debe ser un UUID válido' })
  workshopId: string;

  // ============================================
  // FECHA Y HORA
  // ============================================

  @ApiProperty({
    example: '2026-03-15T09:00:00.000Z',
    description: 'Fecha y hora de inicio',
  })
  @IsNotEmpty({ message: 'La fecha de inicio es obligatoria' })
  @IsDateString({}, { message: 'La fecha de inicio debe ser ISO 8601' })
  startDate: string;

  @ApiProperty({
    example: '2026-03-15T17:00:00.000Z',
    description: 'Fecha y hora de fin',
  })
  @IsNotEmpty({ message: 'La fecha de fin es obligatoria' })
  @IsDateString({}, { message: 'La fecha de fin debe ser ISO 8601' })
  endDate: string;

  @ApiPropertyOptional({
    example: 'America/New_York',
    description: 'Zona horaria',
  })
  @IsOptional()
  @IsString({ message: 'La zona horaria debe ser texto' })
  @MaxLength(50, { message: 'La zona horaria no puede exceder 50 caracteres' })
  timezone?: string;

  // ============================================
  // UBICACIÓN
  // ============================================

  @ApiProperty({
    example: 'UMA Training Center',
    description: 'Nombre del lugar',
  })
  @IsNotEmpty({ message: 'El nombre del lugar es obligatorio' })
  @IsString({ message: 'El nombre debe ser texto' })
  @MaxLength(200, { message: 'El nombre no puede exceder 200 caracteres' })
  locationName: string;

  @ApiProperty({
    example: '123 Medical Plaza, Suite 200',
    description: 'Dirección',
  })
  @IsNotEmpty({ message: 'La dirección es obligatoria' })
  @IsString({ message: 'La dirección debe ser texto' })
  @MaxLength(300, { message: 'La dirección no puede exceder 300 caracteres' })
  locationAddress: string;

  @ApiProperty({
    example: 'Miami',
    description: 'Ciudad',
  })
  @IsNotEmpty({ message: 'La ciudad es obligatoria' })
  @IsString({ message: 'La ciudad debe ser texto' })
  @MaxLength(100, { message: 'La ciudad no puede exceder 100 caracteres' })
  locationCity: string;

  @ApiProperty({
    example: 'FL',
    description: 'Estado',
  })
  @IsNotEmpty({ message: 'El estado es obligatorio' })
  @IsString({ message: 'El estado debe ser texto' })
  @MaxLength(50, { message: 'El estado no puede exceder 50 caracteres' })
  locationState: string;

  @ApiPropertyOptional({
    example: '33101',
    description: 'Código postal',
  })
  @IsOptional()
  @IsString({ message: 'El código postal debe ser texto' })
  @MaxLength(20, { message: 'El código postal no puede exceder 20 caracteres' })
  locationZipCode?: string;

  @ApiPropertyOptional({
    example: 'US',
    description: 'País (código ISO)',
  })
  @IsOptional()
  @IsString({ message: 'El país debe ser texto' })
  @MaxLength(2, { message: 'El país debe ser código ISO de 2 caracteres' })
  locationCountry?: string;

  @ApiPropertyOptional({
    example: 'https://maps.google.com/?q=...',
    description: 'URL de Google Maps',
  })
  @IsOptional()
  @IsString({ message: 'La URL del mapa debe ser texto' })
  locationMapUrl?: string;

  @ApiPropertyOptional({
    example: 'Segundo piso, sala B',
    description: 'Instrucciones de ubicación',
  })
  @IsOptional()
  @IsString({ message: 'Las notas deben ser texto' })
  locationNotes?: string;

  // ============================================
  // CAPACIDAD
  // ============================================

  @ApiProperty({
    example: 8,
    description: 'Capacidad máxima',
  })
  @IsNotEmpty({ message: 'La capacidad es obligatoria' })
  @IsNumber({}, { message: 'La capacidad debe ser un número' })
  @Min(1, { message: 'La capacidad debe ser al menos 1' })
  maxParticipants: number;

  @ApiPropertyOptional({
    example: 4,
    description: 'Mínimo de participantes',
  })
  @IsOptional()
  @IsNumber({}, { message: 'El mínimo debe ser un número' })
  @Min(1, { message: 'El mínimo debe ser al menos 1' })
  minParticipants?: number;

  // ============================================
  // INSCRIPCIÓN
  // ============================================

  @ApiPropertyOptional({
    example: true,
    description: 'Inscripciones abiertas',
  })
  @IsOptional()
  @IsBoolean({ message: 'registrationOpen debe ser un booleano' })
  registrationOpen?: boolean;

  @ApiPropertyOptional({
    example: '2026-03-10T23:59:59.000Z',
    description: 'Fecha límite de inscripción',
  })
  @IsOptional()
  @IsDateString({}, { message: 'La fecha límite debe ser ISO 8601' })
  registrationDeadline?: string;

  // ============================================
  // PRECIO
  // ============================================

  @ApiPropertyOptional({
    example: 350.0,
    description: 'Precio específico de esta sesión (override)',
  })
  @IsOptional()
  @IsNumber({}, { message: 'El precio debe ser un número' })
  @Min(0, { message: 'El precio no puede ser negativo' })
  priceOverride?: number;

  // ============================================
  // NOTAS
  // ============================================

  @ApiPropertyOptional({
    example: 'Sesión especial con instructor invitado',
    description: 'Notas públicas',
  })
  @IsOptional()
  @IsString({ message: 'Las notas públicas deben ser texto' })
  publicNotes?: string;

  @ApiPropertyOptional({
    example: 'Confirmar catering',
    description: 'Notas internas',
  })
  @IsOptional()
  @IsString({ message: 'Las notas internas deben ser texto' })
  internalNotes?: string;

  // ============================================
  // INSTRUCTOR
  // ============================================

  @ApiPropertyOptional({
    example: '550e8400-e29b-41d4-a716-446655440000',
    description: 'ID del instructor de esta sesión (override)',
  })
  @IsOptional()
  @IsUUID('4', { message: 'El ID del instructor debe ser un UUID válido' })
  instructorId?: string;
}
