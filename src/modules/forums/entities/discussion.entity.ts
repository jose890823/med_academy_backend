import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
  Index,
} from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';
import { User } from '../../auth/entities/user.entity';
import { Course } from '../../courses/entities/course.entity';
import { Post } from './post.entity';

/**
 * Estados de una discusión
 */
export enum DiscussionStatus {
  OPEN = 'open',
  CLOSED = 'closed',
  LOCKED = 'locked',
  ARCHIVED = 'archived',
}

/**
 * Tipos de discusión
 */
export enum DiscussionType {
  QUESTION = 'question',
  DISCUSSION = 'discussion',
  ANNOUNCEMENT = 'announcement',
  POLL = 'poll',
}

/**
 * Entidad Discussion (Hilo de discusión)
 * Representa un tema/hilo en un foro de curso o general
 */
@Entity('discussions')
@Index(['courseId', 'status'])
@Index(['authorId'])
@Index(['isPinned', 'lastActivityAt'])
@Index(['createdAt'])
export class Discussion {
  @ApiProperty({ description: 'ID único de la discusión' })
  @PrimaryGeneratedColumn('uuid')
  id: string;

  // ============================================
  // CONTENIDO
  // ============================================

  @ApiProperty({ description: 'Título de la discusión' })
  @Column({ type: 'varchar', length: 255 })
  title: string;

  @ApiProperty({ description: 'Slug URL-friendly' })
  @Column({ type: 'varchar', length: 300 })
  @Index()
  slug: string;

  @ApiProperty({ description: 'Contenido del primer post (descripción del tema)' })
  @Column({ type: 'text' })
  content: string;

  @ApiProperty({
    description: 'Tipo de discusión',
    enum: DiscussionType,
    default: DiscussionType.DISCUSSION,
  })
  @Column({
    type: 'enum',
    enum: DiscussionType,
    default: DiscussionType.DISCUSSION,
  })
  type: DiscussionType;

  // ============================================
  // ESTADO Y MODERACIÓN
  // ============================================

  @ApiProperty({
    description: 'Estado de la discusión',
    enum: DiscussionStatus,
    default: DiscussionStatus.OPEN,
  })
  @Column({
    type: 'enum',
    enum: DiscussionStatus,
    default: DiscussionStatus.OPEN,
  })
  status: DiscussionStatus;

  @ApiProperty({ description: 'Si la discusión está fijada', default: false })
  @Column({ type: 'boolean', default: false })
  isPinned: boolean;

  @ApiProperty({ description: 'Si está marcada como resuelta (para preguntas)', default: false })
  @Column({ type: 'boolean', default: false })
  isResolved: boolean;

  @ApiProperty({ description: 'ID del post que resuelve la pregunta' })
  @Column({ type: 'uuid', nullable: true })
  resolvedPostId: string | null;

  @ApiProperty({ description: 'Etiquetas/tags de la discusión' })
  @Column({ type: 'simple-array', nullable: true })
  tags: string[] | null;

  // ============================================
  // ESTADÍSTICAS
  // ============================================

  @ApiProperty({ description: 'Número de respuestas', default: 0 })
  @Column({ type: 'int', default: 0 })
  postCount: number;

  @ApiProperty({ description: 'Número de vistas', default: 0 })
  @Column({ type: 'int', default: 0 })
  viewCount: number;

  @ApiProperty({ description: 'Número de likes', default: 0 })
  @Column({ type: 'int', default: 0 })
  likeCount: number;

  @ApiProperty({ description: 'Fecha de última actividad' })
  @Column({ type: 'timestamp with time zone', nullable: true })
  lastActivityAt: Date | null;

  @ApiProperty({ description: 'Usuario de la última actividad' })
  @Column({ type: 'uuid', nullable: true })
  lastPostById: string | null;

  // ============================================
  // RELACIONES
  // ============================================

  @ApiProperty({ description: 'Autor de la discusión' })
  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'authorId' })
  author: User;

  @Column({ type: 'uuid' })
  authorId: string;

  @ApiProperty({ description: 'Curso asociado (null = foro general)' })
  @ManyToOne(() => Course, { nullable: true, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'courseId' })
  course: Course | null;

  @Column({ type: 'uuid', nullable: true })
  courseId: string | null;

  @ApiProperty({ description: 'Moderador que cerró/bloqueó (si aplica)' })
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

  @ApiProperty({ description: 'Posts de la discusión' })
  @OneToMany(() => Post, (post) => post.discussion)
  posts: Post[];

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

  constructor(partial: Partial<Discussion>) {
    Object.assign(this, partial);
  }

  /**
   * Incrementar contador de vistas
   */
  incrementViewCount(): void {
    this.viewCount += 1;
  }

  /**
   * Actualizar última actividad
   */
  updateLastActivity(userId: string): void {
    this.lastActivityAt = new Date();
    this.lastPostById = userId;
  }

  /**
   * Incrementar contador de posts
   */
  incrementPostCount(): void {
    this.postCount += 1;
  }

  /**
   * Decrementar contador de posts
   */
  decrementPostCount(): void {
    if (this.postCount > 0) {
      this.postCount -= 1;
    }
  }

  /**
   * Marcar como resuelta
   */
  markAsResolved(postId: string): void {
    this.isResolved = true;
    this.resolvedPostId = postId;
  }

  /**
   * Cerrar discusión
   */
  close(moderatorId: string, reason?: string): void {
    this.status = DiscussionStatus.CLOSED;
    this.moderatedById = moderatorId;
    this.moderationReason = reason || null;
    this.moderatedAt = new Date();
  }

  /**
   * Bloquear discusión
   */
  lock(moderatorId: string, reason?: string): void {
    this.status = DiscussionStatus.LOCKED;
    this.moderatedById = moderatorId;
    this.moderationReason = reason || null;
    this.moderatedAt = new Date();
  }

  /**
   * Verificar si se pueden agregar posts
   */
  canAddPost(): boolean {
    return this.status === DiscussionStatus.OPEN;
  }
}
