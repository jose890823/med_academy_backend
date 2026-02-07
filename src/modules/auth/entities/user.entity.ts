import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
  Index,
  BeforeInsert,
} from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';
import { Exclude } from 'class-transformer';
import { generateSystemCode } from '../../../common/utils/system-code-generator.util';

export enum UserRole {
  SUPER_ADMIN = 'super_admin',
  ADMIN = 'admin',
  TEACHER = 'teacher',
  STUDENT = 'student',
}

@Entity('users')
@Index(['email'], { unique: true })
@Index(['isActive'])
export class User {
  @ApiProperty({
    example: '123e4567-e89b-12d3-a456-426614174000',
    description: 'ID único del usuario',
  })
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ApiProperty({
    example: 'USR-260206-A3K7',
    description: 'Codigo unico legible del sistema',
  })
  @Column({ type: 'varchar', length: 20, unique: true, nullable: true })
  @Index()
  systemCode: string;

  @BeforeInsert()
  generateSystemCode() {
    if (!this.systemCode) {
      this.systemCode = generateSystemCode('User');
    }
  }

  @ApiProperty({
    example: 'juan.perez@example.com',
    description: 'Email del usuario (único)',
  })
  @Column({ type: 'varchar', length: 255, unique: true })
  email: string;

  @Exclude() // Excluir de las respuestas por seguridad
  @Column({ type: 'varchar', length: 255 })
  password: string;

  @ApiProperty({
    example: 'Juan',
    description: 'Nombre del usuario',
  })
  @Column({ type: 'varchar', length: 255 })
  firstName: string;

  @ApiProperty({
    example: 'Pérez',
    description: 'Apellido del usuario',
  })
  @Column({ type: 'varchar', length: 255 })
  lastName: string;

  @ApiProperty({
    example: 'juan-perez',
    description: 'Slug único para URLs amigables (generado automáticamente)',
  })
  @Column({ type: 'varchar', length: 255, unique: true, nullable: true })
  @Index()
  slug: string | null;

  @ApiProperty({
    example: '+1234567890',
    description: 'Teléfono del usuario (formato internacional)',
  })
  @Column({ type: 'varchar', length: 20 })
  phone: string;

  @ApiProperty({
    example: ['student'],
    description: 'Roles del usuario (puede tener múltiples)',
    enum: UserRole,
    isArray: true,
  })
  @Column({
    type: 'simple-array',
    default: UserRole.STUDENT,
  })
  roles: UserRole[];

  /**
   * @deprecated Usar 'roles' en su lugar. Mantenido para compatibilidad.
   * Retorna el rol principal (el primero del array o el de mayor jerarquía)
   */
  get role(): UserRole {
    if (!this.roles || this.roles.length === 0) return UserRole.STUDENT;
    // Orden de jerarquía: super_admin > admin > teacher > student
    const hierarchy = [
      UserRole.SUPER_ADMIN,
      UserRole.ADMIN,
      UserRole.TEACHER,
      UserRole.STUDENT,
    ];
    for (const role of hierarchy) {
      if (this.roles.includes(role)) return role;
    }
    return this.roles[0];
  }

  @ApiProperty({
    example: false,
    description: 'Indica si el email ha sido verificado',
  })
  @Column({ type: 'boolean', default: false })
  emailVerified: boolean;

  @ApiProperty({
    example: false,
    description: 'Indica si el teléfono ha sido verificado',
  })
  @Column({ type: 'boolean', default: false })
  phoneVerified: boolean;

  @ApiProperty({
    example: true,
    description: 'Indica si el usuario está activo',
  })
  @Column({ type: 'boolean', default: true })
  isActive: boolean;

  @ApiProperty({
    example: false,
    description:
      'Indica si es un usuario del sistema (no se puede eliminar desde la UI)',
  })
  @Column({ type: 'boolean', default: false })
  isSystemUser: boolean;

  @ApiProperty({
    example: '2025-01-01T10:30:00.000Z',
    description: 'Fecha y hora del último login',
    required: false,
  })
  @Column({ type: 'timestamp', nullable: true })
  lastLoginAt: Date | null;

  // ============================================
  // CAMPOS DE PERFIL EXTENDIDO
  // ============================================

  @ApiProperty({
    example: 'https://storage.example.com/profile-photos/user123.jpg',
    description: 'URL de la foto de perfil del usuario',
    required: false,
  })
  @Column({ type: 'text', nullable: true })
  profilePhoto: string | null;

  @ApiProperty({
    example: '123 Main Street, Apt 4B',
    description: 'Dirección completa del usuario',
    required: false,
  })
  @Column({ type: 'varchar', length: 500, nullable: true })
  address: string | null;

  @ApiProperty({
    example: 'Miami',
    description: 'Ciudad',
    required: false,
  })
  @Column({ type: 'varchar', length: 100, nullable: true })
  city: string | null;

