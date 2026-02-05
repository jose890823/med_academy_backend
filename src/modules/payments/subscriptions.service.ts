import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';
import Stripe from 'stripe';
import {
  Subscription,
  SubscriptionPlan,
  SubscriptionStatus,
  InitialPaymentType,
  InitialPaymentStatus,
  PaymentMethod,
} from './entities/subscription.entity';
import { Payment, PaymentStatus, PaymentProvider } from './entities/payment.entity';
import { StripeService } from './stripe.service';
import { User } from '../auth/entities/user.entity';
import { CreateCheckoutSessionDto, CancelSubscriptionDto } from './dto';

@Injectable()
export class SubscriptionsService {
  private readonly logger = new Logger(SubscriptionsService.name);

  constructor(
    @InjectRepository(Subscription)
    private readonly subscriptionRepository: Repository<Subscription>,
    @InjectRepository(Payment)
    private readonly paymentRepository: Repository<Payment>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly stripeService: StripeService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  /**
   * Create a Stripe Checkout Session for subscription
   */
  async createCheckoutSession(dto: CreateCheckoutSessionDto): Promise<{
    sessionId: string;
    sessionUrl: string;
    subscription: Subscription;
  }> {
    this.logger.log(`Creating checkout session for user ${dto.userId}`);

    // Get user
    const user = await this.userRepository.findOne({
      where: { id: dto.userId },
    });

    if (!user) {
      throw new NotFoundException('Usuario no encontrado');
    }

    // Check if Stripe is available
    if (!this.stripeService.isAvailable()) {
      throw new BadRequestException('Stripe no está configurado');
    }

    // Create or get Stripe customer
    let stripeCustomerId = user.stripeCustomerId;
    if (!stripeCustomerId) {
      const customer = await this.stripeService.createCustomer({
        email: user.email,
        name: `${user.firstName} ${user.lastName}`,
        metadata: { userId: user.id },
      });
      stripeCustomerId = customer.id;

      // Update user with Stripe customer ID
      await this.userRepository.update(user.id, { stripeCustomerId });
    }

    // Default pricing (can be customized)
    const monthlyPrice = dto.monthlyPrice || 24.0;
    const initialPayment = dto.initialPaymentAmount || 199.0;

    // Create subscription record (pending payment)
    const subscription = this.subscriptionRepository.create({
      userId: dto.userId,
      planType: dto.planType || SubscriptionPlan.FREE,
      status: SubscriptionStatus.PENDING_PAYMENT,
      monthlyPrice,
      initialPaymentType: dto.initialPaymentType || InitialPaymentType.SINGLE,
      initialPaymentAmount: initialPayment,
      initialPaymentStatus: InitialPaymentStatus.PENDING,
      stripeCustomerId,
      paymentMethod: PaymentMethod.STRIPE,
      currency: 'USD',
      metadata: dto.metadata,
    });

    const savedSubscription = await this.subscriptionRepository.save(subscription);

    // Build line items for Stripe Checkout
    const lineItems: Stripe.Checkout.SessionCreateParams.LineItem[] = [];

    // Add initial payment
    lineItems.push({
      price_data: {
        currency: 'usd',
        product_data: {
          name: `EchoMedDx - Pago Inicial`,
          description: `Pago inicial para servicios de salud`,
        },
        unit_amount: Math.round(initialPayment * 100),
      },
      quantity: 1,
    });

    // Create Checkout Session
    const session = await this.stripeService.createCheckoutSession({
      customer: stripeCustomerId,
      mode: 'payment',
      line_items: lineItems,
      success_url: `${dto.successUrl}?session_id={CHECKOUT_SESSION_ID}&subscription_id=${savedSubscription.id}`,
      cancel_url: `${dto.cancelUrl}?subscription_id=${savedSubscription.id}`,
      metadata: {
        subscriptionId: savedSubscription.id,
        userId: dto.userId,
        planType: dto.planType || '',
        initialPaymentType: dto.initialPaymentType || '',
        ...dto.metadata,
      },
      payment_intent_data: {
        metadata: {
          subscriptionId: savedSubscription.id,
          userId: dto.userId,
          type: 'initial_payment',
        },
      },
      customer_update: {
        address: 'auto',
      },
      billing_address_collection: 'required',
    });

    // Update subscription with checkout session ID
    savedSubscription.stripeCheckoutSessionId = session.id;
    await this.subscriptionRepository.save(savedSubscription);

    this.logger.log(`Checkout session created: ${session.id}`);

    return {
      sessionId: session.id,
      sessionUrl: session.url!,
      subscription: savedSubscription,
    };
  }

  /**
   * Handle Stripe webhook events
   */
  async handleWebhook(event: Stripe.Event): Promise<void> {
    this.logger.log(`Processing webhook event: ${event.type}`);

    switch (event.type) {
      case 'checkout.session.completed':
        await this.handleCheckoutCompleted(event.data.object as Stripe.Checkout.Session);
        break;

      case 'payment_intent.succeeded':
        await this.handlePaymentSucceeded(event.data.object as Stripe.PaymentIntent);
        break;

      case 'payment_intent.payment_failed':
        await this.handlePaymentFailed(event.data.object as Stripe.PaymentIntent);
        break;

      case 'invoice.payment_succeeded':
        await this.handleInvoicePaymentSucceeded(event.data.object as Stripe.Invoice);
        break;

      case 'invoice.payment_failed':
        await this.handleInvoicePaymentFailed(event.data.object as Stripe.Invoice);
        break;

      case 'customer.subscription.updated':
        await this.handleSubscriptionUpdated(event.data.object as Stripe.Subscription);
        break;

      case 'customer.subscription.deleted':
        await this.handleSubscriptionDeleted(event.data.object as Stripe.Subscription);
        break;

      default:
        this.logger.log(`Unhandled event type: ${event.type}`);
    }
  }

  /**
   * Handle checkout.session.completed
   */
  private async handleCheckoutCompleted(session: Stripe.Checkout.Session): Promise<void> {
    this.logger.log(`Checkout completed: ${session.id}`);

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

    // Update subscription status
    subscription.initialPaymentStatus = InitialPaymentStatus.COMPLETED;
    subscription.status = SubscriptionStatus.ACTIVE;
    subscription.startDate = new Date();

    // Calculate next billing date (1 month from now)
    const nextBilling = new Date();
    nextBilling.setMonth(nextBilling.getMonth() + 1);
    subscription.nextBillingDate = nextBilling;

    // Save payment method if available
    if (session.payment_intent) {
      const paymentIntent = await this.stripeService.retrievePaymentIntent(
        session.payment_intent as string,
      );
      if (paymentIntent.payment_method) {
        subscription.stripePaymentMethodId = paymentIntent.payment_method as string;
      }
    }

    await this.subscriptionRepository.save(subscription);

    // Create payment record
    await this.createPaymentRecord(subscription, session);

    // Emit event
    this.eventEmitter.emit('subscription.payment.completed', {
      subscriptionId: subscription.id,
      userId: subscription.userId,
    });
  }

  /**
   * Handle payment_intent.succeeded
   */
  private async handlePaymentSucceeded(paymentIntent: Stripe.PaymentIntent): Promise<void> {
    this.logger.log(`Payment succeeded: ${paymentIntent.id}`);
    // Payment handling is mostly done in checkout.session.completed
  }

  /**
   * Handle payment_intent.payment_failed
   */
  private async handlePaymentFailed(paymentIntent: Stripe.PaymentIntent): Promise<void> {
    this.logger.log(`Payment failed: ${paymentIntent.id}`);

    const subscriptionId = paymentIntent.metadata?.subscriptionId;
    if (!subscriptionId) {
      return;
    }

    const subscription = await this.subscriptionRepository.findOne({
      where: { id: subscriptionId },
    });

    if (subscription) {
      subscription.initialPaymentStatus = InitialPaymentStatus.FAILED;
      await this.subscriptionRepository.save(subscription);

      // Create failed payment record
      await this.createFailedPaymentRecord(subscription, paymentIntent);

      // Emit event
      this.eventEmitter.emit('subscription.payment.failed', {
        subscriptionId: subscription.id,
        userId: subscription.userId,
        error: paymentIntent.last_payment_error?.message,
      });
    }
  }

  /**
   * Handle invoice.payment_succeeded (for recurring payments)
   */
  private async handleInvoicePaymentSucceeded(invoice: Stripe.Invoice): Promise<void> {
    this.logger.log(`Invoice payment succeeded: ${invoice.id}`);

    const subscriptionId = (invoice as any).subscription;
    if (!subscriptionId) {
      return;
    }

    const stripeSubId = typeof subscriptionId === 'string' ? subscriptionId : subscriptionId.id;
    const subscription = await this.subscriptionRepository.findOne({
      where: { stripeSubscriptionId: stripeSubId },
    });

    if (subscription) {
      if (invoice.lines?.data?.[0]?.period?.end) {
        subscription.nextBillingDate = new Date(invoice.lines.data[0].period.end * 1000);
      }
      subscription.status = SubscriptionStatus.ACTIVE;
      await this.subscriptionRepository.save(subscription);
    }
  }

  /**
   * Handle invoice.payment_failed
   */
  private async handleInvoicePaymentFailed(invoice: Stripe.Invoice): Promise<void> {
    this.logger.log(`Invoice payment failed: ${invoice.id}`);

    const subscriptionId = (invoice as any).subscription;
    if (!subscriptionId) {
      return;
    }

    const stripeSubId = typeof subscriptionId === 'string' ? subscriptionId : subscriptionId.id;
    const subscription = await this.subscriptionRepository.findOne({
      where: { stripeSubscriptionId: stripeSubId },
    });

    if (subscription) {
      subscription.status = SubscriptionStatus.PAST_DUE;
      await this.subscriptionRepository.save(subscription);

      this.eventEmitter.emit('subscription.payment.failed', {
        subscriptionId: subscription.id,
        userId: subscription.userId,
      });
    }
  }

  /**
   * Handle customer.subscription.updated
   */
  private async handleSubscriptionUpdated(stripeSubscription: Stripe.Subscription): Promise<void> {
    this.logger.log(`Subscription updated: ${stripeSubscription.id}`);

    const subscription = await this.subscriptionRepository.findOne({
      where: { stripeSubscriptionId: stripeSubscription.id },
    });

    if (!subscription) {
      return;
    }

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
    }

    const periodEnd = (stripeSubscription as any).current_period_end;
    if (periodEnd) {
      subscription.nextBillingDate = new Date(periodEnd * 1000);
    }

    await this.subscriptionRepository.save(subscription);
  }

