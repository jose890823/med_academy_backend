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
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { User, UserRole } from '../../auth/entities/user.entity';
import { EvaluationsService } from '../services/evaluations.service';
import { QuestionsService } from '../services/questions.service';
import {
  CreateEvaluationDto,
  UpdateEvaluationDto,
  EvaluationQueryDto,
  CreateQuestionDto,
  UpdateQuestionDto,
} from '../dto';
import { Evaluation } from '../entities/evaluation.entity';
import { Question } from '../entities/question.entity';

// ============================================
// CONTROLADOR PÚBLICO (Estudiantes)
// ============================================

@ApiTags('Evaluations')
@Controller('v1/evaluations')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class EvaluationsController {
  constructor(
    private readonly evaluationsService: EvaluationsService,
    private readonly questionsService: QuestionsService,
  ) {}

  @Get('course/:courseId')
  @ApiOperation({
    summary: 'Obtener evaluaciones de un curso',
    description: 'Retorna las evaluaciones publicadas de un curso',
  })
  @ApiParam({ name: 'courseId', description: 'UUID del curso' })
  @ApiResponse({
    status: 200,
    description: 'Lista de evaluaciones del curso',
    type: [Evaluation],
  })
  async findByCourse(
    @Param('courseId', ParseUUIDPipe) courseId: string,
  ): Promise<Evaluation[]> {
    return this.evaluationsService.findPublishedByCourse(courseId);
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Obtener evaluación por ID',
    description: 'Retorna una evaluación publicada',
  })
  @ApiParam({ name: 'id', description: 'UUID de la evaluación' })
  @ApiResponse({
    status: 200,
    description: 'Evaluación encontrada',
    type: Evaluation,
  })
  @ApiResponse({ status: 404, description: 'Evaluación no encontrada' })
  async findById(@Param('id', ParseUUIDPipe) id: string): Promise<Evaluation> {
    return this.evaluationsService.findById(id);
  }

  @Get(':id/questions')
  @ApiOperation({
    summary: 'Obtener preguntas de una evaluación',
    description: 'Retorna las preguntas de una evaluación (sin respuestas correctas)',
  })
  @ApiParam({ name: 'id', description: 'UUID de la evaluación' })
  @ApiResponse({
    status: 200,
    description: 'Lista de preguntas (sin respuestas correctas)',
  })
  async getQuestions(@Param('id', ParseUUIDPipe) id: string) {
    // Verificar que la evaluación existe
    await this.evaluationsService.findById(id);
    const questions = await this.questionsService.findByEvaluation(id);

    // Ocultar respuestas correctas para estudiantes
    return questions.map((q) => ({
      id: q.id,
      evaluationId: q.evaluationId,
      questionText: q.questionText,
      questionType: q.questionType,
      options: q.options
        ? q.options.map((opt) => ({ id: opt.id, text: opt.text }))
        : null,
      points: q.points,
      hint: q.hint,
      imageUrl: q.imageUrl,
      order: q.order,
      createdAt: q.createdAt,
      updatedAt: q.updatedAt,
    }));
  }
}

// ============================================
// CONTROLADOR ADMINISTRATIVO (Admin/Teacher)
// ============================================

@ApiTags('Admin - Evaluations')
@Controller('v1/admin/evaluations')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
@ApiBearerAuth()
export class EvaluationsAdminController {
  constructor(
    private readonly evaluationsService: EvaluationsService,
    private readonly questionsService: QuestionsService,
  ) {}

  // ============================================
  // CRUD EVALUACIONES
  // ============================================

  @Get()
  @ApiOperation({
    summary: 'Obtener todas las evaluaciones',
    description: 'Retorna todas las evaluaciones con filtros y paginación',
  })
  @ApiResponse({
    status: 200,
    description: 'Lista de evaluaciones con paginación',
  })
  async findAll(@Query() query: EvaluationQueryDto) {
    return this.evaluationsService.findAll(query);
  }

  @Get('course/:courseId')
  @ApiOperation({
    summary: 'Obtener evaluaciones de un curso (Admin)',
    description: 'Retorna todas las evaluaciones de un curso (publicadas y no publicadas)',
  })
  @ApiParam({ name: 'courseId', description: 'UUID del curso' })
  @ApiResponse({
    status: 200,
    description: 'Lista de evaluaciones del curso',
    type: [Evaluation],
  })
  async findByCourse(
    @Param('courseId', ParseUUIDPipe) courseId: string,
  ): Promise<Evaluation[]> {
    return this.evaluationsService.findByCourse(courseId);
  }

