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
import { Category } from '../../courses/entities/category.entity';
import { User } from '../../auth/entities/user.entity';
import { WorkshopSession } from './workshop-session.entity';
import { WorkshopInstructor } from './workshop-instructor.entity';

/**
 * Estado del workshop
 */
export enum WorkshopStatus {
  DRAFT = 'draft',
  PUBLISHED = 'published',
  ARCHIVED = 'archived',
}

/**
 * Nivel del workshop
 */
export enum WorkshopLevel {
  BEGINNER = 'beginner',
  INTERMEDIATE = 'intermediate',
  ADVANCED = 'advanced',
}

/**
 * Tipo de requisito
 */
export enum RequirementType {
  COURSE_COMPLETED = 'course_completed',       // Debe haber completado un curso
  MODULE_COMPLETED = 'module_completed',       // Debe haber completado módulos específicos
  EVALUATION_PASSED = 'evaluation_passed',     // Debe haber aprobado una evaluación
  WORKSHOP_ATTENDED = 'workshop_attended',     // Debe haber asistido a otro workshop
  CERTIFICATION = 'certification',             // Debe tener certificación externa
  EXPERIENCE_YEARS = 'experience_years',       // Años de experiencia requeridos
  CUSTOM = 'custom',                           // Requisito personalizado (texto libre)
}

/**
 * Interfaz para requisitos del workshop
 */
export interface WorkshopRequirement {
  type: RequirementType;
  value: string;           // ID del curso/módulo/evaluación, o texto descriptivo
  label: string;           // Texto para mostrar en el frontend
  isRequired: boolean;     // true = obligatorio, false = recomendado
}

/**
 * Workshop - Taller práctico presencial
 */
@Entity('workshops')
@Index(['slug'], { unique: true })
@Index(['status'])
@Index(['categoryId'])
@Index(['isFeatured'])
export class Workshop {
  @ApiProperty({
    example: '550e8400-e29b-41d4-a716-446655440000',
    description: 'ID único del workshop',
  })
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ApiProperty({
    example: 'vascular-hands-on-workshop',
    description: 'Slug único para URLs amigables',
  })
  @Column({ type: 'varchar', length: 255, unique: true })
  slug: string;

  // ============================================
  // INFORMACIÓN BÁSICA
  // ============================================

  @ApiProperty({
    example: 'Vascular Hands-On Workshop',
    description: 'Título del workshop',
  })
  @Column({ type: 'varchar', length: 255 })
  title: string;

  @ApiProperty({
    example: 'Practical Training Session',
    description: 'Subtítulo del workshop',
    required: false,
  })
  @Column({ type: 'varchar', length: 255, nullable: true })
  subtitle: string | null;

  @ApiProperty({
    example: 'Taller práctico de técnicas de ultrasonido vascular con equipos reales.',
    description: 'Descripción corta para listados',
  })
  @Column({ type: 'varchar', length: 500 })
  shortDescription: string;

  @ApiProperty({
    example: '<p>Descripción completa del workshop...</p>',
    description: 'Descripción completa (rich text/HTML)',
    required: false,
  })
  @Column({ type: 'text', nullable: true })
  fullDescription: string | null;

  // ============================================
  // MEDIA
  // ============================================

  @ApiProperty({
    example: 'https://storage.example.com/workshops/vascular-thumbnail.jpg',
    description: 'URL de la imagen thumbnail',
    required: false,
  })
  @Column({ type: 'text', nullable: true })
  thumbnail: string | null;

  @ApiProperty({
    example: ['url1.jpg', 'url2.jpg'],
    description: 'URLs de imágenes de galería',
    type: [String],
  })
  @Column({ type: 'simple-array', nullable: true })
  gallery: string[] | null;

  // ============================================
  // PRECIOS
  // ============================================

  @ApiProperty({
    example: 350.0,
    description: 'Precio regular del workshop',
  })
  @Column({ type: 'decimal', precision: 10, scale: 2 })
  regularPrice: number;

  @ApiProperty({
    example: 299.0,
    description: 'Precio de oferta (null si no hay oferta)',
    required: false,
  })
  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  salePrice: number | null;

