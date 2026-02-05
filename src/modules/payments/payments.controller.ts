import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  Param,
  Query,
  UseGuards,
  ParseUUIDPipe,
  Headers,
  Req,
  HttpCode,
  HttpStatus,
  BadRequestException,
} from '@nestjs/common';
import type { RawBodyRequest } from '@nestjs/common';
import type { Request } from 'express';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
  ApiBadRequestResponse,
  ApiNotFoundResponse,
  ApiHeader,
} from '@nestjs/swagger';
import { SubscriptionsService } from './subscriptions.service';
import { StripeService } from './stripe.service';
import { WebhookService } from './services/webhook.service';
import { CourseCheckoutService } from './services/course-checkout.service';
import {
  CreateCheckoutSessionDto,
  CancelSubscriptionDto,
  CreateCourseCheckoutDto,
} from './dto';
import {
  Subscription,
  SubscriptionStatus,
  SubscriptionPlan,
} from './entities/subscription.entity';
import { Payment } from './entities/payment.entity';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Public } from '../auth/decorators/public.decorator';
import { User } from '../auth/entities/user.entity';
import { ConfigService } from '@nestjs/config';

@Controller('payments')
@ApiTags('Payments & Subscriptions')
export class PaymentsController {
  constructor(
    private readonly subscriptionsService: SubscriptionsService,
    private readonly stripeService: StripeService,
    private readonly webhookService: WebhookService,
    private readonly courseCheckoutService: CourseCheckoutService,
    private readonly configService: ConfigService,
  ) {}

  // ============================================
  // CHECKOUT ENDPOINTS
  // ============================================

