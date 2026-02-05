import {
  Injectable,
  Logger,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, ILike } from 'typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Discussion, DiscussionStatus, DiscussionType } from '../entities/discussion.entity';
import { DiscussionSubscription } from '../entities/discussion-subscription.entity';
import { Enrollment, EnrollmentStatus } from '../../enrollments/entities/enrollment.entity';
import {
  CreateDiscussionDto,
  UpdateDiscussionDto,
  ModerateDiscussionDto,
  DiscussionQueryDto,
} from '../dto';
import { ErrorCodes } from '../../../common/dto';

@Injectable()
export class DiscussionsService {
  private readonly logger = new Logger(DiscussionsService.name);

  constructor(
    @InjectRepository(Discussion)
    private readonly discussionRepository: Repository<Discussion>,
    @InjectRepository(DiscussionSubscription)
    private readonly subscriptionRepository: Repository<DiscussionSubscription>,
    @InjectRepository(Enrollment)
    private readonly enrollmentRepository: Repository<Enrollment>,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  // ============================================
  // CREAR
  // ============================================

  /**
   * Crear una nueva discusión
   */
  async create(dto: CreateDiscussionDto, authorId: string): Promise<Discussion> {
    // Si es foro de curso, verificar inscripción
    if (dto.courseId) {
      const hasAccess = await this.checkCourseAccess(dto.courseId, authorId);
      if (!hasAccess) {
        throw new ForbiddenException({
          code: ErrorCodes.FORBIDDEN,
          message: 'Debes estar inscrito en el curso para participar en el foro',
        });
      }
    }

    // Generar slug
    const slug = this.generateSlug(dto.title);

    const discussion = this.discussionRepository.create({
      ...dto,
      authorId,
      slug,
      lastActivityAt: new Date(),
      lastPostById: authorId,
    });

    const saved = await this.discussionRepository.save(discussion);

    // Auto-suscribir al autor
    await this.subscribe(saved.id, authorId);

    this.logger.log(`Discusión creada: ${saved.id} - ${dto.title}`);

    // Emitir evento
    this.eventEmitter.emit('forum.discussion.created', {
      discussion: saved,
      authorId,
    });

    return saved;
  }

  // ============================================
  // CONSULTAS
  // ============================================

  /**
   * Listar discusiones con filtros
   */
  async findAll(query: DiscussionQueryDto, userId?: string): Promise<{
    data: Discussion[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
      hasNextPage: boolean;
      hasPrevPage: boolean;
    };
  }> {
    const {
      page = 1,
      limit = 20,
      courseId,
      authorId,
      status,
      type,
      isPinned,
      isResolved,
      tag,
      search,
      sortBy = 'lastActivityAt',
      sortOrder = 'DESC',
    } = query;

    const queryBuilder = this.discussionRepository
      .createQueryBuilder('discussion')
      .leftJoinAndSelect('discussion.author', 'author')
      .leftJoinAndSelect('discussion.course', 'course');

    // Si es foro de curso, verificar acceso del usuario
    if (courseId) {
      queryBuilder.andWhere('discussion.courseId = :courseId', { courseId });
    } else if (courseId === null || courseId === undefined) {
      // Foro general (courseId = null) siempre visible
    }

    // Por defecto, solo mostrar discusiones abiertas al público
    if (status) {
      queryBuilder.andWhere('discussion.status = :status', { status });
    } else {
      // No filtrar por status en admin, pero para usuarios normales solo mostrar open/closed
      queryBuilder.andWhere('discussion.status IN (:...statuses)', {
        statuses: [DiscussionStatus.OPEN, DiscussionStatus.CLOSED],
      });
    }

    if (authorId) {
      queryBuilder.andWhere('discussion.authorId = :authorId', { authorId });
    }

    if (type) {
      queryBuilder.andWhere('discussion.type = :type', { type });
    }

    if (isPinned !== undefined) {
      queryBuilder.andWhere('discussion.isPinned = :isPinned', { isPinned });
    }

    if (isResolved !== undefined) {
      queryBuilder.andWhere('discussion.isResolved = :isResolved', { isResolved });
    }

    if (tag) {
      queryBuilder.andWhere(':tag = ANY(discussion.tags)', { tag });
    }

    if (search) {
      queryBuilder.andWhere(
        '(discussion.title ILIKE :search OR discussion.content ILIKE :search)',
        { search: `%${search}%` },
      );
    }

    // Ordenamiento: pinned primero, luego por sortBy
    const validSortFields = ['createdAt', 'lastActivityAt', 'postCount', 'viewCount'];
    const sortField = validSortFields.includes(sortBy) ? sortBy : 'lastActivityAt';
    queryBuilder
      .orderBy('discussion.isPinned', 'DESC')
      .addOrderBy(`discussion.${sortField}`, sortOrder);

    // Paginación
    const total = await queryBuilder.getCount();
    const totalPages = Math.ceil(total / limit);

    queryBuilder.skip((page - 1) * limit).take(limit);

    const data = await queryBuilder.getMany();

    return {
      data,
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1,
      },
    };
  }

