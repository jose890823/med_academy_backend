import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';
import { User } from '../../auth/entities/user.entity';

export enum ContactMessageStatus {
  PENDING = 'pending',
  READ = 'read',
  REPLIED = 'replied',
  ARCHIVED = 'archived',
}

@Entity('contact_messages')
@Index(['email'])
@Index(['status'])
@Index(['createdAt'])
export class ContactMessage {
  @ApiProperty({
    example: '123e4567-e89b-12d3-a456-426614174000',
    description: 'ID unico del mensaje',
  })
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ApiProperty({
    example: 'Juan Perez',
    description: 'Nombre del remitente',
  })
  @Column({ type: 'varchar', length: 100 })
  name: string;

  @ApiProperty({
    example: 'juan@correo.com',
    description: 'Email del remitente',
  })
  @Column({ type: 'varchar', length: 255 })
  email: string;

  @ApiProperty({
    example: 'Consulta sobre precios',
    description: 'Asunto del mensaje',
  })
  @Column({ type: 'varchar', length: 200 })
  subject: string;

  @ApiProperty({
    example: 'Hola, tengo una consulta sobre...',
    description: 'Contenido del mensaje',
  })
  @Column({ type: 'text' })
  message: string;

  @ApiProperty({
    example: '192.168.1.1',
    description: 'IP del remitente',
  })
  @Column({ type: 'varchar', length: 45, nullable: true })
  ipAddress: string;

  @ApiProperty({
    example: 'Mozilla/5.0...',
    description: 'User agent del navegador',
  })
  @Column({ type: 'varchar', length: 500, nullable: true })
  userAgent: string;

  @ApiProperty({
    enum: ContactMessageStatus,
    example: ContactMessageStatus.PENDING,
    description: 'Estado del mensaje',
  })
  @Column({
    type: 'enum',
    enum: ContactMessageStatus,
    default: ContactMessageStatus.PENDING,
  })
  status: ContactMessageStatus;

  @ApiProperty({
    description: 'Respuesta del admin (si aplica)',
    nullable: true,
  })
  @Column({ type: 'text', nullable: true })
  adminReply: string;

  @ApiProperty({
    description: 'Fecha de la respuesta del admin',
    nullable: true,
  })
  @Column({ type: 'timestamp', nullable: true })
  repliedAt: Date;

  @ApiProperty({
    description: 'ID del admin que respondio',
    nullable: true,
  })
  @Column({ type: 'uuid', nullable: true })
  repliedById: string;

  @ApiProperty({
    description: 'Usuario registrado (si aplica)',
    nullable: true,
  })
  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column({ type: 'uuid', nullable: true })
  userId: string;

  @ApiProperty({
    description: 'Fecha de creacion',
  })
  @CreateDateColumn()
  createdAt: Date;

  @ApiProperty({
    description: 'Fecha de actualizacion',
  })
  @UpdateDateColumn()
  updatedAt: Date;

  constructor(partial: Partial<ContactMessage>) {
    Object.assign(this, partial);
  }
}
