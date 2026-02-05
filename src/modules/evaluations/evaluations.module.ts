import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

// Entities
import { Evaluation, Question, EvaluationAttempt, Answer } from './entities';

// Services
import {
  EvaluationsService,
  QuestionsService,
  AttemptsService,
} from './services';

// Controllers
import {
  EvaluationsController,
  EvaluationsAdminController,
} from './controllers/evaluations.controller';
import {
  AttemptsController,
  GradingController,
} from './controllers/attempts.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([Evaluation, Question, EvaluationAttempt, Answer]),
  ],
  controllers: [
    // Public Controllers
    EvaluationsController,
    AttemptsController,
    // Admin Controllers
    EvaluationsAdminController,
    GradingController,
  ],
  providers: [EvaluationsService, QuestionsService, AttemptsService],
  exports: [EvaluationsService, QuestionsService, AttemptsService],
})
export class EvaluationsModule {}
