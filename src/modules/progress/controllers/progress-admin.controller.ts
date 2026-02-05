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
  ApiQuery,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { UserRole } from '../../auth/entities/user.entity';
import { EnrollmentProgressService } from '../services/enrollment-progress.service';
import { ModuleProgressService } from '../services/module-progress.service';
import { AchievementsService } from '../services/achievements.service';
import { ActivityLogService } from '../services/activity-log.service';
import { EnrollmentProgress } from '../entities/enrollment-progress.entity';
import { Achievement, AchievementType } from '../entities/achievement.entity';

@ApiTags('Admin - Progress')
@Controller('v1/admin/progress')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
@ApiBearerAuth()
export class ProgressAdminController {
  constructor(
    private readonly enrollmentProgressService: EnrollmentProgressService,
    private readonly moduleProgressService: ModuleProgressService,
    private readonly achievementsService: AchievementsService,
    private readonly activityLogService: ActivityLogService,
  ) {}

  // ============================================
  // PROGRESO DE ESTUDIANTES
  // ============================================

  @Get('student/:studentId')
  @ApiOperation({
    summary: 'Obtener estadísticas de un estudiante',
    description: 'Retorna estadísticas generales de un estudiante específico',
  })
  @ApiParam({ name: 'studentId', description: 'UUID del estudiante' })
  @ApiResponse({
    status: 200,
    description: 'Estadísticas del estudiante',
  })
  async getStudentStats(
    @Param('studentId', ParseUUIDPipe) studentId: string,
  ) {
    return this.enrollmentProgressService.getStudentStats(studentId);
  }

  @Get('student/:studentId/courses')
  @ApiOperation({
    summary: 'Obtener cursos de un estudiante',
    description: 'Retorna todos los cursos con progreso de un estudiante',
  })
  @ApiParam({ name: 'studentId', description: 'UUID del estudiante' })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({
    status: 200,
    description: 'Lista de cursos con progreso',
    type: [EnrollmentProgress],
  })
  async getStudentCourses(
    @Param('studentId', ParseUUIDPipe) studentId: string,
    @Query('limit') limit?: number,
  ): Promise<EnrollmentProgress[]> {
    return this.enrollmentProgressService.getRecentCourses(studentId, limit || 50);
  }

  @Get('enrollment/:enrollmentId')
  @ApiOperation({
    summary: 'Obtener progreso detallado de inscripción',
    description: 'Retorna el progreso detallado de una inscripción',
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

  @Get('enrollment/:enrollmentId/modules')
  @ApiOperation({
    summary: 'Obtener progreso de módulos de inscripción',
    description: 'Retorna el progreso de cada módulo de una inscripción',
  })
  @ApiParam({ name: 'enrollmentId', description: 'UUID de la inscripción' })
  @ApiResponse({
    status: 200,
    description: 'Lista de progresos de módulos',
  })
  async getEnrollmentModules(
    @Param('enrollmentId', ParseUUIDPipe) enrollmentId: string,
  ) {
    return this.moduleProgressService.findAllByEnrollment(enrollmentId);
  }

  @Get('enrollment/:enrollmentId/activity')
  @ApiOperation({
    summary: 'Obtener actividad de inscripción',
    description: 'Retorna el historial de actividad de una inscripción',
  })
  @ApiParam({ name: 'enrollmentId', description: 'UUID de la inscripción' })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({
    status: 200,
    description: 'Lista de actividades',
  })
  async getEnrollmentActivity(
    @Param('enrollmentId', ParseUUIDPipe) enrollmentId: string,
    @Query('limit') limit?: number,
  ) {
    return this.activityLogService.findByEnrollment(enrollmentId, {
      limit: limit || 50,
    });
  }

  // ============================================
  // GESTIÓN DE PROGRESO
  // ============================================

  @Post('enrollment/:enrollmentId/initialize')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Inicializar progreso de inscripción',
    description: 'Inicializa los contadores de módulos y evaluaciones',
  })
  @ApiParam({ name: 'enrollmentId', description: 'UUID de la inscripción' })
  @ApiResponse({
    status: 200,
    description: 'Progreso inicializado',
    type: EnrollmentProgress,
  })
  async initializeProgress(
    @Param('enrollmentId', ParseUUIDPipe) enrollmentId: string,
    @Body() body: { totalModules: number; totalEvaluations: number },
  ): Promise<EnrollmentProgress> {
    return this.enrollmentProgressService.initializeCounts(
      enrollmentId,
      body.totalModules,
      body.totalEvaluations,
    );
  }

