import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

// Entities
import { ReferralCode, Referral } from './entities';

// Services
import { ReferralCodesService, ReferralsService } from './services';

// Controllers
import { ReferralsController, ReferralsAdminController } from './controllers';

@Module({
  imports: [
    TypeOrmModule.forFeature([ReferralCode, Referral]),
  ],
  controllers: [
    ReferralsController,
    ReferralsAdminController,
  ],
  providers: [
    ReferralCodesService,
    ReferralsService,
  ],
  exports: [
    ReferralCodesService,
    ReferralsService,
  ],
})
export class ReferralsModule {}
