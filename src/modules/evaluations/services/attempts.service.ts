import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EvaluationAttempt, AttemptStatus } from '../entities/evaluation-attempt.entity';
import { Answer } from '../entities/answer.entity';
import { Question, QuestionType } from '../entities/question.entity';
import {
  StartAttemptDto,
  SubmitAnswersDto,
  SaveAnswerDto,
  GradeAttemptDto,
  QuickGradeDto,
  AttemptQueryDto,
} from '../dto';
import { ErrorCodes } from '../../../common/dto';
import { EvaluationsService } from './evaluations.service';
import { QuestionsService } from './questions.service';

@Injectable()
export class AttemptsService {
  private readonly logger = new Logger(AttemptsService.name);

  constructor(
    @InjectRepository(EvaluationAttempt)
    private readonly attemptRepository: Repository<EvaluationAttempt>,
    @InjectRepository(Answer)
    private readonly answerRepository: Repository<Answer>,
    private readonly evaluationsService: EvaluationsService,
    private readonly questionsService: QuestionsService,
  ) {}

  /**
   * Iniciar un nuevo intento de evaluación
   */
  async startAttempt(dto: StartAttemptDto): Promise<EvaluationAttempt> {
    const evaluation = await this.evaluationsService.findById(dto.evaluationId);

    // Verificar que la evaluación esté publicada
    if (!evaluation.isPublished) {
      throw new BadRequestException({
        code: ErrorCodes.EVAL_NOT_AVAILABLE,
        message: 'La evaluación no está disponible',
      });
    }

    // Contar intentos previos
    const previousAttempts = await this.attemptRepository.count({
      where: { enrollmentId: dto.enrollmentId, evaluationId: dto.evaluationId },
    });

    // Verificar límite de intentos
    if (previousAttempts >= evaluation.maxAttempts) {
      throw new BadRequestException({
        code: ErrorCodes.EVAL_NOT_AVAILABLE,
        message: `Has alcanzado el límite de ${evaluation.maxAttempts} intentos`,
      });
    }

    // Verificar si hay un intento en progreso
    const inProgressAttempt = await this.attemptRepository.findOne({
      where: {
        enrollmentId: dto.enrollmentId,
        evaluationId: dto.evaluationId,
        status: AttemptStatus.IN_PROGRESS,
      },
    });

    if (inProgressAttempt) {
      // Retornar el intento existente si no ha expirado
      if (!inProgressAttempt.isExpired) {
        return inProgressAttempt;
      }
      // Marcar como expirado si el tiempo pasó
      inProgressAttempt.status = AttemptStatus.SUBMITTED;
      inProgressAttempt.submittedAt = new Date();
      await this.attemptRepository.save(inProgressAttempt);
    }

    // Crear nuevo intento
    const now = new Date();
    const expiresAt = evaluation.timeLimitMinutes
      ? new Date(now.getTime() + evaluation.timeLimitMinutes * 60000)
      : null;

    const attempt = this.attemptRepository.create({
      enrollmentId: dto.enrollmentId,
      evaluationId: dto.evaluationId,
      totalPoints: evaluation.totalPoints,
      attemptNumber: previousAttempts + 1,
      startedAt: now,
      expiresAt,
      status: AttemptStatus.IN_PROGRESS,
    });

    const saved = await this.attemptRepository.save(attempt);

    this.logger.log(
      `Intento iniciado: ${saved.id} (Evaluación: ${dto.evaluationId}, Intento #${saved.attemptNumber})`,
    );

    return saved;
  }

  /**
   * Guardar una respuesta individual (auto-guardado)
   */
  async saveAnswer(attemptId: string, dto: SaveAnswerDto): Promise<Answer> {
    const attempt = await this.findById(attemptId);

    if (!attempt.canSubmit) {
      throw new BadRequestException({
        code: ErrorCodes.EVAL_TIME_EXPIRED,
        message: 'El tiempo para esta evaluación ha expirado',
      });
    }

    // Verificar que la pregunta existe
    const question = await this.questionsService.findById(dto.questionId);

    // Verificar que la pregunta pertenece a la evaluación
    if (question.evaluationId !== attempt.evaluationId) {
      throw new BadRequestException({
        code: ErrorCodes.VALIDATION_ERROR,
        message: 'La pregunta no pertenece a esta evaluación',
      });
    }

    // Buscar o crear respuesta
    let answer = await this.answerRepository.findOne({
      where: { attemptId, questionId: dto.questionId },
    });

    if (answer) {
      answer.selectedOptionId = dto.selectedOptionId || null;
      answer.answerText = dto.answerText || null;
    } else {
      answer = this.answerRepository.create({
        attemptId,
        questionId: dto.questionId,
        selectedOptionId: dto.selectedOptionId || null,
        answerText: dto.answerText || null,
      });
    }

    return this.answerRepository.save(answer);
  }

