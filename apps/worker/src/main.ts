import 'dotenv/config';
import { createServer } from 'node:http';
import { connectDatabase, connectRedis, readiness } from '../../../packages/data/src/database.js';
const databaseUrl = process.env.DATABASE_URL;
const redisUrl = process.env.REDIS_URL;
if (!databaseUrl || !redisUrl) throw new Error('DATABASE_URL and REDIS_URL are required.');
const db = connectDatabase(databaseUrl, 2);
const redis = connectRedis(redisUrl);
const port = Number(process.env.WORKER_PORT ?? 3202);
if (!Number.isSafeInteger(port) || port < 1 || port > 65535)
  throw new Error('Invalid WORKER_PORT.');
let stopping = false;
const server = createServer((request, response) => {
  void (async () => {
    response.setHeader('Content-Type', 'application/json');
    if (request.url === '/health/live') {
      response.end(JSON.stringify({ status: 'alive' }));
      return;
    }
    if (request.url === '/health/ready') {
      const health = await readiness(db, redis);
      response.statusCode = !stopping && health.status === 'ready' ? 200 : 503;
      response.end(JSON.stringify(health));
      return;
    }
    response.statusCode = 404;
    response.end(JSON.stringify({ code: 'NOT_FOUND' }));
  })().catch(() => {
    response.statusCode = 503;
    response.end(JSON.stringify({ status: 'unavailable' }));
  });
});
server.listen(port, '0.0.0.0', () =>
  console.info(JSON.stringify({ event: 'worker_started', port, milestone: 'foundation' })),
);
async function shutdown() {
  if (stopping) return;
  stopping = true;
  server.close();
  server.closeAllConnections();
  redis.disconnect();
  await db.destroy();
}
process.on('SIGINT', () => {
  void shutdown();
});
process.on('SIGTERM', () => {
  void shutdown();
});
