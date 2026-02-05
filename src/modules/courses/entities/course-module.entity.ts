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
import { Course } from './course.entity';

/**
 * Módulo/Tema del curso
 */
@Entity('course_modules')
@Index(['courseId'])
@Index(['order'])
@Index(['isPublished'])
export class CourseModule {
  @ApiProperty({
    example: '550e8400-e29b-41d4-a716-446655440000',
    description: 'ID único del módulo',
  })
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ApiProperty({
    example: 'Física Doppler',
    description: 'Título del módulo',
  })
  @Column({ type: 'varchar', length: 255 })
  title: string;

  @ApiProperty({
    example:
      'Fundamentos de la física del efecto Doppler aplicado a ultrasonido.',
    description: 'Descripción del módulo',
    required: false,
  })
  @Column({ type: 'text', nullable: true })
  description: string | null;

  @ApiProperty({
    example: 1,
    description: 'Orden del módulo en el curso',
  })
  @Column({ type: 'int', default: 0 })
  order: number;

  @ApiProperty({
    example: 120,
    description: 'Duración del módulo en minutos',
    required: false,
  })
  @Column({ type: 'int', nullable: true })
  durationMinutes: number | null;

  // ============================================
  // CONTENIDO
  // ============================================

  @ApiProperty({
    example: 'https://vimeo.com/123456789',
    description: 'URL del video del módulo',
    required: false,
  })
  @Column({ type: 'text', nullable: true })
  videoUrl: string | null;

  @ApiProperty({
    example: ['https://storage.example.com/materials/doppler-guide.pdf'],
    description: 'URLs de materiales del módulo (PDFs, PPTs)',
    type: [String],
  })
  @Column({ type: 'simple-array', nullable: true })
  materialsUrls: string[] | null;

  @ApiProperty({
    example: true,
    description: 'Indica si el módulo está publicado',
  })
  @Column({ type: 'boolean', default: false })
  isPublished: boolean;

  // ============================================
  // RELACIONES
  // ============================================

  @ManyToOne(() => Course, (course) => course.modules, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'courseId' })
  course: Course;

  @Column({ type: 'uuid' })
  courseId: string;

  // ============================================
  // TIMESTAMPS
  // ============================================

  @ApiProperty({ description: 'Fecha de creación' })
  @CreateDateColumn()
  createdAt: Date;

  @ApiProperty({ description: 'Fecha de última actualización' })
  @UpdateDateColumn()
  updatedAt: Date;

  // ============================================
  // CONSTRUCTOR
  // ============================================

  constructor(partial: Partial<CourseModule>) {
    Object.assign(this, partial);
  }
}
