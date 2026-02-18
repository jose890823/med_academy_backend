import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { AppModule } from '../../src/app.module';
import { DataSource } from 'typeorm';

let app: INestApplication;
let dataSource: DataSource;

/**
 * Creates and initializes the NestJS test application.
 * Reuses the same app instance within a test file.
 */
export async function createTestApp(): Promise<INestApplication> {
  if (app) return app;

  const moduleFixture: TestingModule = await Test.createTestingModule({
    imports: [AppModule],
  }).compile();

  app = moduleFixture.createNestApplication();

  // Match main.ts configuration
  app.setGlobalPrefix('api');
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  await app.init();

  dataSource = moduleFixture.get<DataSource>(DataSource);

  return app;
}

/**
 * Returns the DataSource for direct DB operations.
 */
export function getDataSource(): DataSource {
  return dataSource;
}

/**
 * Closes the test application and database connection.
 */
export async function closeTestApp(): Promise<void> {
  if (app) {
    await app.close();
    app = null;
    dataSource = null;
  }
}
