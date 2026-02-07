import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
  BeforeInsert,
} from 'typeorm';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { generateSystemCode } from '../../../common/utils/system-code-generator.util';
import { CourseModule } from '../../courses/entities/course-module.entity';
import { Course } from '../../courses/entities/course.entity';
import { User } from '../../auth/entities/user.entity';

/**
 * Tipo de material
 */
export enum MaterialType {
  VIDEO = 'video',
  PDF = 'pdf',
  DOCUMENT = 'document',
  IMAGE = 'image',
  AUDIO = 'audio',
  PRESENTATION = 'presentation',
  SPREADSHEET = 'spreadsheet',
  ARCHIVE = 'archive',
  OTHER = 'other',
}

/**
 * Estado del material
 */
export enum MaterialStatus {
  PENDING = 'pending', // Subiendo o procesando
  ACTIVE = 'active', // Disponible
  ARCHIVED = 'archived', // Archivado (no visible)
  DELETED = 'deleted', // Eliminado lógicamente
}

/**
 * Proveedor de almacenamiento
 */
export enum StorageProvider {
  LOCAL = 'local',
  S3 = 's3',
  GCS = 'gcs', // Google Cloud Storage
  CLOUDINARY = 'cloudinary',
  VIMEO = 'vimeo', // Para videos
  YOUTUBE = 'youtube', // Para videos
  EXTERNAL = 'external', // URL externa
}

/**
 * Material de curso
 */
@Entity('materials')
@Index(['courseId'])
@Index(['moduleId'])
@Index(['type'])
@Index(['status'])
@Index(['isPublic'])
@Index(['order'])
export class Material {
  @ApiProperty({
    example: '550e8400-e29b-41d4-a716-446655440000',
    description: 'ID único del material',
  })
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ApiProperty({
    example: 'MAT-260206-A3K7',
    description: 'Codigo unico legible del sistema',
  })
  @Column({ type: 'varchar', length: 20, unique: true, nullable: true })
  @Index()
  systemCode: string;

  @BeforeInsert()
  generateSystemCode() {
    if (!this.systemCode) {
      this.systemCode = generateSystemCode('Material');
    }
  }

  // ============================================
  // INFORMACIÓN BÁSICA
  // ============================================

  @ApiProperty({
    example: 'Guía de Física Doppler',
    description: 'Nombre del material',
  })
  @Column({ type: 'varchar', length: 255 })
  name: string;

  @ApiPropertyOptional({
    example: 'guia-fisica-doppler.pdf',
    description: 'Nombre original del archivo',
  })
  @Column({ type: 'varchar', length: 255, nullable: true })
  originalFilename: string | null;

  @ApiPropertyOptional({
    example: 'Documento PDF con los fundamentos de la física Doppler.',
    description: 'Descripción del material',
  })
  @Column({ type: 'text', nullable: true })
  description: string | null;

  @ApiProperty({
    example: 'pdf',
    description: 'Tipo de material',
    enum: MaterialType,
  })
  @Column({ type: 'enum', enum: MaterialType, default: MaterialType.OTHER })
  type: MaterialType;

  @ApiProperty({
    example: 'active',
    description: 'Estado del material',
    enum: MaterialStatus,
  })
  @Column({
    type: 'enum',
    enum: MaterialStatus,
    default: MaterialStatus.ACTIVE,
  })
  status: MaterialStatus;

  @ApiProperty({
    example: 1,
    description: 'Orden del material dentro del módulo',
  })
  @Column({ type: 'int', default: 0 })
  order: number;

  // ============================================
  // ALMACENAMIENTO
  // ============================================

  @ApiProperty({
    example: 's3',
    description: 'Proveedor de almacenamiento',
    enum: StorageProvider,
  })
  @Column({
    type: 'enum',
    enum: StorageProvider,
    default: StorageProvider.LOCAL,
  })
  storageProvider: StorageProvider;

