import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, MoreThanOrEqual, LessThanOrEqual } from 'typeorm';
import { User } from '../../auth/entities/user.entity';
import {
  Enrollment,
  EnrollmentStatus,
} from '../../enrollments/entities/enrollment.entity';
import { Payment, PaymentStatus } from '../../payments/entities/payment.entity';
import { Certificate } from '../../certificates/entities/certificate.entity';
import {
  EvaluationAttempt,
  AttemptStatus,
} from '../../evaluations/entities/evaluation-attempt.entity';
import { Course, CourseStatus } from '../../courses/entities/course.entity';
import {
  AnalyticsQueryDto,
  AnalyticsPeriod,
  AnalyticsGranularity,
} from '../dto/analytics-query.dto';
import {
  DashboardMetricsDto,
  MetricWithChange,
  TrendDataDto,
  TrendDataPoint,
  CategoryDistributionDto,
  CourseAnalyticsDto,
  TopPerformerDto,
} from '../dto/dashboard-metrics.dto';

@Injectable()
export class AnalyticsService {
  private readonly logger = new Logger(AnalyticsService.name);

  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Enrollment)
    private readonly enrollmentRepository: Repository<Enrollment>,
    @InjectRepository(Payment)
    private readonly paymentRepository: Repository<Payment>,
    @InjectRepository(Certificate)
    private readonly certificateRepository: Repository<Certificate>,
    @InjectRepository(EvaluationAttempt)
    private readonly attemptRepository: Repository<EvaluationAttempt>,
    @InjectRepository(Course)
    private readonly courseRepository: Repository<Course>,
  ) {}

  // ============================================
  // DASHBOARD PRINCIPAL
  // ============================================

  /**
   * Obtener métricas del dashboard
   */
  async getDashboardMetrics(
    query: AnalyticsQueryDto,
  ): Promise<DashboardMetricsDto> {
    const { startDate, endDate } = this.getDateRange(query);
    const { startDate: prevStartDate, endDate: prevEndDate } =
      this.getPreviousPeriodRange(startDate, endDate);

    this.logger.debug(
      `Calculando métricas: ${startDate.toISOString()} - ${endDate.toISOString()}`,
    );

    // Calcular todas las métricas en paralelo
    const [
      userMetrics,
      enrollmentMetrics,
      revenueMetrics,
      certificateMetrics,
      evaluationMetrics,
      workshopMetrics,
    ] = await Promise.all([
      this.getUserMetrics(startDate, endDate, prevStartDate, prevEndDate),
      this.getEnrollmentMetrics(startDate, endDate, prevStartDate, prevEndDate),
      this.getRevenueMetrics(startDate, endDate, prevStartDate, prevEndDate),
      this.getCertificateMetrics(
        startDate,
        endDate,
        prevStartDate,
        prevEndDate,
      ),
      this.getEvaluationMetrics(startDate, endDate, prevStartDate, prevEndDate),
      this.getWorkshopMetrics(startDate, endDate, prevStartDate, prevEndDate),
    ]);

    return {
      ...userMetrics,
      ...enrollmentMetrics,
      ...revenueMetrics,
      ...certificateMetrics,
      ...evaluationMetrics,
      ...workshopMetrics,
      periodStart: startDate.toISOString().split('T')[0],
      periodEnd: endDate.toISOString().split('T')[0],
    };
  }

  // ============================================
  // MÉTRICAS DE USUARIOS
  // ============================================

  private async getUserMetrics(
    startDate: Date,
    endDate: Date,
    prevStartDate: Date,
    prevEndDate: Date,
  ): Promise<{
    totalUsers: MetricWithChange;
    activeUsers: MetricWithChange;
    newUsers: MetricWithChange;
  }> {
    // Total usuarios
    const totalUsers = await this.userRepository.count({
      where: { isActive: true },
    });
    const prevTotalUsers = await this.userRepository.count({
      where: {
        isActive: true,
        createdAt: LessThanOrEqual(prevEndDate),
      },
    });

    // Nuevos usuarios en el período
    const newUsers = await this.userRepository.count({
      where: { createdAt: Between(startDate, endDate) },
    });
    const prevNewUsers = await this.userRepository.count({
      where: { createdAt: Between(prevStartDate, prevEndDate) },
    });

    // Usuarios activos (con inscripción activa o login reciente)
    const activeUsers = await this.enrollmentRepository
      .createQueryBuilder('enrollment')
      .select('COUNT(DISTINCT enrollment.studentId)', 'count')
      .where('enrollment.status = :status', { status: EnrollmentStatus.ACTIVE })
      .getRawOne()
      .then((r) => parseInt(r?.count || '0', 10));

    return {
      totalUsers: this.createMetric(totalUsers, prevTotalUsers),
      activeUsers: this.createMetric(activeUsers),
      newUsers: this.createMetric(newUsers, prevNewUsers),
    };
  }

  // ============================================
  // MÉTRICAS DE INSCRIPCIONES
  // ============================================

  private async getEnrollmentMetrics(
    startDate: Date,
    endDate: Date,
    prevStartDate: Date,
    prevEndDate: Date,
  ): Promise<{
    activeEnrollments: MetricWithChange;
    newEnrollments: MetricWithChange;
    completedEnrollments: MetricWithChange;
  }> {
    // Inscripciones activas
    const activeEnrollments = await this.enrollmentRepository.count({
      where: { status: EnrollmentStatus.ACTIVE },
    });

    // Nuevas inscripciones
    const newEnrollments = await this.enrollmentRepository.count({
      where: { createdAt: Between(startDate, endDate) },
    });
    const prevNewEnrollments = await this.enrollmentRepository.count({
      where: { createdAt: Between(prevStartDate, prevEndDate) },
    });

    // Inscripciones completadas
    const completedEnrollments = await this.enrollmentRepository.count({
      where: {
        status: EnrollmentStatus.COMPLETED,
        updatedAt: Between(startDate, endDate),
      },
    });
    const prevCompletedEnrollments = await this.enrollmentRepository.count({
      where: {
        status: EnrollmentStatus.COMPLETED,
        updatedAt: Between(prevStartDate, prevEndDate),
      },
    });

    return {
      activeEnrollments: this.createMetric(activeEnrollments),
      newEnrollments: this.createMetric(newEnrollments, prevNewEnrollments),
      completedEnrollments: this.createMetric(
        completedEnrollments,
        prevCompletedEnrollments,
      ),
    };
  }

  // ============================================
  // MÉTRICAS DE INGRESOS
  // ============================================

  private async getRevenueMetrics(
    startDate: Date,
    endDate: Date,
    prevStartDate: Date,
    prevEndDate: Date,
  ): Promise<{
    totalRevenue: MetricWithChange;
    paymentsCount: MetricWithChange;
    averageTicket: MetricWithChange;
  }> {
    // Ingresos del período
    const revenueResult = await this.paymentRepository
      .createQueryBuilder('payment')
      .select('SUM(payment.amount)', 'total')
      .addSelect('COUNT(*)', 'count')
      .where('payment.status = :status', { status: PaymentStatus.COMPLETED })
      .andWhere('payment.paidAt BETWEEN :start AND :end', {
        start: startDate,
        end: endDate,
      })
      .getRawOne();

    const totalRevenue = parseFloat(revenueResult?.total || '0');
    const paymentsCount = parseInt(revenueResult?.count || '0', 10);
    const averageTicket = paymentsCount > 0 ? totalRevenue / paymentsCount : 0;

    // Ingresos del período anterior
    const prevRevenueResult = await this.paymentRepository
      .createQueryBuilder('payment')
      .select('SUM(payment.amount)', 'total')
      .addSelect('COUNT(*)', 'count')
      .where('payment.status = :status', { status: PaymentStatus.COMPLETED })
      .andWhere('payment.paidAt BETWEEN :start AND :end', {
        start: prevStartDate,
        end: prevEndDate,
      })
      .getRawOne();

    const prevTotalRevenue = parseFloat(prevRevenueResult?.total || '0');
    const prevPaymentsCount = parseInt(prevRevenueResult?.count || '0', 10);
    const prevAverageTicket =
      prevPaymentsCount > 0 ? prevTotalRevenue / prevPaymentsCount : 0;

    return {
      totalRevenue: this.createMetric(totalRevenue, prevTotalRevenue),
      paymentsCount: this.createMetric(paymentsCount, prevPaymentsCount),
      averageTicket: this.createMetric(
        Math.round(averageTicket * 100) / 100,
        Math.round(prevAverageTicket * 100) / 100,
      ),
    };
  }

  // ============================================
  // MÉTRICAS DE CERTIFICADOS
  // ============================================

  private async getCertificateMetrics(
    startDate: Date,
    endDate: Date,
    prevStartDate: Date,
    prevEndDate: Date,
  ): Promise<{
    certificatesIssued: MetricWithChange;
    totalCertificates: MetricWithChange;
  }> {
    // Certificados emitidos en el período
    const certificatesIssued = await this.certificateRepository.count({
      where: { issuedAt: Between(startDate, endDate) },
    });
    const prevCertificatesIssued = await this.certificateRepository.count({
      where: { issuedAt: Between(prevStartDate, prevEndDate) },
    });

    // Total certificados
    const totalCertificates = await this.certificateRepository.count();

    return {
      certificatesIssued: this.createMetric(
        certificatesIssued,
        prevCertificatesIssued,
      ),
      totalCertificates: this.createMetric(totalCertificates),
    };
  }

  // ============================================
  // MÉTRICAS DE EVALUACIONES
  // ============================================

  private async getEvaluationMetrics(
    startDate: Date,
    endDate: Date,
    prevStartDate: Date,
    prevEndDate: Date,
  ): Promise<{
    evaluationsCompleted: MetricWithChange;
    averagePassRate: MetricWithChange;
  }> {
    // Evaluaciones completadas
    const evaluationsCompleted = await this.attemptRepository.count({
      where: {
        status: AttemptStatus.GRADED,
        gradedAt: Between(startDate, endDate),
      },
    });
    const prevEvaluationsCompleted = await this.attemptRepository.count({
      where: {
        status: AttemptStatus.GRADED,
        gradedAt: Between(prevStartDate, prevEndDate),
      },
    });

    // Tasa de aprobación
    const passRateResult = await this.attemptRepository
      .createQueryBuilder('attempt')
      .select(
        'AVG(CASE WHEN attempt.passed = true THEN 100 ELSE 0 END)',
        'passRate',
      )
      .where('attempt.status = :status', { status: AttemptStatus.GRADED })
      .andWhere('attempt.gradedAt BETWEEN :start AND :end', {
        start: startDate,
        end: endDate,
      })
      .getRawOne();

    const averagePassRate =
      Math.round(parseFloat(passRateResult?.passRate || '0') * 10) / 10;

    const prevPassRateResult = await this.attemptRepository
      .createQueryBuilder('attempt')
      .select(
        'AVG(CASE WHEN attempt.passed = true THEN 100 ELSE 0 END)',
        'passRate',
      )
      .where('attempt.status = :status', { status: AttemptStatus.GRADED })
      .andWhere('attempt.gradedAt BETWEEN :start AND :end', {
        start: prevStartDate,
        end: prevEndDate,
      })
      .getRawOne();

    const prevAveragePassRate =
      Math.round(parseFloat(prevPassRateResult?.passRate || '0') * 10) / 10;

    return {
      evaluationsCompleted: this.createMetric(
        evaluationsCompleted,
        prevEvaluationsCompleted,
      ),
      averagePassRate: this.createMetric(averagePassRate, prevAveragePassRate),
    };
  }

  // ============================================
  // MÉTRICAS DE WORKSHOPS
  // ============================================

  private async getWorkshopMetrics(
    startDate: Date,
    endDate: Date,
    prevStartDate: Date,
    prevEndDate: Date,
  ): Promise<{
    workshopRegistrations: MetricWithChange;
  }> {
    // Por ahora retornamos 0, se implementará con el módulo de workshops
    return {
      workshopRegistrations: this.createMetric(0),
    };
  }

  // ============================================
  // TENDENCIAS
  // ============================================

  /**
   * Obtener datos de tendencia para gráficos
   */
  async getTrendData(
    metric: string,
    query: AnalyticsQueryDto,
  ): Promise<TrendDataDto> {
    const { startDate, endDate } = this.getDateRange(query);
    const granularity = query.granularity || AnalyticsGranularity.DAILY;

    let data: TrendDataPoint[] = [];

    switch (metric) {
      case 'enrollments':
        data = await this.getEnrollmentTrend(startDate, endDate, granularity);
        break;
      case 'revenue':
        data = await this.getRevenueTrend(startDate, endDate, granularity);
        break;
      case 'users':
        data = await this.getUserTrend(startDate, endDate, granularity);
        break;
      case 'certificates':
        data = await this.getCertificateTrend(startDate, endDate, granularity);
        break;
      default:
        data = [];
    }

    return {
      data,
      metric,
      granularity,
    };
  }

  private async getEnrollmentTrend(
    startDate: Date,
    endDate: Date,
    granularity: AnalyticsGranularity,
  ): Promise<TrendDataPoint[]> {
    const dateFormat = this.getDateFormat(granularity);

    const result = await this.enrollmentRepository
      .createQueryBuilder('enrollment')
      .select(`TO_CHAR(enrollment.createdAt, '${dateFormat}')`, 'date')
      .addSelect('COUNT(*)', 'value')
      .where('enrollment.createdAt BETWEEN :start AND :end', {
        start: startDate,
        end: endDate,
      })
      .groupBy(`TO_CHAR(enrollment.createdAt, '${dateFormat}')`)
      .orderBy('date', 'ASC')
      .getRawMany();

    return result.map((r) => ({
      date: r.date,
      value: parseInt(r.value, 10),
    }));
  }

  private async getRevenueTrend(
    startDate: Date,
    endDate: Date,
    granularity: AnalyticsGranularity,
  ): Promise<TrendDataPoint[]> {
    const dateFormat = this.getDateFormat(granularity);

    const result = await this.paymentRepository
      .createQueryBuilder('payment')
      .select(`TO_CHAR(payment.paidAt, '${dateFormat}')`, 'date')
      .addSelect('SUM(payment.amount)', 'value')
      .where('payment.status = :status', { status: PaymentStatus.COMPLETED })
      .andWhere('payment.paidAt BETWEEN :start AND :end', {
        start: startDate,
        end: endDate,
      })
      .groupBy(`TO_CHAR(payment.paidAt, '${dateFormat}')`)
      .orderBy('date', 'ASC')
      .getRawMany();

    return result.map((r) => ({
      date: r.date,
      value: parseFloat(r.value || '0'),
    }));
  }

  private async getUserTrend(
    startDate: Date,
    endDate: Date,
    granularity: AnalyticsGranularity,
  ): Promise<TrendDataPoint[]> {
    const dateFormat = this.getDateFormat(granularity);

    const result = await this.userRepository
      .createQueryBuilder('user')
      .select(`TO_CHAR(user.createdAt, '${dateFormat}')`, 'date')
      .addSelect('COUNT(*)', 'value')
      .where('user.createdAt BETWEEN :start AND :end', {
        start: startDate,
        end: endDate,
      })
      .groupBy(`TO_CHAR(user.createdAt, '${dateFormat}')`)
      .orderBy('date', 'ASC')
      .getRawMany();

    return result.map((r) => ({
      date: r.date,
      value: parseInt(r.value, 10),
    }));
  }

  private async getCertificateTrend(
    startDate: Date,
    endDate: Date,
    granularity: AnalyticsGranularity,
  ): Promise<TrendDataPoint[]> {
    const dateFormat = this.getDateFormat(granularity);

    const result = await this.certificateRepository
      .createQueryBuilder('certificate')
      .select(`TO_CHAR(certificate.issuedAt, '${dateFormat}')`, 'date')
      .addSelect('COUNT(*)', 'value')
      .where('certificate.issuedAt BETWEEN :start AND :end', {
        start: startDate,
        end: endDate,
      })
      .groupBy(`TO_CHAR(certificate.issuedAt, '${dateFormat}')`)
      .orderBy('date', 'ASC')
      .getRawMany();

    return result.map((r) => ({
      date: r.date,
      value: parseInt(r.value, 10),
    }));
  }

  // ============================================
  // DISTRIBUCIÓN POR CATEGORÍA
  // ============================================

  /**
   * Obtener distribución de inscripciones por curso
   */
  async getCourseDistribution(): Promise<CategoryDistributionDto[]> {
    const result = await this.enrollmentRepository
      .createQueryBuilder('enrollment')
      .innerJoin('enrollment.cohort', 'cohort')
      .innerJoin('cohort.course', 'course')
      .select('course.id', 'courseId')
      .addSelect('course.title', 'name')
      .addSelect('COUNT(*)', 'count')
      .groupBy('course.id')
      .addGroupBy('course.title')
      .orderBy('count', 'DESC')
      .getRawMany();

    const total = result.reduce((sum, r) => sum + parseInt(r.count, 10), 0);
    const colors = [
      '#3B82F6',
      '#10B981',
      '#F59E0B',
      '#EF4444',
      '#8B5CF6',
      '#EC4899',
    ];

    return result.map((r, i) => ({
      name: r.name,
      count: parseInt(r.count, 10),
      percentage: Math.round((parseInt(r.count, 10) / total) * 1000) / 10,
      color: colors[i % colors.length],
    }));
  }

  // ============================================
  // ANALYTICS POR CURSO
  // ============================================

  /**
   * Obtener analytics de todos los cursos
   */
  async getCourseAnalytics(): Promise<CourseAnalyticsDto[]> {
    const courses = await this.courseRepository.find({
      where: { status: CourseStatus.PUBLISHED },
    });

    const analytics: CourseAnalyticsDto[] = [];

    for (const course of courses) {
      const enrollments = await this.enrollmentRepository
        .createQueryBuilder('enrollment')
        .innerJoin('enrollment.cohort', 'cohort')
        .where('cohort.courseId = :courseId', { courseId: course.id })
        .getMany();

      const active = enrollments.filter(
        (e) => e.status === EnrollmentStatus.ACTIVE,
      ).length;
      const completed = enrollments.filter(
        (e) => e.status === EnrollmentStatus.COMPLETED,
      ).length;
      const completionRate =
        enrollments.length > 0 ? (completed / enrollments.length) * 100 : 0;

      // Ingresos del curso (Payment no tiene relación directa con enrollment)
      // TODO: Implementar cuando se añada enrollmentId a Payment entity
      const revenueResult = { total: '0' };

      analytics.push({
        courseId: course.id,
        courseTitle: course.title,
        activeEnrollments: active,
        totalEnrollments: enrollments.length,
        completionRate: Math.round(completionRate * 10) / 10,
        revenue: parseFloat(revenueResult?.total || '0'),
        averageRating: null, // Se implementará con el módulo de reviews
      });
    }

    return analytics.sort((a, b) => b.totalEnrollments - a.totalEnrollments);
  }

  // ============================================
  // TOP PERFORMERS
  // ============================================

  /**
   * Obtener estudiantes destacados
   */
  async getTopPerformers(limit: number = 10): Promise<TopPerformerDto[]> {
    const result = await this.certificateRepository
      .createQueryBuilder('certificate')
      .innerJoin('certificate.student', 'student')
      .select('student.id', 'studentId')
      .addSelect('student.firstName', 'firstName')
      .addSelect('student.lastName', 'lastName')
      .addSelect('student.email', 'email')
      .addSelect('COUNT(certificate.id)', 'certificates_earned')
      .groupBy('student.id')
      .addGroupBy('student.firstName')
      .addGroupBy('student.lastName')
      .addGroupBy('student.email')
      .orderBy('"certificates_earned"', 'DESC')
      .limit(limit)
      .getRawMany();

    return result.map((r) => ({
      studentId: r.studentId,
      studentName: `${r.firstName} ${r.lastName}`,
      email: r.email,
      coursesCompleted: parseInt(r.certificates_earned, 10), // Aproximación
      certificatesEarned: parseInt(r.certificates_earned, 10),
      averageScore: 0, // Se calculará con más datos
    }));
  }

  // ============================================
  // HELPERS
  // ============================================

  /**
   * Obtener rango de fechas según el período
   */
  private getDateRange(query: AnalyticsQueryDto): {
    startDate: Date;
    endDate: Date;
  } {
    const now = new Date();
    let startDate: Date;
    let endDate: Date = new Date(now);

    switch (query.period) {
      case AnalyticsPeriod.TODAY:
        startDate = new Date(now.setHours(0, 0, 0, 0));
        endDate = new Date();
        break;

      case AnalyticsPeriod.YESTERDAY:
        startDate = new Date(now);
        startDate.setDate(startDate.getDate() - 1);
        startDate.setHours(0, 0, 0, 0);
        endDate = new Date(startDate);
        endDate.setHours(23, 59, 59, 999);
        break;

      case AnalyticsPeriod.LAST_7_DAYS:
        startDate = new Date(now);
        startDate.setDate(startDate.getDate() - 7);
        startDate.setHours(0, 0, 0, 0);
        break;

      case AnalyticsPeriod.LAST_30_DAYS:
        startDate = new Date(now);
        startDate.setDate(startDate.getDate() - 30);
        startDate.setHours(0, 0, 0, 0);
        break;

      case AnalyticsPeriod.THIS_MONTH:
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        break;

      case AnalyticsPeriod.LAST_MONTH:
        startDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        endDate = new Date(now.getFullYear(), now.getMonth(), 0);
        break;

      case AnalyticsPeriod.THIS_YEAR:
        startDate = new Date(now.getFullYear(), 0, 1);
        break;

      case AnalyticsPeriod.LAST_YEAR:
        startDate = new Date(now.getFullYear() - 1, 0, 1);
        endDate = new Date(now.getFullYear() - 1, 11, 31);
        break;

      case AnalyticsPeriod.CUSTOM:
        if (query.startDate && query.endDate) {
          startDate = new Date(query.startDate);
          endDate = new Date(query.endDate);
        } else {
          startDate = new Date(now);
          startDate.setDate(startDate.getDate() - 30);
        }
        break;

      case AnalyticsPeriod.ALL_TIME:
      default:
        startDate = new Date('2020-01-01');
        break;
    }

    return { startDate, endDate };
  }

  /**
   * Obtener rango del período anterior para comparación
   */
  private getPreviousPeriodRange(
    startDate: Date,
    endDate: Date,
  ): { startDate: Date; endDate: Date } {
    const duration = endDate.getTime() - startDate.getTime();

    const prevEndDate = new Date(startDate.getTime() - 1);
    const prevStartDate = new Date(prevEndDate.getTime() - duration);

    return { startDate: prevStartDate, endDate: prevEndDate };
  }

  /**
   * Crear métrica con cambio
   */
  private createMetric(
    value: number,
    previousValue?: number,
  ): MetricWithChange {
    const metric: MetricWithChange = { value };

    if (previousValue !== undefined) {
      metric.previousValue = previousValue;

      if (previousValue > 0) {
        metric.changePercent =
          Math.round(((value - previousValue) / previousValue) * 1000) / 10;
      } else if (value > 0) {
        metric.changePercent = 100;
      } else {
        metric.changePercent = 0;
      }

      if (metric.changePercent > 0) {
        metric.trend = 'up';
      } else if (metric.changePercent < 0) {
        metric.trend = 'down';
      } else {
        metric.trend = 'same';
      }
    }

    return metric;
  }

  /**
   * Obtener formato de fecha para SQL según granularidad
   */
  private getDateFormat(granularity: AnalyticsGranularity): string {
    switch (granularity) {
      case AnalyticsGranularity.HOURLY:
        return 'YYYY-MM-DD HH24:00';
      case AnalyticsGranularity.DAILY:
        return 'YYYY-MM-DD';
      case AnalyticsGranularity.WEEKLY:
        return 'IYYY-IW';
      case AnalyticsGranularity.MONTHLY:
        return 'YYYY-MM';
      default:
        return 'YYYY-MM-DD';
    }
  }
}
