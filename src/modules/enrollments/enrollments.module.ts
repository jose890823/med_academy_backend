import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

// Entities
import { Enrollment } from './entities/enrollment.entity';

// Services
import { EnrollmentsService } from './services/enrollments.service';

// Controllers
import {
  EnrollmentsController,
  EnrollmentsAdminController,
} from './controllers/enrollments.controller';

// External modules
import { CoursesModule } from '../courses/courses.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Enrollment]),
    CoursesModule, // Para acceder a CohortsService y ClassroomsService
  ],
  controllers: [EnrollmentsController, EnrollmentsAdminController],
  providers: [EnrollmentsService],
  exports: [EnrollmentsService],
})
export class EnrollmentsModule {}
