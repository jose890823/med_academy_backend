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
  Tree,
  TreeChildren,
  TreeParent,
} from 'typeorm';
import { ApiProperty, ApiHideProperty } from '@nestjs/swagger';
import { User } from '../../auth/entities/user.entity';
import { Discussion } from './discussion.entity';

/**
 * Estados de un post
 */
export enum PostStatus {
  VISIBLE = 'visible',
  HIDDEN = 'hidden',
  DELETED = 'deleted',
}

/**
 * Entidad Post (Respuesta en una discusión)
 * Soporta estructura en árbol para respuestas anidadas
 */
@Entity('posts')
@Tree('closure-table')
@Index(['discussionId', 'createdAt'])
@Index(['authorId'])
@Index(['status'])
export class Post {
  @ApiProperty({ description: 'ID único del post' })
  @PrimaryGeneratedColumn('uuid')
  id: string;

  // ============================================
  // CONTENIDO
  // ============================================

  @ApiProperty({ description: 'Contenido del post (markdown)' })
  @Column({ type: 'text' })
  content: string;

  @ApiProperty({ description: 'Contenido editado (historial)' })
  @Column({ type: 'jsonb', nullable: true })
  editHistory: Array<{
    content: string;
    editedAt: string;
  }> | null;

  // ============================================
  // ESTADO Y MODERACIÓN
  // ============================================

  @ApiProperty({
    description: 'Estado del post',
    enum: PostStatus,
    default: PostStatus.VISIBLE,
  })
  @Column({
    type: 'enum',
    enum: PostStatus,
    default: PostStatus.VISIBLE,
  })
  status: PostStatus;

  @ApiProperty({ description: 'Si es la respuesta aceptada', default: false })
  @Column({ type: 'boolean', default: false })
  isAcceptedAnswer: boolean;

  @ApiProperty({ description: 'Fecha en que fue aceptada como respuesta' })
  @Column({ type: 'timestamp with time zone', nullable: true })
  acceptedAt: Date | null;

  // ============================================
  // ESTADÍSTICAS
  // ============================================

  @ApiProperty({ description: 'Número de likes', default: 0 })
  @Column({ type: 'int', default: 0 })
  likeCount: number;

  @ApiProperty({ description: 'Número de respuestas directas', default: 0 })
  @Column({ type: 'int', default: 0 })
  replyCount: number;

  @ApiProperty({ description: 'Si fue editado', default: false })
  @Column({ type: 'boolean', default: false })
  isEdited: boolean;

  @ApiProperty({ description: 'Fecha de última edición' })
  @Column({ type: 'timestamp with time zone', nullable: true })
  editedAt: Date | null;

  // ============================================
  // RELACIONES
  // ============================================

  @ApiHideProperty()
  @ManyToOne(() => Discussion, (discussion) => discussion.posts, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'discussionId' })
  discussion: Discussion;

  @Column({ type: 'uuid' })
  discussionId: string;

  @ApiProperty({ description: 'Autor del post' })
  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'authorId' })
  author: User;

  @Column({ type: 'uuid' })
  authorId: string;

  @ApiHideProperty()
  @TreeParent()
  parent: Post | null;

  @Column({ type: 'uuid', nullable: true })
  parentId: string | null;

  @ApiHideProperty()
  @TreeChildren()
  children: Post[];

  @ApiProperty({ description: 'Moderador que ocultó/eliminó (si aplica)' })
  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'moderatedById' })
  moderatedBy: User | null;

  @Column({ type: 'uuid', nullable: true })
  moderatedById: string | null;

  @ApiProperty({ description: 'Razón de moderación' })
  @Column({ type: 'text', nullable: true })
  moderationReason: string | null;

  @ApiProperty({ description: 'Fecha de moderación' })
  @Column({ type: 'timestamp with time zone', nullable: true })
  moderatedAt: Date | null;

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

  constructor(partial: Partial<Post>) {
    Object.assign(this, partial);
  }

  /**
   * Editar contenido (guarda historial)
   */
  edit(newContent: string): void {
    // Guardar versión anterior en historial
    if (!this.editHistory) {
      this.editHistory = [];
    }
    this.editHistory.push({
      content: this.content,
      editedAt: new Date().toISOString(),
    });

    this.content = newContent;
    this.isEdited = true;
    this.editedAt = new Date();
  }

  /**
   * Incrementar likes
   */
  incrementLikes(): void {
    this.likeCount += 1;
  }

  /**
   * Decrementar likes
   */
  decrementLikes(): void {
    if (this.likeCount > 0) {
      this.likeCount -= 1;
    }
  }

  /**
   * Incrementar respuestas
   */
  incrementReplyCount(): void {
    this.replyCount += 1;
  }

  /**
   * Decrementar respuestas
   */
  decrementReplyCount(): void {
    if (this.replyCount > 0) {
      this.replyCount -= 1;
    }
  }

  /**
   * Marcar como respuesta aceptada
   */
  markAsAccepted(): void {
    this.isAcceptedAnswer = true;
    this.acceptedAt = new Date();
  }

  /**
   * Quitar marca de respuesta aceptada
   */
  unmarkAsAccepted(): void {
    this.isAcceptedAnswer = false;
    this.acceptedAt = null;
  }

  /**
   * Ocultar post (moderación)
   */
  hide(moderatorId: string, reason?: string): void {
    this.status = PostStatus.HIDDEN;
    this.moderatedById = moderatorId;
    this.moderationReason = reason || null;
    this.moderatedAt = new Date();
  }

  /**
   * Restaurar post
   */
  restore(): void {
    this.status = PostStatus.VISIBLE;
    this.moderatedById = null;
    this.moderationReason = null;
    this.moderatedAt = null;
  }
}
