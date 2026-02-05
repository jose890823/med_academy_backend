import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, MoreThanOrEqual } from 'typeorm';
import {
  ContactMessage,
  ContactMessageStatus,
} from './entities/contact-message.entity';
import { CreateContactMessageDto } from './dto/create-contact-message.dto';
import { ReplyContactMessageDto } from './dto/reply-contact-message.dto';
import { EmailService } from '../email/email.service';

@Injectable()
export class ContactService {
  constructor(
    @InjectRepository(ContactMessage)
    private readonly contactMessageRepository: Repository<ContactMessage>,
    private readonly emailService: EmailService,
  ) {}

  /**
   * Crea un nuevo mensaje de contacto
   * Valida que no se haya enviado un mensaje en las ultimas 24 horas
   */
  async create(
    dto: CreateContactMessageDto,
    ipAddress?: string,
    userAgent?: string,
    userId?: string,
  ): Promise<ContactMessage> {
    // Validar limite de 1 mensaje por dia
    const canSend = await this.canSendMessage(dto.email, ipAddress);
    if (!canSend) {
      throw new BadRequestException(
        'Ya has enviado un mensaje hoy. Por favor intenta de nuevo manana.',
      );
    }

    const message = this.contactMessageRepository.create({
      ...dto,
      ipAddress,
      userAgent,
      userId,
      status: ContactMessageStatus.PENDING,
    });

    const savedMessage = await this.contactMessageRepository.save(message);

    // Notificar al admin por email (opcional, no bloqueante)
    this.notifyAdminNewMessage(savedMessage).catch((error) => {
      console.error('Error al notificar admin:', error);
    });

    return savedMessage;
  }

  /**
   * Verifica si puede enviar un mensaje (limite 1 por dia)
   */
  async canSendMessage(email: string, ipAddress?: string): Promise<boolean> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Buscar mensajes del mismo email en las ultimas 24 horas
    const existingMessage = await this.contactMessageRepository.findOne({
      where: {
        email: email.toLowerCase(),
        createdAt: MoreThanOrEqual(today),
      },
    });

    return !existingMessage;
  }

  /**
   * Verifica si un email puede enviar mensaje (para el frontend)
   */
  async checkCanSend(email: string): Promise<{ canSend: boolean; nextAvailableAt?: Date }> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const existingMessage = await this.contactMessageRepository.findOne({
      where: {
        email: email.toLowerCase(),
        createdAt: MoreThanOrEqual(today),
      },
      order: { createdAt: 'DESC' },
    });

    if (!existingMessage) {
      return { canSend: true };
    }

    // Calcular cuando podra enviar de nuevo (siguiente dia a las 00:00)
    const nextAvailable = new Date(today);
    nextAvailable.setDate(nextAvailable.getDate() + 1);

    return {
      canSend: false,
      nextAvailableAt: nextAvailable,
    };
  }

  /**
   * Obtiene todos los mensajes (admin)
   */
  async findAll(
    page: number = 1,
    limit: number = 20,
    status?: ContactMessageStatus,
  ): Promise<{
    messages: ContactMessage[];
    total: number;
    page: number;
    totalPages: number;
  }> {
    const skip = (page - 1) * limit;

    const whereCondition = status ? { status } : {};

    const [messages, total] = await this.contactMessageRepository.findAndCount({
      where: whereCondition,
      relations: ['user'],
      order: { createdAt: 'DESC' },
      skip,
      take: limit,
    });

    return {
      messages,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Obtiene un mensaje por ID (admin)
   */
  async findOne(id: string): Promise<ContactMessage> {
    const message = await this.contactMessageRepository.findOne({
      where: { id },
      relations: ['user'],
    });

    if (!message) {
      throw new NotFoundException('Mensaje no encontrado');
    }

    return message;
  }

  /**
   * Actualiza el estado de un mensaje (admin)
   */
  async updateStatus(
    id: string,
    status: ContactMessageStatus,
  ): Promise<ContactMessage> {
    const message = await this.findOne(id);
    message.status = status;
    return this.contactMessageRepository.save(message);
  }

  /**
   * Responde a un mensaje (admin)
   */
  async reply(
    id: string,
    dto: ReplyContactMessageDto,
    adminId: string,
  ): Promise<ContactMessage> {
    const message = await this.findOne(id);

    message.adminReply = dto.reply;
    message.repliedAt = new Date();
    message.repliedById = adminId;
    message.status = ContactMessageStatus.REPLIED;

    const updatedMessage = await this.contactMessageRepository.save(message);

    // Enviar respuesta por email
    await this.sendReplyEmail(updatedMessage);

    return updatedMessage;
  }

  /**
   * Elimina un mensaje (admin)
   */
  async remove(id: string): Promise<void> {
    const message = await this.findOne(id);
    await this.contactMessageRepository.remove(message);
  }

  /**
   * Obtiene estadisticas de mensajes (admin)
   */
  async getStats(): Promise<{
    total: number;
    pending: number;
    read: number;
    replied: number;
    archived: number;
    todayCount: number;
  }> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [total, pending, read, replied, archived, todayCount] =
      await Promise.all([
        this.contactMessageRepository.count(),
        this.contactMessageRepository.count({
          where: { status: ContactMessageStatus.PENDING },
        }),
        this.contactMessageRepository.count({
          where: { status: ContactMessageStatus.READ },
        }),
        this.contactMessageRepository.count({
          where: { status: ContactMessageStatus.REPLIED },
        }),
        this.contactMessageRepository.count({
          where: { status: ContactMessageStatus.ARCHIVED },
        }),
        this.contactMessageRepository.count({
          where: { createdAt: MoreThanOrEqual(today) },
        }),
      ]);

    return { total, pending, read, replied, archived, todayCount };
  }

  /**
   * Notifica al admin sobre un nuevo mensaje
   */
  private async notifyAdminNewMessage(message: ContactMessage): Promise<void> {
    // Aqui podrias enviar un email al admin
    // Por ahora solo logueamos
    console.log(`[ContactService] Nuevo mensaje de contacto: ${message.id}`);
    console.log(`  De: ${message.name} <${message.email}>`);
    console.log(`  Asunto: ${message.subject}`);
  }

  /**
   * Envia la respuesta por email al usuario
   */
  private async sendReplyEmail(message: ContactMessage): Promise<void> {
    try {
      await this.emailService.sendEmail({
        to: message.email,
        subject: `Re: ${message.subject}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #8B5CF6;">Respuesta a tu mensaje</h2>
            <p>Hola ${message.name},</p>
            <p>Gracias por contactarnos. Aqui esta nuestra respuesta:</p>
            <div style="background-color: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
              ${message.adminReply.replace(/\n/g, '<br>')}
            </div>
            <p style="color: #6b7280; font-size: 14px;">
              Este mensaje es una respuesta a tu consulta: "${message.subject}"
            </p>
            <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 20px 0;">
            <p style="color: #9ca3af; font-size: 12px;">
              PublishSparks - Tu copiloto de contenido
            </p>
          </div>
        `,
      });
    } catch (error) {
      console.error('Error al enviar respuesta por email:', error);
      throw new BadRequestException(
        'No se pudo enviar el email de respuesta. El mensaje fue guardado.',
      );
    }
  }
}
