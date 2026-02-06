import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString, IsUrl } from 'class-validator';

/**
 * DTO para emitir un certificado
 */
export class EnrollmentIssueCertificateDto {
  @ApiProperty({
    example: 'https://certificates.ultrasoundmedacademy.com/abc123.pdf',
    description: 'URL del certificado generado',
  })
  @IsNotEmpty({ message: 'La URL del certificado es obligatoria' })
  @IsUrl({}, { message: 'certificateUrl debe ser una URL válida' })
  certificateUrl: string;

  @ApiPropertyOptional({
    example: 'Certificado emitido por completar el curso',
    description: 'Notas sobre la emisión del certificado',
  })
  @IsOptional()
  @IsString({ message: 'notes debe ser texto' })
  notes?: string;
}
