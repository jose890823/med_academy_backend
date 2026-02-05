import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Conversation } from './entities/conversation.entity';
import { Message } from './entities/message.entity';
import { User } from '../auth/entities/user.entity';
import { MessagingService } from './services/messaging.service';
import { MessagingController } from './controllers/messaging.controller';

/**
 * Módulo de Mensajería Directa
 *
 * Funcionalidades:
 * - Conversaciones entre dos usuarios
 * - Tipos: directa, soporte de curso, soporte admin
 * - Mensajes de texto con soporte para archivos adjuntos
 * - Estado de mensajes: enviado, entregado, leído
 * - Archivar/desarchivar conversaciones
 * - Contadores de mensajes no leídos
 * - Historial de mensajes con paginación
 * - Editar y eliminar mensajes propios
 * - Eventos para notificaciones en tiempo real
 */
@Module({
  imports: [TypeOrmModule.forFeature([Conversation, Message, User])],
  controllers: [MessagingController],
  providers: [MessagingService],
  exports: [MessagingService],
})
export class MessagingModule {}
