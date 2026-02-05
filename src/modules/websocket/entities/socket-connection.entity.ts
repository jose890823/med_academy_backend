import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  Index,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';
import { User } from '../../auth/entities/user.entity';

/**
 * Registro de conexiones de WebSocket para estadísticas y auditoría
 */
@Entity('socket_connections')
@Index(['userId', 'connectedAt'])
@Index(['socketId'], { unique: true })
export class SocketConnectionEntity {
  @ApiProperty({ description: 'ID único del registro' })
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ApiProperty({ description: 'ID del socket' })
  @Column({ type: 'varchar', length: 255, unique: true })
  socketId: string;

  @ApiProperty({ description: 'ID del usuario' })
  @Column({ type: 'uuid' })
  userId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User;

  @ApiProperty({ description: 'Namespace del socket' })
  @Column({ type: 'varchar', length: 100, nullable: true })
  namespace: string | null;

  @ApiProperty({ description: 'User agent del cliente' })
  @Column({ type: 'varchar', length: 500, nullable: true })
  userAgent: string | null;

  @ApiProperty({ description: 'Dirección IP del cliente' })
  @Column({ type: 'varchar', length: 45, nullable: true })
  ipAddress: string | null;

  @ApiProperty({ description: 'Fecha de conexión' })
  @CreateDateColumn()
  connectedAt: Date;

  @ApiProperty({ description: 'Fecha de desconexión' })
  @Column({ type: 'timestamp', nullable: true })
  disconnectedAt: Date | null;

  @ApiProperty({ description: 'Razón de desconexión' })
  @Column({ type: 'varchar', length: 255, nullable: true })
  disconnectReason: string | null;

  // Constructor
  constructor(partial: Partial<SocketConnectionEntity>) {
    Object.assign(this, partial);
  }

  /**
   * Verificar si la conexión está activa
   */
  isActive(): boolean {
    return this.disconnectedAt === null;
  }

  /**
   * Obtener duración de la conexión en segundos
   */
  getDuration(): number {
    const end = this.disconnectedAt || new Date();
    return Math.floor((end.getTime() - this.connectedAt.getTime()) / 1000);
  }
}