  @ApiProperty({
    example: 'Florida',
    description: 'Estado/Provincia',
    required: false,
  })
  @Column({ type: 'varchar', length: 100, nullable: true })
  state: string | null;

  @ApiProperty({
    example: '33166',
    description: 'Código postal',
    required: false,
  })
  @Column({ type: 'varchar', length: 20, nullable: true })
  zipCode: string | null;

  @ApiProperty({
    example: 'United States',
    description: 'País',
    required: false,
  })
  @Column({ type: 'varchar', length: 100, nullable: true })
  country: string | null;

  @ApiProperty({
    example: '1990-05-15',
    description: 'Fecha de nacimiento',
    required: false,
  })
  @Column({ type: 'date', nullable: true })
  dateOfBirth: Date | null;

  @ApiProperty({
    example: 'V-12345678',
    description: 'Número de identificación (encriptado)',
    required: false,
  })
  @Column({ type: 'text', nullable: true })
  identificationNumber: string | null;

  // ============================================
  // INTEGRACIÓN CON STRIPE
  // ============================================

  @ApiProperty({
    example: 'cus_1234567890abcdef',
    description: 'ID del cliente en Stripe',
    required: false,
  })
  @Column({ type: 'varchar', length: 255, nullable: true })
  stripeCustomerId: string | null;

  @Exclude() // Token sensible, no exponer
  @Column({ type: 'varchar', length: 500, nullable: true })
  refreshToken: string | null;

  @Exclude()
  @Column({ type: 'timestamp', nullable: true })
  refreshTokenExpiresAt: Date | null;

  @Exclude() // Código OTP sensible
  @Column({ type: 'varchar', length: 6, nullable: true })
  otpCode: string | null;

  @Exclude()
  @Column({ type: 'timestamp', nullable: true })
  otpExpiresAt: Date | null;

  @Exclude()
  @Column({ type: 'int', default: 0 })
  otpAttempts: number;

  @Exclude() // Token de reset sensible
  @Column({ type: 'varchar', length: 255, nullable: true })
  resetPasswordToken: string | null;

  @Exclude()
  @Column({ type: 'timestamp', nullable: true })
  resetPasswordExpiresAt: Date | null;

  @ApiProperty({
    example: '2025-01-01T00:00:00.000Z',
    description: 'Fecha de creación del usuario',
  })
  @CreateDateColumn()
  createdAt: Date;

  @ApiProperty({
    example: '2025-01-01T00:00:00.000Z',
    description: 'Fecha de última actualización',
  })
  @UpdateDateColumn()
  updatedAt: Date;

  @ApiProperty({
    example: null,
    description: 'Fecha de eliminación (soft delete)',
    required: false,
  })
  @DeleteDateColumn()
  deletedAt: Date | null;

  // TODO: Relación con Client (implementar cuando se cree el módulo Clients)
  // @OneToOne(() => Client, client => client.user)
  // client: Client;

  constructor(partial: Partial<User>) {
    Object.assign(this, partial);
  }

  /**
   * Método helper para obtener el nombre completo
   */
  get fullName(): string {
    return `${this.firstName} ${this.lastName}`;
  }

  /**
   * Método helper para verificar si el OTP ha expirado
   */
  isOtpExpired(): boolean {
    if (!this.otpExpiresAt) return true;
    return new Date() > this.otpExpiresAt;
  }

  /**
   * Método helper para verificar si el token de reset ha expirado
   */
  isResetTokenExpired(): boolean {
    if (!this.resetPasswordExpiresAt) return true;
    return new Date() > this.resetPasswordExpiresAt;
  }

  /**
   * Método helper para verificar si ha alcanzado el máximo de intentos OTP
   */
  hasReachedMaxOtpAttempts(maxAttempts: number): boolean {
    return this.otpAttempts >= maxAttempts;
  }

  /**
   * Método helper para verificar si el usuario tiene un rol específico
   */
  hasRole(role: UserRole): boolean {
    return this.roles?.includes(role) ?? false;
  }

  /**
   * Método helper para verificar si el usuario tiene alguno de los roles especificados
   */
  hasAnyRole(roles: UserRole[]): boolean {
    return roles.some((role) => this.hasRole(role));
  }

  /**
   * Método helper para verificar si el usuario es administrador (admin o super_admin)
   */
  isAdmin(): boolean {
    return this.hasAnyRole([UserRole.ADMIN, UserRole.SUPER_ADMIN]);
  }

  /**
   * Método helper para verificar si el usuario es super administrador
   */
  isSuperAdmin(): boolean {
    return this.hasRole(UserRole.SUPER_ADMIN);
  }

  /**
   * Método helper para verificar si el usuario es profesor
   */
  isTeacher(): boolean {
    return this.hasRole(UserRole.TEACHER);
  }

  /**
   * Método helper para verificar si el usuario es estudiante
   */
  isStudent(): boolean {
    return this.hasRole(UserRole.STUDENT);
  }
}
