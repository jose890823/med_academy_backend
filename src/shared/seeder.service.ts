import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { User, UserRole } from '../modules/auth/entities/user.entity';
import { generateSystemCode } from '../common/utils/system-code-generator.util';

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
    await this.backfillSystemCodes();
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

  /**
   * Backfill: Genera systemCode para registros existentes que no lo tienen
   * Solo corre si hay registros sin codigo (no-op despues del primer run)
   */
  private async backfillSystemCodes(): Promise<void> {
    const entityTableMap: Array<{ entityName: string; tableName: string }> = [
      { entityName: 'User', tableName: 'users' },
      { entityName: 'Course', tableName: 'courses' },
      { entityName: 'Cohort', tableName: 'cohorts' },
      { entityName: 'CourseModule', tableName: 'course_modules' },
      { entityName: 'Classroom', tableName: 'classrooms' },
      { entityName: 'Category', tableName: 'categories' },
      { entityName: 'Workshop', tableName: 'workshops' },
      { entityName: 'Enrollment', tableName: 'enrollments' },
      { entityName: 'Payment', tableName: 'payments' },
      { entityName: 'Subscription', tableName: 'subscriptions' },
      { entityName: 'Evaluation', tableName: 'evaluations' },
      { entityName: 'Question', tableName: 'questions' },
      { entityName: 'Certificate', tableName: 'certificates' },
      { entityName: 'Discussion', tableName: 'discussions' },
      { entityName: 'Post', tableName: 'posts' },
      { entityName: 'Conversation', tableName: 'conversations' },
      { entityName: 'Message', tableName: 'messages' },
      { entityName: 'Notification', tableName: 'notifications' },
      { entityName: 'Review', tableName: 'reviews' },
      { entityName: 'InstructorProfile', tableName: 'instructor_profiles' },
      { entityName: 'ContactMessage', tableName: 'contact_messages' },
      { entityName: 'Material', tableName: 'materials' },
      { entityName: 'Referral', tableName: 'referrals' },
    ];

    let totalBackfilled = 0;

    for (const { entityName, tableName } of entityTableMap) {
      try {
        const tableExists = await this.checkTableExists(tableName);
        if (!tableExists) continue;

        // Check if systemCode column exists
        const columnExists = await this.dataSource.query(
          `SELECT EXISTS (
            SELECT FROM information_schema.columns
            WHERE table_schema = 'public'
            AND table_name = $1
            AND column_name = 'systemCode'
          )`,
          [tableName],
        );
        if (!columnExists[0]?.exists) continue;

        const rows = await this.dataSource.query(
          `SELECT id FROM "${tableName}" WHERE "systemCode" IS NULL`,
        );

        if (rows.length === 0) continue;

        for (const row of rows) {
          const code = generateSystemCode(entityName);
          await this.dataSource.query(
            `UPDATE "${tableName}" SET "systemCode" = $1 WHERE id = $2`,
            [code, row.id],
          );
        }

        totalBackfilled += rows.length;
        this.logger.log(
          `Backfill: ${rows.length} registros de ${tableName} actualizados con systemCode`,
        );
      } catch (error) {
        this.logger.warn(
          `Backfill: Error procesando ${tableName}: ${error.message}`,
        );
      }
    }

    if (totalBackfilled > 0) {
      this.logger.log(`Backfill completado: ${totalBackfilled} registros actualizados`);
    }
  }
}
