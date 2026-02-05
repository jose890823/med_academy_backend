import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

// Entities de otros módulos
import { User } from '../auth/entities/user.entity';
import { Enrollment } from '../enrollments/entities/enrollment.entity';
import { Payment } from '../payments/entities/payment.entity';
import { Certificate } from '../certificates/entities/certificate.entity';
import { EvaluationAttempt } from '../evaluations/entities/evaluation-attempt.entity';
import { Course } from '../courses/entities/course.entity';

// Services
import { AnalyticsService } from './services';

// Controllers
import { AnalyticsController } from './controllers';

// Auth Module (para guards)
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      User,
      Enrollment,
      Payment,
      Certificate,
      EvaluationAttempt,
      Course,
    ]),
    forwardRef(() => AuthModule),
  ],
  controllers: [AnalyticsController],
  providers: [AnalyticsService],
  exports: [AnalyticsService],
})
export class AnalyticsModule {}
