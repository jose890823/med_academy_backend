import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Classroom } from '../entities/classroom.entity';
import { CreateClassroomDto, UpdateClassroomDto } from '../dto';
import { ErrorCodes } from '../../../common/dto';
import { CohortsService } from './cohorts.service';

@Injectable()
export class ClassroomsService {
  private readonly logger = new Logger(ClassroomsService.name);

  constructor(
    @InjectRepository(Classroom)
    private readonly classroomRepository: Repository<Classroom>,
    private readonly cohortsService: CohortsService,
  ) {}

  /**
   * Crear un nuevo aula virtual
   * @throws NotFoundException si la convocatoria no existe
   */
  async create(dto: CreateClassroomDto): Promise<Classroom> {
    // Verificar que la convocatoria existe
    await this.cohortsService.findById(dto.cohortId);

    const classroom = this.classroomRepository.create(dto);
    const saved = await this.classroomRepository.save(classroom);

    this.logger.log(`Aula creada: ${saved.name} (${saved.id})`);
    return saved;
  }

  /**
   * Obtener todas las aulas de una convocatoria
   */
  async findByCohort(cohortId: string): Promise<Classroom[]> {
    return this.classroomRepository.find({
      where: { cohortId },
      relations: ['instructors', 'instructors.user'],
      order: { name: 'ASC' },
    });
  }

  /**
   * Obtener aulas activas de una convocatoria
   */
  async findActiveByCohort(cohortId: string): Promise<Classroom[]> {
    return this.classroomRepository.find({
      where: { cohortId, isActive: true },
      relations: ['instructors', 'instructors.user'],
      order: { name: 'ASC' },
    });
  }

  /**
   * Obtener un aula por ID
   * @throws NotFoundException si no existe
   */
  async findById(id: string): Promise<Classroom> {
    const classroom = await this.classroomRepository.findOne({
      where: { id },
      relations: ['cohort', 'cohort.course', 'instructors', 'instructors.user'],
    });

    if (!classroom) {
      throw new NotFoundException({
        code: ErrorCodes.CLASSROOM_NOT_FOUND,
        message: 'El aula no fue encontrada',
      });
    }

    return classroom;
  }

  /**
   * Actualizar un aula
   * @throws NotFoundException si no existe
   */
  async update(id: string, dto: UpdateClassroomDto): Promise<Classroom> {
    const classroom = await this.findById(id);

    Object.assign(classroom, dto);
    const updated = await this.classroomRepository.save(classroom);

    this.logger.log(`Aula actualizada: ${updated.name} (${updated.id})`);
    return updated;
  }

  /**
   * Activar/Desactivar un aula
   */
  async toggleActive(id: string): Promise<Classroom> {
    const classroom = await this.findById(id);
    classroom.isActive = !classroom.isActive;
    const updated = await this.classroomRepository.save(classroom);

    this.logger.log(`Aula ${id} ${updated.isActive ? 'activada' : 'desactivada'}`);
    return updated;
  }

  /**
   * Incrementar contador de estudiantes
   */
  async incrementStudentCount(id: string): Promise<void> {
    const classroom = await this.findById(id);

    if (classroom.currentStudents >= classroom.maxStudents) {
      throw new BadRequestException({
        code: ErrorCodes.CLASSROOM_FULL,
        message: 'El aula no tiene cupos disponibles',
      });
    }

    await this.classroomRepository.increment({ id }, 'currentStudents', 1);
    this.logger.log(`Estudiante agregado al aula ${id}`);
  }

  /**
   * Decrementar contador de estudiantes
   */
  async decrementStudentCount(id: string): Promise<void> {
    const classroom = await this.findById(id);

    if (classroom.currentStudents > 0) {
      await this.classroomRepository.decrement({ id }, 'currentStudents', 1);
      this.logger.log(`Estudiante removido del aula ${id}`);
    }
  }

  /**
   * Obtener aulas con cupo disponible de una convocatoria
   */
  async findAvailableByCohort(cohortId: string): Promise<Classroom[]> {
    const classrooms = await this.classroomRepository
      .createQueryBuilder('classroom')
      .where('classroom.cohortId = :cohortId', { cohortId })
      .andWhere('classroom.isActive = :isActive', { isActive: true })
      .andWhere('classroom.currentStudents < classroom.maxStudents')
      .orderBy('classroom.name', 'ASC')
      .getMany();

    return classrooms;
  }

  /**
   * Eliminar un aula
   * @throws NotFoundException si no existe
   */
  async delete(id: string): Promise<void> {
    const classroom = await this.findById(id);

    if (classroom.currentStudents > 0) {
      throw new BadRequestException({
        code: ErrorCodes.VALIDATION_ERROR,
        message: 'No se puede eliminar un aula con estudiantes asignados',
      });
    }

    await this.classroomRepository.remove(classroom);

    this.logger.log(`Aula eliminada: ${classroom.name} (${id})`);
  }
}
