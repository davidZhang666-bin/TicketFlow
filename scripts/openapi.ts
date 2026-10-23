import { mkdir, writeFile } from 'node:fs/promises';
import openapiTS, { astToString } from 'openapi-typescript';
import { format, resolveConfig } from 'prettier';
import { createApp } from '../apps/api/src/app.js';
const { app, document } = await createApp(
  {
    DATABASE_URL: 'postgresql://unused:unused@localhost:5436/unused',
    REDIS_URL: 'redis://localhost:6386',
    SESSION_SECRET: 'unused-documentation-secret-at-least-32-characters',
    APP_ORIGIN: 'http://localhost:5176',
    API_PORT: 3200,
    COOKIE_SECURE: false,
  },
  true,
);
try {
  await mkdir('docs', { recursive: true });
  await writeFile(
    'docs/openapi.json',
    await format(JSON.stringify(document), {
      ...(await resolveConfig('docs/openapi.json')),
      parser: 'json',
    }),
  );
  const ast = await openapiTS(
    JSON.parse(JSON.stringify(document)) as Parameters<typeof openapiTS>[0],
  );
  await writeFile('packages/contracts/src/api.generated.ts', astToString(ast));
  console.info('OpenAPI document and frontend path types generated from controllers.');
} finally {
  await app.close();
}
