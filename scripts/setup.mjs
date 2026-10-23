import { randomBytes } from 'node:crypto';
import { existsSync, writeFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';

if (!existsSync('.env')) {
  const secret = () => randomBytes(24).toString('hex');
  const admin = secret();
  const app = secret();
  const redis = secret();
  writeFileSync('.env', [
    'POSTGRES_DB=ticketflow',
    'POSTGRES_USER=ticketflow_owner',
    'POSTGRES_PASSWORD=' + admin,
    'APP_DB_PASSWORD=' + app,
    'REDIS_PASSWORD=' + redis,
    'SESSION_SECRET=' + secret(),
    'DEMO_PASSWORD=Tf!' + secret().slice(0, 16),
    'ADMIN_DATABASE_URL=postgresql://ticketflow_owner:' + admin + '@localhost:5436/ticketflow',
    'DATABASE_URL=postgresql://ticketflow_app:' + app + '@localhost:5436/ticketflow',
    'REDIS_URL=redis://:' + redis + '@localhost:6386',
    'APP_ORIGIN=http://localhost:5176',
    'API_PORT=3200',
    'WORKER_PORT=3202',
    'COOKIE_SECURE=false',
    'NODE_ENV=development',
    '',
  ].join('\n'), { mode: 0o600, flag: 'wx' });
  console.info('Created .env with random local credentials. Existing environments are preserved.');
}
const check = spawnSync('docker', ['info', '--format', '{{.ServerVersion}}'], { stdio: 'pipe' });
if (check.status !== 0) {
  console.error('Docker engine is unavailable. Start Docker Desktop with WSL 2, then rerun pnpm setup.');
  process.exit(1);
}
const up = spawnSync('docker', ['compose', 'up', '-d', '--wait', 'postgres', 'redis'], { stdio: 'inherit' });
if (up.status !== 0) process.exit(up.status ?? 1);
console.info('PostgreSQL and Redis are healthy. Run pnpm db:migrate, pnpm db:seed, then pnpm dev.');
