import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
  Index,
} from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';
import { Workshop } from './workshop.entity';
import { WorkshopRegistration } from './workshop-registration.entity';

/**
 * Estado de la sesión
 */
export enum SessionStatus {
  SCHEDULED = 'scheduled', // Programada, aceptando inscripciones
  CONFIRMED = 'confirmed', // Confirmada (mínimo alcanzado)
  FULL = 'full', // Llena
  IN_PROGRESS = 'in_progress', // En curso
  COMPLETED = 'completed', // Finalizada
  CANCELLED = 'cancelled', // Cancelada
  POSTPONED = 'postponed', // Pospuesta
}

/**
 * Sesión de un workshop (fecha/ubicación específica)
 */
@Entity('workshop_sessions')
@Index(['workshopId'])
@Index(['status'])
@Index(['startDate'])
@Index(['locationCity'])
export class WorkshopSession {
  @ApiProperty({
    example: '550e8400-e29b-41d4-a716-446655440000',
    description: 'ID único de la sesión',
  })
  @PrimaryGeneratedColumn('uuid')
  id: string;

  // ============================================
  // RELACIÓN CON WORKSHOP
  // ============================================

  @ManyToOne(() => Workshop, (workshop) => workshop.sessions, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'workshopId' })
  workshop: Workshop;

  @Column({ type: 'uuid' })
  workshopId: string;

  // ============================================
  // FECHA Y HORA
  // ============================================

  @ApiProperty({
    example: '2026-03-15T09:00:00.000Z',
    description: 'Fecha y hora de inicio',
  })
  @Column({ type: 'timestamp' })
  startDate: Date;

  @ApiProperty({
    example: '2026-03-15T17:00:00.000Z',
    description: 'Fecha y hora de fin',
  })
  @Column({ type: 'timestamp' })
  endDate: Date;

  @ApiProperty({
    example: 'America/New_York',
    description: 'Zona horaria',
  })
  @Column({ type: 'varchar', length: 50, default: 'America/New_York' })
  timezone: string;

  // ============================================
  // UBICACIÓN
  // ============================================

  @ApiProperty({
    example: 'UMA Training Center',
    description: 'Nombre del lugar',
  })
  @Column({ type: 'varchar', length: 200 })
  locationName: string;

  @ApiProperty({
    example: '123 Medical Plaza, Suite 200',
    description: 'Dirección',
  })
  @Column({ type: 'varchar', length: 300 })
  locationAddress: string;

  @ApiProperty({
    example: 'Miami',
    description: 'Ciudad',
  })
  @Column({ type: 'varchar', length: 100 })
  locationCity: string;

  @ApiProperty({
    example: 'FL',
    description: 'Estado/Provincia',
  })
  @Column({ type: 'varchar', length: 50 })
  locationState: string;

  @ApiProperty({
    example: '33101',
    description: 'Código postal',
    required: false,
  })
  @Column({ type: 'varchar', length: 20, nullable: true })
  locationZipCode: string | null;

  @ApiProperty({
    example: 'US',
    description: 'País (código ISO)',
  })
  @Column({ type: 'varchar', length: 2, default: 'US' })
  locationCountry: string;

  @ApiProperty({
    example: 'https://maps.google.com/?q=...',
    description: 'URL de Google Maps',
    required: false,
  })
  @Column({ type: 'text', nullable: true })
  locationMapUrl: string | null;

  @ApiProperty({
    example: 'Segundo piso, sala de entrenamiento B',
    description: 'Instrucciones adicionales de ubicación',
    required: false,
  })
  @Column({ type: 'text', nullable: true })
  locationNotes: string | null;

  // ============================================
  // CAPACIDAD
  // ============================================

  @ApiProperty({
    example: 8,
    description: 'Capacidad máxima de esta sesión',
  })
  @Column({ type: 'int' })
  maxParticipants: number;

  @ApiProperty({
    example: 5,
    description: 'Participantes actualmente registrados',
  })
  @Column({ type: 'int', default: 0 })
  currentParticipants: number;

  @ApiProperty({
    example: 4,
    description: 'Mínimo de participantes para confirmar',
  })
  @Column({ type: 'int', default: 1 })
  minParticipants: number;

  // ============================================
  // ESTADO
  // ============================================

  @ApiProperty({
    example: 'scheduled',
    description: 'Estado de la sesión',
    enum: SessionStatus,
  })
  @Column({
    type: 'enum',
    enum: SessionStatus,
    default: SessionStatus.SCHEDULED,
  })
  status: SessionStatus;

  @ApiProperty({
    example: true,
    description: 'Indica si las inscripciones están abiertas',
  })
  @Column({ type: 'boolean', default: true })
  registrationOpen: boolean;

  @ApiProperty({
    example: '2026-03-10T23:59:59.000Z',
    description: 'Fecha límite de inscripción',
    required: false,
  })
  @Column({ type: 'timestamp', nullable: true })
  registrationDeadline: Date | null;

  // ============================================
  // PRECIOS ESPECÍFICOS (override del workshop)
  // ============================================

  @ApiProperty({
    example: 350.0,
    description:
      'Precio específico de esta sesión (null = usa precio del workshop)',
    required: false,
  })
  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  priceOverride: number | null;

  // ============================================
  // NOTAS E INFORMACIÓN ADICIONAL
  // ============================================

  @ApiProperty({
    example: 'Sesión especial con instructor invitado',
    description: 'Notas públicas sobre esta sesión',
    required: false,
  })
  @Column({ type: 'text', nullable: true })
  publicNotes: string | null;

  @ApiProperty({
    example: 'Confirmar catering para 10 personas',
    description: 'Notas internas (solo admin)',
    required: false,
  })
  @Column({ type: 'text', nullable: true })
  internalNotes: string | null;

  // ============================================
  // RELACIONES
  // ============================================

  @OneToMany(() => WorkshopRegistration, (reg) => reg.session)
  registrations: WorkshopRegistration[];

  // Instructor específico de esta sesión (opcional, override del workshop)
  @Column({ type: 'uuid', nullable: true })
  instructorId: string | null;

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

  constructor(partial: Partial<WorkshopSession>) {
    Object.assign(this, partial);
  }

  // ============================================
  // MÉTODOS HELPER
  // ============================================

  /**
   * Verifica si hay cupos disponibles
   */
  get hasAvailableSpots(): boolean {
    return this.currentParticipants < this.maxParticipants;
  }

  /**
   * Obtiene los cupos disponibles
   */
  get availableSpots(): number {
    return Math.max(0, this.maxParticipants - this.currentParticipants);
  }

  /**
   * Verifica si está llena
   */
  get isFull(): boolean {
    return this.currentParticipants >= this.maxParticipants;
  }

  /**
   * Verifica si el mínimo fue alcanzado
   */
  get minimumReached(): boolean {
    return this.currentParticipants >= this.minParticipants;
  }

  /**
   * Verifica si se puede registrar (abierto y con cupo)
   */
  get canRegister(): boolean {
    if (!this.registrationOpen) return false;
    if (this.isFull) return false;
    if (this.status === SessionStatus.CANCELLED) return false;
    if (this.status === SessionStatus.COMPLETED) return false;
    if (this.registrationDeadline && new Date() > this.registrationDeadline)
      return false;
    return true;
  }

  /**
   * Verifica si la sesión ya pasó
   */
  get isPast(): boolean {
    return new Date() > new Date(this.endDate);
  }

  /**
   * Verifica si la sesión es hoy
   */
  get isToday(): boolean {
    const today = new Date();
    const sessionDate = new Date(this.startDate);
    return (
      today.getFullYear() === sessionDate.getFullYear() &&
      today.getMonth() === sessionDate.getMonth() &&
      today.getDate() === sessionDate.getDate()
    );
  }

  /**
   * Obtiene la ubicación formateada
   */
  get fullLocation(): string {
    return `${this.locationName}, ${this.locationCity}, ${this.locationState}`;
  }

  /**
   * Obtiene el precio efectivo (override o del workshop)
   */
  getEffectivePrice(workshopPrice: number): number {
    return this.priceOverride ?? workshopPrice;
  }
}
