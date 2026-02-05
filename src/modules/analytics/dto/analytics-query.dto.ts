import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsUUID, IsEnum, IsDateString } from 'class-validator';

/**
 * Período de tiempo para reportes
 */
export enum AnalyticsPeriod {
  TODAY = 'today',
  YESTERDAY = 'yesterday',
  LAST_7_DAYS = 'last_7_days',
  LAST_30_DAYS = 'last_30_days',
  THIS_MONTH = 'this_month',
  LAST_MONTH = 'last_month',
  THIS_YEAR = 'this_year',
  LAST_YEAR = 'last_year',
  CUSTOM = 'custom',
  ALL_TIME = 'all_time',
}

/**
 * Granularidad para datos de tendencia
 */
export enum AnalyticsGranularity {
  HOURLY = 'hourly',
  DAILY = 'daily',
  WEEKLY = 'weekly',
  MONTHLY = 'monthly',
}

/**
 * DTO para consultas de analytics
 */
export class AnalyticsQueryDto {
  @ApiPropertyOptional({
    example: 'last_30_days',
    description: 'Período de tiempo',
    enum: AnalyticsPeriod,
    default: AnalyticsPeriod.LAST_30_DAYS,
  })
  @IsOptional()
  @IsEnum(AnalyticsPeriod)
  period?: AnalyticsPeriod = AnalyticsPeriod.LAST_30_DAYS;

  @ApiPropertyOptional({
    example: '2026-01-01',
    description: 'Fecha de inicio (solo para período CUSTOM)',
  })
  @IsOptional()
  @IsDateString(
    {},
    { message: 'startDate debe ser una fecha válida (YYYY-MM-DD)' },
  )
  startDate?: string;

  @ApiPropertyOptional({
    example: '2026-01-31',
    description: 'Fecha de fin (solo para período CUSTOM)',
  })
  @IsOptional()
  @IsDateString(
    {},
    { message: 'endDate debe ser una fecha válida (YYYY-MM-DD)' },
  )
  endDate?: string;

  @ApiPropertyOptional({
    example: 'daily',
    description: 'Granularidad para datos de tendencia',
    enum: AnalyticsGranularity,
    default: AnalyticsGranularity.DAILY,
  })
  @IsOptional()
  @IsEnum(AnalyticsGranularity)
  granularity?: AnalyticsGranularity = AnalyticsGranularity.DAILY;

  @ApiPropertyOptional({
    example: '550e8400-e29b-41d4-a716-446655440000',
    description: 'Filtrar por curso específico',
  })
  @IsOptional()
  @IsUUID('4', { message: 'courseId debe ser un UUID válido' })
  courseId?: string;

  @ApiPropertyOptional({
    example: '550e8400-e29b-41d4-a716-446655440000',
    description: 'Filtrar por convocatoria específica',
  })
  @IsOptional()
  @IsUUID('4', { message: 'cohortId debe ser un UUID válido' })
  cohortId?: string;
}

/**
 * DTO para exportación de reportes
 */
export class ExportReportDto {
  @ApiPropertyOptional({
    example: 'last_30_days',
    description: 'Período de tiempo',
    enum: AnalyticsPeriod,
  })
  @IsOptional()
  @IsEnum(AnalyticsPeriod)
  period?: AnalyticsPeriod = AnalyticsPeriod.LAST_30_DAYS;

  @ApiPropertyOptional({
    example: '2026-01-01',
    description: 'Fecha de inicio',
  })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional({
    example: '2026-01-31',
    description: 'Fecha de fin',
  })
  @IsOptional()
  @IsDateString()
  endDate?: string;
}
