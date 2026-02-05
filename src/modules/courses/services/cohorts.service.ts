import {
  Injectable,
  Logger,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Cohort, CohortStatus } from '../entities/cohort.entity';
import { CreateCohortDto, UpdateCohortDto, CohortQueryDto } from '../dto';
import { ErrorCodes } from '../../../common/dto';
import { CoursesService } from './courses.service';

@Injectable()
export class CohortsService {
  private readonly logger = new Logger(CohortsService.name);

  constructor(
    @InjectRepository(Cohort)
    private readonly cohortRepository: Repository<Cohort>,
    private readonly coursesService: CoursesService,
  ) {}

  /**
   * Crear una nueva convocatoria
   * @throws ConflictException si el código ya existe
   * @throws NotFoundException si el curso no existe
   */
  async create(dto: CreateCohortDto): Promise<Cohort> {
    // Verificar que el curso existe
    await this.coursesService.findById(dto.courseId);

    // Verificar que el código no exista
    const existing = await this.cohortRepository.findOne({
      where: { code: dto.code },
    });

    if (existing) {
      throw new ConflictException({
        code: ErrorCodes.VALIDATION_ERROR,
        message: 'Ya existe una convocatoria con este código',
      });
    }

    // Validar fechas
    this.validateDates(dto);

    const cohort = this.cohortRepository.create(dto);
    const saved = await this.cohortRepository.save(cohort);

    this.logger.log(`Convocatoria creada: ${saved.name} (${saved.id})`);
    return saved;
  }

