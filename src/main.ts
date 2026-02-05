import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';
import * as express from 'express';
import helmet from 'helmet';

async function bootstrap() {
  const logger = new Logger('Bootstrap');

  // Crear la aplicación con rawBody habilitado para webhooks de Stripe
  const app = await NestFactory.create(AppModule, {
    rawBody: true,
  });

  // ============================================
  // SEGURIDAD - Helmet (HTTP Headers)
  // ============================================
  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          imgSrc: ["'self'", 'data:', 'https:'],
          scriptSrc: ["'self'"],
        },
      },
      crossOriginEmbedderPolicy: false, // Permitir recursos embebidos
      crossOriginResourcePolicy: { policy: 'cross-origin' },
    }),
  );

  // Configurar límite de tamaño para body parser (para archivos base64)
  // Nota: rawBody se preserva automáticamente con la opción rawBody: true
  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ limit: '50mb', extended: true }));

  // Configurar servicio de archivos estáticos para uploads
  app.use('/uploads', express.static('uploads'));

  // Configurar prefijo global
  app.setGlobalPrefix('api');

  // Configurar validation pipe global
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  // ============================================
  // SEGURIDAD - CORS (Cross-Origin Resource Sharing)
  // ============================================
  const allowedOrigins = [
    'http://localhost:3000',
    'http://localhost:3002',
    'https://ultrasoundmedacademy.com',
    'https://www.ultrasoundmedacademy.com',
    'https://admin.ultrasoundmedacademy.com',
    'https://app.ultrasoundmedacademy.com',
  ];

  app.enableCors({
    origin: (origin, callback) => {
      // Permitir requests sin origin (como mobile apps o Postman)
      if (!origin) {
        return callback(null, true);
      }

      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      }

      // En desarrollo, permitir cualquier localhost
      if (process.env.NODE_ENV === 'development' && origin.includes('localhost')) {
        return callback(null, true);
      }

      logger.warn(`CORS bloqueado para origen: ${origin}`);
      callback(new Error('Not allowed by CORS'));
    },
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Accept', 'X-Requested-With'],
    credentials: true,
    maxAge: 86400, // 24 horas
  });

  // Configurar Swagger
  const config = new DocumentBuilder()
    .setTitle('Ultrasound MedAcademy API')
    .setDescription('API de Ultrasound MedAcademy - Plataforma de educación en sonografía médica')
    .setVersion('1.0')
    .addBearerAuth()
    .addTag('Auth', 'Autenticación y autorización')
    .addTag('Users', 'Gestión de usuarios')
    .addTag('Users - Profile', 'Perfil de usuario')
    .addTag('Users - Admin', 'Administración de usuarios')
    .addTag('Payments & Subscriptions', 'Pagos y suscripciones')
    .addTag('Contact', 'Formulario de contacto')
    .addTag('Security - Admin', 'Panel de seguridad (Super Admin)')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document, {
    customSiteTitle: 'Ultrasound MedAcademy API Docs',
    customfavIcon: '/favicon.ico',
    customCss: '.swagger-ui .topbar { display: none }',
  });

  const port = process.env.PORT ?? 3001;
  await app.listen(port);

  logger.log(`🚀 Aplicación corriendo en: http://localhost:${port}`);
  logger.log(`📚 Documentación Swagger en: http://localhost:${port}/api/docs`);
  logger.log(`🔒 Seguridad activada: Helmet, CORS, Rate Limiting`);
}

bootstrap().catch((error) => {
  console.error('Error iniciando la aplicación:', error);
  process.exit(1);
});
