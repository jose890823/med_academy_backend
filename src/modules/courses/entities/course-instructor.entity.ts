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
import { Course } from './course.entity';
import { User } from '../../auth/entities/user.entity';

/**
 * Rol del instructor en el curso
 */
export enum InstructorRole {
  MAIN = 'main',
  GUEST = 'guest',
  ASSISTANT = 'assistant',
}

/**
 * Relación entre curso e instructores
 */
@Entity('course_instructors')
@Unique(['courseId', 'instructorId'])
@Index(['courseId'])
@Index(['instructorId'])
export class CourseInstructor {
  @ApiProperty({
    example: '550e8400-e29b-41d4-a716-446655440000',
    description: 'ID único de la relación',
  })
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ApiProperty({
    example: 'main',
    description: 'Rol del instructor en el curso',
    enum: InstructorRole,
  })
  @Column({ type: 'enum', enum: InstructorRole, default: InstructorRole.GUEST })
  role: InstructorRole;

  @ApiProperty({
    example: 1,
    description: 'Orden de visualización',
  })
  @Column({ type: 'int', default: 0 })
  order: number;

  // ============================================
  // RELACIONES
  // ============================================

  @ManyToOne(() => Course, (course) => course.instructors, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'courseId' })
  course: Course;

  @Column({ type: 'uuid' })
  courseId: string;

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

  constructor(partial: Partial<CourseInstructor>) {
    Object.assign(this, partial);
  }
}