  /**
   * Handle customer.subscription.deleted
   */
  private async handleSubscriptionDeleted(stripeSubscription: Stripe.Subscription): Promise<void> {
    this.logger.log(`Subscription deleted: ${stripeSubscription.id}`);

    const subscription = await this.subscriptionRepository.findOne({
      where: { stripeSubscriptionId: stripeSubscription.id },
    });

    if (subscription) {
      subscription.status = SubscriptionStatus.CANCELLED;
      subscription.cancelledAt = new Date();
      await this.subscriptionRepository.save(subscription);
    }
  }

  /**
   * Create a payment record
   */
  private async createPaymentRecord(
    subscription: Subscription,
    session: Stripe.Checkout.Session,
  ): Promise<Payment> {
    const invoiceNumber = await this.generateInvoiceNumber();

    const payment = this.paymentRepository.create({
      userId: subscription.userId,
      subscriptionId: subscription.id,
      amount: (session.amount_total || 0) / 100,
      currency: session.currency?.toUpperCase() || 'USD',
      status: PaymentStatus.COMPLETED,
      provider: PaymentProvider.STRIPE,
      transactionId: session.payment_intent as string,
      invoiceNumber,
      description: `Pago inicial - ${subscription.planType}`,
      paidAt: new Date(),
      metadata: {
        checkoutSessionId: session.id,
        paymentType: subscription.initialPaymentType,
      },
    });

    return this.paymentRepository.save(payment);
  }

