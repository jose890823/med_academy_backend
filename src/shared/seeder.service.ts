import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { User, UserRole } from '../modules/auth/entities/user.entity';

@Injectable()
export class SeederService implements OnApplicationBootstrap {
  private readonly logger = new Logger(SeederService.name);

  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly configService: ConfigService,
    private readonly dataSource: DataSource,
  ) {}

  async onApplicationBootstrap() {
    // Verificar si las tablas existen
    const tablesReady = await this.ensureTablesExist();
    if (!tablesReady) {
      this.logger.warn(
        'No se pudo preparar la base de datos. Seeders omitidos.',
      );
      return;
    }

    await this.seedSuperAdmin();
  }

  /**
   * Verifica si las tablas necesarias existen.
   * @returns true si las tablas estan listas, false si hubo un error
   */
  private async ensureTablesExist(): Promise<boolean> {
    try {
      const tableExists = await this.checkTableExists('users');

      if (!tableExists) {
        this.logger.log(
          'Tablas no encontradas. Sincronizando esquema de base de datos...',
        );
        await this.dataSource.synchronize(false);
        this.logger.log('Esquema sincronizado correctamente.');
      }

      return true;
    } catch (error) {
      this.logger.error(
        'Error verificando/sincronizando tablas:',
        error.message,
      );
      return false;
    }
  }

  /**
   * Verifica si una tabla existe en la base de datos
   */
  private async checkTableExists(tableName: string): Promise<boolean> {
    try {
      const result = await this.dataSource.query(
        `SELECT EXISTS (
          SELECT FROM information_schema.tables
          WHERE table_schema = 'public'
          AND table_name = $1
        )`,
        [tableName],
      );
      return result[0]?.exists === true;
    } catch {
      return false;
    }
  }

  /**
   * Crea el Super Admin por defecto si no existe
   */
  private async seedSuperAdmin(): Promise<void> {
    const superAdminEmail = this.configService.get<string>(
      'SUPER_ADMIN_EMAIL',
      'admin@publishsparks.com',
    );
    const superAdminPassword = this.configService.get<string>(
      'SUPER_ADMIN_PASSWORD',
      'Admin123!',
    );

    const existingSuperAdmin = await this.userRepository.findOne({
      where: { email: superAdminEmail },
    });

    if (existingSuperAdmin) {
      this.logger.log(`Super Admin ya existe: ${superAdminEmail}`);
      return;
    }

    const hashedPassword = await bcrypt.hash(superAdminPassword, 10);

    const superAdmin = this.userRepository.create({
      email: superAdminEmail,
      password: hashedPassword,
      firstName: 'Super',
      lastName: 'Admin',
      phone: '+1234567890',
      roles: [UserRole.SUPER_ADMIN, UserRole.ADMIN],
      emailVerified: true,
      isActive: true,
      isSystemUser: true,
    });

    await this.userRepository.save(superAdmin);
    this.logger.log(`Super Admin creado: ${superAdminEmail}`);
  }
}
