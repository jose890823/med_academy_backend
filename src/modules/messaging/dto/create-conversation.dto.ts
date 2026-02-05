import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsString,
  IsOptional,
  IsUUID,
  IsEnum,
  MaxLength,
  MinLength,
} from 'class-validator';
import { ConversationType } from '../entities/conversation.entity';

/**
 * DTO para iniciar una conversación
 */
export class CreateConversationDto {
  @ApiProperty({
    example: '550e8400-e29b-41d4-a716-446655440000',
    description: 'ID del usuario destinatario',
  })
  @IsNotEmpty({ message: 'recipientId es obligatorio' })
  @IsUUID('4', { message: 'recipientId debe ser un UUID válido' })
  recipientId: string;

  @ApiPropertyOptional({
    example: 'Pregunta sobre el curso de Vascular',
    description: 'Asunto de la conversación',
  })
  @IsOptional()
  @IsString()
  @MaxLength(255, { message: 'El asunto no debe exceder 255 caracteres' })
  subject?: string;

  @ApiProperty({
    example: 'Hola, tengo una duda sobre el módulo 3...',
    description: 'Mensaje inicial',
    minLength: 1,
  })
  @IsNotEmpty({ message: 'El mensaje es obligatorio' })
  @IsString()
  @MinLength(1, { message: 'El mensaje no puede estar vacío' })
  message: string;

  @ApiPropertyOptional({
    example: 'direct',
    description: 'Tipo de conversación',
    enum: ConversationType,
    default: ConversationType.DIRECT,
  })
  @IsOptional()
  @IsEnum(ConversationType, { message: 'Tipo de conversación inválido' })
  type?: ConversationType;

  @ApiPropertyOptional({
    example: '550e8400-e29b-41d4-a716-446655440000',
    description: 'ID del curso (para soporte de curso)',
  })
  @IsOptional()
  @IsUUID('4', { message: 'courseId debe ser un UUID válido' })
  courseId?: string;
}