  @ApiProperty({
    example: 'USD',
    description: 'Moneda del precio',
  })
  @Column({ type: 'varchar', length: 3, default: 'USD' })
  currency: string;

  @ApiProperty({
    example: true,
    description: 'Indica si el workshop está incluido al comprar un curso asociado',
  })
  @Column({ type: 'boolean', default: false })
  includedWithCourse: boolean;

  // ============================================
  // DURACIÓN Y FORMATO
  // ============================================

  @ApiProperty({
    example: 480,
    description: 'Duración total en minutos',
  })
  @Column({ type: 'int' })
  durationMinutes: number;

  @ApiProperty({
    example: '8 horas (9:00 AM - 5:00 PM)',
    description: 'Descripción de la duración para mostrar',
  })
  @Column({ type: 'varchar', length: 100 })
  durationDisplay: string;

  @ApiProperty({
    example: 8,
    description: 'Capacidad máxima por sesión',
  })
  @Column({ type: 'int', default: 10 })
  maxParticipants: number;

  @ApiProperty({
    example: 4,
    description: 'Mínimo de participantes para realizar el workshop',
  })
  @Column({ type: 'int', default: 1 })
  minParticipants: number;

  // ============================================
  // REQUISITOS (ARRAY FLEXIBLE)
  // ============================================

  @ApiProperty({
    example: [
      {
        type: 'course_completed',
        value: '550e8400-e29b-41d4-a716-446655440000',
        label: 'Completar Vascular vCourse',
        isRequired: true,
      },
      {
        type: 'module_completed',
        value: '1,2,3,4',
        label: 'Completar módulos 1-4',
        isRequired: true,
      },
      {
        type: 'custom',
        value: '',
        label: 'Conocimientos básicos de anatomía vascular',
        isRequired: false,
      },
    ],
    description: 'Requisitos/prerrequisitos del workshop',
  })
  @Column({ type: 'jsonb', nullable: true })
  requirements: WorkshopRequirement[] | null;

  // ============================================
  // CONTENIDO
  // ============================================

  @ApiProperty({
    example: ['Practicar técnicas de Doppler', 'Realizar mediciones en tiempo real'],
    description: 'Objetivos de aprendizaje',
    type: [String],
  })
  @Column({ type: 'simple-array', nullable: true })
  objectives: string[] | null;

  @ApiProperty({
    example: ['Equipo de ultrasonido', 'Casos prácticos', 'Material de estudio'],
    description: 'Qué incluye el workshop',
    type: [String],
  })
  @Column({ type: 'simple-array', nullable: true })
  includes: string[] | null;

  @ApiProperty({
    example: ['Ropa cómoda', 'Libreta de notas'],
    description: 'Qué debe traer el participante',
    type: [String],
  })
  @Column({ type: 'simple-array', nullable: true })
  whatToBring: string[] | null;

  // ============================================
  // CERTIFICACIÓN
  // ============================================

  @ApiProperty({
    example: true,
    description: 'El workshop otorga certificado de asistencia',
  })
  @Column({ type: 'boolean', default: true })
  hasCertificate: boolean;

  @ApiProperty({
    example: 8,
    description: 'Horas CME/CEU certificadas',
    required: false,
  })
  @Column({ type: 'int', nullable: true })
  certifiedHours: number | null;

  // ============================================
  // CATEGORIZACIÓN
  // ============================================

  @ApiProperty({
    example: 'intermediate',
    description: 'Nivel del workshop',
    enum: WorkshopLevel,
  })
  @Column({ type: 'enum', enum: WorkshopLevel, default: WorkshopLevel.INTERMEDIATE })
  level: WorkshopLevel;

  @ApiProperty({
    example: ['hands-on', 'vascular', 'practical'],
    description: 'Tags del workshop',
    type: [String],
  })
  @Column({ type: 'simple-array', nullable: true })
  tags: string[] | null;

  // ============================================
  // ESTADO
  // ============================================

  @ApiProperty({
    example: 'published',
    description: 'Estado del workshop',
    enum: WorkshopStatus,
  })
  @Column({ type: 'enum', enum: WorkshopStatus, default: WorkshopStatus.DRAFT })
  status: WorkshopStatus;

