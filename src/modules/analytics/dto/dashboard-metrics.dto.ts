import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * Métrica con cambio respecto al período anterior
 */
export class MetricWithChange {
  @ApiProperty({ example: 150, description: 'Valor actual' })
  value: number;

  @ApiPropertyOptional({ example: 120, description: 'Valor del período anterior' })
  previousValue?: number;

  @ApiPropertyOptional({ example: 25, description: 'Porcentaje de cambio' })
  changePercent?: number;

  @ApiPropertyOptional({ example: 'up', description: 'Dirección del cambio', enum: ['up', 'down', 'same'] })
  trend?: 'up' | 'down' | 'same';
}

/**
 * Métricas principales del dashboard
 */
export class DashboardMetricsDto {
  // ============================================
  // USUARIOS
  // ============================================

  @ApiProperty({ description: 'Total de usuarios registrados' })
  totalUsers: MetricWithChange;

  @ApiProperty({ description: 'Usuarios activos en el período' })
  activeUsers: MetricWithChange;

  @ApiProperty({ description: 'Nuevos usuarios en el período' })
  newUsers: MetricWithChange;

  // ============================================
  // INSCRIPCIONES
  // ============================================

  @ApiProperty({ description: 'Total de inscripciones activas' })
  activeEnrollments: MetricWithChange;

  @ApiProperty({ description: 'Nuevas inscripciones en el período' })
  newEnrollments: MetricWithChange;

  @ApiProperty({ description: 'Inscripciones completadas en el período' })
  completedEnrollments: MetricWithChange;

  // ============================================
  // INGRESOS
  // ============================================

  @ApiProperty({ description: 'Ingresos totales en el período (USD)' })
  totalRevenue: MetricWithChange;

  @ApiProperty({ description: 'Número de pagos procesados' })
  paymentsCount: MetricWithChange;

  @ApiProperty({ description: 'Ticket promedio (USD)' })
  averageTicket: MetricWithChange;

  // ============================================
  // CERTIFICADOS
  // ============================================

  @ApiProperty({ description: 'Certificados emitidos en el período' })
  certificatesIssued: MetricWithChange;

  @ApiProperty({ description: 'Total de certificados emitidos' })
  totalCertificates: MetricWithChange;

  // ============================================
  // EVALUACIONES
  // ============================================

  @ApiProperty({ description: 'Evaluaciones completadas en el período' })
  evaluationsCompleted: MetricWithChange;

  @ApiProperty({ description: 'Tasa de aprobación promedio (%)' })
  averagePassRate: MetricWithChange;

  // ============================================
  // WORKSHOPS
  // ============================================

  @ApiProperty({ description: 'Inscripciones a workshops en el período' })
  workshopRegistrations: MetricWithChange;

  // ============================================
  // PERÍODO
  // ============================================

  @ApiProperty({ example: '2026-01-01', description: 'Inicio del período' })
  periodStart: string;

  @ApiProperty({ example: '2026-01-31', description: 'Fin del período' })
  periodEnd: string;
}

/**
 * Punto de datos para gráficos de tendencia
 */
export class TrendDataPoint {
  @ApiProperty({ example: '2026-01-15', description: 'Fecha/período' })
  date: string;

  @ApiProperty({ example: 25, description: 'Valor' })
  value: number;

  @ApiPropertyOptional({ example: 'Lunes', description: 'Etiqueta legible' })
  label?: string;
}

/**
 * Datos de tendencia para gráficos
 */
export class TrendDataDto {
  @ApiProperty({ description: 'Datos de la serie', type: [TrendDataPoint] })
  data: TrendDataPoint[];

  @ApiProperty({ example: 'Inscripciones', description: 'Nombre de la métrica' })
  metric: string;

  @ApiProperty({ example: 'daily', description: 'Granularidad' })
  granularity: string;
}

/**
 * Distribución por categoría
 */
export class CategoryDistributionDto {
  @ApiProperty({ example: 'Vascular Sonography', description: 'Nombre de la categoría' })
  name: string;

  @ApiProperty({ example: 45, description: 'Cantidad' })
  count: number;

  @ApiProperty({ example: 35.5, description: 'Porcentaje del total' })
  percentage: number;

  @ApiPropertyOptional({ example: '#3B82F6', description: 'Color para gráficos' })
  color?: string;
}

/**
 * Resumen de curso
 */
export class CourseAnalyticsDto {
  @ApiProperty({ description: 'ID del curso' })
  courseId: string;

  @ApiProperty({ description: 'Título del curso' })
  courseTitle: string;

  @ApiProperty({ description: 'Inscripciones activas' })
  activeEnrollments: number;

  @ApiProperty({ description: 'Total inscripciones' })
  totalEnrollments: number;

  @ApiProperty({ description: 'Tasa de completitud (%)' })
  completionRate: number;

  @ApiProperty({ description: 'Ingresos generados (USD)' })
  revenue: number;

  @ApiProperty({ description: 'Calificación promedio' })
  averageRating: number | null;
}

/**
 * Top performers (estudiantes destacados)
 */
export class TopPerformerDto {
  @ApiProperty({ description: 'ID del estudiante' })
  studentId: string;

  @ApiProperty({ description: 'Nombre del estudiante' })
  studentName: string;

  @ApiProperty({ description: 'Email' })
  email: string;

  @ApiProperty({ description: 'Cursos completados' })
  coursesCompleted: number;

  @ApiProperty({ description: 'Certificados obtenidos' })
  certificatesEarned: number;

  @ApiProperty({ description: 'Promedio de calificaciones' })
  averageScore: number;
}
