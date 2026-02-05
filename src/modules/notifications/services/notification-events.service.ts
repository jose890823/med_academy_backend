import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { NotificationsService } from './notifications.service';
import {
  NotificationType,
  NotificationPriority,
} from '../entities/notification.entity';

/**
 * Servicio que escucha eventos del sistema y crea notificaciones automáticas
 */
@Injectable()
export class NotificationEventsService {
  private readonly logger = new Logger(NotificationEventsService.name);

  constructor(private readonly notificationsService: NotificationsService) {}

  // ============================================
  // EVENTOS DE INSCRIPCIONES
  // ============================================

  @OnEvent('enrollment.created')
  async handleEnrollmentCreated(payload: {
    enrollment: any;
    cohort: any;
    course: any;
  }): Promise<void> {
    this.logger.debug('Evento enrollment.created recibido');

    await this.notificationsService.create({
      userId: payload.enrollment.studentId,
      type: NotificationType.ENROLLMENT_CREATED,
      title: 'Inscripción registrada',
      message: `Tu inscripción al curso "${payload.course?.title || 'Curso'}" ha sido registrada. Completa el pago para activar tu acceso.`,
      actionUrl: `/my-enrollments/${payload.enrollment.id}`,
      actionText: 'Ver inscripción',
      referenceId: payload.enrollment.id,
      referenceType: 'enrollment',
    });
  }

  @OnEvent('enrollment.confirmed')
  async handleEnrollmentConfirmed(payload: {
    enrollment: any;
    cohort?: any;
    course?: any;
  }): Promise<void> {
    this.logger.debug('Evento enrollment.confirmed recibido');

    await this.notificationsService.create({
      userId: payload.enrollment.studentId,
      type: NotificationType.ENROLLMENT_CONFIRMED,
      title: '¡Inscripción confirmada!',
      message: `Tu inscripción ha sido confirmada. Ya puedes acceder al contenido del curso.`,
      priority: NotificationPriority.HIGH,
      actionUrl: `/courses/${payload.enrollment.cohortId}`,
      actionText: 'Comenzar curso',
      referenceId: payload.enrollment.id,
      referenceType: 'enrollment',
    });
  }

  // ============================================
  // EVENTOS DE PAGOS
  // ============================================

  @OnEvent('payment.completed')
  async handlePaymentCompleted(payload: {
    payment: any;
    user: any;
  }): Promise<void> {
    this.logger.debug('Evento payment.completed recibido');

    await this.notificationsService.create({
      userId: payload.payment.userId || payload.user?.id,
      type: NotificationType.PAYMENT_RECEIVED,
      title: 'Pago recibido',
      message: `Hemos recibido tu pago de $${payload.payment.amount}. Gracias por tu confianza.`,
      actionUrl: `/my-payments`,
      actionText: 'Ver pagos',
      referenceId: payload.payment.id,
      referenceType: 'payment',
    });
  }

  @OnEvent('payment.failed')
  async handlePaymentFailed(payload: {
    payment: any;
    reason?: string;
  }): Promise<void> {
    this.logger.debug('Evento payment.failed recibido');

    await this.notificationsService.create({
      userId: payload.payment.userId,
      type: NotificationType.PAYMENT_FAILED,
      title: 'Pago no procesado',
      message: `No pudimos procesar tu pago. ${payload.reason || 'Por favor, verifica tu método de pago e intenta nuevamente.'}`,
      priority: NotificationPriority.HIGH,
      actionUrl: `/my-payments`,
      actionText: 'Reintentar',
      referenceId: payload.payment.id,
      referenceType: 'payment',
    });
  }

  // ============================================
  // EVENTOS DE EVALUACIONES
  // ============================================

  @OnEvent('evaluation.graded')
  async handleEvaluationGraded(payload: {
    attempt: any;
    evaluation: any;
    score: number;
  }): Promise<void> {
    this.logger.debug('Evento evaluation.graded recibido');

    const passed = payload.score >= (payload.evaluation?.passingScore || 70);

    await this.notificationsService.create({
      userId: payload.attempt.userId,
      type: NotificationType.EVALUATION_GRADED,
      title: passed ? '¡Evaluación aprobada!' : 'Evaluación calificada',
      message: passed
        ? `Felicidades, obtuviste ${payload.score}% en "${payload.evaluation?.title || 'la evaluación'}".`
        : `Obtuviste ${payload.score}% en "${payload.evaluation?.title || 'la evaluación'}". Puedes intentar de nuevo.`,
      priority: passed ? NotificationPriority.HIGH : NotificationPriority.NORMAL,
      actionUrl: `/evaluations/${payload.attempt.evaluationId}/results`,
      actionText: 'Ver resultados',
      referenceId: payload.attempt.id,
      referenceType: 'evaluation_attempt',
      metadata: { score: payload.score, passed },
    });
  }

  // ============================================
  // EVENTOS DE CERTIFICADOS
  // ============================================

