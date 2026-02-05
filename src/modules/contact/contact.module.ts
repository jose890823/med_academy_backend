import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ContactMessage } from './entities/contact-message.entity';
import { ContactService } from './contact.service';
import { ContactController } from './contact.controller';
import { ContactAdminController } from './contact-admin.controller';
import { EmailModule } from '../email/email.module';

@Module({
  imports: [TypeOrmModule.forFeature([ContactMessage]), EmailModule],
  controllers: [ContactController, ContactAdminController],
  providers: [ContactService],
  exports: [ContactService],
})
export class ContactModule {}
