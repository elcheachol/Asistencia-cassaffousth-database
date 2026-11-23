import fs from 'fs';
import path from 'path';
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from './schema.ts';

declare global {
  var _postgresPool: Pool | undefined;
}

function resolveSqlHost(rawHost: string | undefined): string | undefined {
  if (!rawHost || !rawHost.startsWith('/app/cloudsql/')) {
    return rawHost;
  }
  const socketFile = path.join(rawHost, '.s.PGSQL.5432');
  if (fs.existsSync(socketFile)) {
    return rawHost;
  }
  const instanceSuffix = rawHost.split(':').pop();
  try {
    const entries = fs.readdirSync('/app/cloudsql');
    const match = entries.find((entry) => {
      const candidate = path.join('/app/cloudsql', entry, '.s.PGSQL.5432');
      return (!instanceSuffix || entry.endsWith(`:${instanceSuffix}`)) && fs.existsSync(candidate);
    });
    if (match) {
      return path.join('/app/cloudsql', match);
    }
  } catch {
    // Ignore if /app/cloudsql is unavailable
  }
  return rawHost;
}

export const createPool = () => {
  if (!global._postgresPool) {
    const databaseUrl = process.env.DATABASE_URL?.trim();
    const resolvedHost = resolveSqlHost(process.env.SQL_HOST);
    const isLocalHost =
      (databaseUrl && /localhost|127\.0\.0\.1/i.test(databaseUrl)) ||
      (resolvedHost && /localhost|127\.0\.0\.1|\/app\/cloudsql\//i.test(resolvedHost));

    const useSsl =
      process.env.DB_SSL === 'true' ||
      (Boolean(databaseUrl) && process.env.DB_SSL !== 'false' && !isLocalHost);

    const sslConfig = useSsl ? { rejectUnauthorized: false } : undefined;

    global._postgresPool = databaseUrl
      ? new Pool({
          connectionString: databaseUrl,
          ssl: sslConfig,
          max: 10,
          connectionTimeoutMillis: 15000,
        })
      : new Pool({
          host: resolvedHost,
          user: process.env.SQL_USER,
          password: process.env.SQL_PASSWORD,
          database: process.env.SQL_DB_NAME,
          ssl: sslConfig,
          max: 10,
          connectionTimeoutMillis: 15000,
        });

    global._postgresPool.on('error', (err) => {
      console.error('Unexpected error on idle SQL pool client:', err);
    });
  }
  return global._postgresPool;
};

const pool = createPool();

export const db = drizzle(pool, { schema });
