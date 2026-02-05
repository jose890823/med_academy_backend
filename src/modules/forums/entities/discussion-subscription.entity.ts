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
import { Discussion } from './discussion.entity';

/**
 * Entidad DiscussionSubscription
 * Suscripción de un usuario a una discusión para recibir notificaciones
 */
@Entity('discussion_subscriptions')
@Unique(['discussionId', 'userId'])
@Index(['userId'])
export class DiscussionSubscription {
  @ApiProperty({ description: 'ID único de la suscripción' })
  @PrimaryGeneratedColumn('uuid')
  id: string;

  // ============================================
  // CONFIGURACIÓN
  // ============================================

  @ApiProperty({ description: 'Notificar por email', default: true })
  @Column({ type: 'boolean', default: true })
  emailNotifications: boolean;

  @ApiProperty({ description: 'Notificar in-app', default: true })
  @Column({ type: 'boolean', default: true })
  inAppNotifications: boolean;

  // ============================================
  // RELACIONES
  // ============================================

  @ApiProperty({ description: 'Discusión suscrita' })
  @ManyToOne(() => Discussion, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'discussionId' })
  discussion: Discussion;

  @Column({ type: 'uuid' })
  discussionId: string;

  @ApiProperty({ description: 'Usuario suscrito' })
  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column({ type: 'uuid' })
  userId: string;

  // ============================================
  // TIMESTAMPS
  // ============================================

  @ApiProperty({ description: 'Fecha de suscripción' })
  @CreateDateColumn({ type: 'timestamp with time zone' })
  createdAt: Date;

  // ============================================
  // CONSTRUCTOR
  // ============================================

  constructor(partial: Partial<DiscussionSubscription>) {
    Object.assign(this, partial);
  }
}
