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
  HttpCode,
  HttpStatus,
  ParseUUIDPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { User } from '../../auth/entities/user.entity';
import { MessagingService } from '../services/messaging.service';
import { Conversation } from '../entities/conversation.entity';
import { Message } from '../entities/message.entity';
import {
  CreateConversationDto,
  SendMessageDto,
  EditMessageDto,
  ConversationQueryDto,
  MessageQueryDto,
} from '../dto';

/**
 * Controlador de Mensajería Directa
 */
@ApiTags('Messaging')
@Controller('v1/messaging')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class MessagingController {
  constructor(private readonly messagingService: MessagingService) {}

  // ============================================
  // CONVERSACIONES
  // ============================================

  @Get('conversations')
  @ApiOperation({
    summary: 'Listar conversaciones',
    description: 'Lista las conversaciones del usuario actual',
  })
  @ApiResponse({
    status: 200,
    description: 'Lista de conversaciones con paginación',
  })
  async findConversations(
    @CurrentUser() user: User,
    @Query() query: ConversationQueryDto,
  ) {
    return this.messagingService.findConversations(user.id, query);
  }

  @Post('conversations')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Iniciar conversación',
    description:
      'Inicia una nueva conversación o envía mensaje a una existente',
  })
  @ApiResponse({
    status: 201,
    description: 'Conversación creada/encontrada',
    type: Conversation,
  })
  @ApiResponse({
    status: 400,
    description: 'No puedes enviarte mensajes a ti mismo',
  })
  @ApiResponse({ status: 404, description: 'Destinatario no encontrado' })
  async createConversation(
    @Body() dto: CreateConversationDto,
    @CurrentUser() user: User,
  ): Promise<Conversation> {
    return this.messagingService.createConversation(dto, user.id);
  }

  @Get('conversations/:id')
  @ApiOperation({
    summary: 'Obtener conversación',
    description: 'Obtiene una conversación específica',
  })
  @ApiParam({ name: 'id', description: 'UUID de la conversación' })
  @ApiResponse({
    status: 200,
    description: 'Conversación encontrada',
    type: Conversation,
  })
  @ApiResponse({
    status: 403,
    description: 'No tienes acceso a esta conversación',
  })
  async findConversationById(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: User,
  ): Promise<Conversation> {
    return this.messagingService.findConversationById(id, user.id);
  }

  @Patch('conversations/:id/archive')
  @ApiOperation({
    summary: 'Archivar conversación',
    description: 'Archiva una conversación (no la elimina)',
  })
  @ApiParam({ name: 'id', description: 'UUID de la conversación' })
  @ApiResponse({
    status: 200,
    description: 'Conversación archivada',
    type: Conversation,
  })
  async archiveConversation(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: User,
  ): Promise<Conversation> {
    return this.messagingService.archiveConversation(id, user.id);
  }

  @Patch('conversations/:id/unarchive')
  @ApiOperation({
    summary: 'Desarchivar conversación',
    description: 'Saca una conversación del archivo',
  })
  @ApiParam({ name: 'id', description: 'UUID de la conversación' })
  @ApiResponse({
    status: 200,
    description: 'Conversación desarchivada',
    type: Conversation,
  })
  async unarchiveConversation(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: User,
  ): Promise<Conversation> {
    return this.messagingService.unarchiveConversation(id, user.id);
  }

  // ============================================
  // MENSAJES
  // ============================================

  @Get('conversations/:id/messages')
  @ApiOperation({
    summary: 'Listar mensajes',
    description: 'Lista los mensajes de una conversación',
  })
  @ApiParam({ name: 'id', description: 'UUID de la conversación' })
  @ApiResponse({
    status: 200,
    description: 'Mensajes de la conversación',
  })
  async findMessages(
    @Param('id', ParseUUIDPipe) conversationId: string,
    @Query() query: MessageQueryDto,
    @CurrentUser() user: User,
  ) {
    return this.messagingService.findMessages(conversationId, user.id, query);
  }

  @Post('messages')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Enviar mensaje',
    description: 'Envía un mensaje en una conversación existente',
  })
  @ApiResponse({
    status: 201,
    description: 'Mensaje enviado',
    type: Message,
  })
  @ApiResponse({
    status: 403,
    description: 'No tienes acceso a esta conversación',
  })
  async sendMessage(
    @Body() dto: SendMessageDto,
    @CurrentUser() user: User,
  ): Promise<Message> {
    return this.messagingService.sendMessage(dto, user.id);
  }

  @Patch('conversations/:id/read')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Marcar como leídos',
    description: 'Marca todos los mensajes de una conversación como leídos',
  })
  @ApiParam({ name: 'id', description: 'UUID de la conversación' })
  @ApiResponse({ status: 200, description: 'Mensajes marcados como leídos' })
  async markAsRead(
    @Param('id', ParseUUIDPipe) conversationId: string,
    @CurrentUser() user: User,
  ) {
    await this.messagingService.markAsRead(conversationId, user.id);
    return { success: true };
  }

  @Patch('messages/:id')
  @ApiOperation({
    summary: 'Editar mensaje',
    description: 'Edita un mensaje propio',
  })
  @ApiParam({ name: 'id', description: 'UUID del mensaje' })
  @ApiResponse({
    status: 200,
    description: 'Mensaje editado',
    type: Message,
  })
  @ApiResponse({ status: 403, description: 'No puedes editar este mensaje' })
  async editMessage(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: EditMessageDto,
    @CurrentUser() user: User,
  ): Promise<Message> {
    return this.messagingService.editMessage(id, dto, user.id);
  }

  @Delete('messages/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Eliminar mensaje',
    description:
      'Elimina un mensaje propio (se muestra como "mensaje eliminado")',
  })
  @ApiParam({ name: 'id', description: 'UUID del mensaje' })
  @ApiResponse({ status: 204, description: 'Mensaje eliminado' })
  @ApiResponse({ status: 403, description: 'No puedes eliminar este mensaje' })
  async deleteMessage(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: User,
  ): Promise<void> {
    return this.messagingService.deleteMessage(id, user.id);
  }

  // ============================================
  // ESTADÍSTICAS
  // ============================================

  @Get('unread-count')
  @ApiOperation({
    summary: 'Contador de no leídos',
    description: 'Obtiene el total de mensajes no leídos del usuario',
  })
  @ApiResponse({
    status: 200,
    description: 'Contador de no leídos',
  })
  async getUnreadCount(@CurrentUser() user: User) {
    const count = await this.messagingService.getUnreadCount(user.id);
    return { unreadCount: count };
  }
}