  /**
   * Obtener todas las convocatorias con paginación y filtros
   */
  async findAll(query: CohortQueryDto): Promise<{
    data: Cohort[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
      hasNextPage: boolean;
      hasPrevPage: boolean;
    };
  }> {
    const { page = 1, limit = 20, courseId, status } = query;

    const queryBuilder = this.cohortRepository
      .createQueryBuilder('cohort')
      .leftJoinAndSelect('cohort.course', 'course');

    // Filtros
    if (courseId) {
      queryBuilder.andWhere('cohort.courseId = :courseId', { courseId });
    }

    if (status) {
      queryBuilder.andWhere('cohort.status = :status', { status });
    }

    // Ordenar por fecha de inicio descendente
    queryBuilder.orderBy('cohort.startDate', 'DESC');

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
   * Obtener convocatorias abiertas de un curso
   */
  async findOpenByCourse(courseId: string): Promise<Cohort[]> {
    return this.cohortRepository.find({
      where: {
        courseId,
        status: CohortStatus.OPEN,
      },
      order: { startDate: 'ASC' },
    });
  }

  /**
   * Obtener una convocatoria por ID
   * @throws NotFoundException si no existe
   */
  async findById(id: string): Promise<Cohort> {
    const cohort = await this.cohortRepository.findOne({
      where: { id },
      relations: ['course', 'classrooms'],
    });

    if (!cohort) {
      throw new NotFoundException({
        code: ErrorCodes.COHORT_NOT_FOUND,
        message: 'La convocatoria no fue encontrada',
      });
    }

    return cohort;
  }

  /**
   * Obtener una convocatoria por código
   * @throws NotFoundException si no existe
   */
  async findByCode(code: string): Promise<Cohort> {
    const cohort = await this.cohortRepository.findOne({
      where: { code },
      relations: ['course', 'classrooms'],
    });

    if (!cohort) {
      throw new NotFoundException({
        code: ErrorCodes.COHORT_NOT_FOUND,
        message: 'La convocatoria no fue encontrada',
      });
    }

    return cohort;
  }

  /**
   * Actualizar una convocatoria
   * @throws NotFoundException si no existe
   * @throws ConflictException si el nuevo código ya existe
   */
  async update(id: string, dto: UpdateCohortDto): Promise<Cohort> {
    const cohort = await this.findById(id);

    // Verificar que el nuevo código no exista (si se está cambiando)
    if (dto.code && dto.code !== cohort.code) {
      const existing = await this.cohortRepository.findOne({
        where: { code: dto.code },
      });

      if (existing) {
        throw new ConflictException({
          code: ErrorCodes.VALIDATION_ERROR,
          message: 'Ya existe una convocatoria con este código',
        });
      }
    }

    // Validar fechas si se actualizan
    if (
      dto.enrollmentStartDate ||
      dto.enrollmentEndDate ||
      dto.startDate ||
      dto.endDate
    ) {
      const datesToValidate = {
        enrollmentStartDate:
          dto.enrollmentStartDate || cohort.enrollmentStartDate.toISOString(),
        enrollmentEndDate:
          dto.enrollmentEndDate || cohort.enrollmentEndDate.toISOString(),
        startDate: dto.startDate || cohort.startDate.toISOString(),
        endDate: dto.endDate || cohort.endDate.toISOString(),
      };
      this.validateDates(datesToValidate as CreateCohortDto);
    }

    Object.assign(cohort, dto);
    const updated = await this.cohortRepository.save(cohort);

    this.logger.log(
      `Convocatoria actualizada: ${updated.name} (${updated.id})`,
    );
    return updated;
  }

  /**
   * Cambiar estado de una convocatoria
   */
  async updateStatus(id: string, status: CohortStatus): Promise<Cohort> {
    const cohort = await this.findById(id);
    cohort.status = status;
    const updated = await this.cohortRepository.save(cohort);

    this.logger.log(`Convocatoria ${id} cambiada a estado: ${status}`);
    return updated;
  }

  /**
   * Incrementar contador de estudiantes
   */
  async incrementStudentCount(id: string): Promise<void> {
    const cohort = await this.findById(id);

    if (
      cohort.maxStudents !== null &&
      cohort.currentStudents >= cohort.maxStudents
    ) {
      throw new BadRequestException({
        code: ErrorCodes.COHORT_FULL,
        message: 'La convocatoria no tiene cupos disponibles',
      });
    }

    await this.cohortRepository.increment({ id }, 'currentStudents', 1);
    this.logger.log(`Estudiante agregado a convocatoria ${id}`);
  }

  /**
   * Decrementar contador de estudiantes
   */
  async decrementStudentCount(id: string): Promise<void> {
    const cohort = await this.findById(id);

    if (cohort.currentStudents > 0) {
      await this.cohortRepository.decrement({ id }, 'currentStudents', 1);
      this.logger.log(`Estudiante removido de convocatoria ${id}`);
    }
  }

  /**
   * Eliminar una convocatoria
   * @throws NotFoundException si no existe
   */
  async delete(id: string): Promise<void> {
    const cohort = await this.findById(id);
    await this.cohortRepository.remove(cohort);

    this.logger.log(`Convocatoria eliminada: ${cohort.name} (${id})`);
  }

  /**
   * Validar que las fechas sean coherentes
   */
  private validateDates(dto: CreateCohortDto): void {
    const enrollmentStart = new Date(dto.enrollmentStartDate);
    const enrollmentEnd = new Date(dto.enrollmentEndDate);
    const courseStart = new Date(dto.startDate);
    const courseEnd = new Date(dto.endDate);

    if (enrollmentStart >= enrollmentEnd) {
      throw new BadRequestException({
        code: ErrorCodes.VALIDATION_ERROR,
        message:
          'La fecha de inicio de inscripciones debe ser anterior a la fecha de fin',
      });
    }

    if (courseStart >= courseEnd) {
      throw new BadRequestException({
        code: ErrorCodes.VALIDATION_ERROR,
        message:
          'La fecha de inicio del curso debe ser anterior a la fecha de fin',
      });
    }

    if (enrollmentEnd > courseStart) {
      throw new BadRequestException({
        code: ErrorCodes.VALIDATION_ERROR,
        message:
          'Las inscripciones deben cerrar antes o el mismo día que inicia el curso',
      });
    }
  }
}
