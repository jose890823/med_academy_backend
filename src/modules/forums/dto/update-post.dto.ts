import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  MinLength,
  MaxLength,
  IsEnum,
} from 'class-validator';
import { PostStatus } from '../entities/post.entity';

/**
 * DTO para actualizar un post (autor)
 */
export class UpdatePostDto {
  @ApiProperty({
    example: 'Contenido editado...',
    description: 'Nuevo contenido del post',
    minLength: 10,
  })
  @IsString({ message: 'El contenido debe ser texto' })
  @MinLength(10, { message: 'El contenido debe tener al menos 10 caracteres' })
  content: string;
}

/**
 * DTO para moderar un post (admin)
 */
export class ModeratePostDto {
  @ApiPropertyOptional({
    example: 'hidden',
    description: 'Nuevo estado del post',
    enum: PostStatus,
  })
  @IsOptional()
  @IsEnum(PostStatus, { message: 'Estado inválido' })
  status?: PostStatus;

  @ApiPropertyOptional({
    example: 'Contenido inapropiado',
    description: 'Razón de la moderación',
  })
  @IsOptional()
  @IsString()
  @MaxLength(500, { message: 'La razón no debe exceder 500 caracteres' })
  reason?: string;
}
