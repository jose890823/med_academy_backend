import {
  Injectable,
  Logger,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Course, CourseStatus } from '../entities/course.entity';
import { CreateCourseDto, UpdateCourseDto, CourseQueryDto } from '../dto';
import { ErrorCodes } from '../../../common/dto';

@Injectable()
export class CoursesService {
  private readonly logger = new Logger(CoursesService.name);

  constructor(
    @InjectRepository(Course)
    private readonly courseRepository: Repository<Course>,
  ) {}

  /**
   * Crear un nuevo curso
   * @throws ConflictException si el slug ya existe
   */
  async create(dto: CreateCourseDto): Promise<Course> {
    // Verificar que el slug no exista
    const existing = await this.courseRepository.findOne({
      where: { slug: dto.slug },
    });

    if (existing) {
      throw new ConflictException({
        code: ErrorCodes.VALIDATION_ERROR,
        message: 'Ya existe un curso con este slug',
      });
    }

    const course = this.courseRepository.create(dto);
    const saved = await this.courseRepository.save(course);

    this.logger.log(`Curso creado: ${saved.title} (${saved.id})`);
    return saved;
  }

  /**
   * Obtener todos los cursos con paginación y filtros
   */
  async findAll(query: CourseQueryDto): Promise<{
    data: Course[];
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
      search,
      status,
      modality,
      level,
      language,
      categoryId,
      isFeatured,
      sortBy = 'order',
      sortOrder = 'ASC',
    } = query;

    const queryBuilder = this.courseRepository
      .createQueryBuilder('course')
      .leftJoinAndSelect('course.category', 'category')
      .leftJoinAndSelect('course.mainInstructor', 'mainInstructor');

    // Filtro por búsqueda de texto
    if (search) {
      queryBuilder.andWhere(
        '(course.title ILIKE :search OR course.shortDescription ILIKE :search)',
        { search: `%${search}%` },
      );
    }

    // Filtros específicos
    if (status) {
      queryBuilder.andWhere('course.status = :status', { status });
    }

    if (modality) {
      queryBuilder.andWhere('course.modality = :modality', { modality });
    }

    if (level) {
      queryBuilder.andWhere('course.level = :level', { level });
    }

    if (language) {
      queryBuilder.andWhere('course.language = :language', { language });
    }

    if (categoryId) {
      queryBuilder.andWhere('course.categoryId = :categoryId', { categoryId });
    }

    if (isFeatured !== undefined) {
      queryBuilder.andWhere('course.isFeatured = :isFeatured', { isFeatured });
    }

    // Ordenamiento
    const validSortFields = ['createdAt', 'title', 'regularPrice', 'order'];
    const sortField = validSortFields.includes(sortBy) ? sortBy : 'order';
    queryBuilder.orderBy(`course.${sortField}`, sortOrder);

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
   * Obtener cursos publicados (para listados públicos)
   */
  async findPublished(query: CourseQueryDto): Promise<{
    data: Course[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
      hasNextPage: boolean;
      hasPrevPage: boolean;
    };
  }> {
    return this.findAll({
      ...query,
      status: CourseStatus.PUBLISHED,
    });
  }

  /**
   * Obtener cursos destacados
   */
  async findFeatured(limit: number = 6): Promise<Course[]> {
    return this.courseRepository.find({
      where: {
        status: CourseStatus.PUBLISHED,
        isFeatured: true,
      },
      relations: ['category', 'mainInstructor'],
      order: { order: 'ASC' },
      take: limit,
    });
  }

  /**
   * Obtener un curso por ID
   * @throws NotFoundException si no existe
   */
  async findById(id: string): Promise<Course> {
    const course = await this.courseRepository.findOne({
      where: { id },
      relations: ['category', 'mainInstructor', 'modules', 'cohorts'],
    });

    if (!course) {
      throw new NotFoundException({
        code: ErrorCodes.COURSE_NOT_FOUND,
        message: 'El curso no fue encontrado',
      });
    }

    return course;
  }

  /**
   * Obtener un curso por slug
   * @throws NotFoundException si no existe
   */
  async findBySlug(slug: string): Promise<Course> {
    const course = await this.courseRepository.findOne({
      where: { slug },
      relations: ['category', 'mainInstructor', 'modules', 'cohorts'],
    });

    if (!course) {
      throw new NotFoundException({
        code: ErrorCodes.COURSE_NOT_FOUND,
        message: 'El curso no fue encontrado',
      });
    }

    return course;
  }

  /**
   * Obtener un curso publicado por slug (para frontend público)
   * @throws NotFoundException si no existe o no está publicado
   */
  async findPublishedBySlug(slug: string): Promise<Course> {
    const course = await this.courseRepository.findOne({
      where: { slug, status: CourseStatus.PUBLISHED },
      relations: ['category', 'mainInstructor', 'modules', 'cohorts'],
    });

    if (!course) {
      throw new NotFoundException({
        code: ErrorCodes.COURSE_NOT_FOUND,
        message: 'El curso no fue encontrado',
      });
    }

    return course;
  }

  /**
   * Actualizar un curso
   * @throws NotFoundException si no existe
   * @throws ConflictException si el nuevo slug ya existe
   */
  async update(id: string, dto: UpdateCourseDto): Promise<Course> {
    const course = await this.findById(id);

    // Verificar que el nuevo slug no exista (si se está cambiando)
    if (dto.slug && dto.slug !== course.slug) {
      const existing = await this.courseRepository.findOne({
        where: { slug: dto.slug },
      });

      if (existing) {
        throw new ConflictException({
          code: ErrorCodes.VALIDATION_ERROR,
          message: 'Ya existe un curso con este slug',
        });
      }
    }

    Object.assign(course, dto);
    const updated = await this.courseRepository.save(course);

    this.logger.log(`Curso actualizado: ${updated.title} (${updated.id})`);
    return updated;
  }

  /**
   * Cambiar estado de un curso
   */
  async updateStatus(id: string, status: CourseStatus): Promise<Course> {
    const course = await this.findById(id);
    course.status = status;
    const updated = await this.courseRepository.save(course);

    this.logger.log(`Curso ${id} cambiado a estado: ${status}`);
    return updated;
  }

  /**
   * Eliminar un curso (soft delete)
   * @throws NotFoundException si no existe
   */
  async delete(id: string): Promise<void> {
    const course = await this.findById(id);
    await this.courseRepository.softRemove(course);

    this.logger.log(`Curso eliminado: ${course.title} (${id})`);
  }

  /**
   * Obtener cursos por categoría
   */
  async findByCategory(categoryId: string): Promise<Course[]> {
    return this.courseRepository.find({
      where: { categoryId, status: CourseStatus.PUBLISHED },
      relations: ['mainInstructor'],
      order: { order: 'ASC' },
    });
  }

  /**
   * Obtener cursos por instructor
   */
  async findByInstructor(instructorId: string): Promise<Course[]> {
    return this.courseRepository.find({
      where: { mainInstructorId: instructorId },
      relations: ['category'],
      order: { createdAt: 'DESC' },
    });
  }
}
