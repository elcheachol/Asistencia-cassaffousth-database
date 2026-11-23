import { defineConfig } from 'drizzle-kit';
import * as dotenv from 'dotenv';

dotenv.config();

const databaseUrl = process.env.DATABASE_URL?.trim();
const isLocalDatabaseUrl = Boolean(databaseUrl && /localhost|127\.0\.0\.1/i.test(databaseUrl));
const useSsl =
  process.env.DB_SSL === 'true' ||
  (Boolean(databaseUrl) && process.env.DB_SSL !== 'false' && !isLocalDatabaseUrl);

const getDbCredentials = () => {
  if (databaseUrl) {
    return {
      url: databaseUrl,
      ssl: useSsl ? ({ rejectUnauthorized: false } as const) : false,
    };
  }

  const sqlHost = process.env.SQL_HOST;
  const sqlDbName = process.env.SQL_DB_NAME;
  const user = process.env.SQL_ADMIN_USER || process.env.SQL_USER;
  const password = process.env.SQL_ADMIN_PASSWORD || process.env.SQL_PASSWORD;

  if (!sqlHost) {
    throw new Error('DATABASE_URL or SQL_HOST must be set in environment variables.');
  }
  if (!sqlDbName) {
    throw new Error('DATABASE_URL or SQL_DB_NAME must be set in environment variables.');
  }
  if (!user) {
    throw new Error('DATABASE_URL or SQL_ADMIN_USER must be set in environment variables.');
  }
  if (!password) {
    throw new Error('DATABASE_URL or SQL_ADMIN_PASSWORD must be set in environment variables.');
  }

  return {
    host: sqlHost,
    user,
    password,
    database: sqlDbName,
    ssl: useSsl ? ({ rejectUnauthorized: false } as const) : false,
  };
};

export default defineConfig({
  schema: './src/db/schema.ts',
  out: './drizzle',
  dialect: 'postgresql',
  schemaFilter: ['public'],
  dbCredentials: getDbCredentials(),
  verbose: true,
});
