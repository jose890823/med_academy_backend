import {
  Controller,
  Get,
  Post,
  Put,
  Patch,
  Delete,
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
  ApiQuery,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { User, UserRole } from '../../auth/entities/user.entity';
import { WorkshopsService } from '../services/workshops.service';
import { SessionsService } from '../services/sessions.service';
import { RegistrationsService } from '../services/registrations.service';
import { Workshop, WorkshopStatus } from '../entities/workshop.entity';
import { WorkshopSession, SessionStatus } from '../entities/workshop-session.entity';
import { WorkshopRegistration } from '../entities/workshop-registration.entity';
import {
  CreateWorkshopDto,
  UpdateWorkshopDto,
  CreateSessionDto,
  UpdateSessionDto,
} from '../dto';

@ApiTags('Admin - Workshops')
@Controller('v1/admin/workshops')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
@ApiBearerAuth()
export class WorkshopsAdminController {
  constructor(
    private readonly workshopsService: WorkshopsService,
    private readonly sessionsService: SessionsService,
    private readonly registrationsService: RegistrationsService,
  ) {}

  // ============================================
  // GESTIÓN DE WORKSHOPS
  // ============================================

  @Get()
  @ApiOperation({
    summary: 'Listar todos los workshops',
    description: 'Retorna todos los workshops con filtros opcionales',
  })
  @ApiQuery({ name: 'status', required: false, enum: WorkshopStatus })
  @ApiQuery({ name: 'categoryId', required: false })
  @ApiResponse({
    status: 200,
    description: 'Lista de workshops',
    type: [Workshop],
  })
  async findAll(
    @Query('status') status?: WorkshopStatus,
    @Query('categoryId') categoryId?: string,
  ): Promise<Workshop[]> {
    return this.workshopsService.findAll({ status, categoryId });
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Obtener workshop por ID',
    description: 'Retorna un workshop con todos sus detalles',
  })
  @ApiParam({ name: 'id', description: 'UUID del workshop' })
  @ApiResponse({
    status: 200,
    description: 'Workshop encontrado',
    type: Workshop,
  })
  async findById(@Param('id', ParseUUIDPipe) id: string): Promise<Workshop> {
    return this.workshopsService.findById(id);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Crear workshop',
    description: 'Crea un nuevo workshop',
  })
  @ApiResponse({
    status: 201,
    description: 'Workshop creado',
    type: Workshop,
  })
  async create(@Body() dto: CreateWorkshopDto): Promise<Workshop> {
    return this.workshopsService.create(dto);
  }

  @Put(':id')
  @ApiOperation({
    summary: 'Actualizar workshop',
    description: 'Actualiza un workshop existente',
  })
  @ApiParam({ name: 'id', description: 'UUID del workshop' })
  @ApiResponse({
    status: 200,
    description: 'Workshop actualizado',
    type: Workshop,
  })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateWorkshopDto,
  ): Promise<Workshop> {
    return this.workshopsService.update(id, dto);
  }

  @Patch(':id/publish')
  @ApiOperation({
    summary: 'Publicar workshop',
    description: 'Cambia el estado del workshop a publicado',
  })
  @ApiParam({ name: 'id', description: 'UUID del workshop' })
  @ApiResponse({
    status: 200,
    description: 'Workshop publicado',
    type: Workshop,
  })
  async publish(@Param('id', ParseUUIDPipe) id: string): Promise<Workshop> {
    return this.workshopsService.publish(id);
  }

  @Patch(':id/archive')
  @ApiOperation({
    summary: 'Archivar workshop',
    description: 'Cambia el estado del workshop a archivado',
  })
  @ApiParam({ name: 'id', description: 'UUID del workshop' })
  @ApiResponse({
    status: 200,
    description: 'Workshop archivado',
    type: Workshop,
  })
  async archive(@Param('id', ParseUUIDPipe) id: string): Promise<Workshop> {
    return this.workshopsService.archive(id);
  }

  @Patch(':id/toggle-featured')
  @ApiOperation({
    summary: 'Toggle destacado',
    description: 'Activa/desactiva el estado destacado',
  })
  @ApiParam({ name: 'id', description: 'UUID del workshop' })
  @ApiResponse({
    status: 200,
    description: 'Estado actualizado',
    type: Workshop,
  })
  async toggleFeatured(@Param('id', ParseUUIDPipe) id: string): Promise<Workshop> {
    return this.workshopsService.toggleFeatured(id);
  }

  @Put(':id/requirements')
  @ApiOperation({
    summary: 'Actualizar requisitos',
    description: 'Actualiza los requisitos del workshop',
  })
  @ApiParam({ name: 'id', description: 'UUID del workshop' })
  @ApiResponse({
    status: 200,
    description: 'Requisitos actualizados',
    type: Workshop,
  })
  async updateRequirements(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: { requirements: Workshop['requirements'] },
  ): Promise<Workshop> {
    return this.workshopsService.updateRequirements(id, body.requirements);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Eliminar workshop',
    description: 'Elimina un workshop (soft delete)',
  })
  @ApiParam({ name: 'id', description: 'UUID del workshop' })
  @ApiResponse({ status: 204, description: 'Workshop eliminado' })
  async delete(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    await this.workshopsService.delete(id);
  }

  // ============================================
  // GESTIÓN DE SESIONES
  // ============================================

  @Get(':workshopId/sessions')
  @ApiOperation({
    summary: 'Listar sesiones de un workshop',
    description: 'Retorna todas las sesiones de un workshop',
  })
  @ApiParam({ name: 'workshopId', description: 'UUID del workshop' })
  @ApiResponse({
    status: 200,
    description: 'Lista de sesiones',
    type: [WorkshopSession],
  })
  async getSessions(
    @Param('workshopId', ParseUUIDPipe) workshopId: string,
  ): Promise<WorkshopSession[]> {
    return this.sessionsService.findByWorkshop(workshopId);
  }

  @Post('sessions')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Crear sesión',
    description: 'Crea una nueva sesión para un workshop',
  })
  @ApiResponse({
    status: 201,
    description: 'Sesión creada',
    type: WorkshopSession,
  })
  async createSession(@Body() dto: CreateSessionDto): Promise<WorkshopSession> {
    return this.sessionsService.create(dto);
  }

  @Get('sessions/:id')
  @ApiOperation({
    summary: 'Obtener sesión por ID',
    description: 'Retorna los detalles de una sesión',
  })
  @ApiParam({ name: 'id', description: 'UUID de la sesión' })
  @ApiResponse({
    status: 200,
    description: 'Sesión encontrada',
    type: WorkshopSession,
  })
  async getSession(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<WorkshopSession> {
    return this.sessionsService.findById(id);
  }

  @Put('sessions/:id')
  @ApiOperation({
    summary: 'Actualizar sesión',
    description: 'Actualiza una sesión existente',
  })
  @ApiParam({ name: 'id', description: 'UUID de la sesión' })
  @ApiResponse({
    status: 200,
    description: 'Sesión actualizada',
    type: WorkshopSession,
  })
  async updateSession(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateSessionDto,
  ): Promise<WorkshopSession> {
    return this.sessionsService.update(id, dto);
  }

  @Patch('sessions/:id/status')
  @ApiOperation({
    summary: 'Actualizar estado de sesión',
    description: 'Cambia el estado de una sesión',
  })
  @ApiParam({ name: 'id', description: 'UUID de la sesión' })
  @ApiResponse({
    status: 200,
    description: 'Estado actualizado',
    type: WorkshopSession,
  })
  async updateSessionStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: { status: SessionStatus },
  ): Promise<WorkshopSession> {
    return this.sessionsService.updateStatus(id, body.status);
  }

  @Patch('sessions/:id/open-registration')
  @ApiOperation({
    summary: 'Abrir inscripciones',
    description: 'Abre las inscripciones de una sesión',
  })
  @ApiParam({ name: 'id', description: 'UUID de la sesión' })
  @ApiResponse({
    status: 200,
    description: 'Inscripciones abiertas',
    type: WorkshopSession,
  })
  async openRegistration(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<WorkshopSession> {
    return this.sessionsService.openRegistration(id);
  }

  @Patch('sessions/:id/close-registration')
  @ApiOperation({
    summary: 'Cerrar inscripciones',
    description: 'Cierra las inscripciones de una sesión',
  })
  @ApiParam({ name: 'id', description: 'UUID de la sesión' })
  @ApiResponse({
    status: 200,
    description: 'Inscripciones cerradas',
    type: WorkshopSession,
  })
  async closeRegistration(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<WorkshopSession> {
    return this.sessionsService.closeRegistration(id);
  }

  @Patch('sessions/:id/confirm')
  @ApiOperation({
    summary: 'Confirmar sesión',
    description: 'Confirma la sesión (mínimo alcanzado)',
  })
  @ApiParam({ name: 'id', description: 'UUID de la sesión' })
  @ApiResponse({
    status: 200,
    description: 'Sesión confirmada',
    type: WorkshopSession,
  })
  async confirmSession(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<WorkshopSession> {
    return this.sessionsService.confirmSession(id);
  }

  @Patch('sessions/:id/cancel')
  @ApiOperation({
    summary: 'Cancelar sesión',
    description: 'Cancela una sesión',
  })
  @ApiParam({ name: 'id', description: 'UUID de la sesión' })
  @ApiResponse({
    status: 200,
    description: 'Sesión cancelada',
    type: WorkshopSession,
  })
  async cancelSession(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: { reason?: string },
  ): Promise<WorkshopSession> {
    return this.sessionsService.cancelSession(id, body.reason);
  }

  @Patch('sessions/:id/complete')
  @ApiOperation({
    summary: 'Completar sesión',
    description: 'Marca la sesión como completada',
  })
  @ApiParam({ name: 'id', description: 'UUID de la sesión' })
  @ApiResponse({
    status: 200,
    description: 'Sesión completada',
    type: WorkshopSession,
  })
  async completeSession(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<WorkshopSession> {
    return this.sessionsService.completeSession(id);
  }

  @Delete('sessions/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Eliminar sesión',
    description: 'Elimina una sesión (solo si no tiene participantes)',
  })
  @ApiParam({ name: 'id', description: 'UUID de la sesión' })
  @ApiResponse({ status: 204, description: 'Sesión eliminada' })
  async deleteSession(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    await this.sessionsService.delete(id);
  }

  // ============================================
  // GESTIÓN DE INSCRIPCIONES
  // ============================================

  @Get('sessions/:sessionId/registrations')
  @ApiOperation({
    summary: 'Listar inscripciones de una sesión',
    description: 'Retorna todas las inscripciones de una sesión',
  })
  @ApiParam({ name: 'sessionId', description: 'UUID de la sesión' })
  @ApiResponse({
    status: 200,
    description: 'Lista de inscripciones',
    type: [WorkshopRegistration],
  })
  async getSessionRegistrations(
    @Param('sessionId', ParseUUIDPipe) sessionId: string,
  ): Promise<WorkshopRegistration[]> {
    return this.registrationsService.findBySession(sessionId);
  }

  @Get('sessions/:sessionId/waitlist')
  @ApiOperation({
    summary: 'Obtener lista de espera',
    description: 'Retorna la lista de espera de una sesión',
  })
  @ApiParam({ name: 'sessionId', description: 'UUID de la sesión' })
  @ApiResponse({
    status: 200,
    description: 'Lista de espera',
    type: [WorkshopRegistration],
  })
  async getWaitlist(
    @Param('sessionId', ParseUUIDPipe) sessionId: string,
  ): Promise<WorkshopRegistration[]> {
    return this.registrationsService.getWaitlist(sessionId);
  }

  @Get('sessions/:sessionId/stats')
  @ApiOperation({
    summary: 'Estadísticas de inscripciones',
    description: 'Retorna estadísticas de inscripciones de una sesión',
  })
  @ApiParam({ name: 'sessionId', description: 'UUID de la sesión' })
  @ApiResponse({
    status: 200,
    description: 'Estadísticas',
  })
  async getSessionStats(@Param('sessionId', ParseUUIDPipe) sessionId: string) {
    return this.registrationsService.getSessionStats(sessionId);
  }

  @Get('registrations/:id')
  @ApiOperation({
    summary: 'Obtener inscripción por ID',
    description: 'Retorna los detalles de una inscripción',
  })
  @ApiParam({ name: 'id', description: 'UUID de la inscripción' })
  @ApiResponse({
    status: 200,
    description: 'Inscripción encontrada',
    type: WorkshopRegistration,
  })
  async getRegistration(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<WorkshopRegistration> {
    return this.registrationsService.findById(id);
  }

  @Patch('registrations/:id/confirm')
  @ApiOperation({
    summary: 'Confirmar inscripción',
    description: 'Confirma una inscripción (después del pago)',
  })
  @ApiParam({ name: 'id', description: 'UUID de la inscripción' })
  @ApiResponse({
    status: 200,
    description: 'Inscripción confirmada',
    type: WorkshopRegistration,
  })
  async confirmRegistration(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: {
      amountPaid: number;
      stripePaymentIntentId?: string;
      discountApplied?: number;
      discountReason?: string;
    },
  ): Promise<WorkshopRegistration> {
    return this.registrationsService.confirm(id, body);
  }

  @Patch('registrations/:id/check-in')
  @ApiOperation({
    summary: 'Registrar check-in',
    description: 'Registra la llegada del participante',
  })
  @ApiParam({ name: 'id', description: 'UUID de la inscripción' })
  @ApiResponse({
    status: 200,
    description: 'Check-in registrado',
    type: WorkshopRegistration,
  })
  async checkIn(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: User,
  ): Promise<WorkshopRegistration> {
    return this.registrationsService.checkIn(id, user.id);
  }

  @Patch('registrations/:id/attended')
  @ApiOperation({
    summary: 'Marcar como asistido',
    description: 'Marca que el participante completó el workshop',
  })
  @ApiParam({ name: 'id', description: 'UUID de la inscripción' })
  @ApiResponse({
    status: 200,
    description: 'Marcado como asistido',
    type: WorkshopRegistration,
  })
  async markAttended(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<WorkshopRegistration> {
    return this.registrationsService.markAttended(id);
  }

  @Patch('registrations/:id/no-show')
  @ApiOperation({
    summary: 'Marcar como no show',
    description: 'Marca que el participante no se presentó',
  })
  @ApiParam({ name: 'id', description: 'UUID de la inscripción' })
  @ApiResponse({
    status: 200,
    description: 'Marcado como no show',
    type: WorkshopRegistration,
  })
  async markNoShow(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<WorkshopRegistration> {
    return this.registrationsService.markNoShow(id);
  }

  @Patch('registrations/:id/certificate')
  @ApiOperation({
    summary: 'Emitir certificado',
    description: 'Emite el certificado de asistencia',
  })
  @ApiParam({ name: 'id', description: 'UUID de la inscripción' })
  @ApiResponse({
    status: 200,
    description: 'Certificado emitido',
    type: WorkshopRegistration,
  })
  async issueCertificate(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: { certificateUrl: string },
  ): Promise<WorkshopRegistration> {
    return this.registrationsService.issueCertificate(id, body.certificateUrl);
  }

  @Patch('registrations/:id/refund')
  @ApiOperation({
    summary: 'Procesar reembolso',
    description: 'Procesa el reembolso de una inscripción',
  })
  @ApiParam({ name: 'id', description: 'UUID de la inscripción' })
  @ApiResponse({
    status: 200,
    description: 'Reembolso procesado',
    type: WorkshopRegistration,
  })
  async processRefund(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: { refundAmount: number },
  ): Promise<WorkshopRegistration> {
    return this.registrationsService.processRefund(id, body.refundAmount);
  }
}
