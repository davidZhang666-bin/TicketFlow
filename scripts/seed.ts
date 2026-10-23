import 'dotenv/config';
import { connectDatabase } from '../packages/data/src/database.js';
import { seed } from '../packages/data/src/seed.js';
if (process.env.NODE_ENV === 'production') throw new Error('Demo seed is disabled in production.');
if (!process.env.DATABASE_URL || !process.env.DEMO_PASSWORD)
  throw new Error('Run pnpm setup before seeding.');
const db = connectDatabase(process.env.DATABASE_URL, 1);
try {
  await seed(db, process.env.DEMO_PASSWORD);
  console.info(
    'Demo accounts and events ready. Password is DEMO_PASSWORD in .env; existing accounts are preserved.',
  );
} finally {
  await db.destroy();
}
