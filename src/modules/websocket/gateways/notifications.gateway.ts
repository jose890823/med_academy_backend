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
import { Logger, UseGuards } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Server, Socket } from 'socket.io';
import { SocketConnectionService } from '../services/socket-connection.service';
import {
  NotificationPayload,
  WsResponse,
} from '../interfaces/socket-client.interface';
import type { AuthenticatedSocket } from '../interfaces/socket-client.interface';
import { UserRole } from '../../auth/entities/user.entity';

/**
 * Gateway de WebSocket para notificaciones en tiempo real
 */
@WebSocketGateway({
  namespace: '/notifications',
  cors: {
    origin: '*',
    credentials: true,
  },
})
export class NotificationsGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  private readonly logger = new Logger(NotificationsGateway.name);

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
    this.logger.log('NotificationsGateway initialized');
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
      (client as AuthenticatedSocket).userRoles = payload.roles;

      // Registrar conexión
      await this.connectionService.registerConnection(client.id, userId, {
        userAgent: client.handshake.headers['user-agent'] as string,
        ip: client.handshake.address,
        namespace: '/notifications',
      });

      // Unir a room personal del usuario
      client.join(`user:${userId}`);

      // Unir a rooms de roles si tiene
      if (payload.roles && Array.isArray(payload.roles)) {
        for (const role of payload.roles) {
          client.join(`role:${role}`);
        }
      }

      // Emitir evento de conexión exitosa
      client.emit('connected', { userId, socketId: client.id });

      this.logger.log(`Client connected: ${client.id} (user: ${userId})`);
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
    await this.connectionService.removeConnection(client.id, 'client_disconnect');
    this.logger.log(`Client disconnected: ${client.id}`);
  }

  // ===== Métodos para enviar notificaciones =====

  /**
   * Enviar notificación a un usuario específico
   */
  async sendToUser(userId: string, notification: NotificationPayload): Promise<void> {
    this.server.to(`user:${userId}`).emit('notification', notification);
    this.logger.debug(`Notification sent to user: ${userId}`);
  }

  /**
   * Enviar notificación a múltiples usuarios
   */
  async sendToUsers(userIds: string[], notification: NotificationPayload): Promise<void> {
    for (const userId of userIds) {
      await this.sendToUser(userId, notification);
    }
  }

  /**
   * Broadcast a todos los usuarios conectados
   */
  async broadcast(notification: NotificationPayload): Promise<void> {
    this.server.emit('notification:broadcast', notification);
    this.logger.debug('Notification broadcast to all users');
  }

  /**
   * Broadcast a usuarios con un rol específico
   */
  async broadcastToRole(role: UserRole, notification: NotificationPayload): Promise<void> {
    this.server.to(`role:${role}`).emit('notification:role', notification);
    this.logger.debug(`Notification broadcast to role: ${role}`);
  }

  // ===== Eventos del cliente =====

  /**
   * Cliente marca notificación como leída
   */
  @SubscribeMessage('notification:read')
  async handleMarkAsRead(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { notificationId: string },
  ): Promise<WsResponse> {
    try {
      const userId = client.userId;
      if (!userId) {
        return { success: false, error: { code: 'NOT_AUTHENTICATED', message: 'Not authenticated' } };
      }

      // Aquí se llamaría al NotificationsService para marcar como leída
      // await this.notificationsService.markAsRead(data.notificationId, userId);

      this.logger.debug(`Notification ${data.notificationId} marked as read by user ${userId}`);

      return { success: true };
    } catch (error: any) {
      this.logger.error(`Error marking notification as read: ${error.message}`);
      return {
        success: false,
        error: { code: 'MARK_READ_ERROR', message: error.message },
      };
    }
  }

  /**
   * Cliente solicita notificaciones no leídas
   */
  @SubscribeMessage('notifications:unread')
  async handleGetUnread(
    @ConnectedSocket() client: AuthenticatedSocket,
  ): Promise<WsResponse<NotificationPayload[]>> {
    try {
      const userId = client.userId;
      if (!userId) {
        return { success: false, error: { code: 'NOT_AUTHENTICATED', message: 'Not authenticated' } };
      }

      // Aquí se llamaría al NotificationsService para obtener no leídas
      // const notifications = await this.notificationsService.getUnread(userId);

      // Por ahora retornamos array vacío
      return { success: true, data: [] };
    } catch (error: any) {
      this.logger.error(`Error fetching unread notifications: ${error.message}`);
      return {
        success: false,
        error: { code: 'FETCH_ERROR', message: error.message },
      };
    }
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
