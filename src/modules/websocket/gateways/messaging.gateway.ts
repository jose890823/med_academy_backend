import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayInit,
  OnGatewayConnection,
  OnGatewayDisconnect,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Logger, Inject, forwardRef } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Server, Socket } from 'socket.io';
import { SocketConnectionService } from '../services/socket-connection.service';
import {
  MessagePayload,
  TypingEvent,
  MessageReadEvent,
  WsResponse,
  PresenceEvent,
} from '../interfaces/socket-client.interface';
import type { AuthenticatedSocket } from '../interfaces/socket-client.interface';

/**
 * Gateway de WebSocket para mensajería en tiempo real (estilo WhatsApp)
 */
@WebSocketGateway({
  namespace: '/messaging',
  cors: {
    origin: '*',
    credentials: true,
  },
})
export class MessagingGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  private readonly logger = new Logger(MessagingGateway.name);

  @WebSocketServer()
  server: Server;

  constructor(
    private readonly connectionService: SocketConnectionService,
    private readonly jwtService: JwtService,
  ) {}

  /**
   * Inicialización del gateway
   */
  afterInit(server: Server): void {
    this.logger.log('MessagingGateway initialized');
  }

  /**
   * Manejar conexión de un cliente
   */
  async handleConnection(client: Socket): Promise<void> {
    try {
      // Obtener token del handshake
      const token =
        client.handshake.auth?.token ||
        client.handshake.headers?.authorization?.split(' ')[1];

      if (!token) {
        this.logger.warn(`Connection rejected: No token provided (${client.id})`);
        client.emit('error', { code: 'AUTH_REQUIRED', message: 'Token required' });
        client.disconnect();
        return;
      }

      // Verificar token
      let payload: any;
      try {
        payload = this.jwtService.verify(token);
      } catch (error) {
        this.logger.warn(`Connection rejected: Invalid token (${client.id})`);
        client.emit('error', { code: 'AUTH_INVALID', message: 'Invalid token' });
        client.disconnect();
        return;
      }

      const userId = payload.sub;

      // Extender el socket con datos de usuario
      (client as AuthenticatedSocket).userId = userId;
      (client as AuthenticatedSocket).userEmail = payload.email;

      // Registrar conexión
      await this.connectionService.registerConnection(client.id, userId, {
        userAgent: client.handshake.headers['user-agent'] as string,
        ip: client.handshake.address,
        namespace: '/messaging',
      });

      // Unir a room personal del usuario
      client.join(`user:${userId}`);

      // Emitir evento de conexión exitosa
      client.emit('connected', { userId, socketId: client.id });

      // Notificar a contactos que el usuario está online
      this.broadcastPresence(userId, 'online');

      this.logger.log(`Client connected to messaging: ${client.id} (user: ${userId})`);
    } catch (error) {
      this.logger.error(`Connection error: ${error}`, error);
      client.emit('error', { code: 'CONNECTION_ERROR', message: 'Connection failed' });
      client.disconnect();
    }
  }

  /**
   * Manejar desconexión de un cliente
   */
  async handleDisconnect(client: Socket): Promise<void> {
    const userId = (client as AuthenticatedSocket).userId;

    if (userId) {
      // Verificar si el usuario tiene otras conexiones activas
      const remainingSockets = await this.connectionService.getUserSockets(userId);

      // Si no hay más conexiones, marcar como offline
      if (remainingSockets.length <= 1) {
        this.broadcastPresence(userId, 'offline');
      }
    }

    await this.connectionService.removeConnection(client.id, 'client_disconnect');
    this.logger.log(`Client disconnected from messaging: ${client.id}`);
  }

  // ===== Eventos del cliente =====

  /**
   * Unirse a una conversación
   */
  @SubscribeMessage('conversation:join')
  async handleJoinConversation(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { conversationId: string },
  ): Promise<WsResponse> {
    try {
      const userId = client.userId;
      if (!userId) {
        return {
          success: false,
          error: { code: 'NOT_AUTHENTICATED', message: 'Not authenticated' },
        };
      }

      // Aquí se verificaría que el usuario es participante de la conversación
      // const canJoin = await this.messagingService.isParticipant(data.conversationId, userId);
      // if (!canJoin) {
      //   return { success: false, error: { code: 'NOT_PARTICIPANT', message: 'Not a participant' } };
      // }

      client.join(`conversation:${data.conversationId}`);

      this.logger.debug(`User ${userId} joined conversation ${data.conversationId}`);

      return { success: true, data: { conversationId: data.conversationId } };
    } catch (error: any) {
      this.logger.error(`Error joining conversation: ${error.message}`);
      return {
        success: false,
        error: { code: 'JOIN_ERROR', message: error.message },
      };
    }
  }

  /**
   * Salir de una conversación
   */
  @SubscribeMessage('conversation:leave')
  async handleLeaveConversation(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { conversationId: string },
  ): Promise<WsResponse> {
    try {
      client.leave(`conversation:${data.conversationId}`);

      this.logger.debug(`User ${client.userId} left conversation ${data.conversationId}`);

      return { success: true };
    } catch (error: any) {
      return {
        success: false,
        error: { code: 'LEAVE_ERROR', message: error.message },
      };
    }
  }

  /**
   * Enviar un mensaje
   */
  @SubscribeMessage('message:send')
  async handleSendMessage(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody()
    data: {
      conversationId: string;
      content: string;
      type?: string;
    },
  ): Promise<WsResponse<MessagePayload>> {
    try {
      const userId = client.userId;
      if (!userId) {
        return {
          success: false,
          error: { code: 'NOT_AUTHENTICATED', message: 'Not authenticated' },
        };
      }

      // Aquí se guardaría el mensaje en la base de datos
      // const message = await this.messagingService.createMessage({
      //   conversationId: data.conversationId,
      //   senderId: userId,
      //   content: data.content,
      //   type: data.type || 'text',
      // });

      // Por ahora creamos un mensaje temporal
      const message: MessagePayload = {
        id: `msg-${Date.now()}`,
        conversationId: data.conversationId,
        senderId: userId,
        content: data.content,
        type: data.type || 'text',
        createdAt: new Date(),
      };

      // Emitir a todos en la conversación
      this.server.to(`conversation:${data.conversationId}`).emit('message:new', message);

      // Notificar a participantes offline
      // await this.notifyOfflineParticipants(data.conversationId, message);

      this.logger.debug(`Message sent in conversation ${data.conversationId} by user ${userId}`);

      return { success: true, data: message };
    } catch (error: any) {
      this.logger.error(`Error sending message: ${error.message}`);
      return {
        success: false,
        error: { code: 'SEND_ERROR', message: error.message },
      };
    }
  }

  /**
   * Indicador de escribiendo
   */
  @SubscribeMessage('message:typing')
  async handleTyping(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { conversationId: string; isTyping: boolean },
  ): Promise<void> {
    const userId = client.userId;
    if (!userId) return;

    const typingEvent: TypingEvent = {
      conversationId: data.conversationId,
      userId,
      isTyping: data.isTyping,
    };

    // Broadcast a otros en la conversación (excepto el emisor)
    client.to(`conversation:${data.conversationId}`).emit('message:typing', typingEvent);
  }

  /**
   * Marcar mensajes como leídos
   */
  @SubscribeMessage('message:read')
  async handleMessageRead(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { conversationId: string; messageIds: string[] },
  ): Promise<WsResponse> {
    try {
      const userId = client.userId;
      if (!userId) {
        return {
          success: false,
          error: { code: 'NOT_AUTHENTICATED', message: 'Not authenticated' },
        };
      }

      // Aquí se actualizaría el estado en la base de datos
      // await this.messagingService.markAsRead(data.messageIds, userId);

      const readEvent: MessageReadEvent = {
        conversationId: data.conversationId,
        messageIds: data.messageIds,
        readBy: userId,
        readAt: new Date(),
      };

      // Notificar a todos en la conversación
      this.server
        .to(`conversation:${data.conversationId}`)
        .emit('message:read:ack', readEvent);

      return { success: true };
    } catch (error: any) {
      this.logger.error(`Error marking messages as read: ${error.message}`);
      return {
        success: false,
        error: { code: 'READ_ERROR', message: error.message },
      };
    }
  }

  // ===== Métodos para enviar mensajes desde el servidor =====

  /**
   * Emitir nuevo mensaje a una conversación
   */
  async emitNewMessage(conversationId: string, message: MessagePayload): Promise<void> {
    this.server.to(`conversation:${conversationId}`).emit('message:new', message);
  }

  /**
   * Emitir mensaje editado
   */
  async emitMessageEdited(conversationId: string, message: MessagePayload): Promise<void> {
    this.server.to(`conversation:${conversationId}`).emit('message:edited', message);
  }

  /**
   * Emitir mensaje eliminado
   */
  async emitMessageDeleted(conversationId: string, messageId: string): Promise<void> {
    this.server
      .to(`conversation:${conversationId}`)
      .emit('message:deleted', { messageId, conversationId });
  }

  /**
   * Broadcast estado de presencia
   */
  private broadcastPresence(userId: string, status: 'online' | 'offline' | 'away'): void {
    const presenceEvent: PresenceEvent = {
      userId,
      status,
      lastSeen: status === 'offline' ? new Date() : undefined,
    };

    // Emitir a todos los usuarios (se podría optimizar para solo contactos)
    this.server.emit('presence:update', presenceEvent);
  }

  /**
   * Verificar si un usuario está online
   */
  async isUserOnline(userId: string): Promise<boolean> {
    return this.connectionService.isUserOnline(userId);
  }

  /**
   * Obtener estadísticas del gateway
   */
  getStats(): { connectedClients: number; rooms: number } {
    const sockets = this.server?.sockets as any;
    return {
      connectedClients: sockets?.size || 0,
      rooms: sockets?.adapter?.rooms?.size || 0,
    };
  }
}
