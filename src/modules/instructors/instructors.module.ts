import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { InstructorProfile } from './entities/instructor-profile.entity';
import { User } from '../auth/entities/user.entity';
import { Course } from '../courses/entities/course.entity';
import { Review } from '../reviews/entities/review.entity';
import { InstructorsService } from './services/instructors.service';
import { InstructorsController } from './controllers/instructors.controller';
import { InstructorsAdminController } from './controllers/instructors-admin.controller';

/**
 * Módulo de Perfiles de Instructores
 *
 * Funcionalidades:
 * - Perfil público de instructor con bio, foto, video
 * - Especialidades y certificaciones
 * - Educación y experiencia laboral
 * - Redes sociales y contacto
 * - Estadísticas: cursos, estudiantes, rating promedio
 * - Instructores destacados
 * - Página pública por slug
 * - Cursos del instructor
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([InstructorProfile, User, Course, Review]),
  ],
  controllers: [InstructorsController, InstructorsAdminController],
  providers: [InstructorsService],
  exports: [InstructorsService],
})
export class InstructorsModule {}
