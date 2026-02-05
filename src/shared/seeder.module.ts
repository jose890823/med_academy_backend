import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { SeederService } from './seeder.service';
import { User } from '../modules/auth/entities/user.entity';

@Module({
  imports: [TypeOrmModule.forFeature([User]), ConfigModule],
  providers: [SeederService],
  exports: [SeederService],
})
export class SeederModule {}