  @ApiProperty({
    example: 'https://s3.amazonaws.com/bucket/materials/doppler-guide.pdf',
    description: 'URL del archivo',
  })
  @Column({ type: 'text' })
  url: string;

  @ApiPropertyOptional({
    example: 'materials/courses/123/doppler-guide.pdf',
    description: 'Ruta/key en el almacenamiento',
  })
  @Column({ type: 'varchar', length: 500, nullable: true })
  storagePath: string | null;

  @ApiPropertyOptional({
    example: 'application/pdf',
    description: 'MIME type del archivo',
  })
  @Column({ type: 'varchar', length: 100, nullable: true })
  mimeType: string | null;

  @ApiPropertyOptional({
    example: 2048576,
    description: 'Tamaño del archivo en bytes',
  })
  @Column({ type: 'bigint', nullable: true })
  sizeBytes: number | null;

  // ============================================
  // METADATOS ESPECÍFICOS POR TIPO
  // ============================================

  @ApiPropertyOptional({
    example: 45,
    description: 'Duración en minutos (para video/audio)',
  })
  @Column({ type: 'int', nullable: true })
  durationMinutes: number | null;

  @ApiPropertyOptional({
    example: 15,
    description: 'Número de páginas (para documentos)',
  })
  @Column({ type: 'int', nullable: true })
  pageCount: number | null;

  @ApiPropertyOptional({
    example: { width: 1920, height: 1080, quality: 'HD' },
    description: 'Metadatos adicionales del archivo',
  })
  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, any> | null;

  // ============================================
  // THUMBNAIL / PREVIEW
  // ============================================

  @ApiPropertyOptional({
    example:
      'https://s3.amazonaws.com/bucket/thumbnails/doppler-guide-thumb.jpg',
    description: 'URL de la miniatura/preview',
  })
  @Column({ type: 'text', nullable: true })
  thumbnailUrl: string | null;

  // ============================================
  // ACCESO Y VISIBILIDAD
  // ============================================

  @ApiProperty({
    example: false,
    description: 'Si el material es público (accesible sin inscripción)',
  })
  @Column({ type: 'boolean', default: false })
  isPublic: boolean;

  @ApiProperty({
    example: true,
    description: 'Si el material permite descarga',
  })
  @Column({ type: 'boolean', default: true })
  allowDownload: boolean;

  @ApiProperty({
    example: 0,
    description: 'Número de veces que se ha visualizado/descargado',
  })
  @Column({ type: 'int', default: 0 })
  downloadCount: number;

  // ============================================
  // RELACIONES
  // ============================================

  @ManyToOne(() => Course, { nullable: true, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'courseId' })
  course: Course | null;

  @Column({ type: 'uuid', nullable: true })
  courseId: string | null;

  @ManyToOne(() => CourseModule, { nullable: true, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'moduleId' })
  module: CourseModule | null;

  @Column({ type: 'uuid', nullable: true })
  moduleId: string | null;

  // Usuario que subió el material
  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'uploadedById' })
  uploadedBy: User | null;

  @Column({ type: 'uuid', nullable: true })
  uploadedById: string | null;

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

  constructor(partial: Partial<Material>) {
    Object.assign(this, partial);
  }

  // ============================================
  // MÉTODOS HELPER
  // ============================================

  /**
   * Obtiene el tamaño en formato legible
   */
  get sizeFormatted(): string {
    if (!this.sizeBytes) return 'Unknown';
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(this.sizeBytes) / Math.log(1024));
    return `${(this.sizeBytes / Math.pow(1024, i)).toFixed(2)} ${sizes[i]}`;
  }

  /**
   * Verifica si es un material de video
   */
  get isVideo(): boolean {
    return this.type === MaterialType.VIDEO;
  }

  /**
   * Verifica si es descargable
   */
  get isDownloadable(): boolean {
    return this.allowDownload && this.status === MaterialStatus.ACTIVE;
  }

  /**
   * Incrementa el contador de descargas
   */
  incrementDownloadCount(): void {
    this.downloadCount += 1;
  }
}
