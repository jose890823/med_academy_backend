import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

// Entities
import {
  EnrollmentProgress,
  ModuleProgress,
  Achievement,
  ActivityLog,
} from './entities';

// Services
import {
  EnrollmentProgressService,
  ModuleProgressService,
  AchievementsService,
  ActivityLogService,
} from './services';

// Controllers
import { ProgressController, ProgressAdminController } from './controllers';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      EnrollmentProgress,
      ModuleProgress,
      Achievement,
      ActivityLog,
    ]),
  ],
  controllers: [ProgressController, ProgressAdminController],
  providers: [
    EnrollmentProgressService,
    ModuleProgressService,
    AchievementsService,
    ActivityLogService,
  ],
  exports: [
    EnrollmentProgressService,
    ModuleProgressService,
    AchievementsService,
    ActivityLogService,
  ],
})
export class ProgressModule {}
