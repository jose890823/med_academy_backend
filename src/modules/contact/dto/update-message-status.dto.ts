import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty } from 'class-validator';
import { ContactMessageStatus } from '../entities/contact-message.entity';

export class UpdateMessageStatusDto {
  @ApiProperty({
    enum: ContactMessageStatus,
    example: ContactMessageStatus.READ,
    description: 'Nuevo estado del mensaje',
  })
  @IsEnum(ContactMessageStatus, { message: 'Estado no valido' })
  @IsNotEmpty({ message: 'El estado es requerido' })
  status: ContactMessageStatus;
}
