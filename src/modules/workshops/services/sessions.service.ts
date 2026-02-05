import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThan, LessThan } from 'typeorm';
import { WorkshopSession, SessionStatus } from '../entities/workshop-session.entity';
import { WorkshopsService } from './workshops.service';
import { CreateSessionDto, UpdateSessionDto } from '../dto';
import { ErrorCodes } from '../../../common/dto';

@Injectable()
export class SessionsService {
  private readonly logger = new Logger(SessionsService.name);

  constructor(
    @InjectRepository(WorkshopSession)
    private readonly sessionRepository: Repository<WorkshopSession>,
    private readonly workshopsService: WorkshopsService,
  ) {}

  /**
   * Crear una nueva sesión
   */
  async create(dto: CreateSessionDto): Promise<WorkshopSession> {
    // Verificar que el workshop existe
    const workshop = await this.workshopsService.findById(dto.workshopId);

    const session = this.sessionRepository.create({
      ...dto,
      maxParticipants: dto.maxParticipants || workshop.maxParticipants,
      minParticipants: dto.minParticipants || workshop.minParticipants,
    });

    const saved = await this.sessionRepository.save(session);

    this.logger.log(`Sesión creada para workshop ${dto.workshopId}: ${saved.id}`);
    return saved;
  }

  /**
   * Obtener sesión por ID
   */
  async findById(id: string): Promise<WorkshopSession> {
    const session = await this.sessionRepository.findOne({
      where: { id },
      relations: ['workshop', 'workshop.mainInstructor', 'registrations'],
    });

    if (!session) {
      throw new NotFoundException({
        code: ErrorCodes.SESSION_NOT_FOUND,
        message: 'La sesión no fue encontrada',
      });
    }

    return session;
  }

  /**
   * Obtener sesiones de un workshop
   */
  async findByWorkshop(workshopId: string): Promise<WorkshopSession[]> {
    return this.sessionRepository.find({
      where: { workshopId },
      order: { startDate: 'ASC' },
    });
  }

  /**
   * Obtener sesiones próximas de un workshop
   */
  async findUpcomingByWorkshop(workshopId: string): Promise<WorkshopSession[]> {
    return this.sessionRepository.find({
      where: {
        workshopId,
        startDate: MoreThan(new Date()),
        status: SessionStatus.SCHEDULED,
      },
      order: { startDate: 'ASC' },
    });
  }

  /**
   * Obtener sesiones disponibles (con cupo y abiertas)
   */
  async findAvailable(workshopId: string): Promise<WorkshopSession[]> {
    const sessions = await this.sessionRepository
      .createQueryBuilder('session')
      .where('session.workshopId = :workshopId', { workshopId })
      .andWhere('session.startDate > :now', { now: new Date() })
      .andWhere('session.registrationOpen = :open', { open: true })
      .andWhere('session.currentParticipants < session.maxParticipants')
      .andWhere('session.status IN (:...statuses)', {
        statuses: [SessionStatus.SCHEDULED, SessionStatus.CONFIRMED],
      })
      .orderBy('session.startDate', 'ASC')
      .getMany();

    return sessions;
  }

  /**
   * Actualizar sesión
   */
  async update(id: string, dto: UpdateSessionDto): Promise<WorkshopSession> {
    const session = await this.findById(id);

    Object.assign(session, dto);
    const updated = await this.sessionRepository.save(session);

    this.logger.log(`Sesión actualizada: ${updated.id}`);
    return updated;
  }

  /**
   * Actualizar estado de la sesión
   */
  async updateStatus(id: string, status: SessionStatus): Promise<WorkshopSession> {
    const session = await this.findById(id);
    session.status = status;
    const updated = await this.sessionRepository.save(session);

    this.logger.log(`Sesión ${id} - estado actualizado a ${status}`);
    return updated;
  }

  /**
   * Abrir inscripciones
   */
  async openRegistration(id: string): Promise<WorkshopSession> {
    const session = await this.findById(id);
    session.registrationOpen = true;
    const updated = await this.sessionRepository.save(session);

    this.logger.log(`Inscripciones abiertas para sesión ${id}`);
    return updated;
  }

