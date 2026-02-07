import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  OneToOne,
  JoinColumn,
  Index,
  BeforeInsert,
} from 'typeorm';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { generateSystemCode } from '../../../common/utils/system-code-generator.util';
import { User } from '../../auth/entities/user.entity';

/**
 * Especialidades disponibles para instructores
 */
export enum InstructorSpecialty {
  VASCULAR = 'vascular',
  MSK = 'msk',
  ECHO = 'echo',
  GENERAL = 'general',
  PHYSICS = 'physics',
  OB_GYN = 'ob_gyn',
  PEDIATRIC = 'pediatric',
  CARDIAC = 'cardiac',
}

/**
 * Certificaciones reconocidas
 */
export enum InstructorCertification {
  ARDMS = 'ARDMS',
  ARRT = 'ARRT',
  CCI = 'CCI',
  APCA = 'APCA',
  SDMS = 'SDMS',
  RDMS = 'RDMS',
  RVT = 'RVT',
  RDCS = 'RDCS',
}

/**
 * Entidad InstructorProfile
 * Perfil público de un instructor
 */
@Entity('instructor_profiles')
@Index(['isActive'])
@Index(['slug'], { unique: true })
export class InstructorProfile {
  @ApiProperty({ description: 'ID único del perfil' })
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ApiProperty({
    example: 'INS-260206-A3K7',
    description: 'Codigo unico legible del sistema',
  })
  @Column({ type: 'varchar', length: 20, unique: true, nullable: true })
  @Index()
  systemCode: string;

  @BeforeInsert()
  generateSystemCode() {
    if (!this.systemCode) {
      this.systemCode = generateSystemCode('InstructorProfile');
    }
  }

  // ============================================
  // INFORMACIÓN BÁSICA
  // ============================================

  @ApiProperty({ description: 'Nombre profesional/público' })
  @Column({ type: 'varchar', length: 255 })
  displayName: string;

  @ApiProperty({ description: 'Slug para URL pública' })
  @Column({ type: 'varchar', length: 255, unique: true })
  slug: string;

  @ApiPropertyOptional({ description: 'Título profesional' })
  @Column({ type: 'varchar', length: 100, nullable: true })
  title: string | null;

  @ApiProperty({ description: 'Biografía corta (resumen)' })
  @Column({ type: 'varchar', length: 500, nullable: true })
  shortBio: string | null;

  @ApiProperty({ description: 'Biografía completa' })
  @Column({ type: 'text', nullable: true })
  fullBio: string | null;

  // ============================================
  // IMAGEN Y MEDIA
  // ============================================

  @ApiPropertyOptional({ description: 'URL de foto de perfil' })
  @Column({ type: 'varchar', length: 500, nullable: true })
  avatarUrl: string | null;

  @ApiPropertyOptional({ description: 'URL de foto de portada' })
  @Column({ type: 'varchar', length: 500, nullable: true })
  coverImageUrl: string | null;

  @ApiPropertyOptional({ description: 'URL de video de presentación' })
  @Column({ type: 'varchar', length: 500, nullable: true })
  introVideoUrl: string | null;

  // ============================================
  // CREDENCIALES Y EXPERIENCIA
  // ============================================

  @ApiProperty({ description: 'Especialidades del instructor' })
  @Column({ type: 'simple-array', nullable: true })
  specialties: InstructorSpecialty[] | null;

  @ApiProperty({ description: 'Certificaciones' })
  @Column({ type: 'simple-array', nullable: true })
  certifications: InstructorCertification[] | null;

  @ApiPropertyOptional({ description: 'Años de experiencia' })
  @Column({ type: 'int', nullable: true })
  yearsOfExperience: number | null;

  @ApiPropertyOptional({ description: 'Educación formal' })
  @Column({ type: 'jsonb', nullable: true })
  education: Array<{
    degree: string;
    institution: string;
    year: number;
  }> | null;

