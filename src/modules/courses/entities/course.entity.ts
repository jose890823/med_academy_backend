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
  BeforeInsert,
} from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';
import { generateSystemCode } from '../../../common/utils/system-code-generator.util';
import { Category } from './category.entity';
import { CourseInstructor } from './course-instructor.entity';
import { CourseModule } from './course-module.entity';
import { Cohort } from './cohort.entity';
import { User } from '../../auth/entities/user.entity';

/**
 * Estados del curso
 */
export enum CourseStatus {
  DRAFT = 'draft',
  PUBLISHED = 'published',
  ARCHIVED = 'archived',
}

/**
 * Modalidad del curso
 */
export enum CourseModality {
  VIRTUAL = 'virtual',
  PRESENCIAL = 'presencial',
  HYBRID = 'hybrid',
}

/**
 * Nivel del curso
 */
export enum CourseLevel {
  BEGINNER = 'beginner',
  INTERMEDIATE = 'intermediate',
  ADVANCED = 'advanced',
}

/**
 * Idioma del curso
 */
export enum CourseLanguage {
  EN = 'en',
  ES = 'es',
  BOTH = 'both',
}

/**
 * Curso - Entidad principal del dominio de cursos
 */
@Entity('courses')
@Index(['slug'], { unique: true })
@Index(['status'])
@Index(['categoryId'])
@Index(['isFeatured'])
@Index(['mainInstructorId'])
export class Course {
  @ApiProperty({
    example: '550e8400-e29b-41d4-a716-446655440000',
    description: 'ID único del curso',
  })
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ApiProperty({
    example: 'CRS-260206-A3K7',
    description: 'Codigo unico legible del sistema',
  })
  @Column({ type: 'varchar', length: 20, unique: true, nullable: true })
  @Index()
  systemCode: string;

  @BeforeInsert()
  generateSystemCode() {
    if (!this.systemCode) {
      this.systemCode = generateSystemCode('Course');
    }
  }

  @ApiProperty({
    example: 'vascular-sonography-vcourse',
    description: 'Slug único para URLs amigables',
  })
  @Column({ type: 'varchar', length: 255, unique: true })
  slug: string;

  // ============================================
  // INFORMACIÓN BÁSICA
  // ============================================

  @ApiProperty({
    example: 'Vascular Sonography vCourse',
    description: 'Título del curso',
  })
  @Column({ type: 'varchar', length: 255 })
  title: string;

  @ApiProperty({
    example: 'Complete Registry Review',
    description: 'Subtítulo del curso',
    required: false,
  })
  @Column({ type: 'varchar', length: 255, nullable: true })
  subtitle: string | null;

  @ApiProperty({
    example:
      'Programa completo de preparación para el examen de certificación vascular.',
    description: 'Descripción corta para listados',
  })
  @Column({ type: 'varchar', length: 500 })
  shortDescription: string;

  @ApiProperty({
    example: '<p>Descripción completa del curso...</p>',
    description: 'Descripción completa (rich text/HTML)',
    required: false,
  })
  @Column({ type: 'text', nullable: true })
  fullDescription: string | null;

  // ============================================
  // MEDIA
  // ============================================

