import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

// Entities
import { Material } from './entities';

// Services
import { MaterialsService } from './services';

// Controllers
import { MaterialsController, MaterialsAdminController } from './controllers';

// Auth Module (para guards)
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [TypeOrmModule.forFeature([Material]), forwardRef(() => AuthModule)],
  controllers: [MaterialsController, MaterialsAdminController],
  providers: [MaterialsService],
  exports: [MaterialsService],
})
export class MaterialsModule {}
