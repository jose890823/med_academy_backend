import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Inject } from '@nestjs/common';
import type { Cache } from 'cache-manager';
import { SocketConnectionEntity } from '../entities/socket-connection.entity';
import { SocketConnection, ConnectionMeta } from '../interfaces/socket-client.interface';

const CACHE_TTL = 86400000; // 24 horas en ms

/**
 * Servicio para gestionar conexiones de WebSocket
 */
@Injectable()
export class SocketConnectionService {
  private readonly logger = new Logger(SocketConnectionService.name);

  // Almacenamiento en memoria para acceso rápido
  private connections: Map<string, SocketConnection> = new Map();

  constructor(
    @InjectRepository(SocketConnectionEntity)
    private readonly connectionRepository: Repository<SocketConnectionEntity>,
    @Inject(CACHE_MANAGER) private readonly cacheManager: Cache,
  ) {}

  /**
   * Registrar una nueva conexión
   */
  async registerConnection(
    socketId: string,
    userId: string,
    meta: ConnectionMeta,
  ): Promise<void> {
    const connection: SocketConnection = {
      socketId,
      userId,
      connectedAt: new Date(),
      userAgent: meta.userAgent,
      ipAddress: meta.ip,
      namespace: meta.namespace,
    };

    // Guardar en memoria
    this.connections.set(socketId, connection);

    // Guardar en cache
    await this.cacheManager.set(`socket:${socketId}`, connection, CACHE_TTL);

    // Agregar a lista de sockets del usuario
    const userSockets = await this.getUserSockets(userId);
    if (!userSockets.includes(socketId)) {
      userSockets.push(socketId);
      await this.cacheManager.set(`user:sockets:${userId}`, userSockets, CACHE_TTL);
    }

    // Persistir para estadísticas
    await this.connectionRepository.save(
      this.connectionRepository.create({
        socketId,
        userId,
        userAgent: meta.userAgent || null,
        ipAddress: meta.ip || null,
        namespace: meta.namespace || null,
        connectedAt: connection.connectedAt,
      }),
    );

    this.logger.debug(`Connection registered: ${socketId} (user: ${userId})`);
  }

  /**
   * Eliminar una conexión
   */
  async removeConnection(socketId: string, reason?: string): Promise<void> {
    const connection = this.connections.get(socketId);

    if (connection) {
      // Remover de lista del usuario
      const userSockets = await this.getUserSockets(connection.userId);
      const updated = userSockets.filter((s) => s !== socketId);
      await this.cacheManager.set(`user:sockets:${connection.userId}`, updated, CACHE_TTL);
    }

    // Eliminar de memoria
    this.connections.delete(socketId);

    // Eliminar de cache
    await this.cacheManager.del(`socket:${socketId}`);

    // Actualizar registro en BD
    await this.connectionRepository.update(
      { socketId },
      {
        disconnectedAt: new Date(),
        disconnectReason: reason || null,
      },
    );

    this.logger.debug(`Connection removed: ${socketId}`);
  }

  /**
   * Obtener conexión por socket ID
   */
  async getConnection(socketId: string): Promise<SocketConnection | null> {
    // Primero buscar en memoria
    let connection = this.connections.get(socketId);
    if (connection) return connection;

    // Luego buscar en cache
    connection = await this.cacheManager.get<SocketConnection>(`socket:${socketId}`);
    if (connection) {
      this.connections.set(socketId, connection);
      return connection;
    }

    return null;
  }

  /**
   * Obtener el userId de un socket
   */
  async getUserId(socketId: string): Promise<string | null> {
    const connection = await this.getConnection(socketId);
    return connection?.userId || null;
  }

  /**
   * Obtener todos los sockets de un usuario
   */
  async getUserSockets(userId: string): Promise<string[]> {
    const cached = await this.cacheManager.get<string[]>(`user:sockets:${userId}`);
    return cached || [];
  }

  /**
   * Verificar si un usuario está online
   */
  async isUserOnline(userId: string): Promise<boolean> {
    const sockets = await this.getUserSockets(userId);
    return sockets.length > 0;
  }

  /**
   * Obtener todos los usuarios online
   */
  async getOnlineUsers(): Promise<string[]> {
    const onlineUsers: Set<string> = new Set();

    for (const connection of this.connections.values()) {
      onlineUsers.add(connection.userId);
    }

    return Array.from(onlineUsers);
  }

  /**
   * Obtener el número de conexiones activas
   */
  getActiveConnectionsCount(): number {
    return this.connections.size;
  }

  /**
   * Obtener todas las conexiones de un namespace
   */
  getConnectionsByNamespace(namespace: string): SocketConnection[] {
    return Array.from(this.connections.values()).filter(
      (conn) => conn.namespace === namespace,
    );
  }

  /**
   * Limpiar conexiones huérfanas (para mantenimiento)
   */
  async cleanOrphanedConnections(): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setHours(cutoffDate.getHours() - 24);

    const result = await this.connectionRepository
      .createQueryBuilder()
      .update(SocketConnectionEntity)
      .set({
        disconnectedAt: new Date(),
        disconnectReason: 'cleanup',
      })
      .where('disconnectedAt IS NULL')
      .andWhere('connectedAt < :cutoffDate', { cutoffDate })
      .execute();

    if (result.affected && result.affected > 0) {
      this.logger.log(`Cleaned up ${result.affected} orphaned connections`);
    }

    return result.affected || 0;
  }

  /**
   * Obtener estadísticas de conexiones
   */
  async getConnectionStats(): Promise<{
    activeConnections: number;
    uniqueUsers: number;
    byNamespace: Record<string, number>;
  }> {
    const uniqueUsers = new Set<string>();
    const byNamespace: Record<string, number> = {};

    for (const connection of this.connections.values()) {
      uniqueUsers.add(connection.userId);

      const ns = connection.namespace || 'default';
      byNamespace[ns] = (byNamespace[ns] || 0) + 1;
    }

    return {
      activeConnections: this.connections.size,
      uniqueUsers: uniqueUsers.size,
      byNamespace,
    };
  }

  /**
   * Obtener historial de conexiones de un usuario
   */
  async getUserConnectionHistory(
    userId: string,
    limit: number = 10,
  ): Promise<SocketConnectionEntity[]> {
    return this.connectionRepository.find({
      where: { userId },
      order: { connectedAt: 'DESC' },
      take: limit,
    });
  }
}