  /**
   * Obtener discusión por ID
   */
  async findById(id: string, incrementViews: boolean = false): Promise<Discussion> {
    const discussion = await this.discussionRepository.findOne({
      where: { id },
      relations: ['author', 'course', 'moderatedBy'],
    });

    if (!discussion) {
      throw new NotFoundException({
        code: ErrorCodes.NOT_FOUND,
        message: 'La discusión no fue encontrada',
      });
    }

    // Incrementar vistas
    if (incrementViews) {
      discussion.incrementViewCount();
      await this.discussionRepository.save(discussion);
    }

    return discussion;
  }

  /**
   * Obtener discusión por slug
   */
  async findBySlug(slug: string): Promise<Discussion> {
    const discussion = await this.discussionRepository.findOne({
      where: { slug },
      relations: ['author', 'course'],
    });

    if (!discussion) {
      throw new NotFoundException({
        code: ErrorCodes.NOT_FOUND,
        message: 'La discusión no fue encontrada',
      });
    }

    // Incrementar vistas
    discussion.incrementViewCount();
    await this.discussionRepository.save(discussion);

    return discussion;
  }

  // ============================================
  // ACTUALIZAR
  // ============================================

  /**
   * Actualizar discusión (solo autor)
   */
  async update(
    id: string,
    dto: UpdateDiscussionDto,
    userId: string,
  ): Promise<Discussion> {
    const discussion = await this.findById(id);

    if (discussion.authorId !== userId) {
      throw new ForbiddenException({
        code: ErrorCodes.FORBIDDEN,
        message: 'No puedes editar discusiones de otros usuarios',
      });
    }

    if (discussion.status !== DiscussionStatus.OPEN) {
      throw new BadRequestException({
        code: ErrorCodes.FORBIDDEN,
        message: 'No se puede editar una discusión cerrada o bloqueada',
      });
    }

    // Actualizar slug si cambió el título
    if (dto.title && dto.title !== discussion.title) {
      discussion.slug = this.generateSlug(dto.title);
    }

    Object.assign(discussion, dto);

    const updated = await this.discussionRepository.save(discussion);

    this.logger.log(`Discusión actualizada: ${id}`);
    return updated;
  }

  /**
   * Moderar discusión (admin)
   */
  async moderate(
    id: string,
    dto: ModerateDiscussionDto,
    moderatorId: string,
  ): Promise<Discussion> {
    const discussion = await this.findById(id);

    if (dto.status) {
      discussion.status = dto.status;
      discussion.moderatedById = moderatorId;
      discussion.moderatedAt = new Date();
      discussion.moderationReason = dto.reason || null;
    }

    if (dto.isPinned !== undefined) {
      discussion.isPinned = dto.isPinned;
    }

    const updated = await this.discussionRepository.save(discussion);

    this.logger.log(`Discusión moderada: ${id} - ${dto.status || 'pin toggled'}`);

    // Emitir evento
    this.eventEmitter.emit('forum.discussion.moderated', {
      discussion: updated,
      moderatorId,
      action: dto.status || 'pin_toggle',
    });

    return updated;
  }

