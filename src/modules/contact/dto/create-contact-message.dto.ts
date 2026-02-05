import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsEmail,
  IsNotEmpty,
  MinLength,
  MaxLength,
} from 'class-validator';

export class CreateContactMessageDto {
  @ApiProperty({
    example: 'Juan Perez',
    description: 'Nombre del remitente',
    minLength: 2,
    maxLength: 100,
  })
  @IsString()
  @IsNotEmpty({ message: 'El nombre es requerido' })
  @MinLength(2, { message: 'El nombre debe tener al menos 2 caracteres' })
  @MaxLength(100, { message: 'El nombre no puede tener mas de 100 caracteres' })
  name: string;

  @ApiProperty({
    example: 'juan@correo.com',
    description: 'Email del remitente',
  })
  @IsEmail({}, { message: 'Por favor ingresa un email valido' })
  @IsNotEmpty({ message: 'El email es requerido' })
  @MaxLength(255, { message: 'El email no puede tener mas de 255 caracteres' })
  email: string;

  @ApiProperty({
    example: 'Consulta sobre precios',
    description: 'Asunto del mensaje',
    minLength: 5,
    maxLength: 200,
  })
  @IsString()
  @IsNotEmpty({ message: 'El asunto es requerido' })
  @MinLength(5, { message: 'El asunto debe tener al menos 5 caracteres' })
  @MaxLength(200, { message: 'El asunto no puede tener mas de 200 caracteres' })
  subject: string;

  @ApiProperty({
    example: 'Hola, tengo una consulta sobre los planes de precios...',
    description: 'Contenido del mensaje',
    minLength: 20,
    maxLength: 2000,
  })
  @IsString()
  @IsNotEmpty({ message: 'El mensaje es requerido' })
  @MinLength(20, { message: 'El mensaje debe tener al menos 20 caracteres' })
  @MaxLength(2000, {
    message: 'El mensaje no puede tener mas de 2000 caracteres',
  })
  message: string;
}
