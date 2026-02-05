import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, FindOptionsWhere, Not, IsNull } from 'typeorm';
import { Review, ReviewStatus } from '../entities/review.entity';
import { Enrollment, EnrollmentStatus } from '../../enrollments/entities/enrollment.entity';
import {
  CreateReviewDto,
  UpdateReviewDto,
  ReviewQueryDto,
  InstructorResponseDto,
  ModerateReviewDto,
} from '../dto';
import { ErrorCodes } from '../../../common/dto';

@Injectable()
export class ReviewsService {
  private readonly logger = new Logger(ReviewsService.name);

  constructor(
    @InjectRepository(Review)
    private readonly reviewRepository: Repository<Review>,
    @InjectRepository(Enrollment)
    private readonly enrollmentRepository: Repository<Enrollment>,
  ) {}

  // ============================================
  // CREAR REVIEW
  // ============================================

  /**
   * Crear un review (solo estudiantes con inscripción completada o activa)
   */
  async create(dto: CreateReviewDto, studentId: string): Promise<Review> {
    // Verificar si ya existe un review del estudiante para este curso
    const existingReview = await this.reviewRepository.findOne({
      where: { courseId: dto.courseId, studentId },
    });

    if (existingReview) {
      throw new ConflictException({
        code: ErrorCodes.REVIEW_ALREADY_EXISTS,
        message: 'Ya has dejado un review para este curso',
      });
    }

    // Verificar que el estudiante tenga una inscripción al curso
    const enrollment = await this.enrollmentRepository
      .createQueryBuilder('enrollment')
      .innerJoin('enrollment.cohort', 'cohort')
      .where('cohort.courseId = :courseId', { courseId: dto.courseId })
      .andWhere('enrollment.studentId = :studentId', { studentId })
      .andWhere('enrollment.status IN (:...statuses)', {
        statuses: [EnrollmentStatus.ACTIVE, EnrollmentStatus.COMPLETED],
      })
      .getOne();

    if (!enrollment) {
      throw new ForbiddenException({
        code: ErrorCodes.REVIEW_NOT_ALLOWED,
        message: 'Debes estar inscrito o haber completado el curso para dejar un review',
      });
    }

    // Verificar si completó el curso
    const isVerified = enrollment.status === EnrollmentStatus.COMPLETED;

    const review = this.reviewRepository.create({
      ...dto,
      studentId,
      isVerifiedPurchase: isVerified,
      status: ReviewStatus.APPROVED, // Auto-aprobación (puede cambiarse a PENDING para moderación)
    });

    const saved = await this.reviewRepository.save(review);

    this.logger.log(`Review creado: ${saved.id} (Curso: ${dto.courseId}, Rating: ${dto.rating})`);
    return saved;
  }

  // ============================================
  // CONSULTAS
  // ============================================

