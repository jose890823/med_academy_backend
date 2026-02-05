import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Discussion } from './entities/discussion.entity';
import { Post } from './entities/post.entity';
import { PostLike } from './entities/post-like.entity';
import { DiscussionSubscription } from './entities/discussion-subscription.entity';
import { Enrollment } from '../enrollments/entities/enrollment.entity';
import { DiscussionsService } from './services/discussions.service';
import { PostsService } from './services/posts.service';
import { DiscussionsController } from './controllers/discussions.controller';
import { PostsController } from './controllers/posts.controller';
import { ForumsAdminController } from './controllers/forums-admin.controller';

/**
 * Módulo de Foros y Comunidad
 *
 * Funcionalidades:
 * - Foro general (sin curso asociado)
 * - Foros de curso (solo estudiantes inscritos)
 * - Tipos de discusión: pregunta, discusión, anuncio, encuesta
 * - Respuestas anidadas (estructura de árbol)
 * - Sistema de likes/votos
 * - Marcar respuesta aceptada
 * - Suscripción a discusiones
 * - Moderación (cerrar, bloquear, archivar)
 * - Discusiones fijadas
 * - Búsqueda por tags y contenido
 * - Historial de ediciones
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([
      Discussion,
      Post,
      PostLike,
      DiscussionSubscription,
      Enrollment,
    ]),
  ],
  controllers: [DiscussionsController, PostsController, ForumsAdminController],
  providers: [DiscussionsService, PostsService],
  exports: [DiscussionsService, PostsService],
})
export class ForumsModule {}
