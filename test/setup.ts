import * as path from 'path';
import * as dotenv from 'dotenv';

// Load .env.test before any test runs
dotenv.config({ path: path.resolve(__dirname, '..', '.env.test') });