  @Post('enrollment/:enrollmentId/complete')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Marcar inscripción como completada',
    description: 'Marca manualmente una inscripción como completada',
  })
  @ApiParam({ name: 'enrollmentId', description: 'UUID de la inscripción' })
  @ApiResponse({
    status: 200,
    description: 'Inscripción marcada como completada',
    type: EnrollmentProgress,
  })
  async markEnrollmentCompleted(
    @Param('enrollmentId', ParseUUIDPipe) enrollmentId: string,
  ): Promise<EnrollmentProgress> {
    return this.enrollmentProgressService.markAsCompleted(enrollmentId);
  }

  @Post('enrollment/:enrollmentId/module/:moduleId/complete')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Completar módulo para estudiante',
    description: 'Marca un módulo como completado para un estudiante',
  })
  @ApiParam({ name: 'enrollmentId', description: 'UUID de la inscripción' })
  @ApiParam({ name: 'moduleId', description: 'UUID del módulo' })
  @ApiResponse({
    status: 200,
    description: 'Módulo completado',
  })
  async completeModuleForStudent(
    @Param('enrollmentId', ParseUUIDPipe) enrollmentId: string,
    @Param('moduleId', ParseUUIDPipe) moduleId: string,
  ) {
    return this.moduleProgressService.markAsCompleted(enrollmentId, moduleId);
  }

  // ============================================
  // GESTIÓN DE LOGROS
  // ============================================

  @Get('achievements/user/:userId')
  @ApiOperation({
    summary: 'Obtener logros de un usuario',
    description: 'Retorna todos los logros de un usuario específico',
  })
  @ApiParam({ name: 'userId', description: 'UUID del usuario' })
  @ApiResponse({
    status: 200,
    description: 'Lista de logros',
    type: [Achievement],
  })
  async getUserAchievements(
    @Param('userId', ParseUUIDPipe) userId: string,
  ): Promise<Achievement[]> {
    return this.achievementsService.findByUserId(userId);
  }

  @Get('achievements/user/:userId/stats')
  @ApiOperation({
    summary: 'Obtener estadísticas de logros de usuario',
    description: 'Retorna estadísticas de logros de un usuario',
  })
  @ApiParam({ name: 'userId', description: 'UUID del usuario' })
  @ApiResponse({
    status: 200,
    description: 'Estadísticas de logros',
  })
  async getUserAchievementStats(
    @Param('userId', ParseUUIDPipe) userId: string,
  ) {
    return this.achievementsService.getUserAchievementStats(userId);
  }

  @Post('achievements/grant')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Otorgar logro a usuario',
    description: 'Otorga un logro específico a un usuario',
  })
  @ApiResponse({
    status: 201,
    description: 'Logro otorgado',
    type: Achievement,
  })
  async grantAchievement(
    @Body() body: {
      userId: string;
      type: AchievementType;
      enrollmentId?: string;
      metadata?: Record<string, any>;
    },
  ): Promise<Achievement | null> {
    return this.achievementsService.grantAchievement(
      body.userId,
      body.type,
      body.enrollmentId,
      body.metadata,
    );
  }

  @Post('achievements/grant-custom')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Otorgar logro personalizado',
    description: 'Crea y otorga un logro personalizado a un usuario',
  })
  @ApiResponse({
    status: 201,
    description: 'Logro personalizado otorgado',
    type: Achievement,
  })
  async grantCustomAchievement(
    @Body() body: {
      userId: string;
      title: string;
      description: string;
      enrollmentId?: string;
      points?: number;
      level?: string;
      iconUrl?: string;
      metadata?: Record<string, any>;
    },
  ): Promise<Achievement> {
    return this.achievementsService.grantCustomAchievement(
      body.userId,
      body.title,
      body.description,
      {
        enrollmentId: body.enrollmentId,
        points: body.points,
        level: body.level,
        iconUrl: body.iconUrl,
        metadata: body.metadata,
      },
    );
  }

  // ============================================
  // ACTIVIDAD Y ANALYTICS
  // ============================================

  @Get('activity/user/:userId')
  @ApiOperation({
    summary: 'Obtener actividad de un usuario',
    description: 'Retorna el historial de actividad de un usuario',
  })
  @ApiParam({ name: 'userId', description: 'UUID del usuario' })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({
    status: 200,
    description: 'Lista de actividades',
  })
  async getUserActivity(
    @Param('userId', ParseUUIDPipe) userId: string,
    @Query('limit') limit?: number,
  ) {
    return this.activityLogService.findByUserId(userId, { limit: limit || 50 });
  }

  @Get('activity/user/:userId/daily')
  @ApiOperation({
    summary: 'Obtener actividad diaria de usuario',
    description: 'Retorna resumen de actividad por día de un usuario',
  })
  @ApiParam({ name: 'userId', description: 'UUID del usuario' })
  @ApiQuery({ name: 'days', required: false, type: Number })
  @ApiResponse({
    status: 200,
    description: 'Resumen de actividad diaria',
  })
  async getUserDailyActivity(
    @Param('userId', ParseUUIDPipe) userId: string,
    @Query('days') days?: number,
  ) {
    return this.activityLogService.getDailyActivitySummary(userId, days || 30);
  }

  @Get('activity/user/:userId/stats')
  @ApiOperation({
    summary: 'Obtener estadísticas de actividad de usuario',
    description: 'Retorna estadísticas de actividad de un usuario',
  })
  @ApiParam({ name: 'userId', description: 'UUID del usuario' })
  @ApiQuery({ name: 'enrollmentId', required: false })
  @ApiResponse({
    status: 200,
    description: 'Estadísticas de actividad',
  })
  async getUserActivityStats(
    @Param('userId', ParseUUIDPipe) userId: string,
    @Query('enrollmentId') enrollmentId?: string,
  ) {
    return this.activityLogService.getActivityStats(userId, enrollmentId);
  }
}
