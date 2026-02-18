import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { BadRequestException } from '@nestjs/common';
import { WebhookService } from './webhook.service';
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

describe('WebhookService', () => {
  let service: WebhookService;
  let subscriptionRepo: any;
  let paymentRepo: any;
  let enrollmentRepo: any;
  let stripeService: any;
  let configService: any;
  let eventEmitter: any;

  const enrollmentId = '11111111-1111-1111-1111-111111111111';
  const studentId = '22222222-2222-2222-2222-222222222222';
  const cohortId = '33333333-3333-3333-3333-333333333333';
  const courseId = '44444444-4444-4444-4444-444444444444';

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WebhookService,
        {
          provide: getRepositoryToken(Subscription),
          useValue: {
            findOne: jest.fn(),
            save: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(Payment),
          useValue: {
            create: jest.fn(),
            save: jest.fn(),
            findOne: jest.fn(),
            count: jest.fn().mockResolvedValue(0),
          },
        },
        {
          provide: getRepositoryToken(Enrollment),
          useValue: {
            findOne: jest.fn(),
            save: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(User),
          useValue: {
            findOne: jest.fn(),
          },
        },
        {
          provide: StripeService,
          useValue: {
            constructWebhookEvent: jest.fn(),
            retrievePaymentIntent: jest.fn(),
          },
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => {
              if (key === 'STRIPE_WEBHOOK_SECRET') return 'whsec_test';
              return null;
            }),
          },
        },
        {
          provide: EventEmitter2,
          useValue: {
            emit: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<WebhookService>(WebhookService);
    subscriptionRepo = module.get(getRepositoryToken(Subscription));
    paymentRepo = module.get(getRepositoryToken(Payment));
    enrollmentRepo = module.get(getRepositoryToken(Enrollment));
    stripeService = module.get(StripeService);
    configService = module.get(ConfigService);
    eventEmitter = module.get(EventEmitter2);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  // ============================================
  // CONSTRUCT EVENT
  // ============================================

  describe('constructEvent', () => {
    it('should verify webhook signature', () => {
      const rawBody = Buffer.from('test');
      const signature = 'sig_test';
      const mockEvent = { id: 'evt_1', type: 'checkout.session.completed' };

      stripeService.constructWebhookEvent.mockReturnValue(mockEvent);

      const result = service.constructEvent(rawBody, signature);

      expect(result).toEqual(mockEvent);
      expect(stripeService.constructWebhookEvent).toHaveBeenCalledWith(
        rawBody,
        signature,
        'whsec_test',
      );
    });

    it('should throw BadRequestException on invalid signature', () => {
      stripeService.constructWebhookEvent.mockImplementation(() => {
        throw new Error('Invalid signature');
      });

      expect(() =>
        service.constructEvent(Buffer.from('test'), 'invalid_sig'),
      ).toThrow(BadRequestException);
    });

    it('should throw if webhook secret not configured', () => {
      configService.get.mockReturnValue(null);

      expect(() =>
        service.constructEvent(Buffer.from('test'), 'sig'),
      ).toThrow(BadRequestException);
    });
  });

  // ============================================
  // HANDLE EVENT - ENROLLMENT CHECKOUT
  // ============================================

  describe('handleEvent - checkout.session.completed (enrollment)', () => {
    const mockSession = {
      id: 'cs_test_123',
      payment_intent: 'pi_test_123',
      amount_total: 50000, // $500.00 in cents
      currency: 'usd',
      metadata: {
        type: 'course_payment',
        enrollmentId,
        userId: studentId,
        cohortId,
        courseId,
      },
    };

    const mockEnrollment = {
      id: enrollmentId,
      studentId,
      cohortId,
      totalPaid: 0,
      discountApplied: 0,
      paymentStatus: EnrollmentPaymentStatus.PENDING,
      status: EnrollmentStatus.PENDING,
      cohort: {
        courseId,
        customPrice: null,
        course: { title: 'Test Course', regularPrice: 500 },
      },
    };

    it('should process enrollment checkout and activate enrollment', async () => {
      enrollmentRepo.findOne.mockResolvedValue({ ...mockEnrollment });
      enrollmentRepo.save.mockImplementation((e) => Promise.resolve(e));
      paymentRepo.create.mockImplementation((data) => data);
      paymentRepo.save.mockImplementation((data) => Promise.resolve(data));

      const event = {
        id: 'evt_1',
        type: 'checkout.session.completed',
        data: { object: mockSession },
      };

      const result = await service.handleEvent(event as any);

      expect(result).toEqual({
        received: true,
        processed: 'checkout.session.completed',
      });

      // Verify enrollment updated
      expect(enrollmentRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({
          totalPaid: 500,
          paymentStatus: EnrollmentPaymentStatus.COMPLETED,
          status: EnrollmentStatus.ACTIVE,
        }),
      );

      // Verify payment record created
      expect(paymentRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: studentId,
          amount: 500,
          currency: 'USD',
          status: PaymentStatus.COMPLETED,
          provider: PaymentProvider.STRIPE,
          transactionId: 'pi_test_123',
        }),
      );

      // Verify event emitted
      expect(eventEmitter.emit).toHaveBeenCalledWith(
        'payment.enrollment.completed',
        expect.objectContaining({
          enrollmentId,
          userId: studentId,
          amount: 500,
        }),
      );
    });

    it('should mark as PARTIAL for insufficient payment', async () => {
      const partialSession = {
        ...mockSession,
        amount_total: 20000, // $200 of $500
      };
      enrollmentRepo.findOne.mockResolvedValue({ ...mockEnrollment });
      enrollmentRepo.save.mockImplementation((e) => Promise.resolve(e));
      paymentRepo.create.mockImplementation((data) => data);
      paymentRepo.save.mockImplementation((data) => Promise.resolve(data));

      const event = {
        id: 'evt_2',
        type: 'checkout.session.completed',
        data: { object: partialSession },
      };

      await service.handleEvent(event as any);

      expect(enrollmentRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({
          totalPaid: 200,
          paymentStatus: EnrollmentPaymentStatus.PARTIAL,
          status: EnrollmentStatus.ACTIVE,
        }),
      );
    });

    it('should skip when enrollment not found', async () => {
      enrollmentRepo.findOne.mockResolvedValue(null);

      const event = {
        id: 'evt_3',
        type: 'checkout.session.completed',
        data: { object: mockSession },
      };

      const result = await service.handleEvent(event as any);

      expect(result.received).toBe(true);
      expect(enrollmentRepo.save).not.toHaveBeenCalled();
    });
  });

  // ============================================
  // HANDLE EVENT - PAYMENT INTENT FAILED
  // ============================================

  describe('handleEvent - payment_intent.payment_failed', () => {
    it('should create failed payment record and emit event', async () => {
      const failedIntent = {
        id: 'pi_failed_1',
        amount: 50000,
        currency: 'usd',
        metadata: {
          type: 'course_payment',
          enrollmentId,
          userId: studentId,
        },
        last_payment_error: {
          message: 'Card declined',
          code: 'card_declined',
        },
      };

      paymentRepo.create.mockImplementation((data) => data);
      paymentRepo.save.mockImplementation((data) => Promise.resolve(data));

      const event = {
        id: 'evt_4',
        type: 'payment_intent.payment_failed',
        data: { object: failedIntent },
      };

      await service.handleEvent(event as any);

      // Verify failed payment record
      expect(paymentRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          status: PaymentStatus.FAILED,
          errorMessage: 'Card declined',
        }),
      );

      // Verify failure event emitted
      expect(eventEmitter.emit).toHaveBeenCalledWith(
        'payment.enrollment.failed',
        expect.objectContaining({
          enrollmentId,
          error: 'Card declined',
        }),
      );
    });
  });

  // ============================================
  // HANDLE EVENT - CHARGE REFUNDED
  // ============================================

  describe('handleEvent - charge.refunded', () => {
    it('should process refund and update payment', async () => {
      const charge = {
        id: 'ch_test_1',
        payment_intent: 'pi_test_refund',
        amount_refunded: 50000,
        refunded: true,
      };

      const existingPayment = {
        id: 'pay_1',
        userId: studentId,
        transactionId: 'pi_test_refund',
        amount: 500,
        status: PaymentStatus.COMPLETED,
        refundedAmount: null,
        refundedAt: null,
      };

      paymentRepo.findOne.mockResolvedValue(existingPayment);
      paymentRepo.save.mockImplementation((p) => Promise.resolve(p));
      paymentRepo.create.mockImplementation((data) => data);

      const event = {
        id: 'evt_5',
        type: 'charge.refunded',
        data: { object: charge },
      };

      await service.handleEvent(event as any);

      expect(paymentRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({
          refundedAmount: 500,
          status: PaymentStatus.REFUNDED,
        }),
      );

      expect(eventEmitter.emit).toHaveBeenCalledWith(
        'payment.refunded',
        expect.objectContaining({
          amount: 500,
          fullRefund: true,
        }),
      );
    });
  });

  // ============================================
  // HANDLE EVENT - UNKNOWN TYPE
  // ============================================

  describe('handleEvent - unknown event', () => {
    it('should return received for unhandled events', async () => {
      const event = {
        id: 'evt_unknown',
        type: 'some.unknown.event',
        data: { object: {} },
      };

      const result = await service.handleEvent(event as any);

      expect(result).toEqual({
        received: true,
        processed: 'some.unknown.event',
      });
    });
  });
});
