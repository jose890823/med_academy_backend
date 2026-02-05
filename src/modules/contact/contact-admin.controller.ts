import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  ParseUUIDPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { ContactService } from './contact.service';
import { ReplyContactMessageDto } from './dto/reply-contact-message.dto';
import { UpdateMessageStatusDto } from './dto/update-message-status.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { User, UserRole } from '../auth/entities/user.entity';
import { ContactMessageStatus } from './entities/contact-message.entity';

@ApiTags('Contact - Admin')
@Controller('admin/contact')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
@ApiBearerAuth()
export class ContactAdminController {
  constructor(private readonly contactService: ContactService) {}

  @Get()
  @ApiOperation({ summary: 'Listar todos los mensajes de contacto' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'status', required: false, enum: ContactMessageStatus })
  @ApiResponse({
    status: 200,
    description: 'Lista de mensajes con paginacion',
  })
  async findAll(
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('status') status?: ContactMessageStatus,
  ) {
    return this.contactService.findAll(page || 1, limit || 20, status);
  }

  @Get('stats')
  @ApiOperation({ summary: 'Obtener estadisticas de mensajes' })
  @ApiResponse({
    status: 200,
    description: 'Estadisticas de mensajes',
  })
  async getStats() {
    return this.contactService.getStats();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener un mensaje por ID' })
  @ApiResponse({
    status: 200,
    description: 'Mensaje encontrado',
  })
  @ApiResponse({
    status: 404,
    description: 'Mensaje no encontrado',
  })
  async findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.contactService.findOne(id);
  }

  @Patch(':id/status')
  @ApiOperation({ summary: 'Actualizar estado de un mensaje' })
  @ApiResponse({
    status: 200,
    description: 'Estado actualizado',
  })
  async updateStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateMessageStatusDto,
  ) {
    return this.contactService.updateStatus(id, dto.status);
  }

  @Post(':id/reply')
  @ApiOperation({ summary: 'Responder a un mensaje' })
  @ApiResponse({
    status: 200,
    description: 'Respuesta enviada',
  })
  async reply(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ReplyContactMessageDto,
    @CurrentUser() user: User,
  ) {
    return this.contactService.reply(id, dto, user.id);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Eliminar un mensaje' })
  @ApiResponse({
    status: 200,
    description: 'Mensaje eliminado',
  })
  async remove(@Param('id', ParseUUIDPipe) id: string) {
    await this.contactService.remove(id);
    return { message: 'Mensaje eliminado exitosamente' };
  }
}