  /**
   * Create a failed payment record
   */
  private async createFailedPaymentRecord(
    subscription: Subscription,
    paymentIntent: Stripe.PaymentIntent,
  ): Promise<Payment> {
    const invoiceNumber = await this.generateInvoiceNumber();

    const payment = this.paymentRepository.create({
      userId: subscription.userId,
      subscriptionId: subscription.id,
      amount: (paymentIntent.amount || 0) / 100,
      currency: paymentIntent.currency?.toUpperCase() || 'USD',
      status: PaymentStatus.FAILED,
      provider: PaymentProvider.STRIPE,
      transactionId: paymentIntent.id,
      invoiceNumber,
      description: `Pago fallido - ${subscription.planType}`,
      errorMessage: paymentIntent.last_payment_error?.message,
      metadata: {
        paymentIntentId: paymentIntent.id,
        errorCode: paymentIntent.last_payment_error?.code,
      },
    });

    return this.paymentRepository.save(payment);
  }

  /**
   * Generate unique invoice number
   */
  private async generateInvoiceNumber(): Promise<string> {
    const year = new Date().getFullYear();
    const count = await this.paymentRepository.count();
    return `INV-${year}-${String(count + 1).padStart(5, '0')}`;
  }

  /**
   * Get subscription by ID
   */
  async findById(id: string): Promise<Subscription> {
    const subscription = await this.subscriptionRepository.findOne({
      where: { id },
      relations: ['user', 'payments'],
    });

    if (!subscription) {
      throw new NotFoundException('Suscripción no encontrada');
    }

    return subscription;
  }

