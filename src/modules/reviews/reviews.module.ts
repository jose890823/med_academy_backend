import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Review } from './entities/review.entity';
import { Enrollment } from '../enrollments/entities/enrollment.entity';
import { ReviewsService } from './services/reviews.service';
import { ReviewsController } from './controllers/reviews.controller';
import { ReviewsAdminController } from './controllers/reviews-admin.controller';

/**
 * Módulo de Reviews y Calificaciones
 *
 * Funcionalidades:
 * - Crear reviews de cursos (solo estudiantes inscritos)
 * - Calificación con estrellas (1-5) y comentarios opcionales
 * - Marca de compra verificada (curso completado)
 * - Respuestas de instructores
 * - Moderación de reviews (aprobar, rechazar, ocultar)
 * - Reviews destacados
 * - Estadísticas (promedio, distribución)
 * - Votos de utilidad
 */
@Module({
  imports: [TypeOrmModule.forFeature([Review, Enrollment])],
  controllers: [ReviewsController, ReviewsAdminController],
  providers: [ReviewsService],
  exports: [ReviewsService],
})
export class ReviewsModule {}