  /**
   * Obtener reviews con filtros y paginación
   */
  async findAll(query: ReviewQueryDto): Promise<{
    data: Review[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
      hasNextPage: boolean;
      hasPrevPage: boolean;
    };
    summary: {
      averageRating: number;
      totalReviews: number;
      ratingDistribution: Record<number, number>;
    };
  }> {
    const {
      page = 1,
      limit = 20,
      courseId,
      studentId,
      status,
      rating,
      minRating,
      verified,
      featured,
      withComment,
      sortBy = 'createdAt',
      sortOrder = 'DESC',
    } = query;

    const queryBuilder = this.reviewRepository
      .createQueryBuilder('review')
      .leftJoinAndSelect('review.student', 'student')
      .leftJoinAndSelect('review.course', 'course');

    // Filtros
    if (courseId) {
      queryBuilder.andWhere('review.courseId = :courseId', { courseId });
    }

    if (studentId) {
      queryBuilder.andWhere('review.studentId = :studentId', { studentId });
    }

    if (status) {
      queryBuilder.andWhere('review.status = :status', { status });
    } else {
      // Por defecto, solo mostrar aprobados
      queryBuilder.andWhere('review.status = :status', { status: ReviewStatus.APPROVED });
    }

    if (rating) {
      queryBuilder.andWhere('review.rating = :rating', { rating });
    }

    if (minRating) {
      queryBuilder.andWhere('review.rating >= :minRating', { minRating });
    }

    if (verified !== undefined) {
      queryBuilder.andWhere('review.isVerifiedPurchase = :verified', { verified });
    }

    if (featured !== undefined) {
      queryBuilder.andWhere('review.isFeatured = :featured', { featured });
    }

    if (withComment) {
      queryBuilder.andWhere('review.comment IS NOT NULL');
    }

    // Ordenamiento
    const validSortFields = ['createdAt', 'rating', 'helpfulCount'];
    const sortField = validSortFields.includes(sortBy) ? sortBy : 'createdAt';
    queryBuilder.orderBy(`review.${sortField}`, sortOrder);

    // Paginación
    const total = await queryBuilder.getCount();
    const totalPages = Math.ceil(total / limit);

    queryBuilder.skip((page - 1) * limit).take(limit);

    const data = await queryBuilder.getMany();

    // Calcular resumen si es para un curso específico
    let summary: {
      averageRating: number;
      totalReviews: number;
      ratingDistribution: Record<number, number>;
    } = {
      averageRating: 0,
      totalReviews: 0,
      ratingDistribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
    };

    if (courseId) {
      summary = await this.getCourseSummary(courseId);
    }

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
      summary,
    };
  }

  /**
   * Obtener review por ID
   */
  async findById(id: string): Promise<Review> {
    const review = await this.reviewRepository.findOne({
      where: { id },
      relations: ['student', 'course', 'respondedBy'],
    });

    if (!review) {
      throw new NotFoundException({
        code: ErrorCodes.REVIEW_NOT_FOUND,
        message: 'El review no fue encontrado',
      });
    }

    return review;
  }

  /**
   * Obtener reviews públicos de un curso
   */
  async findByCourse(courseId: string, limit: number = 10): Promise<Review[]> {
    return this.reviewRepository.find({
      where: {
        courseId,
        status: ReviewStatus.APPROVED,
      },
      relations: ['student'],
      order: { helpfulCount: 'DESC', createdAt: 'DESC' },
      take: limit,
    });
  }

  /**
   * Obtener resumen de reviews de un curso
   */
  async getCourseSummary(courseId: string): Promise<{
    averageRating: number;
    totalReviews: number;
    ratingDistribution: Record<number, number>;
  }> {
    const result = await this.reviewRepository
      .createQueryBuilder('review')
      .select('AVG(review.rating)', 'average')
      .addSelect('COUNT(*)', 'total')
      .where('review.courseId = :courseId', { courseId })
      .andWhere('review.status = :status', { status: ReviewStatus.APPROVED })
      .getRawOne();

    // Distribución por rating
    const distribution = await this.reviewRepository
      .createQueryBuilder('review')
      .select('review.rating', 'rating')
      .addSelect('COUNT(*)', 'count')
      .where('review.courseId = :courseId', { courseId })
      .andWhere('review.status = :status', { status: ReviewStatus.APPROVED })
      .groupBy('review.rating')
      .getRawMany();

    const ratingDistribution: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    for (const d of distribution) {
      ratingDistribution[d.rating] = parseInt(d.count, 10);
    }

    return {
      averageRating: Math.round(parseFloat(result?.average || '0') * 10) / 10,
      totalReviews: parseInt(result?.total || '0', 10),
      ratingDistribution,
    };
  }

  // ============================================
  // ACTUALIZAR
  // ============================================

  /**
   * Actualizar review (solo el autor puede)
   */
  async update(id: string, dto: UpdateReviewDto, studentId: string): Promise<Review> {
    const review = await this.findById(id);

    if (review.studentId !== studentId) {
      throw new ForbiddenException({
        code: ErrorCodes.REVIEW_NOT_OWNER,
        message: 'No puedes editar reviews de otros usuarios',
      });
    }

    Object.assign(review, dto);

    const updated = await this.reviewRepository.save(review);

    this.logger.log(`Review actualizado: ${id}`);
    return updated;
  }

  /**
   * Agregar respuesta del instructor
   */
  async addInstructorResponse(
    id: string,
    dto: InstructorResponseDto,
    instructorId: string,
  ): Promise<Review> {
    const review = await this.findById(id);

    review.instructorResponse = dto.response || null;
    review.respondedAt = dto.response ? new Date() : null;
    review.respondedById = dto.response ? instructorId : null;

    const updated = await this.reviewRepository.save(review);

    this.logger.log(`Respuesta de instructor agregada a review: ${id}`);
    return updated;
  }

  /**
   * Marcar como útil
   */
  async markAsHelpful(id: string): Promise<Review> {
    const review = await this.findById(id);
    review.incrementHelpfulCount();

    return this.reviewRepository.save(review);
  }

  // ============================================
  // MODERACIÓN (ADMIN)
  // ============================================

  /**
   * Moderar un review
   */
  async moderate(
    id: string,
    dto: ModerateReviewDto,
    moderatorId: string,
  ): Promise<Review> {
    const review = await this.findById(id);

    switch (dto.action) {
      case 'approve':
        review.status = ReviewStatus.APPROVED;
        break;
      case 'reject':
        review.status = ReviewStatus.REJECTED;
        review.rejectionReason = dto.reason || null;
        break;
      case 'hide':
        review.status = ReviewStatus.HIDDEN;
        break;
    }

    review.moderatedById = moderatorId;
    review.moderatedAt = new Date();

    const updated = await this.reviewRepository.save(review);

    this.logger.log(`Review moderado: ${id} - ${dto.action}`);
    return updated;
  }

  /**
   * Destacar/quitar destacado de un review
   */
  async toggleFeatured(id: string): Promise<Review> {
    const review = await this.findById(id);
    review.isFeatured = !review.isFeatured;

    const updated = await this.reviewRepository.save(review);

    this.logger.log(`Review ${review.isFeatured ? 'destacado' : 'quitado de destacados'}: ${id}`);
    return updated;
  }

  /**
   * Obtener reviews pendientes de moderación
   */
  async findPendingModeration(): Promise<Review[]> {
    return this.reviewRepository.find({
      where: { status: ReviewStatus.PENDING },
      relations: ['student', 'course'],
      order: { createdAt: 'ASC' },
    });
  }

  // ============================================
  // ELIMINAR
  // ============================================

  /**
   * Eliminar review (solo el autor o admin)
   */
  async delete(id: string, userId: string, isAdmin: boolean = false): Promise<void> {
    const review = await this.findById(id);

    if (!isAdmin && review.studentId !== userId) {
      throw new ForbiddenException({
        code: ErrorCodes.REVIEW_NOT_OWNER,
        message: 'No puedes eliminar reviews de otros usuarios',
      });
    }

    await this.reviewRepository.delete(id);

    this.logger.log(`Review eliminado: ${id}`);
  }
}