  /**
   * Get subscription by user ID
   */
  async findByUserId(userId: string): Promise<Subscription | null> {
    return this.subscriptionRepository.findOne({
      where: { userId },
      order: { createdAt: 'DESC' },
    });
  }

  /**
   * Get active subscription by user ID
   */
  async findActiveByUserId(userId: string): Promise<Subscription | null> {
    return this.subscriptionRepository.findOne({
      where: {
        userId,
        status: SubscriptionStatus.ACTIVE,
      },
    });
  }

  /**
   * Get all subscriptions (admin)
   */
  async findAll(options?: {
    status?: SubscriptionStatus;
    planType?: SubscriptionPlan;
    page?: number;
    limit?: number;
  }): Promise<{ subscriptions: Subscription[]; total: number }> {
    const page = options?.page || 1;
    const limit = options?.limit || 20;

    const queryBuilder = this.subscriptionRepository
      .createQueryBuilder('subscription')
      .leftJoinAndSelect('subscription.user', 'user')
      .orderBy('subscription.createdAt', 'DESC');

    if (options?.status) {
      queryBuilder.andWhere('subscription.status = :status', { status: options.status });
    }

    if (options?.planType) {
      queryBuilder.andWhere('subscription.planType = :planType', { planType: options.planType });
    }

    const [subscriptions, total] = await queryBuilder
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();

    return { subscriptions, total };
  }

  /**
   * Cancel subscription
   */
  async cancel(id: string, dto: CancelSubscriptionDto): Promise<Subscription> {
    const subscription = await this.findById(id);

    if (subscription.status === SubscriptionStatus.CANCELLED) {
      throw new BadRequestException('La suscripción ya está cancelada');
    }

    // Cancel in Stripe if exists
    if (subscription.stripeSubscriptionId && this.stripeService.isAvailable()) {
      await this.stripeService.cancelSubscription(
        subscription.stripeSubscriptionId,
        { cancelAtPeriodEnd: dto.cancelAtPeriodEnd },
      );
    }

    subscription.cancellationReason = dto.reason;

    if (dto.cancelAtPeriodEnd) {
      subscription.expiresAt = subscription.nextBillingDate;
    } else {
      subscription.status = SubscriptionStatus.CANCELLED;
      subscription.cancelledAt = new Date();
    }

    if (dto.feedback) {
      subscription.metadata = {
        ...subscription.metadata,
        cancellationFeedback: dto.feedback,
      };
    }

    await this.subscriptionRepository.save(subscription);

    this.eventEmitter.emit('subscription.cancelled', {
      subscriptionId: subscription.id,
      userId: subscription.userId,
      reason: dto.reason,
    });

    return subscription;
  }

