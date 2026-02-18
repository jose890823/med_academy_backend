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
import { ReferralsModule } from '../referrals/referrals.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Enrollment]),
    CoursesModule, // Para acceder a CohortsService y ClassroomsService
    ReferralsModule, // Para validar códigos de referido en self-enroll
  ],
  controllers: [EnrollmentsController, EnrollmentsAdminController],
  providers: [EnrollmentsService],
  exports: [EnrollmentsService],
})
export class EnrollmentsModule {}
