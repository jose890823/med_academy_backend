import { Module, Logger, Global } from '@nestjs/common';
import { APP_FILTER, APP_INTERCEPTOR } from '@nestjs/core';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ModuleLoaderService } from './shared/module-loader.service';
import { ModuleManagerService } from './shared/module-manager.service';
import { DatabaseModule } from './shared/database.module';
import { ResponseInterceptor } from './common/interceptors/response.interceptor';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { existsSync } from 'fs';
import { join } from 'path';

// Importar módulos del dominio
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { PaymentsModule } from './modules/payments/payments.module';
import { SeederModule } from './shared/seeder.module';
import { ContactModule } from './modules/contact/contact.module';
import { SecurityModule } from './modules/security/security.module';
import { CoursesModule } from './modules/courses/courses.module';
import { EnrollmentsModule } from './modules/enrollments/enrollments.module';
import { EvaluationsModule } from './modules/evaluations/evaluations.module';
import { ReferralsModule } from './modules/referrals/referrals.module';
import { ProgressModule } from './modules/progress/progress.module';

// Importación condicional de módulos opcionales
let EmailModule: any = null;
const emailModulePath = join(__dirname, 'modules/email/email.module');
if (existsSync(emailModulePath + '.ts') || existsSync(emailModulePath + '.js')) {
  try {
    EmailModule = require('./modules/email/email.module').EmailModule;
  } catch (error) {
    // EmailModule no disponible
  }
}

// Los módulos se irán agregando aquí conforme se creen

@Global()
@Module({
  imports: [
    DatabaseModule,
    // Event Emitter para notificaciones asíncronas
    EventEmitterModule.forRoot({
      wildcard: false,
      delimiter: '.',
      newListener: false,
      removeListener: false,
      maxListeners: 10,
      verboseMemoryLeak: false,
      ignoreErrors: false,
    }),
    AuthModule,
    UsersModule,
    PaymentsModule,
    SeederModule,
    ContactModule,
    SecurityModule,
    CoursesModule,
    EnrollmentsModule,
    EvaluationsModule,
    ReferralsModule,
    ProgressModule,
    // Módulos opcionales
    ...(EmailModule ? [EmailModule] : []),
  ],
  controllers: [AppController],
  providers: [
    AppService,
    ModuleLoaderService,
    ModuleManagerService, // Gestor de módulos global
    {
      provide: APP_INTERCEPTOR,
      useClass: ResponseInterceptor,
    },
    {
      provide: APP_FILTER,
      useClass: HttpExceptionFilter,
    },
  ],
  exports: [ModuleManagerService], // Exportar para que esté disponible globalmente
})
export class AppModule {
  private static readonly logger = new Logger(AppModule.name);

  constructor(private moduleManager: ModuleManagerService) {
    AppModule.logger.log('AppModule inicializado - Ultrasound MedAcademy');
    AppModule.logger.log('DatabaseModule configurado con PostgreSQL');
    AppModule.logger.log('AuthModule integrado - Autenticacion JWT completa');
    AppModule.logger.log('UsersModule integrado - Gestion de usuarios');
    AppModule.logger.log('PaymentsModule integrado - Pagos con Stripe');
    AppModule.logger.log('SeederModule integrado - Creacion automatica de Super Admin');
    AppModule.logger.log('ContactModule integrado - Formulario de contacto');
    AppModule.logger.log('SecurityModule integrado - Rate Limiting, IP Block, Alertas');
    AppModule.logger.log('CoursesModule integrado - Cursos, Categorías, Convocatorias, Aulas');
    AppModule.logger.log('EnrollmentsModule integrado - Inscripciones de estudiantes');
    AppModule.logger.log('EvaluationsModule integrado - Evaluaciones, Preguntas e Intentos');
    AppModule.logger.log('ReferralsModule integrado - Codigos de referido y recompensas');
    AppModule.logger.log('ProgressModule integrado - Progreso, Logros y Actividad');

    // Log módulos opcionales
    if (EmailModule) {
      AppModule.logger.log('EmailModule detectado y cargado');
    } else {
      AppModule.logger.warn(
        'EmailModule no disponible - sistema funcionara sin envio de emails',
      );
    }

    AppModule.logger.log('ModuleManagerService activado');
    AppModule.logger.log('Estructura base lista para modulos');
  }
}
