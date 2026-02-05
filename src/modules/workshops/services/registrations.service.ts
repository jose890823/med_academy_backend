import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';
import {
  WorkshopRegistration,
  RegistrationStatus,
  RegistrationPaymentStatus,
} from '../entities/workshop-registration.entity';
import { SessionsService } from './sessions.service';
import { CreateRegistrationDto } from '../dto';
import { ErrorCodes } from '../../../common/dto';

@Injectable()
export class RegistrationsService {
  private readonly logger = new Logger(RegistrationsService.name);

  constructor(
    @InjectRepository(WorkshopRegistration)
    private readonly registrationRepository: Repository<WorkshopRegistration>,
    private readonly sessionsService: SessionsService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  /**
   * Crear inscripción a una sesión
   */
  async create(
    userId: string,
    dto: CreateRegistrationDto,
  ): Promise<WorkshopRegistration> {
    const session = await this.sessionsService.findById(dto.sessionId);

    // Verificar que se puede registrar
    if (!session.canRegister) {
      throw new BadRequestException({
        code: ErrorCodes.REGISTRATION_CLOSED,
        message: 'Las inscripciones no están disponibles para esta sesión',
      });
    }

    // Verificar que no esté ya inscrito
    const existing = await this.registrationRepository.findOne({
      where: { userId, sessionId: dto.sessionId },
    });

    if (existing) {
      throw new ConflictException({
        code: ErrorCodes.REGISTRATION_EXISTS,
        message: 'Ya estás inscrito en esta sesión',
      });
    }

    // Determinar estado inicial
    let status = RegistrationStatus.PENDING;
    let waitlistPosition: number | null = null;

    if (session.isFull) {
      // Agregar a lista de espera
      status = RegistrationStatus.WAITLIST;
      waitlistPosition = await this.getNextWaitlistPosition(dto.sessionId);
    }

    const registration = this.registrationRepository.create({
      userId,
      sessionId: dto.sessionId,
      status,
      waitlistPosition,
      waitlistAddedAt:
        status === RegistrationStatus.WAITLIST ? new Date() : null,
      contactEmail: dto.contactEmail,
      contactPhone: dto.contactPhone || null,
      firstName: dto.firstName,
      lastName: dto.lastName,
      emergencyContactName: dto.emergencyContactName || null,
      emergencyContactPhone: dto.emergencyContactPhone || null,
      dietaryRequirements: dto.dietaryRequirements || null,
      accessibilityNeeds: dto.accessibilityNeeds || null,
      notes: dto.notes || null,
    });

    const saved = await this.registrationRepository.save(registration);

    // Incrementar contador si no es waitlist
    if (status !== RegistrationStatus.WAITLIST) {
      await this.sessionsService.incrementParticipants(dto.sessionId);
    }

    this.logger.log(
      `Inscripción creada: usuario ${userId} en sesión ${dto.sessionId} (${status})`,
    );

    // Emitir evento
    this.eventEmitter.emit('workshop.registration.created', {
      registration: saved,
      session,
    });

    return saved;
  }

  /**
   * Obtener inscripción por ID
   */
  async findById(id: string): Promise<WorkshopRegistration> {
    const registration = await this.registrationRepository.findOne({
      where: { id },
      relations: ['session', 'session.workshop', 'user'],
    });

    if (!registration) {
      throw new NotFoundException({
        code: ErrorCodes.REGISTRATION_NOT_FOUND,
        message: 'La inscripción no fue encontrada',
      });
    }

    return registration;
  }

  /**
   * Obtener inscripciones de un usuario
   */
  async findByUser(userId: string): Promise<WorkshopRegistration[]> {
    return this.registrationRepository.find({
      where: { userId },
      relations: ['session', 'session.workshop'],
      order: { createdAt: 'DESC' },
    });
  }

  /**
   * Obtener inscripciones de una sesión
   */
  async findBySession(sessionId: string): Promise<WorkshopRegistration[]> {
    return this.registrationRepository.find({
      where: { sessionId },
      relations: ['user'],
      order: { createdAt: 'ASC' },
    });
  }

  /**
   * Obtener lista de espera de una sesión
   */
  async getWaitlist(sessionId: string): Promise<WorkshopRegistration[]> {
    return this.registrationRepository.find({
      where: { sessionId, status: RegistrationStatus.WAITLIST },
      relations: ['user'],
      order: { waitlistPosition: 'ASC' },
    });
  }

  /**
   * Confirmar inscripción (después del pago)
   */
  async confirm(
    id: string,
    paymentDetails?: {
      amountPaid: number;
      stripePaymentIntentId?: string;
      discountApplied?: number;
      discountReason?: string;
    },
  ): Promise<WorkshopRegistration> {
    const registration = await this.findById(id);

    if (registration.status === RegistrationStatus.CONFIRMED) {
      return registration;
    }

    registration.status = RegistrationStatus.CONFIRMED;
    registration.paymentStatus = RegistrationPaymentStatus.COMPLETED;

    if (paymentDetails) {
      registration.amountPaid = paymentDetails.amountPaid;
      registration.stripePaymentIntentId =
        paymentDetails.stripePaymentIntentId || null;
      registration.discountApplied = paymentDetails.discountApplied || 0;
      registration.discountReason = paymentDetails.discountReason || null;
    }

    const updated = await this.registrationRepository.save(registration);

    this.logger.log(`Inscripción ${id} confirmada`);

    this.eventEmitter.emit('workshop.registration.confirmed', {
      registration: updated,
    });

    return updated;
  }

  /**
   * Cancelar inscripción
   */
  async cancel(id: string, reason?: string): Promise<WorkshopRegistration> {
    const registration = await this.findById(id);

    if (!registration.canCancel) {
      throw new BadRequestException({
        code: ErrorCodes.VALIDATION_ERROR,
        message: 'Esta inscripción no puede ser cancelada',
      });
    }

    const wasConfirmed = registration.status === RegistrationStatus.CONFIRMED;
    const sessionId = registration.sessionId;

    registration.status = RegistrationStatus.CANCELLED;
    registration.cancelledAt = new Date();
    registration.cancellationReason = reason || null;

    const updated = await this.registrationRepository.save(registration);

    // Decrementar contador si estaba confirmado
    if (wasConfirmed) {
      await this.sessionsService.decrementParticipants(sessionId);

      // Promover siguiente en lista de espera
      await this.promoteFromWaitlist(sessionId);
    }

    this.logger.log(`Inscripción ${id} cancelada`);

    this.eventEmitter.emit('workshop.registration.cancelled', {
      registration: updated,
    });

    return updated;
  }

  /**
   * Registrar check-in
   */
  async checkIn(
    id: string,
    checkedInBy: string,
  ): Promise<WorkshopRegistration> {
    const registration = await this.findById(id);

    if (registration.status !== RegistrationStatus.CONFIRMED) {
      throw new BadRequestException({
        code: ErrorCodes.VALIDATION_ERROR,
        message: 'Solo se puede hacer check-in a inscripciones confirmadas',
      });
    }

    registration.checkedInAt = new Date();
    registration.checkedInBy = checkedInBy;

    const updated = await this.registrationRepository.save(registration);

    this.logger.log(`Check-in registrado para inscripción ${id}`);
    return updated;
  }

  /**
   * Marcar como asistido
   */
  async markAttended(id: string): Promise<WorkshopRegistration> {
    const registration = await this.findById(id);

    registration.status = RegistrationStatus.ATTENDED;

    const updated = await this.registrationRepository.save(registration);

    this.logger.log(`Inscripción ${id} marcada como asistido`);

    this.eventEmitter.emit('workshop.registration.attended', {
      registration: updated,
    });

    return updated;
  }

  /**
   * Marcar como no show
   */
  async markNoShow(id: string): Promise<WorkshopRegistration> {
    const registration = await this.findById(id);

    registration.status = RegistrationStatus.NO_SHOW;

    const updated = await this.registrationRepository.save(registration);

    this.logger.log(`Inscripción ${id} marcada como no show`);
    return updated;
  }

  /**
   * Emitir certificado
   */
  async issueCertificate(
    id: string,
    certificateUrl: string,
  ): Promise<WorkshopRegistration> {
    const registration = await this.findById(id);

    if (registration.status !== RegistrationStatus.ATTENDED) {
      throw new BadRequestException({
        code: ErrorCodes.VALIDATION_ERROR,
        message: 'Solo se puede emitir certificado a asistentes',
      });
    }

    registration.certificateIssuedAt = new Date();
    registration.certificateUrl = certificateUrl;

    const updated = await this.registrationRepository.save(registration);

    this.logger.log(`Certificado emitido para inscripción ${id}`);

    this.eventEmitter.emit('workshop.certificate.issued', {
      registration: updated,
    });

    return updated;
  }

  /**
   * Procesar reembolso
   */
  async processRefund(
    id: string,
    refundAmount: number,
  ): Promise<WorkshopRegistration> {
    const registration = await this.findById(id);

    registration.status = RegistrationStatus.REFUNDED;
    registration.paymentStatus = RegistrationPaymentStatus.REFUNDED;
    registration.refundAmount = refundAmount;

    const updated = await this.registrationRepository.save(registration);

    // Decrementar contador
    await this.sessionsService.decrementParticipants(registration.sessionId);

    this.logger.log(
      `Reembolso procesado para inscripción ${id}: $${refundAmount}`,
    );
    return updated;
  }

  /**
   * Promover siguiente de lista de espera
   */
  private async promoteFromWaitlist(sessionId: string): Promise<void> {
    const nextInLine = await this.registrationRepository.findOne({
      where: { sessionId, status: RegistrationStatus.WAITLIST },
      order: { waitlistPosition: 'ASC' },
    });

    if (nextInLine) {
      nextInLine.status = RegistrationStatus.PENDING;
      nextInLine.waitlistPosition = null;
      nextInLine.waitlistAddedAt = null;

      await this.registrationRepository.save(nextInLine);
      await this.sessionsService.incrementParticipants(sessionId);

      this.logger.log(
        `Usuario ${nextInLine.userId} promovido de lista de espera`,
      );

      this.eventEmitter.emit('workshop.waitlist.promoted', {
        registration: nextInLine,
      });

      // Reordenar lista de espera
      await this.reorderWaitlist(sessionId);
    }
  }

  /**
   * Reordenar lista de espera
   */
  private async reorderWaitlist(sessionId: string): Promise<void> {
    const waitlist = await this.getWaitlist(sessionId);

    for (let i = 0; i < waitlist.length; i++) {
      waitlist[i].waitlistPosition = i + 1;
    }

    await this.registrationRepository.save(waitlist);
  }

  /**
   * Obtener siguiente posición en lista de espera
   */
  private async getNextWaitlistPosition(sessionId: string): Promise<number> {
    const result = await this.registrationRepository
      .createQueryBuilder('reg')
      .where('reg.sessionId = :sessionId', { sessionId })
      .andWhere('reg.status = :status', { status: RegistrationStatus.WAITLIST })
      .select('MAX(reg.waitlistPosition)', 'maxPosition')
      .getRawOne();

    return (result?.maxPosition || 0) + 1;
  }

  /**
   * Obtener estadísticas de inscripciones de una sesión
   */
  async getSessionStats(sessionId: string): Promise<{
    total: number;
    confirmed: number;
    pending: number;
    waitlist: number;
    cancelled: number;
    attended: number;
    noShow: number;
  }> {
    const registrations = await this.findBySession(sessionId);

    return {
      total: registrations.length,
      confirmed: registrations.filter(
        (r) => r.status === RegistrationStatus.CONFIRMED,
      ).length,
      pending: registrations.filter(
        (r) => r.status === RegistrationStatus.PENDING,
      ).length,
      waitlist: registrations.filter(
        (r) => r.status === RegistrationStatus.WAITLIST,
      ).length,
      cancelled: registrations.filter(
        (r) => r.status === RegistrationStatus.CANCELLED,
      ).length,
      attended: registrations.filter(
        (r) => r.status === RegistrationStatus.ATTENDED,
      ).length,
      noShow: registrations.filter(
        (r) => r.status === RegistrationStatus.NO_SHOW,
      ).length,
    };
  }
}
