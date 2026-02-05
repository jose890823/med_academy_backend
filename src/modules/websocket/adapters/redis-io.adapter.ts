import { INestApplicationContext, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { IoAdapter } from '@nestjs/platform-socket.io';
import { Server, ServerOptions } from 'socket.io';
import { createAdapter } from '@socket.io/redis-adapter';
import { createClient } from 'redis';

/**
 * Adaptador de Socket.IO con Redis para escalabilidad horizontal
 * Permite múltiples instancias del servidor compartiendo estado de WebSocket
 */
export class RedisIoAdapter extends IoAdapter {
  private readonly logger = new Logger(RedisIoAdapter.name);
  private adapterConstructor: ReturnType<typeof createAdapter> | null = null;
  private isRedisConnected = false;

  constructor(
    app: INestApplicationContext,
    private readonly configService?: ConfigService,
  ) {
    super(app);
  }

  /**
   * Conectar a Redis para sincronización de sockets
   */
  async connectToRedis(): Promise<void> {
    const redisUrl =
      this.configService?.get<string>('REDIS_URL') ||
      process.env.REDIS_URL ||
      'redis://localhost:6379';

    try {
      const pubClient = createClient({ url: redisUrl });
      const subClient = pubClient.duplicate();

      // Manejar errores de conexión
      pubClient.on('error', (err) => {
        this.logger.error(`Redis pub client error: ${err.message}`);
      });

      subClient.on('error', (err) => {
        this.logger.error(`Redis sub client error: ${err.message}`);
      });

      await Promise.all([pubClient.connect(), subClient.connect()]);

      this.adapterConstructor = createAdapter(pubClient, subClient);
      this.isRedisConnected = true;

      this.logger.log('Redis adapter connected successfully');
    } catch (error: any) {
      this.logger.warn(
        `Failed to connect to Redis for Socket.IO adapter: ${error.message}. Using in-memory adapter.`,
      );
      this.isRedisConnected = false;
    }
  }

  /**
   * Crear servidor de Socket.IO con el adaptador de Redis
   */
  createIOServer(port: number, options?: ServerOptions): Server {
    const server = super.createIOServer(port, {
      ...options,
      cors: {
        origin: '*',
        methods: ['GET', 'POST'],
        credentials: true,
      },
      transports: ['websocket', 'polling'],
      allowEIO3: true, // Compatibilidad con clientes antiguos
    });

    // Usar adaptador de Redis si está disponible
    if (this.adapterConstructor && this.isRedisConnected) {
      server.adapter(this.adapterConstructor);
      this.logger.log('Socket.IO server using Redis adapter');
    } else {
      this.logger.log('Socket.IO server using in-memory adapter');
    }

    return server;
  }

  /**
   * Verificar si Redis está conectado
   */
  isUsingRedis(): boolean {
    return this.isRedisConnected;
  }
}

/**
 * Factory function para crear el adaptador
 * Se usa en main.ts antes de iniciar la aplicación
 */
export async function createRedisIoAdapter(
  app: INestApplicationContext,
): Promise<RedisIoAdapter> {
  const configService = app.get(ConfigService);
  const adapter = new RedisIoAdapter(app, configService);

  // Intentar conectar a Redis
  await adapter.connectToRedis();

  return adapter;
}
