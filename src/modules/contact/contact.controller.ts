import {
  Controller,
  Post,
  Get,
  Body,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import type { Request } from 'express';
import { ContactService } from './contact.service';
import { CreateContactMessageDto } from './dto/create-contact-message.dto';
import { Public } from '../auth/decorators/public.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { User } from '../auth/entities/user.entity';

@ApiTags('Contact')
@Controller('contact')
export class ContactController {
  constructor(private readonly contactService: ContactService) {}

  @Public()
  @Post()
  @ApiOperation({ summary: 'Enviar mensaje de contacto' })
  @ApiResponse({
    status: 201,
    description: 'Mensaje enviado exitosamente',
  })
  @ApiResponse({
    status: 400,
    description: 'Limite de mensajes alcanzado (1 por dia)',
  })
  async create(
    @Body() dto: CreateContactMessageDto,
    @Req() req: Request,
  ) {
    const ipAddress =
      req.headers['x-forwarded-for']?.toString().split(',')[0] ||
      req.socket?.remoteAddress ||
      req.ip;
    const userAgent = req.headers['user-agent'];

    // Si hay un usuario autenticado, obtenerlo del request
    const userId = (req as any).user?.id;

    const message = await this.contactService.create(
      dto,
      ipAddress,
      userAgent,
      userId,
    );

    return {
      message: 'Mensaje enviado exitosamente. Te responderemos pronto.',
      id: message.id,
    };
  }

  @Public()
  @Get('can-send')
  @ApiOperation({ summary: 'Verifica si puede enviar un mensaje' })
  @ApiResponse({
    status: 200,
    description: 'Retorna si puede enviar y cuando estara disponible',
  })
  async checkCanSend(@Query('email') email: string) {
    if (!email) {
      return { canSend: true };
    }
    return this.contactService.checkCanSend(email);
  }
}
