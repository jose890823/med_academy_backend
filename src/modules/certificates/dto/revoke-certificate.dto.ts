import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

/**
 * DTO para revocar un certificado
 */
export class RevokeCertificateDto {
  @ApiProperty({
    example: 'Academic misconduct detected',
    description: 'Razón de la revocación',
  })
  @IsNotEmpty({ message: 'La razón de revocación es obligatoria' })
  @IsString({ message: 'La razón debe ser texto' })
  @MaxLength(1000, { message: 'La razón no puede exceder 1000 caracteres' })
  reason: string;
}
