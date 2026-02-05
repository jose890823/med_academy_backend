import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
  ParseUUIDPipe,
  Req,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { Request } from 'express';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { User } from '../../auth/entities/user.entity';
import { EnrollmentProgressService } from '../services/enrollment-progress.service';
import { ModuleProgressService } from '../services/module-progress.service';
import { AchievementsService } from '../services/achievements.service';
import { ActivityLogService } from '../services/activity-log.service';
import { EnrollmentProgress } from '../entities/enrollment-progress.entity';
import { ModuleProgress } from '../entities/module-progress.entity';
import { Achievement } from '../entities/achievement.entity';
import {
  UpdateVideoProgressDto,
  MarkMaterialViewedDto,
  CompleteModuleDto,
  UpdateStudentNotesDto,
} from '../dto';

@ApiTags('Progress')
@Controller('v1/progress')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class ProgressController {
  constructor(
    private readonly enrollmentProgressService: EnrollmentProgressService,
    private readonly moduleProgressService: ModuleProgressService,
    private readonly achievementsService: AchievementsService,
    private readonly activityLogService: ActivityLogService,
  ) {}

  // ============================================
  // PROGRESO DE ENROLLMENT
  // ============================================

  @Get('enrollment/:enrollmentId')
  @ApiOperation({
    summary: 'Obtener progreso de una inscripción',
    description: 'Retorna el progreso general del estudiante en una inscripción',
  })
  @ApiParam({ name: 'enrollmentId', description: 'UUID de la inscripción' })
  @ApiResponse({
    status: 200,
    description: 'Progreso de la inscripción',
    type: EnrollmentProgress,
  })
  async getEnrollmentProgress(
    @Param('enrollmentId', ParseUUIDPipe) enrollmentId: string,
  ): Promise<EnrollmentProgress> {
    return this.enrollmentProgressService.findByEnrollmentId(enrollmentId);
  }

  @Get('my-stats')
  @ApiOperation({
    summary: 'Obtener estadísticas del estudiante',
    description: 'Retorna estadísticas generales del estudiante actual',
  })
  @ApiResponse({
    status: 200,
    description: 'Estadísticas del estudiante',
  })
  async getMyStats(@CurrentUser() user: User) {
    return this.enrollmentProgressService.getStudentStats(user.id);
  }

  @Get('my-courses/recent')
  @ApiOperation({
    summary: 'Obtener cursos recientes',
    description: 'Retorna los cursos accedidos recientemente',
  })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({
    status: 200,
    description: 'Lista de cursos recientes',
    type: [EnrollmentProgress],
  })
  async getRecentCourses(
    @CurrentUser() user: User,
    @Query('limit') limit?: number,
  ): Promise<EnrollmentProgress[]> {
    return this.enrollmentProgressService.getRecentCourses(user.id, limit || 5);
  }

  // ============================================
  // PROGRESO DE MÓDULOS
  // ============================================

  @Get('enrollment/:enrollmentId/modules')
  @ApiOperation({
    summary: 'Obtener progreso de todos los módulos',
    description: 'Retorna el progreso de cada módulo de la inscripción',
  })
  @ApiParam({ name: 'enrollmentId', description: 'UUID de la inscripción' })
  @ApiResponse({
    status: 200,
    description: 'Lista de progresos de módulos',
    type: [ModuleProgress],
  })
  async getModulesProgress(
    @Param('enrollmentId', ParseUUIDPipe) enrollmentId: string,
  ): Promise<ModuleProgress[]> {
    return this.moduleProgressService.findAllByEnrollment(enrollmentId);
  }

  @Get('enrollment/:enrollmentId/modules/summary')
  @ApiOperation({
    summary: 'Obtener resumen de módulos',
    description: 'Retorna un resumen del progreso de módulos',
  })
  @ApiParam({ name: 'enrollmentId', description: 'UUID de la inscripción' })
  @ApiResponse({
    status: 200,
    description: 'Resumen de módulos',
  })
  async getModulesSummary(
    @Param('enrollmentId', ParseUUIDPipe) enrollmentId: string,
  ) {
    return this.moduleProgressService.getModulesSummary(enrollmentId);
  }

  @Get('enrollment/:enrollmentId/modules/next')
  @ApiOperation({
    summary: 'Obtener siguiente módulo',
    description: 'Retorna el siguiente módulo a ver',
  })
  @ApiParam({ name: 'enrollmentId', description: 'UUID de la inscripción' })
  @ApiResponse({
    status: 200,
    description: 'Siguiente módulo',
    type: ModuleProgress,
  })
  async getNextModule(
    @Param('enrollmentId', ParseUUIDPipe) enrollmentId: string,
  ): Promise<ModuleProgress | null> {
    return this.moduleProgressService.getNextModule(enrollmentId);
  }

  @Post('enrollment/:enrollmentId/modules/access')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Registrar acceso a módulo',
    description: 'Registra que el estudiante accedió a un módulo',
  })
  @ApiParam({ name: 'enrollmentId', description: 'UUID de la inscripción' })
  @ApiResponse({
    status: 200,
    description: 'Acceso registrado',
    type: ModuleProgress,
  })
  async recordModuleAccess(
    @Param('enrollmentId', ParseUUIDPipe) enrollmentId: string,
    @Body() body: { moduleId: string },
    @CurrentUser() user: User,
  ): Promise<ModuleProgress> {
    // Registrar en activity log
    await this.activityLogService.logModuleAccess(
      user.id,
      enrollmentId,
      body.moduleId,
    );

    return this.moduleProgressService.recordAccess(enrollmentId, body.moduleId);
  }

  @Put('enrollment/:enrollmentId/video')
  @ApiOperation({
    summary: 'Actualizar progreso de video',
    description: 'Actualiza la posición y progreso del video',
  })
  @ApiParam({ name: 'enrollmentId', description: 'UUID de la inscripción' })
  @ApiResponse({
    status: 200,
    description: 'Progreso de video actualizado',
    type: ModuleProgress,
  })
  async updateVideoProgress(
    @Param('enrollmentId', ParseUUIDPipe) enrollmentId: string,
    @Body() dto: UpdateVideoProgressDto,
    @CurrentUser() user: User,
  ): Promise<ModuleProgress> {
    const progress = await this.moduleProgressService.updateVideoProgress(enrollmentId, dto);

    // Verificar logros si el video se completó
    if (dto.videoCompleted) {
      const enrollmentProgress = await this.enrollmentProgressService.findByEnrollmentId(enrollmentId);
      await this.achievementsService.checkProgressAchievements(
        user.id,
        enrollmentId,
        enrollmentProgress.completedModulesCount,
        enrollmentProgress.totalModulesCount,
      );
    }

    return progress;
  }

  @Post('enrollment/:enrollmentId/material-viewed')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Marcar material como visto',
    description: 'Registra que el estudiante vio/descargó un material',
  })
  @ApiParam({ name: 'enrollmentId', description: 'UUID de la inscripción' })
  @ApiResponse({
    status: 200,
    description: 'Material marcado como visto',
    type: ModuleProgress,
  })
  async markMaterialViewed(
    @Param('enrollmentId', ParseUUIDPipe) enrollmentId: string,
    @Body() dto: MarkMaterialViewedDto,
    @CurrentUser() user: User,
  ): Promise<ModuleProgress> {
    // Registrar en activity log
    await this.activityLogService.logMaterialDownload(
      user.id,
      enrollmentId,
      dto.moduleId,
      dto.materialIndex,
    );

    return this.moduleProgressService.markMaterialViewed(enrollmentId, dto);
  }

  @Post('enrollment/:enrollmentId/complete-module')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Completar módulo manualmente',
    description: 'Marca un módulo como completado',
  })
  @ApiParam({ name: 'enrollmentId', description: 'UUID de la inscripción' })
  @ApiResponse({
    status: 200,
    description: 'Módulo completado',
    type: ModuleProgress,
  })
  async completeModule(
    @Param('enrollmentId', ParseUUIDPipe) enrollmentId: string,
    @Body() dto: CompleteModuleDto,
    @CurrentUser() user: User,
  ): Promise<ModuleProgress> {
    const progress = await this.moduleProgressService.markAsCompleted(enrollmentId, dto.moduleId);

    // Registrar en activity log
    await this.activityLogService.logModuleCompleted(user.id, enrollmentId, dto.moduleId);

    // Verificar logros
    const enrollmentProgress = await this.enrollmentProgressService.findByEnrollmentId(enrollmentId);
    await this.achievementsService.checkProgressAchievements(
      user.id,
      enrollmentId,
      enrollmentProgress.completedModulesCount,
      enrollmentProgress.totalModulesCount,
    );

    return progress;
  }

  @Put('enrollment/:enrollmentId/notes')
  @ApiOperation({
    summary: 'Actualizar notas del estudiante',
    description: 'Actualiza las notas personales del estudiante en un módulo',
  })
  @ApiParam({ name: 'enrollmentId', description: 'UUID de la inscripción' })
  @ApiResponse({
    status: 200,
    description: 'Notas actualizadas',
    type: ModuleProgress,
  })
  async updateStudentNotes(
    @Param('enrollmentId', ParseUUIDPipe) enrollmentId: string,
    @Body() dto: UpdateStudentNotesDto,
  ): Promise<ModuleProgress> {
    return this.moduleProgressService.updateStudentNotes(enrollmentId, dto);
  }

  // ============================================
  // LOGROS
  // ============================================

  @Get('achievements')
  @ApiOperation({
    summary: 'Obtener mis logros',
    description: 'Retorna todos los logros del estudiante actual',
  })
  @ApiResponse({
    status: 200,
    description: 'Lista de logros',
    type: [Achievement],
  })
  async getMyAchievements(@CurrentUser() user: User): Promise<Achievement[]> {
    return this.achievementsService.findByUserId(user.id);
  }

  @Get('achievements/stats')
  @ApiOperation({
    summary: 'Obtener estadísticas de logros',
    description: 'Retorna estadísticas de logros del estudiante',
  })
  @ApiResponse({
    status: 200,
    description: 'Estadísticas de logros',
  })
  async getAchievementStats(@CurrentUser() user: User) {
    return this.achievementsService.getUserAchievementStats(user.id);
  }

  @Get('achievements/unseen')
  @ApiOperation({
    summary: 'Obtener logros no vistos',
    description: 'Retorna los logros que el usuario aún no ha visto',
  })
  @ApiResponse({
    status: 200,
    description: 'Logros no vistos',
    type: [Achievement],
  })
  async getUnseenAchievements(@CurrentUser() user: User): Promise<Achievement[]> {
    return this.achievementsService.getUnseenAchievements(user.id);
  }

  @Post('achievements/mark-seen')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Marcar logros como vistos',
    description: 'Marca los logros especificados como vistos',
  })
  @ApiResponse({
    status: 200,
    description: 'Logros marcados como vistos',
  })
  async markAchievementsSeen(
    @Body() body: { achievementIds: string[] },
  ): Promise<{ success: boolean }> {
    await this.achievementsService.markAsSeen(body.achievementIds);
    return { success: true };
  }

  @Get('achievements/points')
  @ApiOperation({
    summary: 'Obtener puntos totales',
    description: 'Retorna los puntos totales acumulados por logros',
  })
  @ApiResponse({
    status: 200,
    description: 'Puntos totales',
  })
  async getTotalPoints(@CurrentUser() user: User): Promise<{ points: number }> {
    const points = await this.achievementsService.getTotalPoints(user.id);
    return { points };
  }

  // ============================================
  // ACTIVIDAD
  // ============================================

  @Get('activity')
  @ApiOperation({
    summary: 'Obtener actividad reciente',
    description: 'Retorna la actividad reciente del estudiante',
  })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({
    status: 200,
    description: 'Lista de actividades',
  })
  async getMyActivity(
    @CurrentUser() user: User,
    @Query('limit') limit?: number,
  ) {
    return this.activityLogService.findByUserId(user.id, { limit: limit || 20 });
  }

  @Get('activity/daily')
  @ApiOperation({
    summary: 'Obtener actividad diaria',
    description: 'Retorna resumen de actividad por día',
  })
  @ApiQuery({ name: 'days', required: false, type: Number })
  @ApiResponse({
    status: 200,
    description: 'Resumen de actividad diaria',
  })
  async getDailyActivity(
    @CurrentUser() user: User,
    @Query('days') days?: number,
  ) {
    return this.activityLogService.getDailyActivitySummary(user.id, days || 30);
  }

  @Get('activity/stats')
  @ApiOperation({
    summary: 'Obtener estadísticas de actividad',
    description: 'Retorna estadísticas de actividad del estudiante',
  })
  @ApiQuery({ name: 'enrollmentId', required: false })
  @ApiResponse({
    status: 200,
    description: 'Estadísticas de actividad',
  })
  async getActivityStats(
    @CurrentUser() user: User,
    @Query('enrollmentId') enrollmentId?: string,
  ) {
    return this.activityLogService.getActivityStats(user.id, enrollmentId);
  }
}
