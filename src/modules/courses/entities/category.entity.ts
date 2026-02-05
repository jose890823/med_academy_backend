import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
  Index,
} from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';
import { Course } from './course.entity';

/**
 * Categoría de cursos (Vascular, MSK, Echocardiography, etc.)
 */
@Entity('categories')
@Index(['slug'], { unique: true })
@Index(['isActive'])
@Index(['order'])
export class Category {
  @ApiProperty({
    example: '550e8400-e29b-41d4-a716-446655440000',
    description: 'ID único de la categoría',
  })
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ApiProperty({
    example: 'Vascular Sonography',
    description: 'Nombre de la categoría',
  })
  @Column({ type: 'varchar', length: 100 })
  name: string;

  @ApiProperty({
    example: 'vascular-sonography',
    description: 'Slug único para URLs amigables',
  })
  @Column({ type: 'varchar', length: 100, unique: true })
  slug: string;

  @ApiProperty({
    example: 'Programas especializados en sonografía vascular',
    description: 'Descripción de la categoría',
    required: false,
  })
  @Column({ type: 'text', nullable: true })
  description: string | null;

  @ApiProperty({
    example: 'lucide:heart-pulse',
    description: 'Icono de la categoría (formato: provider:icon-name)',
    required: false,
  })
  @Column({ type: 'varchar', length: 100, nullable: true })
  icon: string | null;

  @ApiProperty({
    example: 1,
    description: 'Orden de visualización',
  })
  @Column({ type: 'int', default: 0 })
  order: number;

  @ApiProperty({
    example: true,
    description: 'Indica si la categoría está activa',
  })
  @Column({ type: 'boolean', default: true })
  isActive: boolean;

  // ============================================
  // RELACIONES
  // ============================================

  @OneToMany(() => Course, (course) => course.category)
  courses: Course[];

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

  constructor(partial: Partial<Category>) {
    Object.assign(this, partial);
  }
}