  /**
   * Activate subscription after contract signature
   */
  async activateAfterContractSigned(
    id: string,
    contractUrl: string,
    envelopeId?: string,
  ): Promise<Subscription> {
    const subscription = await this.findById(id);

    if (subscription.status === SubscriptionStatus.ACTIVE) {
      throw new BadRequestException('La suscripción ya está activa');
    }

    subscription.contractSigned = true;
    subscription.contractSignedAt = new Date();
    subscription.contractUrl = contractUrl;
    subscription.docusignEnvelopeId = envelopeId || null;
    subscription.status = SubscriptionStatus.ACTIVE;
    subscription.startDate = new Date();

    // Calculate next billing date (1 month from now)
    const nextBilling = new Date();
    nextBilling.setMonth(nextBilling.getMonth() + 1);
    subscription.nextBillingDate = nextBilling;

    await this.subscriptionRepository.save(subscription);

    // Emit event
    this.eventEmitter.emit('subscription.activated', {
      subscriptionId: subscription.id,
      userId: subscription.userId,
    });

    return subscription;
  }

  /**
   * Get payments for a subscription
   */
  async getPayments(subscriptionId: string): Promise<Payment[]> {
    return this.paymentRepository.find({
      where: { subscriptionId },
      relations: ['user'],
      order: { createdAt: 'DESC' },
    });
  }

  /**
   * Get user payments
   */
  async getUserPayments(userId: string): Promise<Payment[]> {
    return this.paymentRepository.find({
      where: { userId },
      relations: ['user'],
      order: { createdAt: 'DESC' },
    });
  }

  // ============================================
  // PUBLISHSPARKS - TRIAL & ACCESS CONTROL
  // ============================================

