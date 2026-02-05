import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EventEmitterModule } from '@nestjs/event-emitter';

// Entities
import { Certificate } from './entities/certificate.entity';
import { Enrollment } from '../enrollments/entities/enrollment.entity';

// Services
import { CertificatesService } from './services/certificates.service';

// Controllers
import {
  CertificatesController,
  CertificatesAdminController,
} from './controllers';

// Auth Module (para guards)
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Certificate, Enrollment]),
    EventEmitterModule.forRoot(),
    forwardRef(() => AuthModule),
  ],
  controllers: [CertificatesController, CertificatesAdminController],
  providers: [CertificatesService],
  exports: [CertificatesService],
})
export class CertificatesModule {}
