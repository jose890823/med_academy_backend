import {
  Injectable,
  Logger,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull } from 'typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';
import {
  Conversation,
  ConversationStatus,
  ConversationType,
} from '../entities/conversation.entity';
import {
  Message,
  MessageStatus,
  MessageType,
} from '../entities/message.entity';
import { User } from '../../auth/entities/user.entity';
import {
  CreateConversationDto,
  SendMessageDto,
  EditMessageDto,
  ConversationQueryDto,
  MessageQueryDto,
} from '../dto';
import { ErrorCodes } from '../../../common/dto';

@Injectable()
export class MessagingService {
  private readonly logger = new Logger(MessagingService.name);

  constructor(
    @InjectRepository(Conversation)
    private readonly conversationRepository: Repository<Conversation>,
    @InjectRepository(Message)
    private readonly messageRepository: Repository<Message>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  // ============================================
  // CONVERSACIONES
  // ============================================

  /**
   * Iniciar una nueva conversación
   */
  async createConversation(
    dto: CreateConversationDto,
    senderId: string,
  ): Promise<Conversation> {
    // No permitir conversación consigo mismo
    if (dto.recipientId === senderId) {
      throw new BadRequestException({
        code: ErrorCodes.VALIDATION_ERROR,
        message: 'No puedes iniciar una conversación contigo mismo',
      });
    }

    // Verificar que el destinatario existe
    const recipient = await this.userRepository.findOne({
      where: { id: dto.recipientId, isActive: true },
    });

    if (!recipient) {
      throw new NotFoundException({
        code: ErrorCodes.USER_NOT_FOUND,
        message: 'El destinatario no fue encontrado',
      });
    }

    // Ordenar IDs para asegurar consistencia en la búsqueda
    const [participant1Id, participant2Id] = [senderId, dto.recipientId].sort();

    // Buscar conversación existente
    let conversation = await this.conversationRepository.findOne({
      where: {
        participant1Id,
        participant2Id,
        type: dto.type || ConversationType.DIRECT,
        courseId: dto.courseId ? dto.courseId : IsNull(),
      },
    });

    // Si no existe, crear nueva
    if (!conversation) {
      conversation = this.conversationRepository.create({
        participant1Id,
        participant2Id,
        type: dto.type || ConversationType.DIRECT,
        courseId: dto.courseId || null,
        subject: dto.subject || null,
      });

      conversation = await this.conversationRepository.save(conversation);

      this.logger.log(`Conversación creada: ${conversation.id}`);
    } else {
      // Desarchivar si estaba archivada
      if (conversation.isArchivedFor(senderId)) {
        conversation.unarchive(senderId);
        await this.conversationRepository.save(conversation);
      }
    }

    // Enviar el mensaje inicial
    await this.sendMessage(
      {
        conversationId: conversation.id,
        content: dto.message,
      },
      senderId,
    );

    // Recargar conversación con relaciones
    return this.findConversationById(conversation.id, senderId);
  }

  /**
   * Listar conversaciones del usuario
   */
  async findConversations(
    userId: string,
    query: ConversationQueryDto,
  ): Promise<{
    data: Conversation[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
      hasNextPage: boolean;
      hasPrevPage: boolean;
    };
    unreadTotal: number;
  }> {
    const {
      page = 1,
      limit = 20,
      type,
      includeArchived = false,
      unreadOnly,
      search,
    } = query;

    const queryBuilder = this.conversationRepository
      .createQueryBuilder('conversation')
      .leftJoinAndSelect('conversation.participant1', 'participant1')
      .leftJoinAndSelect('conversation.participant2', 'participant2')
      .leftJoinAndSelect('conversation.course', 'course')
      .where(
        '(conversation.participant1Id = :userId OR conversation.participant2Id = :userId)',
        { userId },
      )
      .andWhere('conversation.status = :status', {
        status: ConversationStatus.ACTIVE,
      });

    // Filtrar archivadas
    if (!includeArchived) {
      queryBuilder.andWhere(
        '((conversation.participant1Id = :userId AND conversation.archivedByParticipant1 = false) OR ' +
          '(conversation.participant2Id = :userId AND conversation.archivedByParticipant2 = false))',
        { userId },
      );
    }

    // Filtrar por tipo
    if (type) {
      queryBuilder.andWhere('conversation.type = :type', { type });
    }

    // Solo con no leídos
    if (unreadOnly) {
      queryBuilder.andWhere(
        '((conversation.participant1Id = :userId AND conversation.unreadCountParticipant1 > 0) OR ' +
          '(conversation.participant2Id = :userId AND conversation.unreadCountParticipant2 > 0))',
        { userId },
      );
    }

    // Buscar por nombre del otro participante
    if (search) {
      queryBuilder.andWhere(
        '((conversation.participant1Id = :userId AND ' +
          '(participant2.firstName ILIKE :search OR participant2.lastName ILIKE :search)) OR ' +
          '(conversation.participant2Id = :userId AND ' +
          '(participant1.firstName ILIKE :search OR participant1.lastName ILIKE :search)))',
        { userId, search: `%${search}%` },
      );
    }

    // Ordenar por último mensaje
    queryBuilder.orderBy('conversation.lastMessageAt', 'DESC', 'NULLS LAST');

    // Paginación
    const total = await queryBuilder.getCount();
    const totalPages = Math.ceil(total / limit);

    queryBuilder.skip((page - 1) * limit).take(limit);

    const data = await queryBuilder.getMany();

    // Calcular total de mensajes no leídos
    const unreadTotalResult = await this.conversationRepository
      .createQueryBuilder('c')
      .select(
        'SUM(CASE WHEN c.participant1Id = :userId THEN c.unreadCountParticipant1 ' +
          'WHEN c.participant2Id = :userId THEN c.unreadCountParticipant2 ELSE 0 END)',
        'total',
      )
      .where('(c.participant1Id = :userId OR c.participant2Id = :userId)', {
        userId,
      })
      .andWhere('c.status = :status', { status: ConversationStatus.ACTIVE })
      .getRawOne();

    const unreadTotal = parseInt(unreadTotalResult?.total || '0', 10);

    return {
      data,
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1,
      },
      unreadTotal,
    };
  }

