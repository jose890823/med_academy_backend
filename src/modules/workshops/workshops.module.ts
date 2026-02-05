import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EventEmitterModule } from '@nestjs/event-emitter';

// Entities
import {
  Workshop,
  WorkshopSession,
  WorkshopRegistration,
  WorkshopInstructor,
} from './entities';

// Services
import {
  WorkshopsService,
  SessionsService,
  RegistrationsService,
} from './services';

// Controllers
import {
  WorkshopsController,
  WorkshopsAdminController,
} from './controllers';

// Auth Module (para guards)
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Workshop,
      WorkshopSession,
      WorkshopRegistration,
      WorkshopInstructor,
    ]),
    EventEmitterModule.forRoot(),
    forwardRef(() => AuthModule),
  ],
  controllers: [
    WorkshopsController,
    WorkshopsAdminController,
  ],
  providers: [
    WorkshopsService,
    SessionsService,
    RegistrationsService,
  ],
  exports: [
    WorkshopsService,
    SessionsService,
    RegistrationsService,
  ],
})
export class WorkshopsModule {}
