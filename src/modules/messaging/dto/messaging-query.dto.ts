import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsOptional,
  IsEnum,
  IsBoolean,
  IsNumber,
  IsString,
  Min,
  Max,
} from 'class-validator';
import { Transform, Type } from 'class-transformer';
import { ConversationType } from '../entities/conversation.entity';

/**
 * DTO para consultar conversaciones
 */
export class ConversationQueryDto {
  @ApiPropertyOptional({
    example: 'direct',
    description: 'Filtrar por tipo de conversación',
    enum: ConversationType,
  })
  @IsOptional()
  @IsEnum(ConversationType, { message: 'Tipo de conversación inválido' })
  type?: ConversationType;

  @ApiPropertyOptional({
    example: false,
    description: 'Incluir conversaciones archivadas',
    default: false,
  })
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  includeArchived?: boolean = false;

  @ApiPropertyOptional({
    example: true,
    description: 'Solo conversaciones con mensajes no leídos',
  })
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  unreadOnly?: boolean;

  @ApiPropertyOptional({
    example: 'John',
    description: 'Buscar por nombre de participante',
  })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({
    example: 1,
    description: 'Página actual',
    default: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({
    example: 20,
    description: 'Elementos por página',
    default: 20,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(100)
  limit?: number = 20;
}

/**
 * DTO para consultar mensajes de una conversación
 */
export class MessageQueryDto {
  @ApiPropertyOptional({
    example: 1,
    description: 'Página actual',
    default: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({
    example: 50,
    description: 'Elementos por página',
    default: 50,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(100)
  limit?: number = 50;

  @ApiPropertyOptional({
    example: 'DESC',
    description: 'Orden (DESC = más recientes primero)',
    enum: ['ASC', 'DESC'],
    default: 'DESC',
  })
  @IsOptional()
  @IsEnum(['ASC', 'DESC'])
  order?: 'ASC' | 'DESC' = 'DESC';
}
