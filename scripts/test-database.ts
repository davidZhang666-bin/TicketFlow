import 'dotenv/config';
import { randomBytes } from 'node:crypto';
import { spawn } from 'node:child_process';
import { sql } from 'kysely';
import { connectDatabase } from '../packages/data/src/database.js';
import { migrate } from '../packages/data/src/migrate.js';
import { seed } from '../packages/data/src/seed.js';

const mode = process.argv[2];
if (!['integration', 'e2e'].includes(mode ?? '')) throw new Error('Expected integration or e2e.');
if (
  !process.env.ADMIN_DATABASE_URL ||
  !process.env.DATABASE_URL ||
  !process.env.APP_DB_PASSWORD ||
  !process.env.REDIS_URL
) {
  throw new Error('Real PostgreSQL and Redis are required. Run pnpm setup first.');
}
const admin = connectDatabase(process.env.ADMIN_DATABASE_URL, 1);
const databaseName = 'tf_test_' + randomBytes(8).toString('hex');
const adminUrl = new URL(process.env.ADMIN_DATABASE_URL);
const appUrl = new URL(process.env.DATABASE_URL);
adminUrl.pathname = '/' + databaseName;
appUrl.pathname = '/' + databaseName;
const password = 'test-only-password-2026';
let created = false;
let exitCode: number;
try {
  await sql.raw('create database "' + databaseName + '"').execute(admin);
  created = true;
  const isolated = connectDatabase(adminUrl.toString(), 1);
  try {
    await migrate(isolated, process.env.APP_DB_PASSWORD);
    await migrate(isolated, process.env.APP_DB_PASSWORD);
    await seed(isolated, password);
  } finally {
    await isolated.destroy();
  }
  const args =
    mode === 'integration'
      ? ['exec', 'vitest', 'run', '--project', 'integration']
      : ['exec', 'playwright', 'test'];
  const pnpmEntry = process.env.npm_execpath;
  if (!pnpmEntry)
    throw new Error('Run this script through pnpm test:integration or pnpm test:e2e.');
  const child = spawn(process.execPath, [pnpmEntry, ...args], {
    stdio: 'inherit',
    env: {
      ...process.env,
      DATABASE_URL: appUrl.toString(),
      ADMIN_DATABASE_URL: adminUrl.toString(),
      DEMO_PASSWORD: password,
      SESSION_SECRET: 'test-session-secret-32-characters-minimum',
      APP_ORIGIN: 'http://127.0.0.1:5176',
      API_PORT: '3200',
      COOKIE_SECURE: 'false',
      NODE_ENV: 'test',
    },
  });
  exitCode = await new Promise<number>((resolve, reject) => {
    child.on('exit', (code) => resolve(code ?? 1));
    child.on('error', reject);
  });
} finally {
  if (created) await sql.raw('drop database "' + databaseName + '" with (force)').execute(admin);
  await admin.destroy();
}
process.exitCode = exitCode;