  @ApiPropertyOptional({ description: 'Experiencia laboral' })
  @Column({ type: 'jsonb', nullable: true })
  workExperience: Array<{
    position: string;
    organization: string;
    startYear: number;
    endYear: number | null;
    current: boolean;
  }> | null;

  // ============================================
  // REDES SOCIALES
  // ============================================

  @ApiPropertyOptional({ description: 'URL de LinkedIn' })
  @Column({ type: 'varchar', length: 255, nullable: true })
  linkedinUrl: string | null;

  @ApiPropertyOptional({ description: 'URL de Twitter/X' })
  @Column({ type: 'varchar', length: 255, nullable: true })
  twitterUrl: string | null;

  @ApiPropertyOptional({ description: 'URL de sitio web personal' })
  @Column({ type: 'varchar', length: 255, nullable: true })
  websiteUrl: string | null;

  @ApiPropertyOptional({ description: 'Email público' })
  @Column({ type: 'varchar', length: 255, nullable: true })
  publicEmail: string | null;

  // ============================================
  // ESTADÍSTICAS
  // ============================================

  @ApiProperty({ description: 'Número de cursos activos', default: 0 })
  @Column({ type: 'int', default: 0 })
  courseCount: number;

  @ApiProperty({ description: 'Número total de estudiantes', default: 0 })
  @Column({ type: 'int', default: 0 })
  studentCount: number;

  @ApiProperty({ description: 'Rating promedio', default: 0 })
  @Column({ type: 'decimal', precision: 3, scale: 2, default: 0 })
  averageRating: number;

  @ApiProperty({ description: 'Número de reviews', default: 0 })
  @Column({ type: 'int', default: 0 })
  reviewCount: number;

  // ============================================
  // CONFIGURACIÓN
  // ============================================

  @ApiProperty({ description: 'Perfil activo/visible', default: true })
  @Column({ type: 'boolean', default: true })
  isActive: boolean;

  @ApiProperty({ description: 'Instructor destacado', default: false })
  @Column({ type: 'boolean', default: false })
  isFeatured: boolean;

  @ApiProperty({ description: 'Orden de visualización' })
  @Column({ type: 'int', default: 0 })
  sortOrder: number;

  // ============================================
  // RELACIONES
  // ============================================

  @ApiProperty({ description: 'Usuario asociado' })
  @OneToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column({ type: 'uuid', unique: true })
  userId: string;

  // ============================================
  // TIMESTAMPS
  // ============================================

  @ApiProperty({ description: 'Fecha de creación' })
  @CreateDateColumn({ type: 'timestamp with time zone' })
  createdAt: Date;

  @ApiProperty({ description: 'Fecha de última actualización' })
  @UpdateDateColumn({ type: 'timestamp with time zone' })
  updatedAt: Date;

  // ============================================
  // CONSTRUCTOR Y MÉTODOS
  // ============================================

  constructor(partial: Partial<InstructorProfile>) {
    Object.assign(this, partial);
  }

  /**
   * Obtener nombre completo con título
   */
  get fullDisplayName(): string {
    return this.title ? `${this.title} ${this.displayName}` : this.displayName;
  }

  /**
   * Verificar si tiene especialidad
   */
  hasSpecialty(specialty: InstructorSpecialty): boolean {
    return this.specialties?.includes(specialty) ?? false;
  }

  /**
   * Verificar si tiene certificación
   */
  hasCertification(certification: InstructorCertification): boolean {
    return this.certifications?.includes(certification) ?? false;
  }

  /**
   * Actualizar estadísticas de cursos
   */
  updateCourseStats(courseCount: number, studentCount: number): void {
    this.courseCount = courseCount;
    this.studentCount = studentCount;
  }

  /**
   * Actualizar estadísticas de reviews
   */
  updateReviewStats(averageRating: number, reviewCount: number): void {
    this.averageRating = averageRating;
    this.reviewCount = reviewCount;
  }
}
