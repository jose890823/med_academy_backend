import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

// Entities
import {
  Category,
  Course,
  CourseInstructor,
  CourseModule,
  Cohort,
  Classroom,
  ClassroomInstructor,
} from './entities';

// Services
import {
  CategoriesService,
  CoursesService,
  CohortsService,
  ClassroomsService,
} from './services';

// Controllers
import {
  CategoriesController,
  CategoriesAdminController,
  CoursesController,
  CoursesAdminController,
  CohortsController,
  CohortsAdminController,
  ClassroomsAdminController,
} from './controllers';

// Modules
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Category,
      Course,
      CourseInstructor,
      CourseModule,
      Cohort,
      Classroom,
      ClassroomInstructor,
    ]),
    forwardRef(() => AuthModule),
  ],
  controllers: [
    // Public Controllers
    CategoriesController,
    CoursesController,
    CohortsController,
    // Admin Controllers
    CategoriesAdminController,
    CoursesAdminController,
    CohortsAdminController,
    ClassroomsAdminController,
  ],
  providers: [
    CategoriesService,
    CoursesService,
    CohortsService,
    ClassroomsService,
  ],
  exports: [
    CategoriesService,
    CoursesService,
    CohortsService,
    ClassroomsService,
  ],
})
export class CoursesModule {}
