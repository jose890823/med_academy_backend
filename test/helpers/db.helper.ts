import { DataSource } from 'typeorm';
import * as bcrypt from 'bcrypt';

/**
 * Tables to truncate in correct order (respecting FK constraints).
 * Listed from most-dependent to least-dependent.
 */
const TABLES_TO_TRUNCATE = [
  'answers',
  'evaluation_attempts',
  'module_progress',
  'enrollment_progress',
  'achievements',
  'certificates',
  'questions',
  'evaluations',
  'enrollments',
  'classrooms',
  'cohorts',
  'course_modules',
  'courses',
  'categories',
  'active_sessions',
  'login_attempts',
  'notifications',
  'messages',
  'conversations',
  'posts',
  'discussions',
  'reviews',
  'materials',
  'referrals',
  'referral_codes',
  'workshop_registrations',
  'workshop_sessions',
  'workshops',
  'payments',
  'subscriptions',
  'instructor_profiles',
  'contact_messages',
  'user_activities',
  'users',
];

/**
 * Truncates all relevant tables in the test database,
 * then re-seeds the super admin user.
 */
export async function cleanDatabase(dataSource: DataSource): Promise<void> {
  const queryRunner = dataSource.createQueryRunner();
  await queryRunner.connect();

  try {
    // Disable FK checks temporarily for faster truncation
    await queryRunner.query('SET session_replication_role = replica');

    for (const table of TABLES_TO_TRUNCATE) {
      try {
        await queryRunner.query(
          `TRUNCATE TABLE "${table}" CASCADE`,
        );
      } catch {
        // Table might not exist yet, skip silently
      }
    }

    // Re-enable FK checks
    await queryRunner.query('SET session_replication_role = DEFAULT');

    // Re-seed the super admin (SeederService only runs on app boot)
    await seedSuperAdmin(queryRunner);
  } finally {
    await queryRunner.release();
  }
}

/**
 * Inserts the super admin user directly into the database.
 * Mirrors what SeederService.createSuperAdmin() does.
 */
async function seedSuperAdmin(queryRunner: any): Promise<void> {
  const email = process.env.SUPER_ADMIN_EMAIL || 'admin@ultrasoundmedacademy.com';
  const password = process.env.SUPER_ADMIN_PASSWORD || 'Admin123!';
  const firstName = process.env.SUPER_ADMIN_FIRST_NAME || 'Super';
  const lastName = process.env.SUPER_ADMIN_LAST_NAME || 'Admin';
  const phone = process.env.SUPER_ADMIN_PHONE || '+19542474395';

  // Use 10 rounds to match SeederService (it hardcodes 10)
  const hashedPassword = await bcrypt.hash(password, 10);

  await queryRunner.query(
    `INSERT INTO users (
      "email", "password", "firstName", "lastName", "phone",
      "roles", "emailVerified", "isActive", "isSystemUser"
    ) VALUES ($1, $2, $3, $4, $5, $6, true, true, true)
    ON CONFLICT ("email") DO NOTHING`,
    [email, hashedPassword, firstName, lastName, phone, 'super_admin,admin'],
  );
}
