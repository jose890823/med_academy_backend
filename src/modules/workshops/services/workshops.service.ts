import {
  Injectable,
  Logger,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Workshop, WorkshopStatus } from '../entities/workshop.entity';
import { CreateWorkshopDto, UpdateWorkshopDto } from '../dto';
import { ErrorCodes } from '../../../common/dto';

@Injectable()
export class WorkshopsService {
  private readonly logger = new Logger(WorkshopsService.name);

  constructor(
    @InjectRepository(Workshop)
    private readonly workshopRepository: Repository<Workshop>,
  ) {}

  /**
   * Crear un nuevo workshop
   */
  async create(dto: CreateWorkshopDto): Promise<Workshop> {
    // Verificar que el slug no exista
    const existing = await this.workshopRepository.findOne({
      where: { slug: dto.slug },
    });

    if (existing) {
      throw new ConflictException({
        code: ErrorCodes.VALIDATION_ERROR,
        message: 'Ya existe un workshop con este slug',
      });
    }

    const workshop = this.workshopRepository.create(dto);
    const saved = await this.workshopRepository.save(workshop);

    this.logger.log(`Workshop creado: ${saved.title} (${saved.id})`);
    return saved;
  }

  /**
   * Obtener todos los workshops
   */
  async findAll(options?: {
    status?: WorkshopStatus;
    categoryId?: string;
    featured?: boolean;
  }): Promise<Workshop[]> {
    const query = this.workshopRepository
      .createQueryBuilder('workshop')
      .leftJoinAndSelect('workshop.category', 'category')
      .leftJoinAndSelect('workshop.mainInstructor', 'mainInstructor')
      .where('workshop.deletedAt IS NULL');

    if (options?.status) {
      query.andWhere('workshop.status = :status', { status: options.status });
    }

    if (options?.categoryId) {
      query.andWhere('workshop.categoryId = :categoryId', {
        categoryId: options.categoryId,
      });
    }

    if (options?.featured !== undefined) {
      query.andWhere('workshop.isFeatured = :featured', {
        featured: options.featured,
      });
    }

    query.orderBy('workshop.sortOrder', 'ASC').addOrderBy('workshop.title', 'ASC');

    return query.getMany();
  }

  /**
   * Obtener workshops publicados (para público)
   */
  async findPublished(): Promise<Workshop[]> {
    return this.findAll({ status: WorkshopStatus.PUBLISHED });
  }

  /**
   * Obtener workshop por ID
   */
  async findById(id: string): Promise<Workshop> {
    const workshop = await this.workshopRepository.findOne({
      where: { id },
      relations: [
        'category',
        'mainInstructor',
        'instructors',
        'instructors.user',
        'sessions',
      ],
    });

    if (!workshop) {
      throw new NotFoundException({
        code: ErrorCodes.WORKSHOP_NOT_FOUND,
        message: 'El workshop no fue encontrado',
      });
    }

    return workshop;
  }

  /**
   * Obtener workshop por slug
   */
  async findBySlug(slug: string): Promise<Workshop> {
    const workshop = await this.workshopRepository.findOne({
      where: { slug, status: WorkshopStatus.PUBLISHED },
      relations: [
        'category',
        'mainInstructor',
        'instructors',
        'instructors.user',
        'sessions',
      ],
    });

    if (!workshop) {
      throw new NotFoundException({
        code: ErrorCodes.WORKSHOP_NOT_FOUND,
        message: 'El workshop no fue encontrado',
      });
    }

    return workshop;
  }

  /**
   * Actualizar workshop
   */
  async update(id: string, dto: UpdateWorkshopDto): Promise<Workshop> {
    const workshop = await this.findById(id);

    // Verificar slug único si se está cambiando
    if (dto.slug && dto.slug !== workshop.slug) {
      const existing = await this.workshopRepository.findOne({
        where: { slug: dto.slug },
      });
      if (existing) {
        throw new ConflictException({
          code: ErrorCodes.VALIDATION_ERROR,
          message: 'Ya existe un workshop con este slug',
        });
      }
    }

    Object.assign(workshop, dto);
    const updated = await this.workshopRepository.save(workshop);

    this.logger.log(`Workshop actualizado: ${updated.title} (${updated.id})`);
    return updated;
  }

  /**
   * Publicar workshop
   */
  async publish(id: string): Promise<Workshop> {
    const workshop = await this.findById(id);
    workshop.status = WorkshopStatus.PUBLISHED;
    const updated = await this.workshopRepository.save(workshop);

    this.logger.log(`Workshop publicado: ${updated.title} (${updated.id})`);
    return updated;
  }

  /**
   * Archivar workshop
   */
  async archive(id: string): Promise<Workshop> {
    const workshop = await this.findById(id);
    workshop.status = WorkshopStatus.ARCHIVED;
    const updated = await this.workshopRepository.save(workshop);

    this.logger.log(`Workshop archivado: ${updated.title} (${updated.id})`);
    return updated;
  }

  /**
   * Eliminar workshop (soft delete)
   */
  async delete(id: string): Promise<void> {
    const workshop = await this.findById(id);
    await this.workshopRepository.softRemove(workshop);

    this.logger.log(`Workshop eliminado: ${workshop.title} (${id})`);
  }

  /**
   * Obtener workshops destacados
   */
  async findFeatured(limit = 4): Promise<Workshop[]> {
    return this.workshopRepository.find({
      where: { isFeatured: true, status: WorkshopStatus.PUBLISHED },
      relations: ['category', 'mainInstructor'],
      order: { sortOrder: 'ASC' },
      take: limit,
    });
  }

  /**
   * Obtener workshops por categoría
   */
  async findByCategory(categoryId: string): Promise<Workshop[]> {
    return this.findAll({ categoryId, status: WorkshopStatus.PUBLISHED });
  }

  /**
   * Obtener workshops asociados a un curso
   */
  async findByCourse(courseId: string): Promise<Workshop[]> {
    return this.workshopRepository.find({
      where: { associatedCourseId: courseId, status: WorkshopStatus.PUBLISHED },
      relations: ['category', 'mainInstructor'],
      order: { sortOrder: 'ASC' },
    });
  }

  /**
   * Actualizar requisitos del workshop
   */
  async updateRequirements(
    id: string,
    requirements: Workshop['requirements'],
  ): Promise<Workshop> {
    const workshop = await this.findById(id);
    workshop.requirements = requirements;
    const updated = await this.workshopRepository.save(workshop);

    this.logger.log(`Requisitos actualizados para workshop ${id}`);
    return updated;
  }

  /**
   * Toggle destacado
   */
  async toggleFeatured(id: string): Promise<Workshop> {
    const workshop = await this.findById(id);
    workshop.isFeatured = !workshop.isFeatured;
    const updated = await this.workshopRepository.save(workshop);

    this.logger.log(
      `Workshop ${id} ${updated.isFeatured ? 'destacado' : 'no destacado'}`,
    );
    return updated;
  }
}