  /**
   * Enviar todas las respuestas y finalizar el intento
   */
  async submitAttempt(attemptId: string, dto: SubmitAnswersDto): Promise<EvaluationAttempt> {
    const attempt = await this.findById(attemptId);

    if (!attempt.canSubmit) {
      throw new BadRequestException({
        code: ErrorCodes.EVAL_ALREADY_SUBMITTED,
        message: 'Este intento ya fue enviado o ha expirado',
      });
    }

    // Guardar todas las respuestas
    for (const answerDto of dto.answers) {
      await this.saveAnswer(attemptId, answerDto);
    }

    // Auto-calificar preguntas de opción múltiple y verdadero/falso
    await this.autoGradeAnswers(attemptId);

    // Actualizar estado del intento
    attempt.status = AttemptStatus.SUBMITTED;
    attempt.submittedAt = new Date();

    const updated = await this.attemptRepository.save(attempt);

    this.logger.log(`Intento enviado: ${attemptId}`);
    return updated;
  }

  /**
   * Auto-calificar respuestas de opción múltiple y V/F
   */
  private async autoGradeAnswers(attemptId: string): Promise<void> {
    const answers = await this.answerRepository.find({
      where: { attemptId },
      relations: ['question'],
    });

    for (const answer of answers) {
      if (
        answer.question.questionType === QuestionType.MULTIPLE_CHOICE ||
        answer.question.questionType === QuestionType.TRUE_FALSE
      ) {
        const isCorrect = answer.question.isAnswerCorrect(answer.selectedOptionId || '');
        answer.isCorrect = isCorrect;
        answer.pointsEarned = isCorrect ? answer.question.points : 0;
        await this.answerRepository.save(answer);
      }
    }
  }

  /**
   * Calificar un intento (INSTRUCTOR)
   * IMPORTANTE: Las evaluaciones son calificadas MANUALMENTE por el instructor
   */
  async gradeAttempt(
    attemptId: string,
    dto: GradeAttemptDto,
    gradedById: string,
  ): Promise<EvaluationAttempt> {
    const attempt = await this.findById(attemptId);

    if (attempt.status === AttemptStatus.IN_PROGRESS) {
      throw new BadRequestException({
        code: ErrorCodes.VALIDATION_ERROR,
        message: 'El intento debe ser enviado antes de calificar',
      });
    }

    // Calificar cada respuesta
    for (const grade of dto.grades) {
      const answer = await this.answerRepository.findOne({
        where: { id: grade.answerId, attemptId },
      });

      if (!answer) {
        throw new NotFoundException({
          code: ErrorCodes.NOT_FOUND,
          message: `Respuesta ${grade.answerId} no encontrada`,
        });
      }

      answer.pointsEarned = grade.pointsEarned;
      answer.isCorrect = grade.pointsEarned > 0;
      answer.feedback = grade.feedback || null;
      await this.answerRepository.save(answer);
    }

    // Calcular puntaje total
    const answers = await this.answerRepository.find({ where: { attemptId } });
    const totalScore = answers.reduce(
      (sum, a) => sum + Number(a.pointsEarned || 0),
      0,
    );

    // Obtener evaluación para calcular si aprobó
    const evaluation = await this.evaluationsService.findById(attempt.evaluationId);
    const percentage = (totalScore / attempt.totalPoints) * 100;
    const passed = totalScore >= evaluation.passingScore;

    // Actualizar intento
    attempt.score = totalScore;
    attempt.percentage = percentage;
    attempt.passed = passed;
    attempt.feedback = dto.feedback || null;
    attempt.status = AttemptStatus.GRADED;
    attempt.gradedAt = new Date();
    attempt.gradedById = gradedById;

    const updated = await this.attemptRepository.save(attempt);

    this.logger.log(
      `Intento calificado: ${attemptId} - Score: ${totalScore}/${attempt.totalPoints} (${passed ? 'Aprobado' : 'Reprobado'})`,
    );

    return updated;
  }

