import { Controller, Get, Query, Param, UseGuards, Res } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import type { Response } from 'express';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { UserRole } from '../../auth/entities/user.entity';
import { AnalyticsService } from '../services/analytics.service';
import {
  AnalyticsQueryDto,
  ExportReportDto,
  DashboardMetricsDto,
  TrendDataDto,
  CategoryDistributionDto,
  CourseAnalyticsDto,
  TopPerformerDto,
} from '../dto';

/**
 * Controlador de Analytics para administradores
 */
@ApiTags('Admin - Analytics')
@Controller('v1/admin/analytics')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
@ApiBearerAuth()
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  // ============================================
  // DASHBOARD
  // ============================================

  @Get('dashboard')
  @ApiOperation({
    summary: 'Métricas del dashboard',
    description:
      'Obtiene las métricas principales para el dashboard de administración',
  })
  @ApiResponse({
    status: 200,
    description: 'Métricas del dashboard',
    type: DashboardMetricsDto,
  })
  async getDashboardMetrics(
    @Query() query: AnalyticsQueryDto,
  ): Promise<DashboardMetricsDto> {
    return this.analyticsService.getDashboardMetrics(query);
  }

  // ============================================
  // TENDENCIAS
  // ============================================

  @Get('trends/:metric')
  @ApiOperation({
    summary: 'Datos de tendencia',
    description:
      'Obtiene datos de tendencia para gráficos (enrollments, revenue, users, certificates)',
  })
  @ApiParam({
    name: 'metric',
    description: 'Métrica a obtener',
    enum: ['enrollments', 'revenue', 'users', 'certificates'],
  })
  @ApiResponse({
    status: 200,
    description: 'Datos de tendencia',
    type: TrendDataDto,
  })
  async getTrendData(
    @Param('metric') metric: string,
    @Query() query: AnalyticsQueryDto,
  ): Promise<TrendDataDto> {
    return this.analyticsService.getTrendData(metric, query);
  }

  // ============================================
  // DISTRIBUCIONES
  // ============================================

  @Get('distribution/courses')
  @ApiOperation({
    summary: 'Distribución por curso',
    description: 'Obtiene la distribución de inscripciones por curso',
  })
  @ApiResponse({
    status: 200,
    description: 'Distribución por curso',
    type: [CategoryDistributionDto],
  })
  async getCourseDistribution(): Promise<CategoryDistributionDto[]> {
    return this.analyticsService.getCourseDistribution();
  }

  // ============================================
  // ANALYTICS POR CURSO
  // ============================================

  @Get('courses')
  @ApiOperation({
    summary: 'Analytics de cursos',
    description: 'Obtiene analytics detallados de todos los cursos',
  })
  @ApiResponse({
    status: 200,
    description: 'Analytics de cursos',
    type: [CourseAnalyticsDto],
  })
  async getCourseAnalytics(): Promise<CourseAnalyticsDto[]> {
    return this.analyticsService.getCourseAnalytics();
  }

  // ============================================
  // TOP PERFORMERS
  // ============================================

  @Get('top-performers')
  @ApiOperation({
    summary: 'Estudiantes destacados',
    description: 'Obtiene los estudiantes con mejor rendimiento',
  })
  @ApiResponse({
    status: 200,
    description: 'Lista de top performers',
    type: [TopPerformerDto],
  })
  async getTopPerformers(
    @Query('limit') limit?: number,
  ): Promise<TopPerformerDto[]> {
    return this.analyticsService.getTopPerformers(limit || 10);
  }

  // ============================================
  // EXPORTACIÓN
  // ============================================

  @Get('export/dashboard')
  @ApiOperation({
    summary: 'Exportar dashboard a Excel',
    description: 'Genera un archivo Excel con las métricas del dashboard',
  })
  @ApiResponse({
    status: 200,
    description: 'Archivo Excel',
    content: {
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': {},
    },
  })
  async exportDashboard(
    @Query() query: ExportReportDto,
    @Res() res: Response,
  ): Promise<void> {
    // Obtener datos
    const metrics = await this.analyticsService.getDashboardMetrics(
      query as AnalyticsQueryDto,
    );
    const courseAnalytics = await this.analyticsService.getCourseAnalytics();
    const topPerformers = await this.analyticsService.getTopPerformers(20);

    // Generar CSV simple (alternativa a Excel sin dependencias adicionales)
    const csvData = this.generateCSVReport(
      metrics,
      courseAnalytics,
      topPerformers,
    );

    // Configurar respuesta
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="analytics-report-${new Date().toISOString().split('T')[0]}.csv"`,
    );

    res.send(csvData);
  }

  /**
   * Genera reporte en formato CSV
   */
  private generateCSVReport(
    metrics: DashboardMetricsDto,
    courseAnalytics: CourseAnalyticsDto[],
    topPerformers: TopPerformerDto[],
  ): string {
    const lines: string[] = [];

    // Encabezado
    lines.push('ULTRASOUND MEDACADEMY - ANALYTICS REPORT');
    lines.push(`Generated: ${new Date().toISOString()}`);
    lines.push(`Period: ${metrics.periodStart} to ${metrics.periodEnd}`);
    lines.push('');

    // Métricas principales
    lines.push('=== MAIN METRICS ===');
    lines.push('Metric,Value,Previous,Change %');
    lines.push(
      `Total Users,${metrics.totalUsers.value},${metrics.totalUsers.previousValue || ''},${metrics.totalUsers.changePercent || ''}`,
    );
    lines.push(`Active Users,${metrics.activeUsers.value},,`);
    lines.push(
      `New Users,${metrics.newUsers.value},${metrics.newUsers.previousValue || ''},${metrics.newUsers.changePercent || ''}`,
    );
    lines.push(`Active Enrollments,${metrics.activeEnrollments.value},,`);
    lines.push(
      `New Enrollments,${metrics.newEnrollments.value},${metrics.newEnrollments.previousValue || ''},${metrics.newEnrollments.changePercent || ''}`,
    );
    lines.push(
      `Completed Enrollments,${metrics.completedEnrollments.value},${metrics.completedEnrollments.previousValue || ''},${metrics.completedEnrollments.changePercent || ''}`,
    );
    lines.push(
      `Total Revenue (USD),${metrics.totalRevenue.value},${metrics.totalRevenue.previousValue || ''},${metrics.totalRevenue.changePercent || ''}`,
    );
    lines.push(
      `Payments Count,${metrics.paymentsCount.value},${metrics.paymentsCount.previousValue || ''},${metrics.paymentsCount.changePercent || ''}`,
    );
    lines.push(
      `Average Ticket (USD),${metrics.averageTicket.value},${metrics.averageTicket.previousValue || ''},${metrics.averageTicket.changePercent || ''}`,
    );
    lines.push(
      `Certificates Issued,${metrics.certificatesIssued.value},${metrics.certificatesIssued.previousValue || ''},${metrics.certificatesIssued.changePercent || ''}`,
    );
    lines.push(
      `Evaluations Completed,${metrics.evaluationsCompleted.value},${metrics.evaluationsCompleted.previousValue || ''},${metrics.evaluationsCompleted.changePercent || ''}`,
    );
    lines.push(
      `Average Pass Rate (%),${metrics.averagePassRate.value},${metrics.averagePassRate.previousValue || ''},${metrics.averagePassRate.changePercent || ''}`,
    );
    lines.push('');

    // Analytics por curso
    lines.push('=== COURSE ANALYTICS ===');
    lines.push(
      'Course,Active Enrollments,Total Enrollments,Completion Rate %,Revenue (USD)',
    );
    for (const course of courseAnalytics) {
      lines.push(
        `"${course.courseTitle}",${course.activeEnrollments},${course.totalEnrollments},${course.completionRate},${course.revenue}`,
      );
    }
    lines.push('');

    // Top performers
    lines.push('=== TOP PERFORMERS ===');
    lines.push('Student,Email,Certificates Earned');
    for (const performer of topPerformers) {
      lines.push(
        `"${performer.studentName}",${performer.email},${performer.certificatesEarned}`,
      );
    }

    return lines.join('\n');
  }
}
