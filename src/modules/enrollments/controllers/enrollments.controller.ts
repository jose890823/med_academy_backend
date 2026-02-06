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
import { EnrollmentsService } from '../services/enrollments.service';
import {
  CreateEnrollmentDto,
  UpdateEnrollmentDto,
  EnrollmentQueryDto,
  AssignClassroomDto,
  EnrollmentIssueCertificateDto,
} from '../dto';
import { Enrollment, EnrollmentStatus } from '../entities/enrollment.entity';

// ============================================
// CONTROLADOR PARA ESTUDIANTES
// ============================================

@ApiTags('Enrollments')
@Controller('v1/enrollments')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class EnrollmentsController {
  constructor(private readonly enrollmentsService: EnrollmentsService) {}

  // ============================================
  // MIS INSCRIPCIONES (ESTUDIANTE AUTENTICADO)
  // ============================================

  @Get('my-enrollments')
  @ApiOperation({
    summary: 'Obtener mis inscripciones',
    description: 'Retorna todas las inscripciones del estudiante autenticado',
  })
  @ApiResponse({
    status: 200,
    description: 'Lista de inscripciones del estudiante',
    type: [Enrollment],
  })
  async getMyEnrollments(@CurrentUser() user: User): Promise<Enrollment[]> {
    return this.enrollmentsService.findByStudent(user.id);
  }

  @Get('my-enrollments/active')
  @ApiOperation({
    summary: 'Obtener mis inscripciones activas',
    description: 'Retorna las inscripciones activas del estudiante autenticado',
  })
  @ApiResponse({
    status: 200,
    description: 'Lista de inscripciones activas',
    type: [Enrollment],
  })
  async getMyActiveEnrollments(
    @CurrentUser() user: User,
  ): Promise<Enrollment[]> {
    return this.enrollmentsService.findActiveByStudent(user.id);
  }

  @Get('check-access/:courseId')
  @ApiOperation({
    summary: 'Verificar acceso a curso',
    description:
      'Verifica si el estudiante autenticado tiene acceso a un curso',
  })
  @ApiParam({ name: 'courseId', description: 'UUID del curso' })
  @ApiResponse({
    status: 200,
    description: 'Resultado de la verificación',
  })
  async checkAccess(
    @CurrentUser() user: User,
    @Param('courseId', ParseUUIDPipe) courseId: string,
  ): Promise<{ hasAccess: boolean }> {
    const hasAccess = await this.enrollmentsService.hasAccess(
      user.id,
      courseId,
    );
    return { hasAccess };
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Obtener inscripción por ID',
    description: 'Retorna una inscripción del estudiante autenticado',
  })
  @ApiParam({ name: 'id', description: 'UUID de la inscripción' })
  @ApiResponse({
    status: 200,
    description: 'Inscripción encontrada',
    type: Enrollment,
  })
  @ApiResponse({ status: 404, description: 'Inscripción no encontrada' })
  async findById(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: User,
  ): Promise<Enrollment> {
    const enrollment = await this.enrollmentsService.findById(id);
    // Verificar que pertenece al usuario o es admin
    if (enrollment.studentId !== user.id && !user.isAdmin()) {
      return this.enrollmentsService.findById('not-authorized'); // Forzar 404
    }
    return enrollment;
  }
}

// ============================================
// CONTROLADOR ADMINISTRATIVO
// ============================================

@ApiTags('Admin - Enrollments')
@Controller('v1/admin/enrollments')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
@ApiBearerAuth()
export class EnrollmentsAdminController {
  constructor(private readonly enrollmentsService: EnrollmentsService) {}

  // ============================================
  // CRUD COMPLETO
  // ============================================

  @Get()
  @ApiOperation({
    summary: 'Obtener todas las inscripciones',
    description: 'Retorna todas las inscripciones con filtros y paginación',
  })
  @ApiResponse({
    status: 200,
    description: 'Lista de inscripciones con paginación',
  })
  async findAll(@Query() query: EnrollmentQueryDto) {
    return this.enrollmentsService.findAll(query);
  }

