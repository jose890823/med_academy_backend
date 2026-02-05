import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';
import { User } from '../../auth/entities/user.entity';
import { Workshop } from './workshop.entity';

/**
 * Rol del instructor en el workshop
 */
export enum InstructorRole {
  LEAD = 'lead', // Instructor principal
  ASSISTANT = 'assistant', // Asistente
  GUEST = 'guest', // Instructor invitado
}

/**
 * Relación instructor-workshop
 */
@Entity('workshop_instructors')
@Index(['workshopId'])
@Index(['userId'])
@Index(['workshopId', 'userId'], { unique: true })
export class WorkshopInstructor {
  @ApiProperty({
    example: '550e8400-e29b-41d4-a716-446655440000',
    description: 'ID único de la relación',
  })
  @PrimaryGeneratedColumn('uuid')
  id: string;

  // ============================================
  // RELACIONES
  // ============================================

  @ManyToOne(() => Workshop, (workshop) => workshop.instructors, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'workshopId' })
  workshop: Workshop;

  @Column({ type: 'uuid' })
  workshopId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column({ type: 'uuid' })
  userId: string;

  // ============================================
  // ROL Y ORDEN
  // ============================================

  @ApiProperty({
    example: 'lead',
    description: 'Rol del instructor',
    enum: InstructorRole,
  })
  @Column({
    type: 'enum',
    enum: InstructorRole,
    default: InstructorRole.ASSISTANT,
  })
  role: InstructorRole;

  @ApiProperty({
    example: 1,
    description: 'Orden de aparición',
  })
  @Column({ type: 'int', default: 0 })
  sortOrder: number;

  // ============================================
  // BIO ESPECÍFICA (override de la del usuario)
  // ============================================

  @ApiProperty({
    example: 'Especialista en ultrasonido vascular con 15 años de experiencia.',
    description: 'Bio específica para este workshop (opcional)',
    required: false,
  })
  @Column({ type: 'text', nullable: true })
  customBio: string | null;

  // ============================================
  // TIMESTAMPS
  // ============================================

  @CreateDateColumn()
  createdAt: Date;

  // ============================================
  // CONSTRUCTOR
  // ============================================

  constructor(partial: Partial<WorkshopInstructor>) {
    Object.assign(this, partial);
  }

  // ============================================
  // MÉTODOS HELPER
  // ============================================

  /**
   * Verifica si es instructor principal
   */
  get isLead(): boolean {
    return this.role === InstructorRole.LEAD;
  }
}
