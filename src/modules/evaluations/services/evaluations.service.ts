import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Evaluation } from '../entities/evaluation.entity';
import { CreateEvaluationDto, UpdateEvaluationDto, EvaluationQueryDto } from '../dto';
import { ErrorCodes } from '../../../common/dto';

@Injectable()
export class EvaluationsService {
  private readonly logger = new Logger(EvaluationsService.name);

  constructor(
    @InjectRepository(Evaluation)
    private readonly evaluationRepository: Repository<Evaluation>,
  ) {}

  /**
   * Crear una nueva evaluación
   */
  async create(dto: CreateEvaluationDto): Promise<Evaluation> {
    // Validar que passingScore no sea mayor que totalPoints
    const totalPoints = dto.totalPoints || 100;
    const passingScore = dto.passingScore || 70;

    if (passingScore > totalPoints) {
      throw new BadRequestException({
        code: ErrorCodes.VALIDATION_ERROR,
        message: 'El puntaje para aprobar no puede ser mayor que los puntos totales',
      });
    }

    const evaluation = this.evaluationRepository.create({
      ...dto,
      totalPoints,
      passingScore,
    });

    const saved = await this.evaluationRepository.save(evaluation);
    this.logger.log(`Evaluación creada: ${saved.id} - ${saved.title}`);
    return saved;
  }

  /**
   * Obtener todas las evaluaciones con paginación y filtros
   */
  async findAll(query: EvaluationQueryDto): Promise<{
    data: Evaluation[];
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
      moduleId,
      type,
      isPublished,
      sortBy = 'order',
      sortOrder = 'ASC',
    } = query;

    const queryBuilder = this.evaluationRepository
      .createQueryBuilder('evaluation')
      .leftJoinAndSelect('evaluation.course', 'course')
      .leftJoinAndSelect('evaluation.module', 'module');

    // Filtros
    if (courseId) {
      queryBuilder.andWhere('evaluation.courseId = :courseId', { courseId });
    }

    if (moduleId) {
      queryBuilder.andWhere('evaluation.moduleId = :moduleId', { moduleId });
    }

    if (type) {
      queryBuilder.andWhere('evaluation.type = :type', { type });
    }

    if (isPublished !== undefined) {
      queryBuilder.andWhere('evaluation.isPublished = :isPublished', { isPublished });
    }

    // Ordenamiento
    const validSortFields = ['createdAt', 'order', 'title', 'type'];
    const sortField = validSortFields.includes(sortBy) ? sortBy : 'order';
    queryBuilder.orderBy(`evaluation.${sortField}`, sortOrder);

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
   * Obtener evaluaciones de un curso
   */
  async findByCourse(courseId: string, onlyPublished = false): Promise<Evaluation[]> {
    const where: any = { courseId };
    if (onlyPublished) {
      where.isPublished = true;
    }

    return this.evaluationRepository.find({
      where,
      relations: ['module'],
      order: { order: 'ASC' },
    });
  }

  /**
   * Obtener evaluaciones publicadas de un curso
   */
  async findPublishedByCourse(courseId: string): Promise<Evaluation[]> {
    return this.findByCourse(courseId, true);
  }

  /**
   * Obtener una evaluación por ID
   * @throws NotFoundException si no existe
   */
  async findById(id: string): Promise<Evaluation> {
    const evaluation = await this.evaluationRepository.findOne({
      where: { id },
      relations: ['course', 'module'],
    });

    if (!evaluation) {
      throw new NotFoundException({
        code: ErrorCodes.EVAL_NOT_FOUND,
        message: 'La evaluación no fue encontrada',
      });
    }

    return evaluation;
  }

  /**
   * Actualizar una evaluación
   * @throws NotFoundException si no existe
   */
  async update(id: string, dto: UpdateEvaluationDto): Promise<Evaluation> {
    const evaluation = await this.findById(id);

    // Validar que passingScore no sea mayor que totalPoints
    const totalPoints = dto.totalPoints ?? evaluation.totalPoints;
    const passingScore = dto.passingScore ?? evaluation.passingScore;

    if (passingScore > totalPoints) {
      throw new BadRequestException({
        code: ErrorCodes.VALIDATION_ERROR,
        message: 'El puntaje para aprobar no puede ser mayor que los puntos totales',
      });
    }

    Object.assign(evaluation, dto);
    const updated = await this.evaluationRepository.save(evaluation);

    this.logger.log(`Evaluación actualizada: ${updated.id}`);
    return updated;
  }

  /**
   * Publicar una evaluación
   */
  async publish(id: string): Promise<Evaluation> {
    const evaluation = await this.findById(id);
    evaluation.isPublished = true;
    const updated = await this.evaluationRepository.save(evaluation);

    this.logger.log(`Evaluación publicada: ${updated.id}`);
    return updated;
  }

  /**
   * Despublicar una evaluación
   */
  async unpublish(id: string): Promise<Evaluation> {
    const evaluation = await this.findById(id);
    evaluation.isPublished = false;
    const updated = await this.evaluationRepository.save(evaluation);

    this.logger.log(`Evaluación despublicada: ${updated.id}`);
    return updated;
  }

  /**
   * Eliminar una evaluación
   */
  async delete(id: string): Promise<void> {
    const evaluation = await this.findById(id);
    await this.evaluationRepository.remove(evaluation);
    this.logger.log(`Evaluación eliminada: ${id}`);
  }

  /**
   * Obtener estadísticas de evaluaciones de un curso
   */
  async getStatsByCourse(courseId: string): Promise<{
    total: number;
    published: number;
    draft: number;
    byType: Record<string, number>;
  }> {
    const evaluations = await this.evaluationRepository.find({
      where: { courseId },
      select: ['id', 'type', 'isPublished'],
    });

    const total = evaluations.length;
    const published = evaluations.filter((e) => e.isPublished).length;
    const draft = total - published;

    const byType: Record<string, number> = {};
    evaluations.forEach((e) => {
      byType[e.type] = (byType[e.type] || 0) + 1;
    });

    return { total, published, draft, byType };
  }
}
