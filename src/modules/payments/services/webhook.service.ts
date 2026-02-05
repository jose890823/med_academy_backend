import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { EventEmitter2 } from '@nestjs/event-emitter';
import Stripe from 'stripe';
import { StripeService } from '../stripe.service';
import {
  Subscription,
  SubscriptionStatus,
  InitialPaymentStatus,
} from '../entities/subscription.entity';
import {
  Payment,
  PaymentStatus,
  PaymentProvider,
} from '../entities/payment.entity';
import {
  Enrollment,
  EnrollmentStatus,
  PaymentStatus as EnrollmentPaymentStatus,
} from '../../enrollments/entities/enrollment.entity';
import { User } from '../../auth/entities/user.entity';

/**
 * Tipo de pago identificado por metadata
 */
type PaymentType = 'subscription' | 'enrollment' | 'unknown';

/**
 * Servicio dedicado al manejo de webhooks de Stripe
 *
 * Maneja eventos de:
 * - checkout.session.completed (subscripciones y pagos de cursos)
 * - payment_intent.succeeded / failed
 * - invoice.payment_succeeded / failed
 * - customer.subscription.updated / deleted
 */
@Injectable()
export class WebhookService {
  private readonly logger = new Logger(WebhookService.name);

  constructor(
    @InjectRepository(Subscription)
    private readonly subscriptionRepository: Repository<Subscription>,
    @InjectRepository(Payment)
    private readonly paymentRepository: Repository<Payment>,
    @InjectRepository(Enrollment)
    private readonly enrollmentRepository: Repository<Enrollment>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly stripeService: StripeService,
    private readonly configService: ConfigService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  /**
   * Verificar firma y construir evento de webhook
   */
  constructEvent(rawBody: Buffer, signature: string): Stripe.Event {
    const webhookSecret = this.configService.get<string>(
      'STRIPE_WEBHOOK_SECRET',
    );

    if (!webhookSecret) {
      throw new BadRequestException({
        code: 'WEBHOOK_SECRET_NOT_CONFIGURED',
        message: 'Stripe webhook secret no está configurado',
      });
    }

    try {
      return this.stripeService.constructWebhookEvent(
        rawBody,
        signature,
        webhookSecret,
      );
    } catch (error) {
      this.logger.error(
        `Webhook signature verification failed: ${error.message}`,
      );
      throw new BadRequestException({
        code: 'WEBHOOK_SIGNATURE_INVALID',
        message: `Verificación de firma fallida: ${error.message}`,
      });
    }
  }

  /**
   * Procesar evento de webhook
   */
  async handleEvent(
    event: Stripe.Event,
  ): Promise<{ received: boolean; processed: string }> {
    this.logger.log(`📨 Webhook recibido: ${event.type} (ID: ${event.id})`);

    try {
      switch (event.type) {
        // ============================================
        // CHECKOUT COMPLETADO
        // ============================================
        case 'checkout.session.completed':
          await this.handleCheckoutCompleted(event.data.object);
          break;

        // ============================================
        // PAYMENT INTENT
        // ============================================
        case 'payment_intent.succeeded':
          await this.handlePaymentIntentSucceeded(event.data.object);
          break;

        case 'payment_intent.payment_failed':
          await this.handlePaymentIntentFailed(event.data.object);
          break;

        // ============================================
        // INVOICE (PAGOS RECURRENTES)
        // ============================================
        case 'invoice.payment_succeeded':
          await this.handleInvoicePaymentSucceeded(event.data.object);
          break;

        case 'invoice.payment_failed':
          await this.handleInvoicePaymentFailed(event.data.object);
          break;

        // ============================================
        // SUBSCRIPTION
        // ============================================
        case 'customer.subscription.created':
          await this.handleSubscriptionCreated(event.data.object);
          break;

        case 'customer.subscription.updated':
          await this.handleSubscriptionUpdated(event.data.object);
          break;

        case 'customer.subscription.deleted':
          await this.handleSubscriptionDeleted(event.data.object);
          break;

        // ============================================
        // REFUNDS
        // ============================================
        case 'charge.refunded':
          await this.handleChargeRefunded(event.data.object);
          break;

        default:
          this.logger.log(`⚠️ Evento no manejado: ${event.type}`);
      }

      return { received: true, processed: event.type };
    } catch (error) {
      this.logger.error(
        `Error procesando webhook ${event.type}: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  // ============================================
  // CHECKOUT.SESSION.COMPLETED
  // ============================================

  /**
   * Manejar checkout completado - puede ser subscription o enrollment
   */
  private async handleCheckoutCompleted(
    session: Stripe.Checkout.Session,
  ): Promise<void> {
    this.logger.log(`✅ Checkout completado: ${session.id}`);

    const paymentType = this.identifyPaymentType(session.metadata);

    switch (paymentType) {
      case 'subscription':
        await this.processSubscriptionCheckout(session);
        break;
      case 'enrollment':
        await this.processEnrollmentCheckout(session);
        break;
      default:
        this.logger.warn(`Checkout sin tipo identificable: ${session.id}`);
        // Intentar procesar como subscription por compatibilidad
        if (session.metadata?.subscriptionId) {
          await this.processSubscriptionCheckout(session);
        }
    }
  }

  /**
   * Identificar tipo de pago por metadata
   */
  private identifyPaymentType(metadata?: Stripe.Metadata | null): PaymentType {
    if (!metadata) return 'unknown';

    if (metadata.enrollmentId) return 'enrollment';
    if (metadata.subscriptionId) return 'subscription';
    if (metadata.type === 'course_payment') return 'enrollment';
    if (metadata.type === 'subscription_payment') return 'subscription';

    return 'unknown';
  }

  /**
   * Procesar checkout de suscripción
   */
  private async processSubscriptionCheckout(
    session: Stripe.Checkout.Session,
  ): Promise<void> {
    const subscriptionId = session.metadata?.subscriptionId;
    if (!subscriptionId) {
      this.logger.warn('No subscription ID in checkout session metadata');
      return;
    }

    const subscription = await this.subscriptionRepository.findOne({
      where: { id: subscriptionId },
    });

    if (!subscription) {
      this.logger.warn(`Subscription not found: ${subscriptionId}`);
      return;
    }

    // Actualizar estado de suscripción
    subscription.initialPaymentStatus = InitialPaymentStatus.COMPLETED;
    subscription.status = SubscriptionStatus.ACTIVE;
    subscription.startDate = new Date();

    // Si es suscripción recurrente de Stripe, guardar el ID
    if (session.subscription) {
      subscription.stripeSubscriptionId = session.subscription as string;
    }

    // Calcular próxima fecha de cobro
    const nextBilling = new Date();
    nextBilling.setMonth(nextBilling.getMonth() + 1);
    subscription.nextBillingDate = nextBilling;

    // Guardar método de pago
    if (session.payment_intent) {
      try {
        const paymentIntent = await this.stripeService.retrievePaymentIntent(
          session.payment_intent as string,
        );
        if (paymentIntent.payment_method) {
          subscription.stripePaymentMethodId =
            paymentIntent.payment_method as string;
        }
      } catch (e) {
        this.logger.warn(
          'Could not retrieve payment intent for payment method',
        );
      }
    }

    await this.subscriptionRepository.save(subscription);

    // Crear registro de pago
    await this.createPaymentRecord({
      userId: subscription.userId,
      subscriptionId: subscription.id,
      amount: (session.amount_total || 0) / 100,
      currency: session.currency?.toUpperCase() || 'USD',
      transactionId: session.payment_intent as string,
      description: `Pago - ${subscription.planType}`,
      metadata: {
        checkoutSessionId: session.id,
        paymentType: 'subscription',
      },
    });

    // Emitir evento
    this.eventEmitter.emit('payment.subscription.completed', {
      subscriptionId: subscription.id,
      userId: subscription.userId,
      amount: (session.amount_total || 0) / 100,
    });

    this.logger.log(
      `💰 Suscripción ${subscriptionId} activada por checkout ${session.id}`,
    );
  }

  /**
   * Procesar checkout de inscripción a curso
   */
  private async processEnrollmentCheckout(
    session: Stripe.Checkout.Session,
  ): Promise<void> {
    const enrollmentId = session.metadata?.enrollmentId;
    if (!enrollmentId) {
      this.logger.warn('No enrollment ID in checkout session metadata');
      return;
    }

    const enrollment = await this.enrollmentRepository.findOne({
      where: { id: enrollmentId },
      relations: ['cohort', 'cohort.course'],
    });

    if (!enrollment) {
      this.logger.warn(`Enrollment not found: ${enrollmentId}`);
      return;
    }

    // Calcular monto pagado
    const amountPaid = (session.amount_total || 0) / 100;

    // Actualizar enrollment
    enrollment.totalPaid = Number(enrollment.totalPaid) + amountPaid;

    // Obtener precio del curso
    const coursePrice =
      enrollment.cohort?.customPrice ||
      enrollment.cohort?.course?.regularPrice ||
      0;
    const finalPrice =
      Number(coursePrice) - Number(enrollment.discountApplied || 0);

    // Actualizar estado de pago
    if (enrollment.totalPaid >= finalPrice) {
      enrollment.paymentStatus = EnrollmentPaymentStatus.COMPLETED;
    } else if (enrollment.totalPaid > 0) {
      enrollment.paymentStatus = EnrollmentPaymentStatus.PARTIAL;
    }

    // Activar inscripción si el pago está completo o parcial
    if (
      enrollment.paymentStatus === EnrollmentPaymentStatus.COMPLETED ||
      enrollment.paymentStatus === EnrollmentPaymentStatus.PARTIAL
    ) {
      enrollment.status = EnrollmentStatus.ACTIVE;
    }

    await this.enrollmentRepository.save(enrollment);

    // Crear registro de pago
    await this.createPaymentRecord({
      userId: enrollment.studentId,
      amount: amountPaid,
      currency: session.currency?.toUpperCase() || 'USD',
      transactionId: session.payment_intent as string,
      description: `Pago curso: ${enrollment.cohort?.course?.title || 'Curso'}`,
      metadata: {
        checkoutSessionId: session.id,
        enrollmentId,
        cohortId: enrollment.cohortId,
        courseId: enrollment.cohort?.courseId,
        paymentType: 'enrollment',
      },
    });

    // Emitir evento
    this.eventEmitter.emit('payment.enrollment.completed', {
      enrollmentId: enrollment.id,
      userId: enrollment.studentId,
      cohortId: enrollment.cohortId,
      courseId: enrollment.cohort?.courseId,
      amount: amountPaid,
    });

    this.logger.log(
      `💰 Inscripción ${enrollmentId} actualizada: $${amountPaid} pagado (total: $${enrollment.totalPaid})`,
    );
  }

  // ============================================
  // PAYMENT INTENT
  // ============================================

  /**
   * Manejar payment intent exitoso
   */
  private async handlePaymentIntentSucceeded(
    paymentIntent: Stripe.PaymentIntent,
  ): Promise<void> {
    this.logger.log(`✅ Payment intent succeeded: ${paymentIntent.id}`);
    // La mayoría del procesamiento se hace en checkout.session.completed
    // Este evento es útil para pagos directos sin checkout
  }

  /**
   * Manejar payment intent fallido
   */
  private async handlePaymentIntentFailed(
    paymentIntent: Stripe.PaymentIntent,
  ): Promise<void> {
    this.logger.log(`❌ Payment intent failed: ${paymentIntent.id}`);

    const paymentType = this.identifyPaymentType(paymentIntent.metadata);
    const errorMessage =
      paymentIntent.last_payment_error?.message || 'Pago fallido';

    if (paymentType === 'subscription') {
      const subscriptionId = paymentIntent.metadata?.subscriptionId;
      if (subscriptionId) {
        const subscription = await this.subscriptionRepository.findOne({
          where: { id: subscriptionId },
        });

        if (subscription) {
          subscription.initialPaymentStatus = InitialPaymentStatus.FAILED;
          await this.subscriptionRepository.save(subscription);

          this.eventEmitter.emit('payment.subscription.failed', {
            subscriptionId: subscription.id,
            userId: subscription.userId,
            error: errorMessage,
          });
        }
      }
    } else if (paymentType === 'enrollment') {
      const enrollmentId = paymentIntent.metadata?.enrollmentId;
      if (enrollmentId) {
        this.eventEmitter.emit('payment.enrollment.failed', {
          enrollmentId,
          error: errorMessage,
        });
      }
    }

    // Crear registro de pago fallido
    await this.createPaymentRecord({
      userId: paymentIntent.metadata?.userId || '',
      subscriptionId: paymentIntent.metadata?.subscriptionId,
      amount: (paymentIntent.amount || 0) / 100,
      currency: paymentIntent.currency?.toUpperCase() || 'USD',
      status: PaymentStatus.FAILED,
      transactionId: paymentIntent.id,
      description: `Pago fallido`,
      errorMessage,
      metadata: {
        paymentIntentId: paymentIntent.id,
        errorCode: paymentIntent.last_payment_error?.code,
        paymentType,
      },
    });
  }

  // ============================================
  // INVOICE (PAGOS RECURRENTES)
  // ============================================

  /**
   * Manejar invoice pagada exitosamente (pagos recurrentes)
   */
  private async handleInvoicePaymentSucceeded(
    invoice: Stripe.Invoice,
  ): Promise<void> {
    this.logger.log(`✅ Invoice payment succeeded: ${invoice.id}`);

    const stripeSubscriptionId = invoice.subscription as string;
    if (!stripeSubscriptionId) return;

    const subscription = await this.subscriptionRepository.findOne({
      where: { stripeSubscriptionId },
    });

    if (!subscription) return;

    // Actualizar próxima fecha de cobro
    if (invoice.lines?.data?.[0]?.period?.end) {
      subscription.nextBillingDate = new Date(
        invoice.lines.data[0].period.end * 1000,
      );
    }

    subscription.status = SubscriptionStatus.ACTIVE;
    await this.subscriptionRepository.save(subscription);

    // Crear registro de pago
    await this.createPaymentRecord({
      userId: subscription.userId,
      subscriptionId: subscription.id,
      amount: (invoice.amount_paid || 0) / 100,
      currency: invoice.currency?.toUpperCase() || 'USD',
      transactionId: invoice.payment_intent as string,
      description: `Pago mensual - ${subscription.planType}`,
      metadata: {
        invoiceId: invoice.id,
        stripeSubscriptionId,
        paymentType: 'recurring',
      },
    });

    // Emitir evento
    this.eventEmitter.emit('payment.recurring.completed', {
      subscriptionId: subscription.id,
      userId: subscription.userId,
      amount: (invoice.amount_paid || 0) / 100,
    });

    this.logger.log(
      `💰 Pago recurrente procesado para suscripción ${subscription.id}`,
    );
  }

  /**
   * Manejar invoice con pago fallido
   */
  private async handleInvoicePaymentFailed(
    invoice: Stripe.Invoice,
  ): Promise<void> {
    this.logger.log(`❌ Invoice payment failed: ${invoice.id}`);

    const stripeSubscriptionId = invoice.subscription as string;
    if (!stripeSubscriptionId) return;

    const subscription = await this.subscriptionRepository.findOne({
      where: { stripeSubscriptionId },
    });

    if (!subscription) return;

    subscription.status = SubscriptionStatus.PAST_DUE;
    await this.subscriptionRepository.save(subscription);

    // Emitir evento
    this.eventEmitter.emit('payment.recurring.failed', {
      subscriptionId: subscription.id,
      userId: subscription.userId,
      invoiceId: invoice.id,
    });

    this.logger.log(`⚠️ Suscripción ${subscription.id} marcada como PAST_DUE`);
  }

  // ============================================
  // SUBSCRIPTION EVENTS
  // ============================================

  /**
   * Manejar creación de suscripción en Stripe
   */
  private async handleSubscriptionCreated(
    stripeSubscription: Stripe.Subscription,
  ): Promise<void> {
    this.logger.log(
      `📝 Subscription created in Stripe: ${stripeSubscription.id}`,
    );
    // La suscripción local ya debería existir del checkout
    // Actualizar con el ID de Stripe si no se guardó antes

    const subscriptionId = stripeSubscription.metadata?.subscriptionId;
    if (!subscriptionId) return;

    const subscription = await this.subscriptionRepository.findOne({
      where: { id: subscriptionId },
    });

    if (subscription && !subscription.stripeSubscriptionId) {
      subscription.stripeSubscriptionId = stripeSubscription.id;
      await this.subscriptionRepository.save(subscription);
    }
  }

  /**
   * Manejar actualización de suscripción en Stripe
   */
  private async handleSubscriptionUpdated(
    stripeSubscription: Stripe.Subscription,
  ): Promise<void> {
    this.logger.log(`🔄 Subscription updated: ${stripeSubscription.id}`);

    const subscription = await this.subscriptionRepository.findOne({
      where: { stripeSubscriptionId: stripeSubscription.id },
    });

    if (!subscription) return;

    // Mapear estado de Stripe a estado local
    switch (stripeSubscription.status) {
      case 'active':
        subscription.status = SubscriptionStatus.ACTIVE;
        break;
      case 'past_due':
        subscription.status = SubscriptionStatus.PAST_DUE;
        break;
      case 'canceled':
        subscription.status = SubscriptionStatus.CANCELLED;
        subscription.cancelledAt = new Date();
        break;
      case 'unpaid':
        subscription.status = SubscriptionStatus.SUSPENDED;
        break;
      case 'trialing':
        // Stripe trialing se mapea a ACTIVE ya que no hay estado TRIAL local
        subscription.status = SubscriptionStatus.ACTIVE;
        break;
    }

    // Actualizar próxima fecha de cobro
    if (stripeSubscription.current_period_end) {
      subscription.nextBillingDate = new Date(
        stripeSubscription.current_period_end * 1000,
      );
    }

    await this.subscriptionRepository.save(subscription);

    // Emitir evento
    this.eventEmitter.emit('subscription.status.changed', {
      subscriptionId: subscription.id,
      userId: subscription.userId,
      oldStatus: subscription.status,
      newStatus: stripeSubscription.status,
    });
  }

  /**
   * Manejar eliminación de suscripción en Stripe
   */
  private async handleSubscriptionDeleted(
    stripeSubscription: Stripe.Subscription,
  ): Promise<void> {
    this.logger.log(`🗑️ Subscription deleted: ${stripeSubscription.id}`);

    const subscription = await this.subscriptionRepository.findOne({
      where: { stripeSubscriptionId: stripeSubscription.id },
    });

    if (!subscription) return;

    subscription.status = SubscriptionStatus.CANCELLED;
    subscription.cancelledAt = new Date();
    await this.subscriptionRepository.save(subscription);

    // Emitir evento
    this.eventEmitter.emit('subscription.cancelled', {
      subscriptionId: subscription.id,
      userId: subscription.userId,
    });
  }

  // ============================================
  // REFUNDS
  // ============================================

  /**
   * Manejar reembolso
   */
  private async handleChargeRefunded(charge: Stripe.Charge): Promise<void> {
    this.logger.log(`💸 Charge refunded: ${charge.id}`);

    const paymentIntentId = charge.payment_intent as string;
    if (!paymentIntentId) return;

    // Buscar el pago asociado
    const payment = await this.paymentRepository.findOne({
      where: { transactionId: paymentIntentId },
    });

    if (!payment) return;

    // Calcular monto reembolsado
    const refundedAmount = (charge.amount_refunded || 0) / 100;

    payment.refundedAmount = refundedAmount;
    payment.refundedAt = new Date();
    payment.status = charge.refunded
      ? PaymentStatus.REFUNDED
      : PaymentStatus.PARTIALLY_REFUNDED;

    await this.paymentRepository.save(payment);

    // Emitir evento
    this.eventEmitter.emit('payment.refunded', {
      paymentId: payment.id,
      userId: payment.userId,
      amount: refundedAmount,
      fullRefund: charge.refunded,
    });

    this.logger.log(
      `💸 Reembolso procesado: $${refundedAmount} para pago ${payment.id}`,
    );
  }

  // ============================================
  // HELPERS
  // ============================================

  /**
   * Crear registro de pago
   */
  private async createPaymentRecord(data: {
    userId: string;
    subscriptionId?: string;
    amount: number;
    currency: string;
    status?: PaymentStatus;
    transactionId: string;
    description: string;
    errorMessage?: string;
    metadata?: Record<string, any>;
  }): Promise<Payment> {
    const invoiceNumber = await this.generateInvoiceNumber();

    const payment = this.paymentRepository.create({
      userId: data.userId,
      subscriptionId: data.subscriptionId || null,
      amount: data.amount,
      currency: data.currency,
      status: data.status || PaymentStatus.COMPLETED,
      provider: PaymentProvider.STRIPE,
      transactionId: data.transactionId,
      invoiceNumber,
      description: data.description,
      paidAt: data.status !== PaymentStatus.FAILED ? new Date() : null,
      errorMessage: data.errorMessage || null,
      metadata: data.metadata || null,
    });

    return this.paymentRepository.save(payment);
  }

  /**
   * Generar número de factura único
   */
  private async generateInvoiceNumber(): Promise<string> {
    const year = new Date().getFullYear();
    const count = await this.paymentRepository.count();
    return `INV-${year}-${String(count + 1).padStart(6, '0')}`;
  }
}
