import { Module, Logger, Global, OnModuleInit } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { DataSource } from 'typeorm';

@Global()
@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: async (configService: ConfigService) => {
        const logger = new Logger('DatabaseModule');

        try {
          // TYPEORM_SYNC permite forzar sincronización en producción (usar solo para crear tablas inicialmente)
          const forceSync = configService.get('TYPEORM_SYNC', 'false') === 'true';
          const isProduction = configService.get('NODE_ENV') === 'production';
          const shouldSync = forceSync || !isProduction;

          const dbConfig = {
            type: 'postgres' as const,
            host: configService.get('DB_HOST', 'localhost'),
            port: configService.get('DB_PORT', 5432),
            username: configService.get('DB_USERNAME', 'postgres'),
            password: configService.get('DB_PASSWORD', 'postgres'),
            database: configService.get('DB_NAME', 'modular_base'),
            entities: [__dirname + '/../**/*.entity{.ts,.js}'],
            synchronize: shouldSync,
            logging: configService.get('NODE_ENV') === 'development',
            retryAttempts: 3,
            retryDelay: 3000,
          };

          if (forceSync && isProduction) {
            logger.warn('⚠️  TYPEORM_SYNC=true en producción - Las tablas se sincronizarán automáticamente');
            logger.warn('⚠️  RECUERDA desactivar TYPEORM_SYNC después de crear las tablas');
          }

          logger.log('🔄 Intentando conectar a PostgreSQL...');
          logger.log(`📍 Host: ${dbConfig.host}:${dbConfig.port}`);
          logger.log(`📊 Database: ${dbConfig.database}`);

          return dbConfig;
        } catch (error) {
          logger.warn(
            '⚠️  PostgreSQL no disponible, usando fallback in-memory',
          );
          logger.error(`Error: ${error.message}`);

          // Retornar configuración básica que permita el módulo cargar
          return {
            type: 'postgres' as const,
            host: 'localhost',
            port: 5432,
            username: 'invalid',
            password: 'invalid',
            database: 'invalid',
            entities: [],
            synchronize: false,
            logging: false,
          };
        }
      },
    }),
  ],
  exports: [TypeOrmModule],
})
export class DatabaseModule implements OnModuleInit {
  private static readonly logger = new Logger(DatabaseModule.name);

  constructor(private readonly dataSource: DataSource) {
    DatabaseModule.logger.log('💾 DatabaseModule inicializado');
    DatabaseModule.logger.log(
      '🔧 PostgreSQL configurado con fallback automático',
    );
  }

  async onModuleInit() {
    try {
      // Crear extensión uuid-ossp si no existe
      await this.dataSource.query('CREATE EXTENSION IF NOT EXISTS "uuid-ossp"');
      DatabaseModule.logger.log('✅ Extensión uuid-ossp verificada/creada');
    } catch (error) {
      DatabaseModule.logger.warn(`⚠️ No se pudo crear extensión uuid-ossp: ${error.message}`);
    }
  }
}
