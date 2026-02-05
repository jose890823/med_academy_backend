import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
  Unique,
} from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';
import { Classroom } from './classroom.entity';
import { User } from '../../auth/entities/user.entity';

/**
 * Rol del instructor en el aula
 */
export enum ClassroomInstructorRole {
  MAIN = 'main',
  ASSISTANT = 'assistant',
}

/**
 * Relación entre aula e instructores
 */
@Entity('classroom_instructors')
@Unique(['classroomId', 'instructorId'])
@Index(['classroomId'])
@Index(['instructorId'])
export class ClassroomInstructor {
  @ApiProperty({
    example: '550e8400-e29b-41d4-a716-446655440000',
    description: 'ID único de la relación',
  })
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ApiProperty({
    example: 'main',
    description: 'Rol del instructor en el aula',
    enum: ClassroomInstructorRole,
  })
  @Column({
    type: 'enum',
    enum: ClassroomInstructorRole,
    default: ClassroomInstructorRole.ASSISTANT,
  })
  role: ClassroomInstructorRole;

  // ============================================
  // RELACIONES
  // ============================================

  @ManyToOne(() => Classroom, (classroom) => classroom.instructors, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'classroomId' })
  classroom: Classroom;

  @Column({ type: 'uuid' })
  classroomId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'instructorId' })
  instructor: User;

  @Column({ type: 'uuid' })
  instructorId: string;

  // ============================================
  // TIMESTAMPS
  // ============================================

  @ApiProperty({ description: 'Fecha de asignación' })
  @CreateDateColumn()
  createdAt: Date;

  // ============================================
  // CONSTRUCTOR
  // ============================================

  constructor(partial: Partial<ClassroomInstructor>) {
    Object.assign(this, partial);
  }
}
