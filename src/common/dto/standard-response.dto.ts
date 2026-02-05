import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * ============================================
 * ESTRUCTURA ESTÁNDAR DE RESPUESTAS API
 * ============================================
 *
 * RESPUESTA EXITOSA:
 * {
 *   "success": true,
 *   "data": { ... },
 *   "message": "Operación exitosa",
 *   "timestamp": "2026-02-04T12:00:00.000Z",
 *   "path": "/api/v1/courses"
 * }
 *
 * RESPUESTA DE ERROR:
 * {
 *   "success": false,
 *   "error": {
 *     "code": "COURSE_NOT_FOUND",
 *     "message": "El curso no fue encontrado",
 *     "details": { ... }
 *   },
 *   "timestamp": "2026-02-04T12:00:00.000Z",
 *   "path": "/api/v1/courses/123"
 * }
 */

// ============================================
// RESPUESTA EXITOSA
// ============================================

export class SuccessResponseDto<T = any> {
  @ApiProperty({
    example: true,
    description: 'Indica que la operación fue exitosa',
    enum: [true],
  })
  success: true;

  @ApiProperty({
    description: 'Datos de la respuesta (puede ser objeto, array, o null)',
  })
  data: T;

  @ApiProperty({
    example: 'Operación realizada exitosamente',
    description: 'Mensaje descriptivo de la operación',
  })
  message: string;

  @ApiProperty({
    example: '2026-02-04T12:00:00.000Z',
    description: 'Timestamp ISO 8601 de la respuesta',
  })
  timestamp: string;

  @ApiProperty({
    example: '/api/v1/courses',
    description: 'Ruta de la petición',
  })
  path: string;
}

// ============================================
// RESPUESTA CON PAGINACIÓN
// ============================================

export class PaginationMetaDto {
  @ApiProperty({ example: 1, description: 'Página actual' })
  page: number;

  @ApiProperty({ example: 20, description: 'Elementos por página' })
  limit: number;

  @ApiProperty({ example: 150, description: 'Total de elementos' })
  total: number;

  @ApiProperty({ example: 8, description: 'Total de páginas' })
  totalPages: number;

  @ApiProperty({ example: true, description: 'Si hay página siguiente' })
  hasNextPage: boolean;

  @ApiProperty({ example: false, description: 'Si hay página anterior' })
  hasPrevPage: boolean;
}

export class CursorPaginationMetaDto {
  @ApiPropertyOptional({
    example: 'eyJpZCI6IjEyMyJ9',
    description: 'Cursor para la siguiente página (null si no hay más)',
  })
  nextCursor: string | null;

  @ApiProperty({ example: true, description: 'Si hay más elementos' })
  hasMore: boolean;
}

export class PaginatedResponseDto<T = any> {
  @ApiProperty({ example: true })
  success: true;

  @ApiProperty({ description: 'Array de elementos' })
  data: T[];

  @ApiProperty({ type: PaginationMetaDto })
  pagination: PaginationMetaDto;

  @ApiProperty({ example: 'Listado obtenido exitosamente' })
  message: string;

  @ApiProperty({ example: '2026-02-04T12:00:00.000Z' })
  timestamp: string;

  @ApiProperty({ example: '/api/v1/courses' })
  path: string;
}

// ============================================
// RESPUESTA DE ERROR
// ============================================

export class ErrorDetailDto {
  @ApiProperty({
    example: 'COURSE_NOT_FOUND',
    description: 'Código único del error (prefijo por dominio: AUTH_, USER_, COURSE_, etc.)',
  })
  code: string;

  @ApiProperty({
    example: 'El curso solicitado no fue encontrado',
    description: 'Mensaje descriptivo del error para el usuario',
  })
  message: string;

  @ApiPropertyOptional({
    description: 'Detalles adicionales del error (validación, contexto, etc.)',
    example: { field: 'email', reason: 'Formato inválido' },
  })
  details?: Record<string, any> | null;
}

export class ErrorResponseDto {
  @ApiProperty({
    example: false,
    description: 'Indica que la operación falló',
    enum: [false],
  })
  success: false;

  @ApiProperty({
    type: ErrorDetailDto,
    description: 'Información del error',
  })
  error: ErrorDetailDto;

  @ApiProperty({
    example: '2026-02-04T12:00:00.000Z',
    description: 'Timestamp ISO 8601 de la respuesta',
  })
  timestamp: string;

  @ApiProperty({
    example: '/api/v1/courses/123',
    description: 'Ruta de la petición que falló',
  })
  path: string;
}

// ============================================
// CÓDIGOS DE ERROR POR DOMINIO
// ============================================

