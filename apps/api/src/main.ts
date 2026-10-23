import 'dotenv/config';
import { createApp } from './app.js';
import { loadConfig } from './config.js';
import { Resources } from './resources.js';
const config = loadConfig();
const { app } = await createApp(config);
app.enableShutdownHooks();
const health = await app.get(Resources).ready();
if (health.status !== 'ready') {
  await app.close();
  console.error('PostgreSQL or Redis is unavailable. Run pnpm setup and pnpm db:migrate.');
  process.exit(1);
}
await app.listen(config.API_PORT, '0.0.0.0');
