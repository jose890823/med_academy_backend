import { Module, Global } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { CacheModule } from '@nestjs/cache-manager';

// Entity
import { SocketConnectionEntity } from './entities/socket-connection.entity';

// Services
import { SocketConnectionService } from './services/socket-connection.service';

// Gateways
import { NotificationsGateway } from './gateways/notifications.gateway';
import { MessagingGateway } from './gateways/messaging.gateway';

@Global()
@Module({
  imports: [
    TypeOrmModule.forFeature([SocketConnectionEntity]),
    ConfigModule,
    CacheModule.register(),
    // JWT Module para verificación de tokens en WebSocket
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: async (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET') || 'default-secret',
        signOptions: {
          expiresIn: configService.get('JWT_EXPIRATION') || '15m',
        },
      }),
    }),
  ],
  providers: [
    // Services
    SocketConnectionService,

    // Gateways
    NotificationsGateway,
    MessagingGateway,
  ],
  exports: [
    SocketConnectionService,
    NotificationsGateway,
    MessagingGateway,
  ],
})
export class WebSocketModule {}