  @ApiProperty({
    example: 'https://storage.example.com/courses/vascular-thumbnail.jpg',
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

  @ApiProperty({
    example: 'https://vimeo.com/123456789',
    description: 'URL del video promocional',
    required: false,
  })
  @Column({ type: 'text', nullable: true })
  promoVideoUrl: string | null;

  // ============================================
  // PRECIOS
  // ============================================

  @ApiProperty({
    example: 345.0,
    description: 'Precio regular del curso',
  })
  @Column({ type: 'decimal', precision: 10, scale: 2 })
  regularPrice: number;

  @ApiProperty({
    example: 265.0,
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

  // ============================================
  // FINANCIAMIENTO
  // ============================================

  @ApiProperty({
    example: true,
    description: 'Permite pago en cuotas',
  })
  @Column({ type: 'boolean', default: false })
  allowInstallments: boolean;

  @ApiProperty({
    example: 6,
    description: 'Número máximo de cuotas',
    required: false,
  })
  @Column({ type: 'int', nullable: true })
  maxInstallments: number | null;

  @ApiProperty({
    example: 0,
    description: 'Tasa de interés para cuotas (%)',
  })
  @Column({ type: 'decimal', precision: 5, scale: 2, default: 0 })
  installmentInterestRate: number;

  // ============================================
  // MODALIDAD
  // ============================================

  @ApiProperty({
    example: 'virtual',
    description: 'Modalidad del curso',
    enum: CourseModality,
  })
  @Column({
    type: 'enum',
    enum: CourseModality,
    default: CourseModality.VIRTUAL,
  })
  modality: CourseModality;

  @ApiProperty({
    example: 'Campus Virtual',
    description: 'Plataforma donde se imparte',
    required: false,
  })
  @Column({ type: 'varchar', length: 100, nullable: true })
  platform: string | null;

  // ============================================
  // DURACIÓN
  // ============================================

  @ApiProperty({
    example: 4,
    description: 'Número total de sesiones',
  })
  @Column({ type: 'int', default: 1 })
  totalSessions: number;

  @ApiProperty({
    example: 120,
    description: 'Duración de cada sesión en minutos',
  })
  @Column({ type: 'int', default: 60 })
  sessionDurationMinutes: number;

  @ApiProperty({
    example: 12,
    description: 'Total de horas académicas',
  })
  @Column({ type: 'int', default: 1 })
  totalAcademicHours: number;

  @ApiProperty({
    example: '1 sesión por semana',
    description: 'Frecuencia de las sesiones',
    required: false,
  })
  @Column({ type: 'varchar', length: 100, nullable: true })
  frequency: string | null;

  @ApiProperty({
    example: true,
    description: 'Acceso de por vida al comprar',
  })
  @Column({ type: 'boolean', default: true })
  lifetimeAccess: boolean;

  // ============================================
  // CERTIFICACIÓN
  // ============================================

  @ApiProperty({
    example: true,
    description: 'El curso otorga certificado',
  })
  @Column({ type: 'boolean', default: false })
  hasCertificate: boolean;

  @ApiProperty({
    example: 'Certificate of Completion',
    description: 'Tipo de certificado',
    required: false,
  })
  @Column({ type: 'varchar', length: 100, nullable: true })
  certificateType: string | null;

  @ApiProperty({
    example: 12,
    description: 'Horas certificadas',
    required: false,
  })
  @Column({ type: 'int', nullable: true })
  certifiedHours: number | null;

  @ApiProperty({
    example: ['ARDMS', 'CCI', 'ARRT'],
    description: 'Certificaciones para las que prepara',
    type: [String],
  })
  @Column({ type: 'simple-array', nullable: true })
  preparesFor: string[] | null;

  // ============================================
  // CONTENIDO
  // ============================================

  @ApiProperty({
    example: [
      'Dominar técnicas de Doppler',
      'Identificar patologías vasculares',
    ],
    description: 'Objetivos de aprendizaje',
    type: [String],
  })
  @Column({ type: 'simple-array', nullable: true })
  objectives: string[] | null;

  @ApiProperty({
    example: 'Metodología práctica con casos reales',
    description: 'Descripción de la metodología',
    required: false,
  })
  @Column({ type: 'text', nullable: true })
  methodology: string | null;

  @ApiProperty({
    example: ['Video lectures', 'Quizzes', 'Study guides'],
    description: 'Recursos incluidos',
    type: [String],
  })
  @Column({ type: 'simple-array', nullable: true })
  includedResources: string[] | null;

  @ApiProperty({
    example: ['Internet estable', 'Navegador actualizado'],
    description: 'Requisitos técnicos',
    type: [String],
  })
  @Column({ type: 'simple-array', nullable: true })
  technicalRequirements: string[] | null;

  @ApiProperty({
    example: ['Conocimientos básicos de anatomía'],
    description: 'Prerrequisitos',
    type: [String],
  })
  @Column({ type: 'simple-array', nullable: true })
  prerequisites: string[] | null;

  @ApiProperty({
    example: 'Profesionales de la salud interesados en sonografía vascular',
    description: 'Audiencia objetivo',
    required: false,
  })
  @Column({ type: 'text', nullable: true })
  targetAudience: string | null;

  // ============================================
  // MÉTRICAS DEL CURSO
  // ============================================

  @ApiProperty({
    example: 34,
    description: 'Número de video lectures',
  })
  @Column({ type: 'int', default: 0 })
  videoLecturesCount: number;

  @ApiProperty({
    example: 6,
    description: 'Número de quizzes',
  })
  @Column({ type: 'int', default: 0 })
  quizzesCount: number;

  @ApiProperty({
    example: true,
    description: 'Tiene examen final',
  })
  @Column({ type: 'boolean', default: false })
  hasExam: boolean;

  // ============================================
  // CATEGORIZACIÓN
  // ============================================

  @ApiProperty({
    example: ['sonography', 'vascular', 'certification'],
    description: 'Tags del curso',
    type: [String],
  })
  @Column({ type: 'simple-array', nullable: true })
  tags: string[] | null;

  @ApiProperty({
    example: 'intermediate',
    description: 'Nivel del curso',
    enum: CourseLevel,
  })
  @Column({ type: 'enum', enum: CourseLevel, default: CourseLevel.BEGINNER })
  level: CourseLevel;

  @ApiProperty({
    example: 'en',
    description: 'Idioma del curso',
    enum: CourseLanguage,
  })
  @Column({ type: 'enum', enum: CourseLanguage, default: CourseLanguage.EN })
  language: CourseLanguage;

  // ============================================
  // ESTADO
  // ============================================

  @ApiProperty({
    example: 'published',
    description: 'Estado del curso',
    enum: CourseStatus,
  })
  @Column({ type: 'enum', enum: CourseStatus, default: CourseStatus.DRAFT })
  status: CourseStatus;

  @ApiProperty({
    example: true,
    description: 'Curso destacado',
  })
  @Column({ type: 'boolean', default: false })
  isFeatured: boolean;

  @ApiProperty({
    example: 1,
    description: 'Orden en listados',
  })
  @Column({ type: 'int', default: 0 })
  order: number;

  // ============================================
  // STRIPE
  // ============================================

  @ApiProperty({
    example: 'prod_abc123',
    description: 'ID del producto en Stripe',
    required: false,
  })
  @Column({ type: 'varchar', length: 100, nullable: true })
  stripeProductId: string | null;

  @ApiProperty({
    example: 'price_abc123',
    description: 'ID del precio en Stripe',
    required: false,
  })
  @Column({ type: 'varchar', length: 100, nullable: true })
  stripePriceId: string | null;

  // ============================================
  // RELACIONES
  // ============================================

  @ManyToOne(() => Category, (category) => category.courses, { nullable: true })
  @JoinColumn({ name: 'categoryId' })
  category: Category | null;

  @Column({ type: 'uuid', nullable: true })
  categoryId: string | null;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'mainInstructorId' })
  mainInstructor: User | null;

  @Column({ type: 'uuid', nullable: true })
  mainInstructorId: string | null;

  @OneToMany(() => CourseInstructor, (ci) => ci.course)
  instructors: CourseInstructor[];

  @OneToMany(() => CourseModule, (module) => module.course)
  modules: CourseModule[];

  @OneToMany(() => Cohort, (cohort) => cohort.course)
  cohorts: Cohort[];

  // ============================================
  // TIMESTAMPS
  // ============================================

  @ApiProperty({ description: 'Fecha de creación' })
  @CreateDateColumn()
  createdAt: Date;

  @ApiProperty({ description: 'Fecha de última actualización' })
  @UpdateDateColumn()
  updatedAt: Date;

  @ApiProperty({
    description: 'Fecha de eliminación (soft delete)',
    required: false,
  })
  @DeleteDateColumn()
  deletedAt: Date | null;

  // ============================================
  // CONSTRUCTOR
  // ============================================

  constructor(partial: Partial<Course>) {
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
   * Verifica si el curso tiene descuento activo
   */
  get hasDiscount(): boolean {
    return this.salePrice !== null && this.salePrice < this.regularPrice;
  }

  /**
   * Calcula el porcentaje de descuento
   */
  get discountPercentage(): number {
    if (!this.hasDiscount) return 0;
    return Math.round(
      ((this.regularPrice - this.salePrice!) / this.regularPrice) * 100,
    );
  }

  /**
   * Verifica si el curso está publicado
   */
  get isPublished(): boolean {
    return this.status === CourseStatus.PUBLISHED;
  }
}
