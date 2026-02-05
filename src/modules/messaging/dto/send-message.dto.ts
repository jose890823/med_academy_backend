import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsString,
  IsOptional,
  IsUUID,
  IsEnum,
  IsUrl,
  IsNumber,
  MinLength,
  MaxLength,
} from 'class-validator';
import { MessageType } from '../entities/message.entity';

/**
 * DTO para enviar un mensaje
 */
export class SendMessageDto {
  @ApiProperty({
    example: '550e8400-e29b-41d4-a716-446655440000',
    description: 'ID de la conversación',
  })
  @IsNotEmpty({ message: 'conversationId es obligatorio' })
  @IsUUID('4', { message: 'conversationId debe ser un UUID válido' })
  conversationId: string;

  @ApiProperty({
    example: 'Gracias por tu respuesta, ahora entiendo mejor el tema.',
    description: 'Contenido del mensaje',
    minLength: 1,
  })
  @IsNotEmpty({ message: 'El contenido es obligatorio' })
  @IsString()
  @MinLength(1, { message: 'El mensaje no puede estar vacío' })
  content: string;

  @ApiPropertyOptional({
    example: 'text',
    description: 'Tipo de mensaje',
    enum: MessageType,
    default: MessageType.TEXT,
  })
  @IsOptional()
  @IsEnum(MessageType, { message: 'Tipo de mensaje inválido' })
  type?: MessageType;

  @ApiPropertyOptional({
    example: 'https://storage.example.com/files/document.pdf',
    description: 'URL del archivo adjunto',
  })
  @IsOptional()
  @IsUrl({}, { message: 'URL de archivo inválida' })
  attachmentUrl?: string;

  @ApiPropertyOptional({
    example: 'documento.pdf',
    description: 'Nombre del archivo adjunto',
  })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  attachmentName?: string;

  @ApiPropertyOptional({
    example: 'application/pdf',
    description: 'Tipo MIME del archivo',
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  attachmentMimeType?: string;

  @ApiPropertyOptional({
    example: 1024000,
    description: 'Tamaño del archivo en bytes',
  })
  @IsOptional()
  @IsNumber()
  attachmentSize?: number;
}

/**
 * DTO para editar un mensaje
 */
export class EditMessageDto {
  @ApiProperty({
    example: 'Contenido editado del mensaje',
    description: 'Nuevo contenido del mensaje',
    minLength: 1,
  })
  @IsNotEmpty({ message: 'El contenido es obligatorio' })
  @IsString()
  @MinLength(1, { message: 'El mensaje no puede estar vacío' })
  content: string;
}