  /**
   * Marcar como resuelta
   */
  async markAsResolved(
    id: string,
    postId: string,
    userId: string,
  ): Promise<Discussion> {
    const discussion = await this.findById(id);

    if (discussion.authorId !== userId) {
      throw new ForbiddenException({
        code: ErrorCodes.FORBIDDEN,
        message: 'Solo el autor puede marcar la discusión como resuelta',
      });
    }

    if (discussion.type !== DiscussionType.QUESTION) {
      throw new BadRequestException({
        code: ErrorCodes.VALIDATION_ERROR,
        message: 'Solo las preguntas pueden marcarse como resueltas',
      });
    }

    discussion.markAsResolved(postId);

    const updated = await this.discussionRepository.save(discussion);

    this.logger.log(`Discusión marcada como resuelta: ${id}`);
    return updated;
  }

  // ============================================
  // SUSCRIPCIONES
  // ============================================

  /**
   * Suscribirse a una discusión
   */
  async subscribe(discussionId: string, userId: string): Promise<DiscussionSubscription> {
    const existing = await this.subscriptionRepository.findOne({
      where: { discussionId, userId },
    });

    if (existing) {
      return existing;
    }

    const subscription = this.subscriptionRepository.create({
      discussionId,
      userId,
    });

    return this.subscriptionRepository.save(subscription);
  }

  /**
   * Cancelar suscripción
   */
  async unsubscribe(discussionId: string, userId: string): Promise<void> {
    await this.subscriptionRepository.delete({ discussionId, userId });
  }

  /**
   * Verificar suscripción
   */
  async isSubscribed(discussionId: string, userId: string): Promise<boolean> {
    const subscription = await this.subscriptionRepository.findOne({
      where: { discussionId, userId },
    });
    return !!subscription;
  }

  /**
   * Obtener suscriptores de una discusión
   */
  async getSubscribers(discussionId: string): Promise<DiscussionSubscription[]> {
    return this.subscriptionRepository.find({
      where: { discussionId },
      relations: ['user'],
    });
  }

  // ============================================
  // ELIMINAR
  // ============================================

  /**
   * Eliminar discusión (soft delete)
   */
  async delete(id: string, userId: string, isAdmin: boolean = false): Promise<void> {
    const discussion = await this.findById(id);

    if (!isAdmin && discussion.authorId !== userId) {
      throw new ForbiddenException({
        code: ErrorCodes.FORBIDDEN,
        message: 'No puedes eliminar discusiones de otros usuarios',
      });
    }

    await this.discussionRepository.softDelete(id);

    this.logger.log(`Discusión eliminada: ${id}`);
  }

  // ============================================
  // HELPERS
  // ============================================

  /**
   * Verificar acceso a foro de curso
   */
  private async checkCourseAccess(courseId: string, userId: string): Promise<boolean> {
    const enrollment = await this.enrollmentRepository
      .createQueryBuilder('enrollment')
      .innerJoin('enrollment.cohort', 'cohort')
      .where('cohort.courseId = :courseId', { courseId })
      .andWhere('enrollment.studentId = :userId', { userId })
      .andWhere('enrollment.status IN (:...statuses)', {
        statuses: [EnrollmentStatus.ACTIVE, EnrollmentStatus.COMPLETED],
      })
      .getOne();

    return !!enrollment;
  }

  /**
   * Generar slug único
   */
  private generateSlug(title: string): string {
    const baseSlug = title
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .substring(0, 200);

    // Agregar timestamp para unicidad
    const timestamp = Date.now().toString(36);
    return `${baseSlug}-${timestamp}`;
  }

  /**
   * Actualizar última actividad (llamado por PostsService)
   */
  async updateLastActivity(discussionId: string, userId: string): Promise<void> {
    await this.discussionRepository.update(discussionId, {
      lastActivityAt: new Date(),
      lastPostById: userId,
    });
  }

  /**
   * Incrementar contador de posts (llamado por PostsService)
   */
  async incrementPostCount(discussionId: string): Promise<void> {
    await this.discussionRepository.increment({ id: discussionId }, 'postCount', 1);
  }

  /**
   * Decrementar contador de posts (llamado por PostsService)
   */
  async decrementPostCount(discussionId: string): Promise<void> {
    await this.discussionRepository.decrement({ id: discussionId }, 'postCount', 1);
  }
}
