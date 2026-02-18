import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

// Entities
import { Material } from './entities';
import { CourseModule as CourseModuleEntity } from '../courses/entities/course-module.entity';

// Services
import { MaterialsService } from './services';

// Controllers
import { MaterialsController, MaterialsAdminController } from './controllers';

// External Modules
import { AuthModule } from '../auth/auth.module';
import { EnrollmentsModule } from '../enrollments/enrollments.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Material, CourseModuleEntity]),
    forwardRef(() => AuthModule),
    EnrollmentsModule,
  ],
  controllers: [MaterialsController, MaterialsAdminController],
  providers: [MaterialsService],
  exports: [MaterialsService],
})
export class MaterialsModule {}
