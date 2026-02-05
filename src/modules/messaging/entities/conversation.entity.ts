import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
  Index,
  Unique,
} from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';
import { User } from '../../auth/entities/user.entity';
import { Course } from '../../courses/entities/course.entity';
import { Message } from './message.entity';

/**
 * Estados de una conversación
 */
export enum ConversationStatus {
  ACTIVE = 'active',
  ARCHIVED = 'archived',
  BLOCKED = 'blocked',
}

/**
 * Tipos de conversación
 */
export enum ConversationType {
  DIRECT = 'direct', // Entre dos usuarios
  COURSE_SUPPORT = 'course_support', // Soporte de curso (estudiante-instructor)
  ADMIN_SUPPORT = 'admin_support', // Soporte administrativo
}

/**
 * Entidad Conversation
 * Representa una conversación entre dos usuarios
 */
@Entity('conversations')
@Index(['participant1Id', 'participant2Id'])
@Index(['lastMessageAt'])
@Unique(['participant1Id', 'participant2Id', 'type', 'courseId'])
export class Conversation {
  @ApiProperty({ description: 'ID único de la conversación' })
  @PrimaryGeneratedColumn('uuid')
  id: string;

  // ============================================
  // TIPO Y CONTEXTO
  // ============================================

  @ApiProperty({
    description: 'Tipo de conversación',
    enum: ConversationType,
    default: ConversationType.DIRECT,
  })
  @Column({
    type: 'enum',
    enum: ConversationType,
    default: ConversationType.DIRECT,
  })
  type: ConversationType;

  @ApiProperty({ description: 'Asunto/título de la conversación' })
  @Column({ type: 'varchar', length: 255, nullable: true })
  subject: string | null;

  // ============================================
  // PARTICIPANTES
  // ============================================

  @ApiProperty({ description: 'Primer participante' })
  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'participant1Id' })
  participant1: User;

  @Column({ type: 'uuid' })
  participant1Id: string;

  @ApiProperty({ description: 'Segundo participante' })
  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'participant2Id' })
  participant2: User;

  @Column({ type: 'uuid' })
  participant2Id: string;

  // ============================================
  // CONTEXTO DE CURSO (opcional)
  // ============================================

  @ApiProperty({ description: 'Curso relacionado (para soporte de curso)' })
  @ManyToOne(() => Course, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'courseId' })
  course: Course | null;

  @Column({ type: 'uuid', nullable: true })
  courseId: string | null;

  // ============================================
  // ESTADO
  // ============================================

  @ApiProperty({
    description: 'Estado de la conversación',
    enum: ConversationStatus,
    default: ConversationStatus.ACTIVE,
  })
  @Column({
    type: 'enum',
    enum: ConversationStatus,
    default: ConversationStatus.ACTIVE,
  })
  status: ConversationStatus;

  @ApiProperty({ description: 'Archivada por participante 1', default: false })
  @Column({ type: 'boolean', default: false })
  archivedByParticipant1: boolean;

  @ApiProperty({ description: 'Archivada por participante 2', default: false })
  @Column({ type: 'boolean', default: false })
  archivedByParticipant2: boolean;

  // ============================================
  // ESTADÍSTICAS
  // ============================================

  @ApiProperty({ description: 'Número total de mensajes', default: 0 })
  @Column({ type: 'int', default: 0 })
  messageCount: number;

  @ApiProperty({ description: 'Mensajes no leídos por participante 1', default: 0 })
  @Column({ type: 'int', default: 0 })
  unreadCountParticipant1: number;

  @ApiProperty({ description: 'Mensajes no leídos por participante 2', default: 0 })
  @Column({ type: 'int', default: 0 })
  unreadCountParticipant2: number;

  @ApiProperty({ description: 'Fecha del último mensaje' })
  @Column({ type: 'timestamp with time zone', nullable: true })
  lastMessageAt: Date | null;

  @ApiProperty({ description: 'Preview del último mensaje' })
  @Column({ type: 'varchar', length: 255, nullable: true })
  lastMessagePreview: string | null;

  @ApiProperty({ description: 'ID del remitente del último mensaje' })
  @Column({ type: 'uuid', nullable: true })
  lastMessageSenderId: string | null;

  // ============================================
  // RELACIONES
  // ============================================

  @ApiProperty({ description: 'Mensajes de la conversación' })
  @OneToMany(() => Message, (message) => message.conversation)
  messages: Message[];

  // ============================================
  // TIMESTAMPS
  // ============================================

  @ApiProperty({ description: 'Fecha de creación' })
  @CreateDateColumn({ type: 'timestamp with time zone' })
  createdAt: Date;

  @ApiProperty({ description: 'Fecha de última actualización' })
  @UpdateDateColumn({ type: 'timestamp with time zone' })
  updatedAt: Date;

  // ============================================
  // CONSTRUCTOR Y MÉTODOS
  // ============================================

  constructor(partial: Partial<Conversation>) {
    Object.assign(this, partial);
  }

  /**
   * Obtener el otro participante
   */
  getOtherParticipantId(userId: string): string | null {
    if (this.participant1Id === userId) return this.participant2Id;
    if (this.participant2Id === userId) return this.participant1Id;
    return null;
  }

  /**
   * Verificar si un usuario es participante
   */
  isParticipant(userId: string): boolean {
    return this.participant1Id === userId || this.participant2Id === userId;
  }

  /**
   * Actualizar último mensaje
   */
  updateLastMessage(preview: string, senderId: string): void {
    this.lastMessageAt = new Date();
    this.lastMessagePreview = preview.substring(0, 255);
    this.lastMessageSenderId = senderId;
    this.messageCount += 1;
  }

  /**
   * Incrementar contador de no leídos
   */
  incrementUnreadCount(recipientId: string): void {
    if (this.participant1Id === recipientId) {
      this.unreadCountParticipant1 += 1;
    } else if (this.participant2Id === recipientId) {
      this.unreadCountParticipant2 += 1;
    }
  }

  /**
   * Marcar como leídos
   */
  markAsRead(userId: string): void {
    if (this.participant1Id === userId) {
      this.unreadCountParticipant1 = 0;
    } else if (this.participant2Id === userId) {
      this.unreadCountParticipant2 = 0;
    }
  }

  /**
   * Obtener contador de no leídos para un usuario
   */
  getUnreadCount(userId: string): number {
    if (this.participant1Id === userId) return this.unreadCountParticipant1;
    if (this.participant2Id === userId) return this.unreadCountParticipant2;
    return 0;
  }

  /**
   * Archivar para un usuario
   */
  archive(userId: string): void {
    if (this.participant1Id === userId) {
      this.archivedByParticipant1 = true;
    } else if (this.participant2Id === userId) {
      this.archivedByParticipant2 = true;
    }
  }

  /**
   * Desarchivar para un usuario
   */
  unarchive(userId: string): void {
    if (this.participant1Id === userId) {
      this.archivedByParticipant1 = false;
    } else if (this.participant2Id === userId) {
      this.archivedByParticipant2 = false;
    }
  }

  /**
   * Verificar si está archivada para un usuario
   */
  isArchivedFor(userId: string): boolean {
    if (this.participant1Id === userId) return this.archivedByParticipant1;
    if (this.participant2Id === userId) return this.archivedByParticipant2;
    return false;
  }
}
