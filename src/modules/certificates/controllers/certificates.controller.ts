import {
  Controller,
  Get,
  Param,
  Res,
  UseGuards,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import type { Response } from 'express';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { Public } from '../../auth/decorators/public.decorator';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { User } from '../../auth/entities/user.entity';
import { CertificatesService } from '../services/certificates.service';
import { Certificate } from '../entities/certificate.entity';

@ApiTags('Certificates')
@Controller('v1/certificates')
export class CertificatesController {
  constructor(private readonly certificatesService: CertificatesService) {}

  // ============================================
  // VERIFICACIÓN PÚBLICA
  // ============================================

  @Get('verify/:code')
  @Public()
  @ApiOperation({
    summary: 'Verificar certificado',
    description: 'Verifica la autenticidad de un certificado por su código',
  })
  @ApiParam({
    name: 'code',
    description: 'Código de verificación del certificado',
  })
  @ApiResponse({
    status: 200,
    description: 'Resultado de la verificación',
  })
  async verify(@Param('code') code: string): Promise<{
    valid: boolean;
    certificate?: Partial<Certificate>;
    message: string;
  }> {
    const result = await this.certificatesService.verify(code);

    // Si hay certificado, devolver solo datos públicos
    if (result.certificate) {
      const { certificate } = result;
      return {
        valid: result.valid,
        certificate: {
          certificateNumber: certificate.certificateNumber,
          studentFullName: certificate.studentFullName,
          programName: certificate.programName,
          type: certificate.type,
          completionDate: certificate.completionDate,
          issuedAt: certificate.issuedAt,
          expiresAt: certificate.expiresAt,
          issuingAuthority: certificate.issuingAuthority,
          instructionHours: certificate.instructionHours,
          cmeCredits: certificate.cmeCredits,
          associatedCertifications: certificate.associatedCertifications,
          status: certificate.status,
        },
        message: result.message,
      };
    }

    return result;
  }

  // ============================================
  // ENDPOINTS AUTENTICADOS
  // ============================================

  @Get('my-certificates')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Obtener mis certificados',
    description: 'Retorna los certificados del usuario autenticado',
  })
  @ApiResponse({
    status: 200,
    description: 'Lista de certificados',
    type: [Certificate],
  })
  async getMyCertificates(@CurrentUser() user: User): Promise<Certificate[]> {
    return this.certificatesService.findByStudent(user.id);
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Obtener certificado por ID',
    description: 'Retorna los detalles de un certificado',
  })
  @ApiParam({ name: 'id', description: 'UUID del certificado' })
  @ApiResponse({
    status: 200,
    description: 'Certificado encontrado',
    type: Certificate,
  })
  @ApiResponse({ status: 404, description: 'Certificado no encontrado' })
  async findById(@Param('id') id: string): Promise<Certificate> {
    return this.certificatesService.findById(id);
  }

  @Get(':id/download')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Descargar certificado PDF',
    description: 'Genera y descarga el PDF del certificado',
  })
  @ApiParam({ name: 'id', description: 'UUID del certificado' })
  @ApiResponse({
    status: 200,
    description: 'PDF del certificado',
    content: { 'application/pdf': {} },
  })
  @ApiResponse({ status: 404, description: 'Certificado no encontrado' })
  async downloadPdf(
    @Param('id') id: string,
    @Res() res: Response,
  ): Promise<void> {
    const certificate = await this.certificatesService.findById(id);
    const pdfBuffer = await this.certificatesService.generatePdf(id);

    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${certificate.certificateNumber}.pdf"`,
      'Content-Length': pdfBuffer.length,
    });

    res.status(HttpStatus.OK).send(pdfBuffer);
  }

  @Get(':id/preview')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Ver certificado PDF',
    description: 'Genera y muestra el PDF del certificado en el navegador',
  })
  @ApiParam({ name: 'id', description: 'UUID del certificado' })
  @ApiResponse({
    status: 200,
    description: 'PDF del certificado',
    content: { 'application/pdf': {} },
  })
  async previewPdf(
    @Param('id') id: string,
    @Res() res: Response,
  ): Promise<void> {
    const certificate = await this.certificatesService.findById(id);
    const pdfBuffer = await this.certificatesService.generatePdf(id);

    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `inline; filename="${certificate.certificateNumber}.pdf"`,
      'Content-Length': pdfBuffer.length,
    });

    res.status(HttpStatus.OK).send(pdfBuffer);
  }
}
