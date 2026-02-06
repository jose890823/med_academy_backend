import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { ApiProperty, ApiPropertyOptional, ApiHideProperty } from '@nestjs/swagger';
import { User } from '../../auth/entities/user.entity';
import { Conversation } from './conversation.entity';

/**
 * Estados de un mensaje
 */
export enum MessageStatus {
  SENT = 'sent',
  DELIVERED = 'delivered',
  READ = 'read',
  DELETED = 'deleted',
}

/**
 * Tipos de contenido del mensaje
 */
export enum MessageType {
  TEXT = 'text',
  IMAGE = 'image',
  FILE = 'file',
  SYSTEM = 'system', // Mensajes del sistema (ej: "Usuario se unió")
}

/**
 * Entidad Message
 * Representa un mensaje en una conversación
 */
@Entity('messages')
@Index(['conversationId', 'createdAt'])
@Index(['senderId'])
@Index(['status'])
export class Message {
  @ApiProperty({ description: 'ID único del mensaje' })
  @PrimaryGeneratedColumn('uuid')
  id: string;

  // ============================================
  // CONTENIDO
  // ============================================

  @ApiProperty({ description: 'Contenido del mensaje' })
  @Column({ type: 'text' })
  content: string;

  @ApiProperty({
    description: 'Tipo de mensaje',
    enum: MessageType,
    default: MessageType.TEXT,
  })
  @Column({
    type: 'enum',
    enum: MessageType,
    default: MessageType.TEXT,
  })
  type: MessageType;

  @ApiPropertyOptional({ description: 'URL del archivo adjunto' })
  @Column({ type: 'varchar', length: 500, nullable: true })
  attachmentUrl: string | null;

  @ApiPropertyOptional({ description: 'Nombre del archivo adjunto' })
  @Column({ type: 'varchar', length: 255, nullable: true })
  attachmentName: string | null;

  @ApiPropertyOptional({ description: 'Tipo MIME del archivo' })
  @Column({ type: 'varchar', length: 100, nullable: true })
  attachmentMimeType: string | null;

  @ApiPropertyOptional({ description: 'Tamaño del archivo en bytes' })
  @Column({ type: 'int', nullable: true })
  attachmentSize: number | null;

  // ============================================
  // ESTADO
  // ============================================

  @ApiProperty({
    description: 'Estado del mensaje',
    enum: MessageStatus,
    default: MessageStatus.SENT,
  })
  @Column({
    type: 'enum',
    enum: MessageStatus,
    default: MessageStatus.SENT,
  })
  status: MessageStatus;

  @ApiProperty({ description: 'Fecha de lectura' })
  @Column({ type: 'timestamp with time zone', nullable: true })
  readAt: Date | null;

  @ApiProperty({ description: 'Si fue editado', default: false })
  @Column({ type: 'boolean', default: false })
  isEdited: boolean;

  @ApiProperty({ description: 'Fecha de edición' })
  @Column({ type: 'timestamp with time zone', nullable: true })
  editedAt: Date | null;

  // ============================================
  // RELACIONES
  // ============================================

  @ApiHideProperty()
  @ManyToOne(() => Conversation, (conversation) => conversation.messages, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'conversationId' })
  conversation: Conversation;

  @Column({ type: 'uuid' })
  conversationId: string;

  @ApiProperty({ description: 'Remitente del mensaje' })
  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'senderId' })
  sender: User;

  @Column({ type: 'uuid' })
  senderId: string;

  // ============================================
  // TIMESTAMPS
  // ============================================

  @ApiProperty({ description: 'Fecha de creación' })
  @CreateDateColumn({ type: 'timestamp with time zone' })
  createdAt: Date;

  @ApiProperty({ description: 'Fecha de última actualización' })
  @UpdateDateColumn({ type: 'timestamp with time zone' })
  updatedAt: Date;

  @DeleteDateColumn({ type: 'timestamp with time zone' })
  deletedAt: Date | null;

  // ============================================
  // CONSTRUCTOR Y MÉTODOS
  // ============================================

  constructor(partial: Partial<Message>) {
    Object.assign(this, partial);
  }

  /**
   * Marcar como leído
   */
  markAsRead(): void {
    if (this.status !== MessageStatus.READ) {
      this.status = MessageStatus.READ;
      this.readAt = new Date();
    }
  }

  /**
   * Editar contenido
   */
  edit(newContent: string): void {
    this.content = newContent;
    this.isEdited = true;
    this.editedAt = new Date();
  }

  /**
   * Marcar como eliminado
   */
  markAsDeleted(): void {
    this.status = MessageStatus.DELETED;
    this.content = '[Mensaje eliminado]';
  }

  /**
   * Obtener preview del mensaje (para la lista de conversaciones)
   */
  getPreview(maxLength: number = 100): string {
    if (this.type === MessageType.IMAGE) return '📷 Imagen';
    if (this.type === MessageType.FILE)
      return `📎 ${this.attachmentName || 'Archivo'}`;
    if (this.type === MessageType.SYSTEM) return this.content;

    return this.content.length > maxLength
      ? this.content.substring(0, maxLength) + '...'
      : this.content;
  }

  /**
   * Verificar si tiene archivo adjunto
   */
  hasAttachment(): boolean {
    return !!this.attachmentUrl;
  }
}