  @ApiProperty({
    example: true,
    description: 'Workshop destacado',
  })
  @Column({ type: 'boolean', default: false })
  isFeatured: boolean;

  @ApiProperty({
    example: 1,
    description: 'Orden en listados',
  })
  @Column({ type: 'int', default: 0 })
  sortOrder: number;

  // ============================================
  // POLÍTICAS
  // ============================================

  @ApiProperty({
    example: 'Cancelación gratuita hasta 7 días antes del evento.',
    description: 'Política de cancelación',
    required: false,
  })
  @Column({ type: 'text', nullable: true })
  cancellationPolicy: string | null;

  @ApiProperty({
    example: 7,
    description: 'Días antes para cancelar sin penalización',
  })
  @Column({ type: 'int', default: 7 })
  cancellationDays: number;

  // ============================================
  // RELACIONES
  // ============================================

  @ManyToOne(() => Category, { nullable: true })
  @JoinColumn({ name: 'categoryId' })
  category: Category | null;

  @Column({ type: 'uuid', nullable: true })
  categoryId: string | null;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'mainInstructorId' })
  mainInstructor: User | null;

  @Column({ type: 'uuid', nullable: true })
  mainInstructorId: string | null;

  @OneToMany(() => WorkshopInstructor, (wi) => wi.workshop)
  instructors: WorkshopInstructor[];

  @OneToMany(() => WorkshopSession, (session) => session.workshop)
  sessions: WorkshopSession[];

  // Curso asociado (opcional)
  @Column({ type: 'uuid', nullable: true })
  associatedCourseId: string | null;

  // ============================================
  // STRIPE
  // ============================================

  @ApiProperty({
    example: 'prod_workshop123',
    description: 'ID del producto en Stripe',
    required: false,
  })
  @Column({ type: 'varchar', length: 100, nullable: true })
  stripeProductId: string | null;

  @ApiProperty({
    example: 'price_workshop123',
    description: 'ID del precio en Stripe',
    required: false,
  })
  @Column({ type: 'varchar', length: 100, nullable: true })
  stripePriceId: string | null;

  // ============================================
  // TIMESTAMPS
  // ============================================

  @ApiProperty({ description: 'Fecha de creación' })
  @CreateDateColumn()
  createdAt: Date;

  @ApiProperty({ description: 'Fecha de última actualización' })
  @UpdateDateColumn()
  updatedAt: Date;

  @DeleteDateColumn()
  deletedAt: Date | null;

  // ============================================
  // CONSTRUCTOR
  // ============================================

  constructor(partial: Partial<Workshop>) {
    Object.assign(this, partial);
  }

  // ============================================
  // MÉTODOS HELPER
  // ============================================

  /**
   * Obtiene el precio actual (sale price o regular price)
   */
  get currentPrice(): number {
    return this.salePrice ?? this.regularPrice;
  }

  /**
   * Verifica si tiene descuento activo
   */
  get hasDiscount(): boolean {
    return this.salePrice !== null && this.salePrice < this.regularPrice;
  }

  /**
   * Calcula el porcentaje de descuento
   */
  get discountPercentage(): number {
    if (!this.hasDiscount) return 0;
    return Math.round(((this.regularPrice - this.salePrice!) / this.regularPrice) * 100);
  }

  /**
   * Verifica si está publicado
   */
  get isPublished(): boolean {
    return this.status === WorkshopStatus.PUBLISHED;
  }

  /**
   * Obtiene solo los requisitos obligatorios
   */
  get requiredRequirements(): WorkshopRequirement[] {
    return this.requirements?.filter((r) => r.isRequired) || [];
  }

  /**
   * Obtiene solo los requisitos recomendados
   */
  get recommendedRequirements(): WorkshopRequirement[] {
    return this.requirements?.filter((r) => !r.isRequired) || [];
  }

  /**
   * Duración formateada en horas
   */
  get durationHours(): number {
    return Math.round((this.durationMinutes / 60) * 10) / 10;
  }
}