  @OnEvent('certificate.issued')
  async handleCertificateIssued(payload: {
    certificate: any;
    enrollment?: any;
  }): Promise<void> {
    this.logger.debug('Evento certificate.issued recibido');

    await this.notificationsService.create({
      userId: payload.certificate.studentId,
      type: NotificationType.CERTIFICATE_ISSUED,
      title: '¡Certificado emitido!',
      message: `Tu certificado para "${payload.certificate.programName}" está listo para descargar.`,
      priority: NotificationPriority.HIGH,
      actionUrl: `/certificates/${payload.certificate.id}`,
      actionText: 'Descargar certificado',
      referenceId: payload.certificate.id,
      referenceType: 'certificate',
    });
  }

  // ============================================
  // EVENTOS DE WORKSHOPS
  // ============================================

  @OnEvent('workshop.registration.created')
  async handleWorkshopRegistration(payload: {
    registration: any;
    session: any;
  }): Promise<void> {
    this.logger.debug('Evento workshop.registration.created recibido');

    await this.notificationsService.create({
      userId: payload.registration.userId,
      type: NotificationType.WORKSHOP_REGISTRATION,
      title: 'Inscripción a workshop confirmada',
      message: `Te has inscrito al workshop. Fecha: ${new Date(payload.session?.startDate).toLocaleDateString()}.`,
      actionUrl: `/my-workshops/${payload.registration.id}`,
      actionText: 'Ver detalles',
      referenceId: payload.registration.id,
      referenceType: 'workshop_registration',
    });
  }

  // ============================================
  // EVENTOS DE PROGRESO
  // ============================================

  @OnEvent('achievement.earned')
  async handleAchievementEarned(payload: {
    userId: string;
    achievement: any;
  }): Promise<void> {
    this.logger.debug('Evento achievement.earned recibido');

    await this.notificationsService.create({
      userId: payload.userId,
      type: NotificationType.ACHIEVEMENT_EARNED,
      title: '¡Nuevo logro desbloqueado!',
      message: `Has obtenido el logro "${payload.achievement.name}". ${payload.achievement.description || ''}`,
      priority: NotificationPriority.HIGH,
      actionUrl: `/my-achievements`,
      actionText: 'Ver logros',
      referenceId: payload.achievement.id,
      referenceType: 'achievement',
    });
  }

  @OnEvent('course.completed')
  async handleCourseCompleted(payload: {
    userId: string;
    course: any;
    enrollment: any;
  }): Promise<void> {
    this.logger.debug('Evento course.completed recibido');

    await this.notificationsService.create({
      userId: payload.userId,
      type: NotificationType.COURSE_COMPLETED,
      title: '¡Felicidades! Curso completado',
      message: `Has completado exitosamente el curso "${payload.course?.title || 'Curso'}". Tu certificado está siendo procesado.`,
      priority: NotificationPriority.HIGH,
      actionUrl: `/my-enrollments/${payload.enrollment?.id}`,
      actionText: 'Ver progreso',
      referenceId: payload.enrollment?.id,
      referenceType: 'enrollment',
    });
  }

  // ============================================
  // EVENTOS DE SEGURIDAD
  // ============================================

  @OnEvent('user.password.changed')
  async handlePasswordChanged(payload: {
    userId: string;
  }): Promise<void> {
    this.logger.debug('Evento user.password.changed recibido');

    await this.notificationsService.create({
      userId: payload.userId,
      type: NotificationType.PASSWORD_CHANGED,
      title: 'Contraseña actualizada',
      message: 'Tu contraseña ha sido cambiada exitosamente. Si no fuiste tú, contacta soporte inmediatamente.',
      priority: NotificationPriority.HIGH,
      actionUrl: `/support`,
      actionText: 'Contactar soporte',
    });
  }

  // ============================================
  // EVENTOS DE REFERIDOS
  // ============================================

  @OnEvent('referral.used')
  async handleReferralUsed(payload: {
    referral: any;
    referrer: any;
    referred: any;
  }): Promise<void> {
    this.logger.debug('Evento referral.used recibido');

    // Notificar al referidor
    await this.notificationsService.create({
      userId: payload.referrer.id,
      type: NotificationType.REFERRAL_USED,
      title: '¡Alguien usó tu código!',
      message: `${payload.referred.firstName} se registró usando tu código de referido. Recibirás tu recompensa cuando complete su inscripción.`,
      actionUrl: `/my-referrals`,
      actionText: 'Ver referidos',
      referenceId: payload.referral.id,
      referenceType: 'referral',
    });
  }

  @OnEvent('referral.reward')
  async handleReferralReward(payload: {
    referral: any;
    reward: any;
    user: any;
  }): Promise<void> {
    this.logger.debug('Evento referral.reward recibido');

    await this.notificationsService.create({
      userId: payload.user.id,
      type: NotificationType.REFERRAL_REWARD,
      title: '¡Recompensa de referido!',
      message: `Has recibido una recompensa por tu referido: ${payload.reward.description || 'Ver detalles en tu cuenta.'}`,
      priority: NotificationPriority.HIGH,
      actionUrl: `/my-referrals`,
      actionText: 'Ver recompensa',
      referenceId: payload.referral.id,
      referenceType: 'referral',
    });
  }
}
