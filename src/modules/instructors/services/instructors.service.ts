import {
  Injectable,
  Logger,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, ILike } from 'typeorm';
import { InstructorProfile, InstructorSpecialty, InstructorCertification } from '../entities/instructor-profile.entity';
import { User, UserRole } from '../../auth/entities/user.entity';
import { Course, CourseStatus } from '../../courses/entities/course.entity';
import { Review, ReviewStatus } from '../../reviews/entities/review.entity';
import {
  CreateInstructorProfileDto,
  UpdateInstructorProfileDto,
  InstructorQueryDto,
} from '../dto';
import { ErrorCodes } from '../../../common/dto';

@Injectable()
export class InstructorsService {
  private readonly logger = new Logger(InstructorsService.name);

  constructor(
    @InjectRepository(InstructorProfile)
    private readonly profileRepository: Repository<InstructorProfile>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Course)
    private readonly courseRepository: Repository<Course>,
    @InjectRepository(Review)
    private readonly reviewRepository: Repository<Review>,
  ) {}

  // ============================================
  // CREAR
  // ============================================

  /**
   * Crear perfil de instructor
   */
  async create(dto: CreateInstructorProfileDto): Promise<InstructorProfile> {
    // Verificar que el usuario existe
    const user = await this.userRepository.findOne({
      where: { id: dto.userId },
    });

    if (!user) {
      throw new NotFoundException({
        code: ErrorCodes.USER_NOT_FOUND,
        message: 'El usuario no fue encontrado',
      });
    }

    // Verificar que no tenga ya un perfil
    const existing = await this.profileRepository.findOne({
      where: { userId: dto.userId },
    });

    if (existing) {
      throw new ConflictException({
        code: ErrorCodes.VALIDATION_ERROR,
        message: 'El usuario ya tiene un perfil de instructor',
      });
    }

    // Generar slug
    const slug = await this.generateUniqueSlug(dto.displayName);

    const profile = this.profileRepository.create({
      ...dto,
      slug,
    });

    const saved = await this.profileRepository.save(profile);

    // Asignar rol de instructor si no lo tiene
    if (!user.roles?.includes(UserRole.ADMIN)) {
      // Solo si no es admin, agregar como instructor implícito
      // Los admins ya tienen todos los permisos
    }

    this.logger.log(`Perfil de instructor creado: ${saved.id} - ${dto.displayName}`);
    return saved;
  }

  // ============================================
  // CONSULTAS
  // ============================================

  /**
   * Listar perfiles de instructores
   */
  async findAll(query: InstructorQueryDto): Promise<{
    data: InstructorProfile[];
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
      specialty,
      certification,
      isFeatured,
      isActive = true,
      search,
      sortBy = 'sortOrder',
      sortOrder = 'ASC',
    } = query;

    const queryBuilder = this.profileRepository
      .createQueryBuilder('profile')
      .leftJoinAndSelect('profile.user', 'user');

    // Filtros
    if (isActive !== undefined) {
      queryBuilder.andWhere('profile.isActive = :isActive', { isActive });
    }

    if (specialty) {
      queryBuilder.andWhere(':specialty = ANY(profile.specialties)', { specialty });
    }

    if (certification) {
      queryBuilder.andWhere(':certification = ANY(profile.certifications)', { certification });
    }

    if (isFeatured !== undefined) {
      queryBuilder.andWhere('profile.isFeatured = :isFeatured', { isFeatured });
    }

    if (search) {
      queryBuilder.andWhere(
        '(profile.displayName ILIKE :search OR profile.shortBio ILIKE :search)',
        { search: `%${search}%` },
      );
    }

    // Ordenamiento
    const validSortFields = ['sortOrder', 'displayName', 'courseCount', 'studentCount', 'averageRating', 'createdAt'];
    const sortField = validSortFields.includes(sortBy) ? sortBy : 'sortOrder';
    queryBuilder.orderBy(`profile.${sortField}`, sortOrder);

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
   * Obtener instructores destacados
   */
  async findFeatured(limit: number = 6): Promise<InstructorProfile[]> {
    return this.profileRepository.find({
      where: { isActive: true, isFeatured: true },
      order: { sortOrder: 'ASC' },
      take: limit,
    });
  }

  /**
   * Obtener perfil por ID
   */
  async findById(id: string): Promise<InstructorProfile> {
    const profile = await this.profileRepository.findOne({
      where: { id },
      relations: ['user'],
    });

    if (!profile) {
      throw new NotFoundException({
        code: ErrorCodes.NOT_FOUND,
        message: 'El perfil de instructor no fue encontrado',
      });
    }

    return profile;
  }

  /**
   * Obtener perfil por slug
   */
  async findBySlug(slug: string): Promise<InstructorProfile> {
    const profile = await this.profileRepository.findOne({
      where: { slug, isActive: true },
      relations: ['user'],
    });

    if (!profile) {
      throw new NotFoundException({
        code: ErrorCodes.NOT_FOUND,
        message: 'El perfil de instructor no fue encontrado',
      });
    }

    return profile;
  }

  /**
   * Obtener perfil por userId
   */
  async findByUserId(userId: string): Promise<InstructorProfile | null> {
    return this.profileRepository.findOne({
      where: { userId },
      relations: ['user'],
    });
  }

  /**
   * Obtener cursos de un instructor
   */
  async getInstructorCourses(instructorId: string): Promise<Course[]> {
    const profile = await this.findById(instructorId);

    return this.courseRepository.find({
      where: {
        mainInstructorId: profile.userId,
        status: CourseStatus.PUBLISHED,
      },
      order: { createdAt: 'DESC' },
    });
  }

  // ============================================
  // ACTUALIZAR
  // ============================================

  /**
   * Actualizar perfil
   */
  async update(id: string, dto: UpdateInstructorProfileDto): Promise<InstructorProfile> {
    const profile = await this.findById(id);

    // Si cambia el nombre, regenerar slug
    if (dto.displayName && dto.displayName !== profile.displayName) {
      profile.slug = await this.generateUniqueSlug(dto.displayName);
    }

    Object.assign(profile, dto);

    const updated = await this.profileRepository.save(profile);

    this.logger.log(`Perfil de instructor actualizado: ${id}`);
    return updated;
  }

  /**
   * Alternar estado destacado
   */
  async toggleFeatured(id: string): Promise<InstructorProfile> {
    const profile = await this.findById(id);
    profile.isFeatured = !profile.isFeatured;

    const updated = await this.profileRepository.save(profile);

    this.logger.log(`Instructor ${profile.isFeatured ? 'destacado' : 'no destacado'}: ${id}`);
    return updated;
  }

  // ============================================
  // ESTADÍSTICAS
  // ============================================

  /**
   * Actualizar estadísticas de cursos del instructor
   */
  async updateCourseStats(userId: string): Promise<void> {
    const profile = await this.findByUserId(userId);
    if (!profile) return;

    // Contar cursos activos
    const courseCount = await this.courseRepository.count({
      where: { mainInstructorId: userId, status: CourseStatus.PUBLISHED },
    });

    // Contar estudiantes únicos (a través de enrollments)
    const studentCountResult = await this.courseRepository
      .createQueryBuilder('course')
      .innerJoin('course.cohorts', 'cohort')
      .innerJoin('cohort.enrollments', 'enrollment')
      .where('course.mainInstructorId = :userId', { userId })
      .andWhere('course.status = :status', { status: CourseStatus.PUBLISHED })
      .select('COUNT(DISTINCT enrollment.studentId)', 'count')
      .getRawOne();

    const studentCount = parseInt(studentCountResult?.count || '0', 10);

    profile.updateCourseStats(courseCount, studentCount);
    await this.profileRepository.save(profile);
  }

  /**
   * Actualizar estadísticas de reviews del instructor
   */
  async updateReviewStats(userId: string): Promise<void> {
    const profile = await this.findByUserId(userId);
    if (!profile) return;

    // Obtener reviews de los cursos del instructor
    const reviewStats = await this.reviewRepository
      .createQueryBuilder('review')
      .innerJoin('review.course', 'course')
      .where('course.mainInstructorId = :userId', { userId })
      .andWhere('review.status = :status', { status: ReviewStatus.APPROVED })
      .select('AVG(review.rating)', 'average')
      .addSelect('COUNT(*)', 'count')
      .getRawOne();

    const averageRating = Math.round(parseFloat(reviewStats?.average || '0') * 100) / 100;
    const reviewCount = parseInt(reviewStats?.count || '0', 10);

    profile.updateReviewStats(averageRating, reviewCount);
    await this.profileRepository.save(profile);
  }

  // ============================================
  // ELIMINAR
  // ============================================

  /**
   * Eliminar perfil de instructor
   */
  async delete(id: string): Promise<void> {
    const profile = await this.findById(id);
    await this.profileRepository.remove(profile);

    this.logger.log(`Perfil de instructor eliminado: ${id}`);
  }

  // ============================================
  // HELPERS
  // ============================================

  /**
   * Generar slug único
   */
  private async generateUniqueSlug(displayName: string): Promise<string> {
    const baseSlug = displayName
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .substring(0, 200);

    // Verificar unicidad
    let slug = baseSlug;
    let counter = 1;

    while (await this.profileRepository.findOne({ where: { slug } })) {
      slug = `${baseSlug}-${counter}`;
      counter++;
    }

    return slug;
  }
}
