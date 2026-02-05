import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
  ParseUUIDPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { User, UserRole } from '../../auth/entities/user.entity';
import { CertificatesService } from '../services/certificates.service';
import { Certificate } from '../entities/certificate.entity';
import {
  IssueCertificateDto,
  RevokeCertificateDto,
  CertificateQueryDto,
} from '../dto';

@ApiTags('Admin - Certificates')
@Controller('v1/admin/certificates')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
@ApiBearerAuth()
export class CertificatesAdminController {
  constructor(private readonly certificatesService: CertificatesService) {}

  // ============================================
  // EMITIR CERTIFICADOS
  // ============================================

  @Post('issue')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Emitir certificado',
    description: 'Emite un certificado para una inscripción completada',
  })
  @ApiResponse({
    status: 201,
    description: 'Certificado emitido exitosamente',
    type: Certificate,
  })
  @ApiResponse({ status: 400, description: 'Inscripción no completada' })
  @ApiResponse({ status: 404, description: 'Inscripción no encontrada' })
  @ApiResponse({ status: 409, description: 'Certificado ya existe' })
  async issueCertificate(
    @Body() dto: IssueCertificateDto,
  ): Promise<Certificate> {
    return this.certificatesService.issueCertificate(dto);
  }

  @Post(':id/regenerate-pdf')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Regenerar PDF',
    description:
      'Regenera el PDF del certificado (útil si hay cambios en el diseño)',
  })
  @ApiParam({ name: 'id', description: 'UUID del certificado' })
  @ApiResponse({
    status: 200,
    description: 'PDF regenerado',
  })
  async regeneratePdf(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<{ message: string; pdfSize: number }> {
    const pdfBuffer = await this.certificatesService.generatePdf(id);
    return {
      message: 'PDF regenerado exitosamente',
      pdfSize: pdfBuffer.length,
    };
  }

  // ============================================
  // LISTAR Y CONSULTAR
  // ============================================

  @Get()
  @ApiOperation({
    summary: 'Listar certificados',
    description: 'Lista todos los certificados con filtros opcionales',
  })
  @ApiResponse({
    status: 200,
    description: 'Lista de certificados',
  })
  async findAll(@Query() query: CertificateQueryDto): Promise<{
    data: Certificate[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    return this.certificatesService.findAll(query);
  }

  @Get('stats')
  @ApiOperation({
    summary: 'Estadísticas de certificados',
    description: 'Retorna estadísticas de certificados emitidos',
  })
  @ApiResponse({
    status: 200,
    description: 'Estadísticas',
  })
  async getStats(): Promise<{
    total: number;
    byType: Record<string, number>;
    byStatus: Record<string, number>;
    thisMonth: number;
    thisYear: number;
  }> {
    return this.certificatesService.getStats();
  }

  @Get('by-number/:number')
  @ApiOperation({
    summary: 'Buscar por número de certificado',
    description: 'Busca un certificado por su número único',
  })
  @ApiParam({
    name: 'number',
    description: 'Número del certificado (ej: CERT-2026-000001)',
  })
  @ApiResponse({
    status: 200,
    description: 'Certificado encontrado',
    type: Certificate,
  })
  @ApiResponse({ status: 404, description: 'Certificado no encontrado' })
  async findByNumber(@Param('number') number: string): Promise<Certificate> {
    return this.certificatesService.findByNumber(number);
  }

  @Get('student/:studentId')
  @ApiOperation({
    summary: 'Certificados de un estudiante',
    description: 'Lista todos los certificados de un estudiante',
  })
  @ApiParam({ name: 'studentId', description: 'UUID del estudiante' })
  @ApiResponse({
    status: 200,
    description: 'Lista de certificados',
    type: [Certificate],
  })
  async findByStudent(
    @Param('studentId', ParseUUIDPipe) studentId: string,
  ): Promise<Certificate[]> {
    return this.certificatesService.findByStudent(studentId);
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Obtener certificado',
    description: 'Obtiene los detalles completos de un certificado',
  })
  @ApiParam({ name: 'id', description: 'UUID del certificado' })
  @ApiResponse({
    status: 200,
    description: 'Certificado encontrado',
    type: Certificate,
  })
  @ApiResponse({ status: 404, description: 'Certificado no encontrado' })
  async findById(@Param('id', ParseUUIDPipe) id: string): Promise<Certificate> {
    return this.certificatesService.findById(id);
  }

  // ============================================
  // REVOCAR
  // ============================================

  @Post(':id/revoke')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Revocar certificado',
    description: 'Revoca un certificado emitido (irreversible)',
  })
  @ApiParam({ name: 'id', description: 'UUID del certificado' })
  @ApiResponse({
    status: 200,
    description: 'Certificado revocado',
    type: Certificate,
  })
  @ApiResponse({ status: 400, description: 'Certificado ya revocado' })
  @ApiResponse({ status: 404, description: 'Certificado no encontrado' })
  async revoke(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: RevokeCertificateDto,
    @CurrentUser() user: User,
  ): Promise<Certificate> {
    return this.certificatesService.revoke(id, dto, user.id);
  }
}