/**
 * Códigos de error estandarizados por dominio.
 * Usar estos códigos en lugar de strings arbitrarios.
 */
export const ErrorCodes = {
  // Errores generales
  INTERNAL_SERVER_ERROR: 'INTERNAL_SERVER_ERROR',
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  NOT_FOUND: 'NOT_FOUND',
  FORBIDDEN: 'FORBIDDEN',
  RATE_LIMITED: 'RATE_LIMITED',

  // AUTH - Autenticación
  AUTH_INVALID_CREDENTIALS: 'AUTH_INVALID_CREDENTIALS',
  AUTH_TOKEN_EXPIRED: 'AUTH_TOKEN_EXPIRED',
  AUTH_TOKEN_INVALID: 'AUTH_TOKEN_INVALID',
  AUTH_EMAIL_NOT_VERIFIED: 'AUTH_EMAIL_NOT_VERIFIED',
  AUTH_ACCOUNT_INACTIVE: 'AUTH_ACCOUNT_INACTIVE',
  AUTH_ACCOUNT_LOCKED: 'AUTH_ACCOUNT_LOCKED',
  AUTH_IP_BLOCKED: 'AUTH_IP_BLOCKED',
  AUTH_RATE_LIMITED: 'AUTH_RATE_LIMITED',
  AUTH_OTP_EXPIRED: 'AUTH_OTP_EXPIRED',
  AUTH_OTP_INVALID: 'AUTH_OTP_INVALID',
  AUTH_OTP_MAX_ATTEMPTS: 'AUTH_OTP_MAX_ATTEMPTS',
  AUTH_SESSION_NOT_FOUND: 'AUTH_SESSION_NOT_FOUND',
  AUTH_REFRESH_TOKEN_INVALID: 'AUTH_REFRESH_TOKEN_INVALID',

  // USER - Usuarios
  USER_NOT_FOUND: 'USER_NOT_FOUND',
  USER_ALREADY_EXISTS: 'USER_ALREADY_EXISTS',
  USER_EMAIL_TAKEN: 'USER_EMAIL_TAKEN',
  USER_INACTIVE: 'USER_INACTIVE',

  // COURSE - Cursos
  COURSE_NOT_FOUND: 'COURSE_NOT_FOUND',
  COURSE_NOT_ACTIVE: 'COURSE_NOT_ACTIVE',
  COURSE_FULL: 'COURSE_FULL',

  // COHORT - Convocatorias
  COHORT_NOT_FOUND: 'COHORT_NOT_FOUND',
  COHORT_CLOSED: 'COHORT_CLOSED',
  COHORT_FULL: 'COHORT_FULL',

  // CLASSROOM - Aulas
  CLASSROOM_NOT_FOUND: 'CLASSROOM_NOT_FOUND',
  CLASSROOM_FULL: 'CLASSROOM_FULL',

  // ENROLL - Inscripciones
  ENROLL_NOT_FOUND: 'ENROLL_NOT_FOUND',
  ENROLL_ALREADY_EXISTS: 'ENROLL_ALREADY_EXISTS',
  ENROLL_EXPIRED: 'ENROLL_EXPIRED',
  ENROLL_PAYMENT_PENDING: 'ENROLL_PAYMENT_PENDING',

  // PAYMENT - Pagos
  PAYMENT_NOT_FOUND: 'PAYMENT_NOT_FOUND',
  PAYMENT_REQUIRED: 'PAYMENT_REQUIRED',
  PAYMENT_FAILED: 'PAYMENT_FAILED',
  PAYMENT_CARD_DECLINED: 'PAYMENT_CARD_DECLINED',
  PAYMENT_INSUFFICIENT_FUNDS: 'PAYMENT_INSUFFICIENT_FUNDS',
  PAYMENT_ALREADY_PROCESSED: 'PAYMENT_ALREADY_PROCESSED',

  // EVAL - Evaluaciones
  EVAL_NOT_FOUND: 'EVAL_NOT_FOUND',
  EVAL_ALREADY_SUBMITTED: 'EVAL_ALREADY_SUBMITTED',
  EVAL_TIME_EXPIRED: 'EVAL_TIME_EXPIRED',
  EVAL_NOT_AVAILABLE: 'EVAL_NOT_AVAILABLE',

  // REFERRAL - Referidos
  REFERRAL_CODE_INVALID: 'REFERRAL_CODE_INVALID',
  REFERRAL_SELF_REFERRAL: 'REFERRAL_SELF_REFERRAL',
  REFERRAL_ALREADY_USED: 'REFERRAL_ALREADY_USED',

  // PROGRESS - Progreso
  PROGRESS_NOT_FOUND: 'PROGRESS_NOT_FOUND',
  PROGRESS_ALREADY_COMPLETED: 'PROGRESS_ALREADY_COMPLETED',

  // ACHIEVEMENT - Logros
  ACHIEVEMENT_NOT_FOUND: 'ACHIEVEMENT_NOT_FOUND',
  ACHIEVEMENT_ALREADY_EARNED: 'ACHIEVEMENT_ALREADY_EARNED',

  // WORKSHOP - Talleres
  WORKSHOP_NOT_FOUND: 'WORKSHOP_NOT_FOUND',
  WORKSHOP_NOT_ACTIVE: 'WORKSHOP_NOT_ACTIVE',

  // SESSION - Sesiones de talleres
  SESSION_NOT_FOUND: 'SESSION_NOT_FOUND',
  SESSION_FULL: 'SESSION_FULL',
  SESSION_CLOSED: 'SESSION_CLOSED',

  // REGISTRATION - Inscripciones a talleres
  REGISTRATION_NOT_FOUND: 'REGISTRATION_NOT_FOUND',
  REGISTRATION_EXISTS: 'REGISTRATION_EXISTS',
  REGISTRATION_CLOSED: 'REGISTRATION_CLOSED',
  REGISTRATION_CANCELLED: 'REGISTRATION_CANCELLED',

  // CERTIFICATE - Certificados
  CERTIFICATE_NOT_FOUND: 'CERTIFICATE_NOT_FOUND',
  CERTIFICATE_ALREADY_EXISTS: 'CERTIFICATE_ALREADY_EXISTS',
  CERTIFICATE_ALREADY_REVOKED: 'CERTIFICATE_ALREADY_REVOKED',
  CERTIFICATE_EXPIRED: 'CERTIFICATE_EXPIRED',
  CERTIFICATE_INVALID: 'CERTIFICATE_INVALID',

  // NOTIFICATION - Notificaciones
  NOTIFICATION_NOT_FOUND: 'NOTIFICATION_NOT_FOUND',
  NOTIFICATION_ALREADY_READ: 'NOTIFICATION_ALREADY_READ',
  NOTIFICATION_SEND_FAILED: 'NOTIFICATION_SEND_FAILED',

  // MATERIAL - Materiales
  MATERIAL_NOT_FOUND: 'MATERIAL_NOT_FOUND',
  MATERIAL_ACCESS_DENIED: 'MATERIAL_ACCESS_DENIED',
  MATERIAL_NOT_DOWNLOADABLE: 'MATERIAL_NOT_DOWNLOADABLE',
} as const;