  /**
   * Verificar si el usuario tiene acceso al servicio
   * Retorna información del trial o suscripción, incluyendo el plan
   */
  async checkAccess(userId: string): Promise<{
    hasAccess: boolean;
    accessType: 'trial' | 'subscription' | 'none';
    plan: SubscriptionPlan;
    trialDaysRemaining?: number;
    trialEndsAt?: Date;
    subscription?: Subscription;
    message: string;
  }> {
    // Obtener usuario para verificar fecha de creación
    const user = await this.userRepository.findOne({
      where: { id: userId },
    });

    if (!user) {
      return {
        hasAccess: false,
        accessType: 'none',
        plan: SubscriptionPlan.FREE,
        message: 'Usuario no encontrado',
      };
    }

    // Verificar si tiene suscripción activa
    const activeSubscription = await this.findActiveByUserId(userId);
    if (activeSubscription) {
      return {
        hasAccess: true,
        accessType: 'subscription',
        plan: activeSubscription.planType,
        subscription: activeSubscription,
        message: `Plan ${activeSubscription.planType} activo`,
      };
    }

    // Calcular días de trial (7 días desde la creación de la cuenta)
    const trialDays = 7;
    const accountCreatedAt = new Date(user.createdAt);
    const trialEndsAt = new Date(accountCreatedAt);
    trialEndsAt.setDate(trialEndsAt.getDate() + trialDays);

    const now = new Date();
    const trialDaysRemaining = Math.ceil(
      (trialEndsAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
    );

    if (trialDaysRemaining > 0) {
      return {
        hasAccess: true,
        accessType: 'trial',
        plan: SubscriptionPlan.FREE,
        trialDaysRemaining,
        trialEndsAt,
        message: `Trial activo - ${trialDaysRemaining} días restantes`,
      };
    }

    // Trial expirado y sin suscripción
    return {
      hasAccess: false,
      accessType: 'none',
      plan: SubscriptionPlan.FREE,
      trialDaysRemaining: 0,
      trialEndsAt,
      message: 'Tu periodo de prueba ha terminado. Suscríbete para continuar.',
    };
  }

  /**
   * Crear checkout session para PublishSparks
   * @param plan - Plan a suscribir (CREATOR $7/mes o PRO $15/mes)
   */
  async createPublishSparksCheckout(
    userId: string,
    successUrl: string,
    cancelUrl: string,
    plan: SubscriptionPlan = SubscriptionPlan.CREATOR,
  ): Promise<{
    sessionId: string;
    sessionUrl: string;
  }> {
    const user = await this.userRepository.findOne({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('Usuario no encontrado');
    }

    if (!this.stripeService.isAvailable()) {
      throw new BadRequestException('Stripe no está configurado');
    }

    // Validar que el plan sea de pago
    if (plan === SubscriptionPlan.FREE) {
      throw new BadRequestException('El plan gratuito no requiere pago');
    }

    // Obtener precio segun el plan
    const planPrices: Record<SubscriptionPlan, number> = {
      [SubscriptionPlan.FREE]: 0,
      [SubscriptionPlan.CREATOR]: 7,
      [SubscriptionPlan.PRO]: 15,
    };

    const planNames: Record<SubscriptionPlan, string> = {
      [SubscriptionPlan.FREE]: 'Gratis',
      [SubscriptionPlan.CREATOR]: 'Creador',
      [SubscriptionPlan.PRO]: 'Pro',
    };

    const planDescriptions: Record<SubscriptionPlan, string> = {
      [SubscriptionPlan.FREE]: '1 idea por dia',
      [SubscriptionPlan.CREATOR]: '3 ideas por dia generadas con IA',
      [SubscriptionPlan.PRO]: '10 ideas por dia generadas con IA + soporte prioritario',
    };

    const price = planPrices[plan];
    const planName = planNames[plan];
    const planDescription = planDescriptions[plan];

    // Create or get Stripe customer
    let stripeCustomerId = user.stripeCustomerId;
    if (!stripeCustomerId) {
      const customer = await this.stripeService.createCustomer({
        email: user.email,
        name: `${user.firstName} ${user.lastName}`,
        metadata: { userId: user.id },
      });
      stripeCustomerId = customer.id;
      await this.userRepository.update(user.id, { stripeCustomerId });
    }

    // Create subscription record
    const subscription = this.subscriptionRepository.create({
      userId,
      planType: plan,
      status: SubscriptionStatus.PENDING_PAYMENT,
      monthlyPrice: price,
      initialPaymentType: InitialPaymentType.SINGLE,
      initialPaymentAmount: price,
      initialPaymentStatus: InitialPaymentStatus.PENDING,
      stripeCustomerId,
      paymentMethod: PaymentMethod.STRIPE,
      currency: 'USD',
      metadata: { product: 'publishsparks', plan },
    });

    const savedSubscription = await this.subscriptionRepository.save(subscription);

    // Create Checkout Session para suscripción recurrente
    const session = await this.stripeService.createCheckoutSession({
      customer: stripeCustomerId,
      mode: 'subscription',
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: `PublishSparks ${planName}`,
              description: planDescription,
            },
            unit_amount: price * 100, // Convertir a centavos
            recurring: {
              interval: 'month',
            },
          },
          quantity: 1,
        },
      ],
      success_url: `${successUrl}?session_id={CHECKOUT_SESSION_ID}&subscription_id=${savedSubscription.id}`,
      cancel_url: `${cancelUrl}?subscription_id=${savedSubscription.id}`,
      metadata: {
        subscriptionId: savedSubscription.id,
        userId,
        product: 'publishsparks',
        plan,
      },
      subscription_data: {
        metadata: {
          subscriptionId: savedSubscription.id,
          userId,
          product: 'publishsparks',
          plan,
        },
      },
    });

    // Update subscription with checkout session ID
    savedSubscription.stripeCheckoutSessionId = session.id;
    await this.subscriptionRepository.save(savedSubscription);

    this.logger.log(`PublishSparks checkout created: ${session.id} for plan ${plan}`);

    return {
      sessionId: session.id,
      sessionUrl: session.url!,
    };
  }

  /**
   * Obtener informacion del plan del usuario
   */
  async getUserPlanInfo(userId: string): Promise<{
    plan: SubscriptionPlan;
    planName: string;
    dailyLimit: number;
    price: number;
    isSubscribed: boolean;
    trialDaysRemaining?: number;
  }> {
    const accessStatus = await this.checkAccess(userId);

    const planNames: Record<SubscriptionPlan, string> = {
      [SubscriptionPlan.FREE]: 'Gratis',
      [SubscriptionPlan.CREATOR]: 'Creador',
      [SubscriptionPlan.PRO]: 'Pro',
    };

    const dailyLimits: Record<SubscriptionPlan, number> = {
      [SubscriptionPlan.FREE]: 1,
      [SubscriptionPlan.CREATOR]: 3,
      [SubscriptionPlan.PRO]: 10,
    };

    const prices: Record<SubscriptionPlan, number> = {
      [SubscriptionPlan.FREE]: 0,
      [SubscriptionPlan.CREATOR]: 7,
      [SubscriptionPlan.PRO]: 15,
    };

    return {
      plan: accessStatus.plan,
      planName: planNames[accessStatus.plan],
      dailyLimit: dailyLimits[accessStatus.plan],
      price: prices[accessStatus.plan],
      isSubscribed: accessStatus.accessType === 'subscription',
      trialDaysRemaining: accessStatus.trialDaysRemaining,
    };
  }

  // ============================================
  // DEVELOPMENT: MANUAL SYNC (para desarrollo local sin webhooks)
  // ============================================

  /**
   * Sincronizar estado del checkout manualmente
   * Útil para desarrollo local donde los webhooks no llegan
   */
  async syncCheckoutSession(sessionId: string): Promise<{
    synced: boolean;
    subscription: Subscription | null;
    stripeStatus: string;
    message: string;
  }> {
    this.logger.log(`Syncing checkout session: ${sessionId}`);

    if (!this.stripeService.isAvailable()) {
      throw new BadRequestException('Stripe no está configurado');
    }

    // Buscar suscripción por checkout session ID
    const subscription = await this.subscriptionRepository.findOne({
      where: { stripeCheckoutSessionId: sessionId },
    });

    if (!subscription) {
      return {
        synced: false,
        subscription: null,
        stripeStatus: 'unknown',
        message: 'No se encontró suscripción con ese session ID',
      };
    }

    // Si ya está activa, no hay nada que hacer
    if (subscription.status === SubscriptionStatus.ACTIVE) {
      return {
        synced: true,
        subscription,
        stripeStatus: 'completed',
        message: 'La suscripción ya está activa',
      };
    }

    // Consultar el estado del checkout en Stripe
    const session = await this.stripeService.retrieveCheckoutSession(sessionId);

    if (!session) {
      return {
        synced: false,
        subscription,
        stripeStatus: 'not_found',
        message: 'Checkout session no encontrado en Stripe',
      };
    }

    // Si el pago fue completado, actualizar la suscripción
    if (session.payment_status === 'paid') {
      subscription.initialPaymentStatus = InitialPaymentStatus.COMPLETED;
      subscription.status = SubscriptionStatus.ACTIVE;
      subscription.startDate = new Date();

      // Si es suscripción recurrente, guardar el ID
      if (session.subscription) {
        subscription.stripeSubscriptionId = session.subscription as string;
      }

      // Calcular próxima fecha de cobro (1 mes)
      const nextBilling = new Date();
      nextBilling.setMonth(nextBilling.getMonth() + 1);
      subscription.nextBillingDate = nextBilling;

      // Guardar método de pago si está disponible
      if (session.payment_intent) {
        try {
          const paymentIntent = await this.stripeService.retrievePaymentIntent(
            session.payment_intent as string,
          );
          if (paymentIntent.payment_method) {
            subscription.stripePaymentMethodId = paymentIntent.payment_method as string;
          }
        } catch (e) {
          this.logger.warn('Could not retrieve payment intent');
        }
      }

      await this.subscriptionRepository.save(subscription);

      // Crear registro de pago
      await this.createPaymentRecord(subscription, session);

      // Emitir evento
      this.eventEmitter.emit('subscription.payment.completed', {
        subscriptionId: subscription.id,
        userId: subscription.userId,
      });

      this.logger.log(`Subscription ${subscription.id} synced and activated`);

      return {
        synced: true,
        subscription,
        stripeStatus: session.payment_status,
        message: '¡Pago sincronizado! Suscripción activada exitosamente',
      };
    }

    return {
      synced: false,
      subscription,
      stripeStatus: session.payment_status || 'unknown',
      message: `Checkout aún no completado (estado: ${session.payment_status})`,
    };
  }
}
