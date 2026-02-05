import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Question, QuestionType } from '../entities/question.entity';
import { CreateQuestionDto, UpdateQuestionDto } from '../dto';
import { ErrorCodes } from '../../../common/dto';
import { EvaluationsService } from './evaluations.service';

@Injectable()
export class QuestionsService {
  private readonly logger = new Logger(QuestionsService.name);

  constructor(
    @InjectRepository(Question)
    private readonly questionRepository: Repository<Question>,
    private readonly evaluationsService: EvaluationsService,
  ) {}

  /**
   * Crear una nueva pregunta
   */
  async create(dto: CreateQuestionDto): Promise<Question> {
    // Verificar que la evaluación existe
    await this.evaluationsService.findById(dto.evaluationId);

    // Validar opciones para tipos que las requieren
    if (
      (dto.questionType === QuestionType.MULTIPLE_CHOICE ||
        dto.questionType === QuestionType.TRUE_FALSE) &&
      (!dto.options || dto.options.length < 2)
    ) {
      throw new BadRequestException({
        code: ErrorCodes.VALIDATION_ERROR,
        message:
          'Las preguntas de opción múltiple deben tener al menos 2 opciones',
      });
    }

    // Validar que hay exactamente una respuesta correcta para multiple choice
    if (dto.options) {
      const correctCount = dto.options.filter((o) => o.isCorrect).length;
      if (correctCount === 0) {
        throw new BadRequestException({
          code: ErrorCodes.VALIDATION_ERROR,
          message: 'Debe haber al menos una opción correcta',
        });
      }
      if (
        dto.questionType === QuestionType.MULTIPLE_CHOICE &&
        correctCount !== 1
      ) {
        throw new BadRequestException({
          code: ErrorCodes.VALIDATION_ERROR,
          message:
            'Las preguntas de opción múltiple deben tener exactamente una respuesta correcta',
        });
      }
    }

    // Para true/false, crear opciones automáticamente si no se proporcionan
    if (dto.questionType === QuestionType.TRUE_FALSE && !dto.options) {
      throw new BadRequestException({
        code: ErrorCodes.VALIDATION_ERROR,
        message:
          'Las preguntas de verdadero/falso deben tener opciones definidas',
      });
    }

    const question = this.questionRepository.create(dto);
    const saved = await this.questionRepository.save(question);

    this.logger.log(
      `Pregunta creada: ${saved.id} (Evaluación: ${dto.evaluationId})`,
    );
    return saved;
  }

  /**
   * Crear múltiples preguntas a la vez
   */
  async createBulk(dtos: CreateQuestionDto[]): Promise<Question[]> {
    const questions: Question[] = [];

    for (const dto of dtos) {
      const question = await this.create(dto);
      questions.push(question);
    }

    return questions;
  }

  /**
   * Obtener preguntas de una evaluación
   */
  async findByEvaluation(evaluationId: string): Promise<Question[]> {
    return this.questionRepository.find({
      where: { evaluationId },
      order: { order: 'ASC' },
    });
  }

  /**
   * Obtener una pregunta por ID
   * @throws NotFoundException si no existe
   */
  async findById(id: string): Promise<Question> {
    const question = await this.questionRepository.findOne({
      where: { id },
      relations: ['evaluation'],
    });

    if (!question) {
      throw new NotFoundException({
        code: ErrorCodes.NOT_FOUND,
        message: 'La pregunta no fue encontrada',
      });
    }

    return question;
  }

  /**
   * Actualizar una pregunta
   * @throws NotFoundException si no existe
   */
  async update(id: string, dto: UpdateQuestionDto): Promise<Question> {
    const question = await this.findById(id);

    // Si se cambia el tipo, validar opciones
    const newType = dto.questionType || question.questionType;
    const newOptions =
      dto.options !== undefined ? dto.options : question.options;

    if (
      (newType === QuestionType.MULTIPLE_CHOICE ||
        newType === QuestionType.TRUE_FALSE) &&
      (!newOptions || newOptions.length < 2)
    ) {
      throw new BadRequestException({
        code: ErrorCodes.VALIDATION_ERROR,
        message:
          'Las preguntas de opción múltiple deben tener al menos 2 opciones',
      });
    }

    if (newOptions) {
      const correctCount = newOptions.filter((o) => o.isCorrect).length;
      if (correctCount === 0) {
        throw new BadRequestException({
          code: ErrorCodes.VALIDATION_ERROR,
          message: 'Debe haber al menos una opción correcta',
        });
      }
    }

    Object.assign(question, dto);
    const updated = await this.questionRepository.save(question);

    this.logger.log(`Pregunta actualizada: ${updated.id}`);
    return updated;
  }

  /**
   * Reordenar preguntas de una evaluación
   */
  async reorder(
    evaluationId: string,
    questionIds: string[],
  ): Promise<Question[]> {
    const questions = await this.findByEvaluation(evaluationId);

    // Validar que todos los IDs existen
    const existingIds = new Set(questions.map((q) => q.id));
    for (const id of questionIds) {
      if (!existingIds.has(id)) {
        throw new BadRequestException({
          code: ErrorCodes.VALIDATION_ERROR,
          message: `La pregunta ${id} no pertenece a esta evaluación`,
        });
      }
    }

    // Actualizar orden
    const updates = questionIds.map((id, index) => ({
      id,
      order: index,
    }));

    for (const update of updates) {
      await this.questionRepository.update(update.id, { order: update.order });
    }

    return this.findByEvaluation(evaluationId);
  }

  /**
   * Eliminar una pregunta
   */
  async delete(id: string): Promise<void> {
    const question = await this.findById(id);
    await this.questionRepository.remove(question);
    this.logger.log(`Pregunta eliminada: ${id}`);
  }

  /**
   * Eliminar todas las preguntas de una evaluación
   */
  async deleteByEvaluation(evaluationId: string): Promise<void> {
    await this.questionRepository.delete({ evaluationId });
    this.logger.log(`Preguntas eliminadas para evaluación: ${evaluationId}`);
  }

  /**
   * Contar preguntas de una evaluación
   */
  async countByEvaluation(evaluationId: string): Promise<number> {
    return this.questionRepository.count({ where: { evaluationId } });
  }

  /**
   * Calcular puntos totales de las preguntas de una evaluación
   */
  async getTotalPointsByEvaluation(evaluationId: string): Promise<number> {
    const result = await this.questionRepository
      .createQueryBuilder('question')
      .select('SUM(question.points)', 'total')
      .where('question.evaluationId = :evaluationId', { evaluationId })
      .getRawOne();

    return parseInt(result?.total || '0');
  }
}