  @Get('stats')
  @ApiOperation({
    summary: 'Obtener estadísticas de inscripciones',
    description: 'Retorna estadísticas generales de inscripciones',
  })
  @ApiResponse({
    status: 200,
    description: 'Estadísticas de inscripciones',
  })
  async getStats() {
    return this.enrollmentsService.getStats();
  }

  @Get('student/:studentId')
  @ApiOperation({
    summary: 'Obtener inscripciones de un estudiante',
    description: 'Retorna todas las inscripciones de un estudiante específico',
  })
  @ApiParam({ name: 'studentId', description: 'UUID del estudiante' })
  @ApiResponse({
    status: 200,
    description: 'Lista de inscripciones del estudiante',
    type: [Enrollment],
  })
  async findByStudent(
    @Param('studentId', ParseUUIDPipe) studentId: string,
  ): Promise<Enrollment[]> {
    return this.enrollmentsService.findByStudent(studentId);
  }

  @Get('cohort/:cohortId')
  @ApiOperation({
    summary: 'Obtener inscripciones de una convocatoria',
    description: 'Retorna todas las inscripciones de una convocatoria',
  })
  @ApiParam({ name: 'cohortId', description: 'UUID de la convocatoria' })
  @ApiResponse({
    status: 200,
    description: 'Lista de inscripciones de la convocatoria',
    type: [Enrollment],
  })
  async findByCohort(
    @Param('cohortId', ParseUUIDPipe) cohortId: string,
  ): Promise<Enrollment[]> {
    return this.enrollmentsService.findByCohort(cohortId);
  }

