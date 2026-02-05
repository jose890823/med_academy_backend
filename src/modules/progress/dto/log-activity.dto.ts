import { ApiProperty } from '@nestjs/swagger';
import {
  IsUUID,
  IsNotEmpty,
  IsEnum,
  IsOptional,
  IsObject,
  IsString,
} from 'class-validator';
import { ActivityType, EntityType } from '../entities/activity-log.entity';

/**
 * DTO para registrar una actividad
 */
export class LogActivityDto {
  @ApiProperty({
    example: '550e8400-e29b-41d4-a716-446655440000',
    description: 'ID de la inscripción',
    required: false,
  })
  @IsOptional()
  @IsUUID('4', { message: 'El ID de inscripción debe ser un UUID válido' })
  enrollmentId?: string;

  @ApiProperty({
    example: 'video_completed',
    description: 'Tipo de actividad',
    enum: ActivityType,
  })
  @IsNotEmpty({ message: 'El tipo de actividad es obligatorio' })
  @IsEnum(ActivityType, { message: 'Tipo de actividad no válido' })
  activityType: ActivityType;

  @ApiProperty({
    example: 'module',
    description: 'Tipo de entidad relacionada',
    enum: EntityType,
  })
  @IsNotEmpty({ message: 'El tipo de entidad es obligatorio' })
  @IsEnum(EntityType, { message: 'Tipo de entidad no válido' })
  entityType: EntityType;

  @ApiProperty({
    example: '550e8400-e29b-41d4-a716-446655440000',
    description: 'ID de la entidad relacionada',
  })
  @IsNotEmpty({ message: 'El ID de la entidad es obligatorio' })
  @IsUUID('4', { message: 'El ID de la entidad debe ser un UUID válido' })
  entityId: string;

  @ApiProperty({
    example: { moduleTitle: 'Física Doppler', videoPosition: 1234 },
    description: 'Datos adicionales de la actividad',
    required: false,
  })
  @IsOptional()
  @IsObject({ message: 'Los metadatos deben ser un objeto' })
  metadata?: Record<string, any>;
}
