import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, MinLength, MaxLength } from 'class-validator';

export class ReplyContactMessageDto {
  @ApiProperty({
    example: 'Gracias por contactarnos. En respuesta a tu consulta...',
    description: 'Respuesta del administrador',
    minLength: 10,
    maxLength: 5000,
  })
  @IsString()
  @IsNotEmpty({ message: 'La respuesta es requerida' })
  @MinLength(10, { message: 'La respuesta debe tener al menos 10 caracteres' })
  @MaxLength(5000, {
    message: 'La respuesta no puede tener mas de 5000 caracteres',
  })
  reply: string;
}