  @Post('checkout/session')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Create Stripe Checkout Session',
    description:
      'Creates a new Stripe checkout session for subscription payment',
  })
  @ApiResponse({
    status: 201,
    description: 'Checkout session created successfully',
    schema: {
      example: {
        message: 'Sesión de checkout creada exitosamente',
        data: {
          sessionId: 'cs_test_xxx',
          sessionUrl: 'https://checkout.stripe.com/xxx',
          subscription: {},
        },
      },
    },
  })
  @ApiBadRequestResponse({
    description: 'Invalid data or Stripe not configured',
  })
  async createCheckoutSession(
    @CurrentUser() user: User,
    @Body() dto: Omit<CreateCheckoutSessionDto, 'userId'>,
  ) {
    const result = await this.subscriptionsService.createCheckoutSession({
      ...dto,
      userId: user.id,
    });

    return {
      message: 'Sesión de checkout creada exitosamente',
      data: result,
    };
  }

  @Post('checkout/session/guest')
  @Public()
  @ApiOperation({
    summary: 'Create Stripe Checkout Session (Guest)',
    description: 'Creates a checkout session for a specific user (admin use)',
  })
  @ApiResponse({
    status: 201,
    description: 'Checkout session created successfully',
  })
  async createGuestCheckoutSession(@Body() dto: CreateCheckoutSessionDto) {
    const result = await this.subscriptionsService.createCheckoutSession(dto);

    return {
      message: 'Sesión de checkout creada exitosamente',
      data: result,
    };
  }

  // ============================================
  // PUBLISHSPARKS CHECKOUT ($7/mes)
  // ============================================

  @Post('checkout/publishsparks')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Create PublishSparks Subscription Checkout',
    description:
      'Creates a Stripe checkout session for PublishSparks $7/month subscription',
  })
  @ApiResponse({
    status: 201,
    description: 'Checkout session created',
    schema: {
      example: {
        message: 'Sesión de checkout creada exitosamente',
        data: {
          sessionId: 'cs_test_xxx',
          sessionUrl: 'https://checkout.stripe.com/xxx',
        },
      },
    },
  })
  async createPublishSparksCheckout(
    @CurrentUser() user: User,
    @Body() body: { successUrl: string; cancelUrl: string },
  ) {
    const result = await this.subscriptionsService.createPublishSparksCheckout(
      user.id,
      body.successUrl,
      body.cancelUrl,
    );

    return {
      message: 'Sesión de checkout creada exitosamente',
      data: result,
    };
  }

  @Get('checkout/sync/:sessionId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Sync Checkout Session Status (Dev)',
    description:
      'Manually sync checkout session status with Stripe. Useful for local development without webhooks.',
  })
  @ApiResponse({
    status: 200,
    description: 'Sync result',
    schema: {
      example: {
        message: '¡Pago sincronizado! Suscripción activada exitosamente',
        data: {
          synced: true,
          stripeStatus: 'paid',
          subscription: {},
        },
      },
    },
  })
  async syncCheckoutSession(@Param('sessionId') sessionId: string) {
    const result =
      await this.subscriptionsService.syncCheckoutSession(sessionId);

    return {
      message: result.message,
      data: result,
    };
  }

  // ============================================
  // WEBHOOK ENDPOINTS
  // ============================================

  @Post('webhook/stripe')
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Stripe Webhook Handler',
    description:
      'Handles incoming webhook events from Stripe (subscriptions and course payments)',
  })
  @ApiHeader({
    name: 'stripe-signature',
    description: 'Stripe webhook signature',
    required: true,
  })
  @ApiResponse({
    status: 200,
    description: 'Webhook processed successfully',
    schema: {
      example: { received: true, processed: 'checkout.session.completed' },
    },
  })
  @ApiBadRequestResponse({
    description: 'Invalid signature or webhook error',
  })
  async handleStripeWebhook(
    @Req() req: RawBodyRequest<Request>,
    @Headers('stripe-signature') signature: string,
  ) {
    if (!signature) {
      throw new BadRequestException('Missing stripe-signature header');
    }

    const rawBody = req.rawBody;
    if (!rawBody) {
      throw new BadRequestException('Missing request body');
    }

    // Construir y verificar evento
    const event = this.webhookService.constructEvent(rawBody, signature);

    // Procesar evento
    const result = await this.webhookService.handleEvent(event);

    return result;
  }

  // ============================================
  // COURSE CHECKOUT ENDPOINTS
  // ============================================

  @Post('checkout/course')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Create Course Checkout Session',
    description:
      'Creates a Stripe checkout session for course enrollment payment',
  })
  @ApiResponse({
    status: 201,
    description: 'Checkout session created successfully',
    schema: {
      example: {
        message: 'Sesión de checkout creada exitosamente',
        data: {
          sessionId: 'cs_test_xxx',
          sessionUrl: 'https://checkout.stripe.com/xxx',
          amount: 265.0,
          enrollment: {},
        },
      },
    },
  })
  @ApiBadRequestResponse({
    description:
      'Invalid data, payment already completed, or Stripe not configured',
  })
  @ApiNotFoundResponse({
    description: 'Enrollment not found',
  })
  async createCourseCheckout(
    @CurrentUser() user: User,
    @Body() dto: CreateCourseCheckoutDto,
  ) {
    const result = await this.courseCheckoutService.createCheckoutSession(
      dto,
      user.id,
    );

    return {
      message: 'Sesión de checkout creada exitosamente',
      data: result,
    };
  }

  @Get('checkout/course/sync/:sessionId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Sync Course Checkout Session Status (Dev)',
    description:
      'Manually sync checkout session status with Stripe. Useful for local development without webhooks.',
  })
  @ApiResponse({
    status: 200,
    description: 'Sync result',
    schema: {
      example: {
        message: 'Pago sincronizado: $265 registrado',
        data: {
          synced: true,
          stripeStatus: 'paid',
          enrollment: {},
        },
      },
    },
  })
  async syncCourseCheckoutSession(@Param('sessionId') sessionId: string) {
    const result =
      await this.courseCheckoutService.syncCheckoutSession(sessionId);

    return {
      message: result.message,
      data: result,
    };
  }

  @Get('checkout/course/info/:enrollmentId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get Course Payment Info',
    description: 'Returns payment information for an enrollment',
  })
  @ApiResponse({
    status: 200,
    description: 'Payment information',
    schema: {
      example: {
        message: 'Información de pago obtenida',
        data: {
          totalPrice: 295.0,
          discount: 30.0,
          alreadyPaid: 0,
          remainingAmount: 265.0,
          paymentStatus: 'pending',
          canPay: true,
        },
      },
    },
  })
  async getCoursePaymentInfo(
    @Param('enrollmentId', ParseUUIDPipe) enrollmentId: string,
  ) {
    const result =
      await this.courseCheckoutService.getPaymentInfo(enrollmentId);

    return {
      message: 'Información de pago obtenida',
      data: result,
    };
  }

  // ============================================
  // SUBSCRIPTION ENDPOINTS (USER)
  // ============================================

  @Get('subscription/me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get current user subscription',
    description: 'Returns the current subscription for the authenticated user',
  })
  @ApiResponse({
    status: 200,
    description: 'User subscription',
    type: Subscription,
  })
  async getMySubscription(@CurrentUser() user: User) {
    const subscription = await this.subscriptionsService.findByUserId(user.id);

    return {
      message: 'Suscripción obtenida exitosamente',
      data: subscription,
    };
  }

  @Get('subscription/me/active')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get current user active subscription',
    description: 'Returns the active subscription for the authenticated user',
  })
  @ApiResponse({
    status: 200,
    description: 'Active subscription or null',
    type: Subscription,
  })
  async getMyActiveSubscription(@CurrentUser() user: User) {
    const subscription = await this.subscriptionsService.findActiveByUserId(
      user.id,
    );

    return {
      message: subscription
        ? 'Suscripción activa encontrada'
        : 'No tienes una suscripción activa',
      data: subscription,
    };
  }

  @Post('subscription/me/cancel')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Cancel current user subscription',
    description: 'Cancels the active subscription for the authenticated user',
  })
  @ApiResponse({
    status: 200,
    description: 'Subscription cancelled',
    type: Subscription,
  })
  @ApiBadRequestResponse({
    description: 'No active subscription or already cancelled',
  })
  async cancelMySubscription(
    @CurrentUser() user: User,
    @Body() dto: CancelSubscriptionDto,
  ) {
    const subscription = await this.subscriptionsService.findByUserId(user.id);
    if (!subscription) {
      throw new BadRequestException('No tienes una suscripción');
    }

    const cancelled = await this.subscriptionsService.cancel(
      subscription.id,
      dto,
    );

    return {
      message: 'Suscripción cancelada exitosamente',
      data: cancelled,
    };
  }

  @Get('payments/me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get current user payments',
    description: 'Returns all payments for the authenticated user',
  })
  @ApiResponse({
    status: 200,
    description: 'User payments',
    type: [Payment],
  })
  async getMyPayments(@CurrentUser() user: User) {
    const payments = await this.subscriptionsService.getUserPayments(user.id);

    return {
      message: 'Pagos obtenidos exitosamente',
      data: payments,
    };
  }

  // ============================================
  // ADMIN ENDPOINTS
  // ============================================

  @Get('subscriptions')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get all subscriptions (admin)',
    description: 'Returns all subscriptions with pagination and filters',
  })
  @ApiQuery({ name: 'status', required: false, enum: SubscriptionStatus })
  @ApiQuery({ name: 'planType', required: false, enum: SubscriptionPlan })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({
    status: 200,
    description: 'List of subscriptions',
  })
  async getAllSubscriptions(
    @Query('status') status?: SubscriptionStatus,
    @Query('planType') planType?: SubscriptionPlan,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    const result = await this.subscriptionsService.findAll({
      status,
      planType,
      page,
      limit,
    });

    return {
      message: 'Suscripciones obtenidas exitosamente',
      data: result.subscriptions,
      meta: {
        total: result.total,
        page: page || 1,
        limit: limit || 20,
      },
    };
  }

  @Get('subscriptions/:id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get subscription by ID (admin)',
    description: 'Returns a specific subscription with all details',
  })
  @ApiResponse({
    status: 200,
    description: 'Subscription details',
    type: Subscription,
  })
  @ApiNotFoundResponse({
    description: 'Subscription not found',
  })
  async getSubscription(@Param('id', ParseUUIDPipe) id: string) {
    const subscription = await this.subscriptionsService.findById(id);

    return {
      message: 'Suscripción obtenida exitosamente',
      data: subscription,
    };
  }

  @Post('subscriptions/:id/cancel')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Cancel subscription (admin)',
    description: 'Admin cancellation of a subscription',
  })
  @ApiResponse({
    status: 200,
    description: 'Subscription cancelled',
    type: Subscription,
  })
  async cancelSubscription(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CancelSubscriptionDto,
  ) {
    const subscription = await this.subscriptionsService.cancel(id, dto);

    return {
      message: 'Suscripción cancelada exitosamente',
      data: subscription,
    };
  }

  @Put('subscriptions/:id/activate')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Activate subscription after contract (admin)',
    description: 'Activates a subscription after the contract has been signed',
  })
  @ApiResponse({
    status: 200,
    description: 'Subscription activated',
    type: Subscription,
  })
  async activateSubscription(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: { contractUrl: string; envelopeId?: string },
  ) {
    const subscription =
      await this.subscriptionsService.activateAfterContractSigned(
        id,
        body.contractUrl,
        body.envelopeId,
      );

    return {
      message: 'Suscripción activada exitosamente',
      data: subscription,
    };
  }

  @Get('subscriptions/:id/payments')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get subscription payments (admin)',
    description: 'Returns all payments for a specific subscription',
  })
  @ApiResponse({
    status: 200,
    description: 'Subscription payments',
    type: [Payment],
  })
  async getSubscriptionPayments(@Param('id', ParseUUIDPipe) id: string) {
    const payments = await this.subscriptionsService.getPayments(id);

    return {
      message: 'Pagos obtenidos exitosamente',
      data: payments,
    };
  }

  // ============================================
  // UTILITY ENDPOINTS
  // ============================================

  @Get('stripe/status')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Check Stripe configuration status',
    description: 'Returns whether Stripe is properly configured',
  })
  @ApiResponse({
    status: 200,
    description: 'Stripe status',
  })
  async getStripeStatus() {
    return {
      message: 'Estado de Stripe',
      data: {
        configured: this.stripeService.isAvailable(),
      },
    };
  }
}