  /**
   * Obtener conversación por ID
   */
  async findConversationById(
    id: string,
    userId: string,
  ): Promise<Conversation> {
    const conversation = await this.conversationRepository.findOne({
      where: { id },
      relations: ['participant1', 'participant2', 'course'],
    });

    if (!conversation) {
      throw new NotFoundException({
        code: ErrorCodes.NOT_FOUND,
        message: 'La conversación no fue encontrada',
      });
    }

    if (!conversation.isParticipant(userId)) {
      throw new ForbiddenException({
        code: ErrorCodes.FORBIDDEN,
        message: 'No tienes acceso a esta conversación',
      });
    }

    return conversation;
  }

  /**
   * Archivar conversación
   */
  async archiveConversation(id: string, userId: string): Promise<Conversation> {
    const conversation = await this.findConversationById(id, userId);
    conversation.archive(userId);
    return this.conversationRepository.save(conversation);
  }

  /**
   * Desarchivar conversación
   */
  async unarchiveConversation(
    id: string,
    userId: string,
  ): Promise<Conversation> {
    const conversation = await this.findConversationById(id, userId);
    conversation.unarchive(userId);
    return this.conversationRepository.save(conversation);
  }

  // ============================================
  // MENSAJES
  // ============================================

  /**
   * Enviar mensaje
   */
  async sendMessage(dto: SendMessageDto, senderId: string): Promise<Message> {
    const conversation = await this.findConversationById(
      dto.conversationId,
      senderId,
    );

    if (conversation.status !== ConversationStatus.ACTIVE) {
      throw new BadRequestException({
        code: ErrorCodes.VALIDATION_ERROR,
        message: 'No se pueden enviar mensajes en esta conversación',
      });
    }

    const message = this.messageRepository.create({
      conversationId: dto.conversationId,
      senderId,
      content: dto.content,
      type: dto.type || MessageType.TEXT,
      attachmentUrl: dto.attachmentUrl || null,
      attachmentName: dto.attachmentName || null,
      attachmentMimeType: dto.attachmentMimeType || null,
      attachmentSize: dto.attachmentSize || null,
    });

    const saved = await this.messageRepository.save(message);

    // Actualizar conversación
    const recipientId = conversation.getOtherParticipantId(senderId);
    conversation.updateLastMessage(dto.content, senderId);
    if (recipientId) {
      conversation.incrementUnreadCount(recipientId);
    }
    await this.conversationRepository.save(conversation);

    this.logger.log(
      `Mensaje enviado: ${saved.id} en conversación ${dto.conversationId}`,
    );

    // Emitir evento para notificaciones
    this.eventEmitter.emit('messaging.message.sent', {
      message: saved,
      conversation,
      senderId,
      recipientId,
    });

    return saved;
  }