  @Get('classroom/:classroomId')
  @ApiOperation({
    summary: 'Obtener inscripciones de un aula',
    description: 'Retorna todas las inscripciones de un aula',
  })
  @ApiParam({ name: 'classroomId', description: 'UUID del aula' })
  @ApiResponse({
    status: 200,
    description: 'Lista de inscripciones del aula',
    type: [Enrollment],
  })
  async findByClassroom(
    @Param('classroomId', ParseUUIDPipe) classroomId: string,
  ): Promise<Enrollment[]> {
    return this.enrollmentsService.findByClassroom(classroomId);
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Obtener inscripción por ID',
    description: 'Retorna una inscripción por su ID',
  })
  @ApiParam({ name: 'id', description: 'UUID de la inscripción' })
  @ApiResponse({
    status: 200,
    description: 'Inscripción encontrada',
    type: Enrollment,
  })
  @ApiResponse({ status: 404, description: 'Inscripción no encontrada' })
  async findById(@Param('id', ParseUUIDPipe) id: string): Promise<Enrollment> {
    return this.enrollmentsService.findById(id);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Crear inscripción',
    description: 'Crea una nueva inscripción para un estudiante',
  })
  @ApiResponse({
    status: 201,
    description: 'Inscripción creada exitosamente',
    type: Enrollment,
  })
  @ApiResponse({ status: 400, description: 'Convocatoria cerrada o sin cupo' })
  @ApiResponse({
    status: 404,
    description: 'Convocatoria o aula no encontrada',
  })
  @ApiResponse({ status: 409, description: 'El estudiante ya está inscrito' })
  async create(@Body() dto: CreateEnrollmentDto): Promise<Enrollment> {
    return this.enrollmentsService.create(dto);
  }

  @Put(':id')
  @ApiOperation({
    summary: 'Actualizar inscripción',
    description: 'Actualiza una inscripción existente',
  })
  @ApiParam({ name: 'id', description: 'UUID de la inscripción' })
  @ApiResponse({
    status: 200,
    description: 'Inscripción actualizada exitosamente',
    type: Enrollment,
  })
  @ApiResponse({ status: 404, description: 'Inscripción no encontrada' })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateEnrollmentDto,
  ): Promise<Enrollment> {
    return this.enrollmentsService.update(id, dto);
  }

  @Patch(':id/status')
  @ApiOperation({
    summary: 'Cambiar estado de inscripción',
    description: 'Cambia el estado de una inscripción',
  })
  @ApiParam({ name: 'id', description: 'UUID de la inscripción' })
  @ApiQuery({
    name: 'status',
    enum: EnrollmentStatus,
    description: 'Nuevo estado',
  })
  @ApiResponse({
    status: 200,
    description: 'Estado actualizado exitosamente',
    type: Enrollment,
  })
  @ApiResponse({ status: 404, description: 'Inscripción no encontrada' })
  async updateStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @Query('status') status: EnrollmentStatus,
  ): Promise<Enrollment> {
    return this.enrollmentsService.updateStatus(id, status);
  }

  @Patch(':id/activate')
  @ApiOperation({
    summary: 'Activar inscripción',
    description: 'Activa una inscripción (requiere pago completado o parcial)',
  })
  @ApiParam({ name: 'id', description: 'UUID de la inscripción' })
  @ApiResponse({
    status: 200,
    description: 'Inscripción activada exitosamente',
    type: Enrollment,
  })
  @ApiResponse({ status: 400, description: 'Se requiere pago para activar' })
  @ApiResponse({ status: 404, description: 'Inscripción no encontrada' })
  async activate(@Param('id', ParseUUIDPipe) id: string): Promise<Enrollment> {
    return this.enrollmentsService.activate(id);
  }

  @Patch(':id/cancel')
  @ApiOperation({
    summary: 'Cancelar inscripción',
    description: 'Cancela una inscripción',
  })
  @ApiParam({ name: 'id', description: 'UUID de la inscripción' })
  @ApiQuery({
    name: 'reason',
    required: false,
    description: 'Razón de cancelación',
  })
  @ApiResponse({
    status: 200,
    description: 'Inscripción cancelada exitosamente',
    type: Enrollment,
  })
  @ApiResponse({ status: 404, description: 'Inscripción no encontrada' })
  async cancel(
    @Param('id', ParseUUIDPipe) id: string,
    @Query('reason') reason?: string,
  ): Promise<Enrollment> {
    return this.enrollmentsService.cancel(id, reason);
  }

  @Patch(':id/assign-classroom')
  @ApiOperation({
    summary: 'Asignar aula a inscripción',
    description: 'Asigna o cambia el aula de una inscripción',
  })
  @ApiParam({ name: 'id', description: 'UUID de la inscripción' })
  @ApiResponse({
    status: 200,
    description: 'Aula asignada exitosamente',
    type: Enrollment,
  })
  @ApiResponse({
    status: 400,
    description: 'El aula no pertenece a la convocatoria o está llena',
  })
  @ApiResponse({ status: 404, description: 'Inscripción o aula no encontrada' })
  async assignClassroom(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AssignClassroomDto,
  ): Promise<Enrollment> {
    return this.enrollmentsService.assignClassroom(id, dto);
  }

  @Patch(':id/record-payment')
  @ApiOperation({
    summary: 'Registrar pago',
    description: 'Registra un pago para la inscripción',
  })
  @ApiParam({ name: 'id', description: 'UUID de la inscripción' })
  @ApiQuery({ name: 'amount', type: Number, description: 'Monto del pago' })
  @ApiResponse({
    status: 200,
    description: 'Pago registrado exitosamente',
    type: Enrollment,
  })
  @ApiResponse({ status: 404, description: 'Inscripción no encontrada' })
  async recordPayment(
    @Param('id', ParseUUIDPipe) id: string,
    @Query('amount') amount: number,
  ): Promise<Enrollment> {
    return this.enrollmentsService.recordPayment(id, Number(amount));
  }

  @Patch(':id/issue-certificate')
  @ApiOperation({
    summary: 'Emitir certificado',
    description: 'Emite un certificado para la inscripción',
  })
  @ApiParam({ name: 'id', description: 'UUID de la inscripción' })
  @ApiResponse({
    status: 200,
    description: 'Certificado emitido exitosamente',
    type: Enrollment,
  })
  @ApiResponse({
    status: 400,
    description: 'La inscripción debe estar activa o completada',
  })
  @ApiResponse({ status: 404, description: 'Inscripción no encontrada' })
  async issueCertificate(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: EnrollmentIssueCertificateDto,
  ): Promise<Enrollment> {
    return this.enrollmentsService.issueCertificate(id, dto);
  }
}