  @Get('course/:courseId/stats')
  @ApiOperation({
    summary: 'Obtener estadísticas de evaluaciones de un curso',
    description: 'Retorna estadísticas de las evaluaciones de un curso',
  })
  @ApiParam({ name: 'courseId', description: 'UUID del curso' })
  @ApiResponse({
    status: 200,
    description: 'Estadísticas de evaluaciones',
  })
  async getStats(@Param('courseId', ParseUUIDPipe) courseId: string) {
    return this.evaluationsService.getStatsByCourse(courseId);
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Obtener evaluación por ID (Admin)',
    description: 'Retorna una evaluación por su ID',
  })
  @ApiParam({ name: 'id', description: 'UUID de la evaluación' })
  @ApiResponse({
    status: 200,
    description: 'Evaluación encontrada',
    type: Evaluation,
  })
  @ApiResponse({ status: 404, description: 'Evaluación no encontrada' })
  async findById(@Param('id', ParseUUIDPipe) id: string): Promise<Evaluation> {
    return this.evaluationsService.findById(id);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Crear evaluación',
    description: 'Crea una nueva evaluación',
  })
  @ApiResponse({
    status: 201,
    description: 'Evaluación creada exitosamente',
    type: Evaluation,
  })
  async create(@Body() dto: CreateEvaluationDto): Promise<Evaluation> {
    return this.evaluationsService.create(dto);
  }

  @Put(':id')
  @ApiOperation({
    summary: 'Actualizar evaluación',
    description: 'Actualiza una evaluación existente',
  })
  @ApiParam({ name: 'id', description: 'UUID de la evaluación' })
  @ApiResponse({
    status: 200,
    description: 'Evaluación actualizada exitosamente',
    type: Evaluation,
  })
  @ApiResponse({ status: 404, description: 'Evaluación no encontrada' })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateEvaluationDto,
  ): Promise<Evaluation> {
    return this.evaluationsService.update(id, dto);
  }

  @Patch(':id/publish')
  @ApiOperation({
    summary: 'Publicar evaluación',
    description: 'Publica una evaluación para que sea visible a estudiantes',
  })
  @ApiParam({ name: 'id', description: 'UUID de la evaluación' })
  @ApiResponse({
    status: 200,
    description: 'Evaluación publicada exitosamente',
    type: Evaluation,
  })
  @ApiResponse({ status: 404, description: 'Evaluación no encontrada' })
  async publish(@Param('id', ParseUUIDPipe) id: string): Promise<Evaluation> {
    return this.evaluationsService.publish(id);
  }

  @Patch(':id/unpublish')
  @ApiOperation({
    summary: 'Despublicar evaluación',
    description: 'Oculta una evaluación de los estudiantes',
  })
  @ApiParam({ name: 'id', description: 'UUID de la evaluación' })
  @ApiResponse({
    status: 200,
    description: 'Evaluación despublicada exitosamente',
    type: Evaluation,
  })
  @ApiResponse({ status: 404, description: 'Evaluación no encontrada' })
  async unpublish(@Param('id', ParseUUIDPipe) id: string): Promise<Evaluation> {
    return this.evaluationsService.unpublish(id);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Eliminar evaluación',
    description: 'Elimina una evaluación y todas sus preguntas',
  })
  @ApiParam({ name: 'id', description: 'UUID de la evaluación' })
  @ApiResponse({ status: 204, description: 'Evaluación eliminada exitosamente' })
  @ApiResponse({ status: 404, description: 'Evaluación no encontrada' })
  async delete(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    await this.evaluationsService.delete(id);
  }

  // ============================================
  // CRUD PREGUNTAS
  // ============================================

  @Get(':id/questions')
  @ApiOperation({
    summary: 'Obtener preguntas de una evaluación (Admin)',
    description: 'Retorna todas las preguntas con respuestas correctas',
  })
  @ApiParam({ name: 'id', description: 'UUID de la evaluación' })
  @ApiResponse({
    status: 200,
    description: 'Lista de preguntas',
    type: [Question],
  })
  async getQuestions(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<Question[]> {
    await this.evaluationsService.findById(id);
    return this.questionsService.findByEvaluation(id);
  }

  @Post(':id/questions')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Agregar pregunta a evaluación',
    description: 'Crea una nueva pregunta para la evaluación',
  })
  @ApiParam({ name: 'id', description: 'UUID de la evaluación' })
  @ApiResponse({
    status: 201,
    description: 'Pregunta creada exitosamente',
    type: Question,
  })
  async addQuestion(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CreateQuestionDto,
  ): Promise<Question> {
    // Asegurar que el evaluationId coincide
    dto.evaluationId = id;
    return this.questionsService.create(dto);
  }

  @Put('questions/:questionId')
  @ApiOperation({
    summary: 'Actualizar pregunta',
    description: 'Actualiza una pregunta existente',
  })
  @ApiParam({ name: 'questionId', description: 'UUID de la pregunta' })
  @ApiResponse({
    status: 200,
    description: 'Pregunta actualizada exitosamente',
    type: Question,
  })
  @ApiResponse({ status: 404, description: 'Pregunta no encontrada' })
  async updateQuestion(
    @Param('questionId', ParseUUIDPipe) questionId: string,
    @Body() dto: UpdateQuestionDto,
  ): Promise<Question> {
    return this.questionsService.update(questionId, dto);
  }

  @Delete('questions/:questionId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Eliminar pregunta',
    description: 'Elimina una pregunta de la evaluación',
  })
  @ApiParam({ name: 'questionId', description: 'UUID de la pregunta' })
  @ApiResponse({ status: 204, description: 'Pregunta eliminada exitosamente' })
  @ApiResponse({ status: 404, description: 'Pregunta no encontrada' })
  async deleteQuestion(
    @Param('questionId', ParseUUIDPipe) questionId: string,
  ): Promise<void> {
    await this.questionsService.delete(questionId);
  }

  @Patch(':id/questions/reorder')
  @ApiOperation({
    summary: 'Reordenar preguntas',
    description: 'Cambia el orden de las preguntas de una evaluación',
  })
  @ApiParam({ name: 'id', description: 'UUID de la evaluación' })
  @ApiResponse({
    status: 200,
    description: 'Preguntas reordenadas exitosamente',
    type: [Question],
  })
  async reorderQuestions(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: { questionIds: string[] },
  ): Promise<Question[]> {
    return this.questionsService.reorder(id, body.questionIds);
  }
}