  /**
   * Listar mensajes de una conversación
   */
  async findMessages(
    conversationId: string,
    userId: string,
    query: MessageQueryDto,
  ): Promise<{
    data: Message[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
      hasNextPage: boolean;
      hasPrevPage: boolean;
    };
  }> {
    // Verificar acceso
    await this.findConversationById(conversationId, userId);

    const { page = 1, limit = 50, order = 'DESC' } = query;

    const queryBuilder = this.messageRepository
      .createQueryBuilder('message')
      .leftJoinAndSelect('message.sender', 'sender')
      .where('message.conversationId = :conversationId', { conversationId })
      .andWhere('message.status != :deletedStatus', {
        deletedStatus: MessageStatus.DELETED,
      })
      .orderBy('message.createdAt', order);

    // Paginación
    const total = await queryBuilder.getCount();
    const totalPages = Math.ceil(total / limit);

    queryBuilder.skip((page - 1) * limit).take(limit);

    const data = await queryBuilder.getMany();

    return {
      data,
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1,
      },
    };
  }

  /**
   * Marcar mensajes como leídos
   */
  async markAsRead(conversationId: string, userId: string): Promise<void> {
    const conversation = await this.findConversationById(
      conversationId,
      userId,
    );

    // Marcar todos los mensajes del otro usuario como leídos
    await this.messageRepository
      .createQueryBuilder()
      .update(Message)
      .set({ status: MessageStatus.READ, readAt: new Date() })
      .where('conversationId = :conversationId', { conversationId })
      .andWhere('senderId != :userId', { userId })
      .andWhere('status != :readStatus', { readStatus: MessageStatus.READ })
      .execute();

    // Actualizar contador en la conversación
    conversation.markAsRead(userId);
    await this.conversationRepository.save(conversation);

    this.logger.log(
      `Mensajes marcados como leídos: conversación ${conversationId}`,
    );
  }

  /**
   * Editar mensaje (solo el remitente)
   */
  async editMessage(
    messageId: string,
    dto: EditMessageDto,
    userId: string,
  ): Promise<Message> {
    const message = await this.messageRepository.findOne({
      where: { id: messageId },
    });

    if (!message) {
      throw new NotFoundException({
        code: ErrorCodes.NOT_FOUND,
        message: 'El mensaje no fue encontrado',
      });
    }

    if (message.senderId !== userId) {
      throw new ForbiddenException({
        code: ErrorCodes.FORBIDDEN,
        message: 'No puedes editar mensajes de otros usuarios',
      });
    }

    message.edit(dto.content);
    return this.messageRepository.save(message);
  }

  /**
   * Eliminar mensaje (soft delete)
   */
  async deleteMessage(messageId: string, userId: string): Promise<void> {
    const message = await this.messageRepository.findOne({
      where: { id: messageId },
    });

    if (!message) {
      throw new NotFoundException({
        code: ErrorCodes.NOT_FOUND,
        message: 'El mensaje no fue encontrado',
      });
    }

    if (message.senderId !== userId) {
      throw new ForbiddenException({
        code: ErrorCodes.FORBIDDEN,
        message: 'No puedes eliminar mensajes de otros usuarios',
      });
    }

    message.markAsDeleted();
    await this.messageRepository.save(message);

    this.logger.log(`Mensaje eliminado: ${messageId}`);
  }

  // ============================================
  // ESTADÍSTICAS
  // ============================================

  /**
   * Obtener contador de mensajes no leídos del usuario
   */
  async getUnreadCount(userId: string): Promise<number> {
    const result = await this.conversationRepository
      .createQueryBuilder('c')
      .select(
        'SUM(CASE WHEN c.participant1Id = :userId THEN c.unreadCountParticipant1 ' +
          'WHEN c.participant2Id = :userId THEN c.unreadCountParticipant2 ELSE 0 END)',
        'total',
      )
      .where('(c.participant1Id = :userId OR c.participant2Id = :userId)', {
        userId,
      })
      .andWhere('c.status = :status', { status: ConversationStatus.ACTIVE })
      .getRawOne();

    return parseInt(result?.total || '0', 10);
  }
}
