import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { StripeService } from '../stripe.service';
import {
  Enrollment,
  EnrollmentStatus,
  PaymentStatus,
} from '../../enrollments/entities/enrollment.entity';
import { User } from '../../auth/entities/user.entity';
import { CreateCourseCheckoutDto } from '../dto/create-course-checkout.dto';
import { ErrorCodes } from '../../../common/dto';

/**
 * Servicio para crear sesiones de checkout de Stripe para cursos
 */
@Injectable()
export class CourseCheckoutService {
  private readonly logger = new Logger(CourseCheckoutService.name);

  constructor(
    @InjectRepository(Enrollment)
    private readonly enrollmentRepository: Repository<Enrollment>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly stripeService: StripeService,
  ) {}

  /**
   * Crear sesión de checkout para una inscripción
   */
  async createCheckoutSession(
    dto: CreateCourseCheckoutDto,
    userId: string,
  ): Promise<{
    sessionId: string;
    sessionUrl: string;
    enrollment: Enrollment;
    amount: number;
  }> {
    this.logger.log(
      `Creating course checkout for enrollment ${dto.enrollmentId}`,
    );

    // Verificar que Stripe está disponible
    if (!this.stripeService.isAvailable()) {
      throw new BadRequestException({
        code: ErrorCodes.PAYMENT_FAILED,
        message: 'Stripe no está configurado',
      });
    }

    // Obtener inscripción con relaciones
    const enrollment = await this.enrollmentRepository.findOne({
      where: { id: dto.enrollmentId },
      relations: ['student', 'cohort', 'cohort.course'],
    });

    if (!enrollment) {
      throw new NotFoundException({
        code: ErrorCodes.ENROLL_NOT_FOUND,
        message: 'La inscripción no fue encontrada',
      });
    }

    // Verificar que el usuario es el dueño de la inscripción o es admin
    const user = await this.userRepository.findOne({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException({
        code: ErrorCodes.USER_NOT_FOUND,
        message: 'Usuario no encontrado',
      });
    }

    if (enrollment.studentId !== userId && !user.isAdmin()) {
      throw new BadRequestException({
        code: ErrorCodes.FORBIDDEN,
        message: 'No tienes permiso para pagar esta inscripción',
      });
    }

    // Verificar que la inscripción no está cancelada o completada
    if (enrollment.status === EnrollmentStatus.CANCELLED) {
      throw new BadRequestException({
        code: ErrorCodes.ENROLL_EXPIRED,
        message: 'Esta inscripción fue cancelada',
      });
    }

    if (enrollment.paymentStatus === PaymentStatus.COMPLETED) {
      throw new BadRequestException({
        code: ErrorCodes.PAYMENT_ALREADY_PROCESSED,
        message: 'El pago de esta inscripción ya fue completado',
      });
    }

    // Calcular monto a pagar
    const coursePrice =
      enrollment.cohort?.customPrice ||
      enrollment.cohort?.course?.regularPrice ||
      0;
    const discount = Number(enrollment.discountApplied || 0);
    const totalPrice = Number(coursePrice) - discount;
    const alreadyPaid = Number(enrollment.totalPaid || 0);
    const remainingAmount = totalPrice - alreadyPaid;

    // Usar monto personalizado si se especifica, sino el monto pendiente
    let amount = dto.amount || remainingAmount;

    // Validar que el monto no excede lo pendiente
    if (amount > remainingAmount) {
      amount = remainingAmount;
    }

    if (amount <= 0) {
      throw new BadRequestException({
        code: ErrorCodes.VALIDATION_ERROR,
        message: 'No hay monto pendiente por pagar',
      });
    }

    // Crear o obtener Stripe customer
    const student =
      enrollment.student ||
      (await this.userRepository.findOne({
        where: { id: enrollment.studentId },
      }));

    if (!student) {
      throw new NotFoundException({
        code: ErrorCodes.USER_NOT_FOUND,
        message: 'Estudiante no encontrado',
      });
    }

    let stripeCustomerId = student.stripeCustomerId;
    if (!stripeCustomerId) {
      const customer = await this.stripeService.createCustomer({
        email: student.email,
        name: `${student.firstName} ${student.lastName}`,
        metadata: { userId: student.id },
      });
      stripeCustomerId = customer.id;

      // Actualizar usuario con Stripe customer ID
      await this.userRepository.update(student.id, { stripeCustomerId });
    }

    // Construir descripción
    const courseName = enrollment.cohort?.course?.title || 'Curso';
    const cohortName = enrollment.cohort?.name || '';
    const description =
      dto.description ||
      `Pago ${alreadyPaid > 0 ? 'parcial ' : ''}del curso: ${courseName}${cohortName ? ` - ${cohortName}` : ''}`;

    // Crear sesión de checkout
    const session = await this.stripeService.createCheckoutSession({
      customer: stripeCustomerId,
      mode: 'payment',
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: courseName,
              description: cohortName || undefined,
            },
            unit_amount: Math.round(amount * 100), // Convertir a centavos
          },
          quantity: 1,
        },
      ],
      success_url: `${dto.successUrl}${dto.successUrl.includes('?') ? '&' : '?'}session_id={CHECKOUT_SESSION_ID}&enrollment_id=${enrollment.id}`,
      cancel_url: `${dto.cancelUrl}${dto.cancelUrl.includes('?') ? '&' : '?'}enrollment_id=${enrollment.id}`,
      metadata: {
        type: 'course_payment',
        enrollmentId: enrollment.id,
        userId: student.id,
        cohortId: enrollment.cohortId,
        courseId: enrollment.cohort?.courseId || '',
        amount: amount.toString(),
        totalPrice: totalPrice.toString(),
        alreadyPaid: alreadyPaid.toString(),
      },
      payment_intent_data: {
        metadata: {
          type: 'course_payment',
          enrollmentId: enrollment.id,
          userId: student.id,
          cohortId: enrollment.cohortId,
        },
        description,
      },
      customer_update: {
        address: 'auto',
      },
      billing_address_collection: 'required',
    });

    this.logger.log(
      `Checkout session created: ${session.id} for enrollment ${enrollment.id}`,
    );

    return {
      sessionId: session.id,
      sessionUrl: session.url!,
      enrollment,
      amount,
    };
  }

  /**
   * Sincronizar estado de checkout manualmente (para desarrollo)
   */
  async syncCheckoutSession(sessionId: string): Promise<{
    synced: boolean;
    enrollment: Enrollment | null;
    stripeStatus: string;
    message: string;
  }> {
    this.logger.log(`Syncing checkout session: ${sessionId}`);

    if (!this.stripeService.isAvailable()) {
      throw new BadRequestException({
        code: ErrorCodes.PAYMENT_FAILED,
        message: 'Stripe no está configurado',
      });
    }

    // Obtener sesión de Stripe
    const session = await this.stripeService.retrieveCheckoutSession(sessionId);

    if (!session) {
      return {
        synced: false,
        enrollment: null,
        stripeStatus: 'not_found',
        message: 'Sesión de checkout no encontrada en Stripe',
      };
    }

    // Verificar que es un pago de curso
    if (session.metadata?.type !== 'course_payment') {
      return {
        synced: false,
        enrollment: null,
        stripeStatus: session.payment_status || 'unknown',
        message: 'Esta sesión no es de un pago de curso',
      };
    }

    const enrollmentId = session.metadata?.enrollmentId;
    if (!enrollmentId) {
      return {
        synced: false,
        enrollment: null,
        stripeStatus: session.payment_status || 'unknown',
        message: 'No se encontró ID de inscripción en la sesión',
      };
    }

    const enrollment = await this.enrollmentRepository.findOne({
      where: { id: enrollmentId },
      relations: ['cohort', 'cohort.course'],
    });

    if (!enrollment) {
      return {
        synced: false,
        enrollment: null,
        stripeStatus: session.payment_status || 'unknown',
        message: 'Inscripción no encontrada',
      };
    }

    // Si el pago fue completado, actualizar la inscripción
    if (session.payment_status === 'paid') {
      const amountPaid = (session.amount_total || 0) / 100;
      enrollment.totalPaid = Number(enrollment.totalPaid) + amountPaid;

      // Calcular precio total
      const coursePrice =
        enrollment.cohort?.customPrice ||
        enrollment.cohort?.course?.regularPrice ||
        0;
      const discount = Number(enrollment.discountApplied || 0);
      const totalPrice = Number(coursePrice) - discount;

      // Actualizar estado de pago
      if (enrollment.totalPaid >= totalPrice) {
        enrollment.paymentStatus = PaymentStatus.COMPLETED;
      } else if (enrollment.totalPaid > 0) {
        enrollment.paymentStatus = PaymentStatus.PARTIAL;
      }

      // Activar inscripción
      enrollment.status = EnrollmentStatus.ACTIVE;

      await this.enrollmentRepository.save(enrollment);

      this.logger.log(`Enrollment ${enrollmentId} synced: $${amountPaid} paid`);

      return {
        synced: true,
        enrollment,
        stripeStatus: session.payment_status,
        message: `Pago sincronizado: $${amountPaid} registrado`,
      };
    }

    return {
      synced: false,
      enrollment,
      stripeStatus: session.payment_status || 'unknown',
      message: `Checkout no completado (estado: ${session.payment_status})`,
    };
  }

  /**
   * Obtener información de pago pendiente para una inscripción
   */
  async getPaymentInfo(enrollmentId: string): Promise<{
    enrollment: Enrollment;
    totalPrice: number;
    discount: number;
    alreadyPaid: number;
    remainingAmount: number;
    paymentStatus: PaymentStatus;
    canPay: boolean;
  }> {
    const enrollment = await this.enrollmentRepository.findOne({
      where: { id: enrollmentId },
      relations: ['cohort', 'cohort.course'],
    });

    if (!enrollment) {
      throw new NotFoundException({
        code: ErrorCodes.ENROLL_NOT_FOUND,
        message: 'La inscripción no fue encontrada',
      });
    }

    const coursePrice =
      enrollment.cohort?.customPrice ||
      enrollment.cohort?.course?.regularPrice ||
      0;
    const discount = Number(enrollment.discountApplied || 0);
    const totalPrice = Number(coursePrice) - discount;
    const alreadyPaid = Number(enrollment.totalPaid || 0);
    const remainingAmount = Math.max(0, totalPrice - alreadyPaid);

    const canPay =
      enrollment.status !== EnrollmentStatus.CANCELLED &&
      enrollment.paymentStatus !== PaymentStatus.COMPLETED &&
      remainingAmount > 0;

    return {
      enrollment,
      totalPrice,
      discount,
      alreadyPaid,
      remainingAmount,
      paymentStatus: enrollment.paymentStatus,
      canPay,
    };
  }
}