  /**
   * Cerrar inscripciones
   */
  async closeRegistration(id: string): Promise<WorkshopSession> {
    const session = await this.findById(id);
    session.registrationOpen = false;
    const updated = await this.sessionRepository.save(session);

    this.logger.log(`Inscripciones cerradas para sesión ${id}`);
    return updated;
  }

  /**
   * Incrementar contador de participantes
   */
  async incrementParticipants(id: string): Promise<void> {
    const session = await this.findById(id);

    if (session.currentParticipants >= session.maxParticipants) {
      throw new BadRequestException({
        code: ErrorCodes.SESSION_FULL,
        message: 'La sesión no tiene cupos disponibles',
      });
    }

    await this.sessionRepository.increment({ id }, 'currentParticipants', 1);

    // Verificar si se llenó
    const updated = await this.findById(id);
    if (updated.isFull) {
      updated.status = SessionStatus.FULL;
      await this.sessionRepository.save(updated);
    }

    this.logger.log(`Participante agregado a sesión ${id}`);
  }

  /**
   * Decrementar contador de participantes
   */
  async decrementParticipants(id: string): Promise<void> {
    const session = await this.findById(id);

    if (session.currentParticipants > 0) {
      await this.sessionRepository.decrement({ id }, 'currentParticipants', 1);

      // Si estaba llena, cambiar estado
      if (session.status === SessionStatus.FULL) {
        session.status = SessionStatus.CONFIRMED;
        await this.sessionRepository.save(session);
      }

      this.logger.log(`Participante removido de sesión ${id}`);
    }
  }

  /**
   * Confirmar sesión (mínimo alcanzado)
   */
  async confirmSession(id: string): Promise<WorkshopSession> {
    const session = await this.findById(id);

    if (!session.minimumReached) {
      throw new BadRequestException({
        code: ErrorCodes.VALIDATION_ERROR,
        message: 'No se ha alcanzado el mínimo de participantes',
      });
    }

    session.status = SessionStatus.CONFIRMED;
    const updated = await this.sessionRepository.save(session);

    this.logger.log(`Sesión ${id} confirmada`);
    return updated;
  }

  /**
   * Cancelar sesión
   */
  async cancelSession(id: string, reason?: string): Promise<WorkshopSession> {
    const session = await this.findById(id);
    session.status = SessionStatus.CANCELLED;
    session.registrationOpen = false;
    if (reason) {
      session.internalNotes = `${session.internalNotes || ''}\nCancelación: ${reason}`;
    }
    const updated = await this.sessionRepository.save(session);

    this.logger.log(`Sesión ${id} cancelada`);
    return updated;
  }

  /**
   * Marcar sesión como completada
   */
  async completeSession(id: string): Promise<WorkshopSession> {
    const session = await this.findById(id);
    session.status = SessionStatus.COMPLETED;
    session.registrationOpen = false;
    const updated = await this.sessionRepository.save(session);

    this.logger.log(`Sesión ${id} completada`);
    return updated;
  }

  /**
   * Eliminar sesión
   */
  async delete(id: string): Promise<void> {
    const session = await this.findById(id);

    if (session.currentParticipants > 0) {
      throw new BadRequestException({
        code: ErrorCodes.VALIDATION_ERROR,
        message: 'No se puede eliminar una sesión con participantes registrados',
      });
    }

    await this.sessionRepository.remove(session);

    this.logger.log(`Sesión eliminada: ${id}`);
  }

  /**
   * Obtener próximas sesiones (todas)
   */
  async findUpcoming(limit = 10): Promise<WorkshopSession[]> {
    return this.sessionRepository.find({
      where: {
        startDate: MoreThan(new Date()),
        status: SessionStatus.SCHEDULED,
        registrationOpen: true,
      },
      relations: ['workshop'],
      order: { startDate: 'ASC' },
      take: limit,
    });
  }

  /**
   * Obtener sesiones por ciudad
   */
  async findByCity(city: string): Promise<WorkshopSession[]> {
    return this.sessionRepository.find({
      where: {
        locationCity: city,
        startDate: MoreThan(new Date()),
        registrationOpen: true,
      },
      relations: ['workshop'],
      order: { startDate: 'ASC' },
    });
  }
}
