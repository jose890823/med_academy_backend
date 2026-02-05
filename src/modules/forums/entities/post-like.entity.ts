import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Unique,
  Index,
} from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';
import { User } from '../../auth/entities/user.entity';
import { Post } from './post.entity';

/**
 * Entidad PostLike
 * Registra los likes de usuarios en posts
 * Un usuario solo puede dar un like por post
 */
@Entity('post_likes')
@Unique(['postId', 'userId'])
@Index(['userId'])
export class PostLike {
  @ApiProperty({ description: 'ID único del like' })
  @PrimaryGeneratedColumn('uuid')
  id: string;

  // ============================================
  // RELACIONES
  // ============================================

  @ApiProperty({ description: 'Post que recibió el like' })
  @ManyToOne(() => Post, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'postId' })
  post: Post;

  @Column({ type: 'uuid' })
  postId: string;

  @ApiProperty({ description: 'Usuario que dio el like' })
  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column({ type: 'uuid' })
  userId: string;

  // ============================================
  // TIMESTAMPS
  // ============================================

  @ApiProperty({ description: 'Fecha del like' })
  @CreateDateColumn({ type: 'timestamp with time zone' })
  createdAt: Date;

  // ============================================
  // CONSTRUCTOR
  // ============================================

  constructor(partial: Partial<PostLike>) {
    Object.assign(this, partial);
  }
}
