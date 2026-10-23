import 'dotenv/config';
import { connectDatabase } from '../packages/data/src/database.js';
import { migrate } from '../packages/data/src/migrate.js';
const url = process.env.ADMIN_DATABASE_URL;
const password = process.env.APP_DB_PASSWORD;
if (!url || !password)
  throw new Error('ADMIN_DATABASE_URL and APP_DB_PASSWORD are required; run pnpm setup.');
const db = connectDatabase(url, 1);
try {
  await migrate(db, password);
  console.info(
    'Migrations applied; application role granted table access without schema ownership.',
  );
} finally {
  await db.destroy();
}