export type ErrorCode = (typeof ErrorCodes)[keyof typeof ErrorCodes];

// ============================================
// TIPOS PARA TYPESCRIPT
// ============================================

/**
 * Tipo genérico para respuestas exitosas
 */
export interface ApiSuccessResponse<T = any> {
  success: true;
  data: T;
  message: string;
  timestamp: string;
  path: string;
}

/**
 * Tipo genérico para respuestas de error
 */
export interface ApiErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    details?: Record<string, any> | null;
  };
  timestamp: string;
  path: string;
}

/**
 * Tipo genérico para respuestas paginadas
 */
export interface ApiPaginatedResponse<T = any> {
  success: true;
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
  };
  message: string;
  timestamp: string;
  path: string;
}

/**
 * Tipo union para cualquier respuesta API
 */
export type ApiResponse<T = any> = ApiSuccessResponse<T> | ApiErrorResponse;

// ============================================
// HELPERS PARA CREAR RESPUESTAS (uso en services/controllers)
// ============================================

/**
 * Helper para crear respuesta exitosa (usar en servicios si es necesario)
 */
export function createSuccessResponse<T>(
  data: T,
  message: string,
  path: string,
): ApiSuccessResponse<T> {
  return {
    success: true,
    data,
    message,
    timestamp: new Date().toISOString(),
    path,
  };
}

/**
 * Helper para crear respuesta de error (usar en filtros de excepción)
 */
export function createErrorResponse(
  code: string,
  message: string,
  path: string,
  details?: Record<string, any> | null,
): ApiErrorResponse {
  return {
    success: false,
    error: {
      code,
      message,
      details: details || null,
    },
    timestamp: new Date().toISOString(),
    path,
  };
}

// ============================================
// DEPRECATED - Mantener por compatibilidad
// ============================================

/** @deprecated Usar SuccessResponseDto en su lugar */
export class StandardResponseDto<T = any> extends SuccessResponseDto<T> {}

/** @deprecated Usar ErrorDetailDto en su lugar */
export class ErrorDetailsDto extends ErrorDetailDto {}