  /**
   * Calificación rápida (solo puntaje total)
   */
  async quickGrade(
    attemptId: string,
    dto: QuickGradeDto,
    gradedById: string,
  ): Promise<EvaluationAttempt> {
    const attempt = await this.findById(attemptId);

    if (attempt.status === AttemptStatus.IN_PROGRESS) {
      throw new BadRequestException({
        code: ErrorCodes.VALIDATION_ERROR,
        message: 'El intento debe ser enviado antes de calificar',
      });
    }

    // Validar que el score no exceda los puntos totales
    if (dto.score > attempt.totalPoints) {
      throw new BadRequestException({
        code: ErrorCodes.VALIDATION_ERROR,
        message: `El puntaje no puede ser mayor a ${attempt.totalPoints}`,
      });
    }

    // Obtener evaluación para calcular si aprobó
    const evaluation = await this.evaluationsService.findById(attempt.evaluationId);
    const percentage = (dto.score / attempt.totalPoints) * 100;
    const passed = dto.score >= evaluation.passingScore;

    // Actualizar intento
    attempt.score = dto.score;
    attempt.percentage = percentage;
    attempt.passed = passed;
    attempt.feedback = dto.feedback || null;
    attempt.status = AttemptStatus.GRADED;
    attempt.gradedAt = new Date();
    attempt.gradedById = gradedById;

    const updated = await this.attemptRepository.save(attempt);

    this.logger.log(
      `Intento calificado (rápido): ${attemptId} - Score: ${dto.score}/${attempt.totalPoints}`,
    );

    return updated;
  }

  /**
   * Obtener intentos con paginación y filtros
   */
  async findAll(query: AttemptQueryDto): Promise<{
    data: EvaluationAttempt[];
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
      enrollmentId,
      evaluationId,
      status,
      passed,
      sortBy = 'createdAt',
      sortOrder = 'DESC',
    } = query;

    const queryBuilder = this.attemptRepository
      .createQueryBuilder('attempt')
      .leftJoinAndSelect('attempt.evaluation', 'evaluation')
      .leftJoinAndSelect('attempt.enrollment', 'enrollment')
      .leftJoinAndSelect('attempt.gradedBy', 'gradedBy');

    // Filtros
    if (enrollmentId) {
      queryBuilder.andWhere('attempt.enrollmentId = :enrollmentId', { enrollmentId });
    }

    if (evaluationId) {
      queryBuilder.andWhere('attempt.evaluationId = :evaluationId', { evaluationId });
    }

    if (status) {
      queryBuilder.andWhere('attempt.status = :status', { status });
    }

    if (passed !== undefined) {
      queryBuilder.andWhere('attempt.passed = :passed', { passed });
    }

    // Ordenamiento
    const validSortFields = ['createdAt', 'submittedAt', 'gradedAt', 'score'];
    const sortField = validSortFields.includes(sortBy) ? sortBy : 'createdAt';
    queryBuilder.orderBy(`attempt.${sortField}`, sortOrder);

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
   * Obtener intentos de un estudiante para una evaluación
   */
  async findByEnrollmentAndEvaluation(
    enrollmentId: string,
    evaluationId: string,
  ): Promise<EvaluationAttempt[]> {
    return this.attemptRepository.find({
      where: { enrollmentId, evaluationId },
      order: { attemptNumber: 'ASC' },
    });
  }

  /**
   * Obtener intentos pendientes de calificar
   */
  async findPendingGrading(evaluationId?: string): Promise<EvaluationAttempt[]> {
    const where: any = { status: AttemptStatus.SUBMITTED };
    if (evaluationId) {
      where.evaluationId = evaluationId;
    }

    return this.attemptRepository.find({
      where,
      relations: ['enrollment', 'enrollment.student', 'evaluation'],
      order: { submittedAt: 'ASC' },
    });
  }

  /**
   * Obtener un intento por ID
   * @throws NotFoundException si no existe
   */
  async findById(id: string): Promise<EvaluationAttempt> {
    const attempt = await this.attemptRepository.findOne({
      where: { id },
      relations: ['evaluation', 'enrollment', 'gradedBy'],
    });

    if (!attempt) {
      throw new NotFoundException({
        code: ErrorCodes.NOT_FOUND,
        message: 'El intento no fue encontrado',
      });
    }

    return attempt;
  }

  /**
   * Obtener respuestas de un intento
   */
  async getAnswers(attemptId: string): Promise<Answer[]> {
    return this.answerRepository.find({
      where: { attemptId },
      relations: ['question'],
      order: { question: { order: 'ASC' } },
    });
  }

  /**
   * Verificar si un estudiante puede ver los resultados
   */
  async canViewResults(attemptId: string): Promise<boolean> {
    const attempt = await this.findById(attemptId);
    return attempt.isGraded;
  }
}
