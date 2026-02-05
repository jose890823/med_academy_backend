import {
  Controller,
  Get,
  Post,
  Patch,
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
import { AttemptsService } from '../services/attempts.service';
import {
  StartAttemptDto,
  SubmitAnswersDto,
  SaveAnswerDto,
  GradeAttemptDto,
  QuickGradeDto,
  AttemptQueryDto,
} from '../dto';
import { EvaluationAttempt } from '../entities/evaluation-attempt.entity';
import { Answer } from '../entities/answer.entity';

// ============================================
// CONTROLADOR PARA ESTUDIANTES (Intentos)
// ============================================

@ApiTags('Evaluation Attempts')
@Controller('v1/attempts')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class AttemptsController {
  constructor(private readonly attemptsService: AttemptsService) {}

  @Post('start')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Iniciar intento de evaluación',
    description: 'Inicia un nuevo intento de evaluación para el estudiante',
  })
  @ApiResponse({
    status: 201,
    description: 'Intento iniciado exitosamente',
    type: EvaluationAttempt,
  })
  @ApiResponse({
    status: 400,
    description: 'Evaluación no disponible o límite de intentos alcanzado',
  })
  async startAttempt(@Body() dto: StartAttemptDto): Promise<EvaluationAttempt> {
    return this.attemptsService.startAttempt(dto);
  }

  @Patch(':id/save-answer')
  @ApiOperation({
    summary: 'Guardar respuesta (auto-guardado)',
    description: 'Guarda una respuesta individual sin enviar el intento',
  })
  @ApiParam({ name: 'id', description: 'UUID del intento' })
  @ApiResponse({
    status: 200,
    description: 'Respuesta guardada exitosamente',
    type: Answer,
  })
  @ApiResponse({ status: 400, description: 'El tiempo ha expirado' })
  async saveAnswer(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: SaveAnswerDto,
  ): Promise<Answer> {
    return this.attemptsService.saveAnswer(id, dto);
  }

  @Post(':id/submit')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Enviar intento',
    description: 'Envía todas las respuestas y finaliza el intento',
  })
  @ApiParam({ name: 'id', description: 'UUID del intento' })
  @ApiResponse({
    status: 200,
    description: 'Intento enviado exitosamente',
    type: EvaluationAttempt,
  })
  @ApiResponse({
    status: 400,
    description: 'El intento ya fue enviado o ha expirado',
  })
  async submitAttempt(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: SubmitAnswersDto,
  ): Promise<EvaluationAttempt> {
    return this.attemptsService.submitAttempt(id, dto);
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Obtener intento por ID',
    description: 'Retorna un intento con su información',
  })
  @ApiParam({ name: 'id', description: 'UUID del intento' })
  @ApiResponse({
    status: 200,
    description: 'Intento encontrado',
    type: EvaluationAttempt,
  })
  @ApiResponse({ status: 404, description: 'Intento no encontrado' })
  async findById(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<EvaluationAttempt> {
    return this.attemptsService.findById(id);
  }

  @Get(':id/answers')
  @ApiOperation({
    summary: 'Obtener respuestas del intento',
    description: 'Retorna las respuestas del estudiante para este intento',
  })
  @ApiParam({ name: 'id', description: 'UUID del intento' })
  @ApiResponse({
    status: 200,
    description: 'Lista de respuestas',
    type: [Answer],
  })
  async getAnswers(@Param('id', ParseUUIDPipe) id: string): Promise<Answer[]> {
    return this.attemptsService.getAnswers(id);
  }

  @Get(':id/results')
  @ApiOperation({
    summary: 'Obtener resultados del intento',
    description: 'Retorna los resultados del intento si ya fue calificado',
  })
  @ApiParam({ name: 'id', description: 'UUID del intento' })
  @ApiResponse({
    status: 200,
    description: 'Resultados del intento',
  })
  @ApiResponse({
    status: 400,
    description: 'El intento aún no ha sido calificado',
  })
  async getResults(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<{ attempt: EvaluationAttempt; answers: Answer[] }> {
    const canView = await this.attemptsService.canViewResults(id);
    if (!canView) {
      return { attempt: await this.attemptsService.findById(id), answers: [] };
    }

    const attempt = await this.attemptsService.findById(id);
    const answers = await this.attemptsService.getAnswers(id);
    return { attempt, answers };
  }

  @Get('enrollment/:enrollmentId/evaluation/:evaluationId')
  @ApiOperation({
    summary: 'Obtener intentos por inscripción y evaluación',
    description:
      'Retorna todos los intentos de un estudiante para una evaluación',
  })
  @ApiParam({ name: 'enrollmentId', description: 'UUID de la inscripción' })
  @ApiParam({ name: 'evaluationId', description: 'UUID de la evaluación' })
  @ApiResponse({
    status: 200,
    description: 'Lista de intentos',
    type: [EvaluationAttempt],
  })
  async findByEnrollmentAndEvaluation(
    @Param('enrollmentId', ParseUUIDPipe) enrollmentId: string,
    @Param('evaluationId', ParseUUIDPipe) evaluationId: string,
  ): Promise<EvaluationAttempt[]> {
    return this.attemptsService.findByEnrollmentAndEvaluation(
      enrollmentId,
      evaluationId,
    );
  }
}

// ============================================
// CONTROLADOR PARA CALIFICACIÓN (Admin/Teacher)
// ============================================

@ApiTags('Admin - Grading')
@Controller('v1/admin/grading')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
@ApiBearerAuth()
export class GradingController {
  constructor(private readonly attemptsService: AttemptsService) {}

  @Get('pending')
  @ApiOperation({
    summary: 'Obtener intentos pendientes de calificar',
    description:
      'Retorna los intentos enviados que aún no han sido calificados',
  })
  @ApiResponse({
    status: 200,
    description: 'Lista de intentos pendientes',
    type: [EvaluationAttempt],
  })
  async getPendingGrading(
    @Query('evaluationId') evaluationId?: string,
  ): Promise<EvaluationAttempt[]> {
    return this.attemptsService.findPendingGrading(evaluationId);
  }

  @Get()
  @ApiOperation({
    summary: 'Obtener todos los intentos',
    description: 'Retorna todos los intentos con filtros y paginación',
  })
  @ApiResponse({
    status: 200,
    description: 'Lista de intentos con paginación',
  })
  async findAll(@Query() query: AttemptQueryDto) {
    return this.attemptsService.findAll(query);
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Obtener intento para calificar',
    description: 'Retorna un intento con todas sus respuestas para calificar',
  })
  @ApiParam({ name: 'id', description: 'UUID del intento' })
  @ApiResponse({
    status: 200,
    description: 'Intento con respuestas',
  })
  async getAttemptForGrading(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<{ attempt: EvaluationAttempt; answers: Answer[] }> {
    const attempt = await this.attemptsService.findById(id);
    const answers = await this.attemptsService.getAnswers(id);
    return { attempt, answers };
  }

  @Post(':id/grade')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Calificar intento (detallado)',
    description: 'Califica un intento asignando puntos a cada respuesta',
  })
  @ApiParam({ name: 'id', description: 'UUID del intento' })
  @ApiResponse({
    status: 200,
    description: 'Intento calificado exitosamente',
    type: EvaluationAttempt,
  })
  @ApiResponse({
    status: 400,
    description: 'El intento debe ser enviado antes de calificar',
  })
  async gradeAttempt(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: GradeAttemptDto,
    @CurrentUser() user: User,
  ): Promise<EvaluationAttempt> {
    return this.attemptsService.gradeAttempt(id, dto, user.id);
  }

  @Post(':id/quick-grade')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Calificación rápida',
    description:
      'Asigna un puntaje total sin calificar cada respuesta individualmente',
  })
  @ApiParam({ name: 'id', description: 'UUID del intento' })
  @ApiResponse({
    status: 200,
    description: 'Intento calificado exitosamente',
    type: EvaluationAttempt,
  })
  @ApiResponse({
    status: 400,
    description: 'El intento debe ser enviado antes de calificar',
  })
  async quickGrade(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: QuickGradeDto,
    @CurrentUser() user: User,
  ): Promise<EvaluationAttempt> {
    return this.attemptsService.quickGrade(id, dto, user.id);
  }
}
