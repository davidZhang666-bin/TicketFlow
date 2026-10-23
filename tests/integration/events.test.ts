import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { INestApplication } from '@nestjs/common';
import { sql } from 'kysely';
import { createApp } from '../../apps/api/src/app.js';
import { loadConfig } from '../../apps/api/src/config.js';
import { Resources } from '../../apps/api/src/resources.js';
import { seed } from '../../packages/data/src/seed.js';
import type { EventView, SessionView } from '../../packages/contracts/src/index.js';

let app: INestApplication;
let base: string;
let resources: Resources;
interface Login {
  cookie: string;
  csrf: string;
}
let organizer: Login;
let user: Login;
let other: Login;
const input = () => ({
  title: '集成验证活动',
  description: '使用真实 PostgreSQL 和 Redis 验证。',
  location: '上海测试空间',
  category: 'LECTURE',
  salesOpensAt: new Date(Date.now() - 3600_000).toISOString(),
  salesClosesAt: new Date(Date.now() + 86400_000).toISOString(),
  slots: [
    {
      label: '上午场',
      startsAt: new Date(Date.now() + 2 * 86400_000).toISOString(),
      endsAt: new Date(Date.now() + 2 * 86400_000 + 3600_000).toISOString(),
      capacity: 100,
      priceCents: 4900,
    },
    {
      label: '下午场',
      startsAt: new Date(Date.now() + 3 * 86400_000).toISOString(),
      endsAt: new Date(Date.now() + 3 * 86400_000 + 3600_000).toISOString(),
      capacity: 50,
      priceCents: 0,
    },
  ],
});
async function call(
  path: string,
  options: { method?: string; body?: unknown; session?: Login; key?: string } = {},
) {
  return fetch(base + '/api/v1' + path, {
    method: options.method ?? 'GET',
    headers: {
      ...(options.body !== undefined ? { 'Content-Type': 'application/json' } : {}),
      ...(options.session
        ? { Cookie: options.session.cookie, 'X-CSRF-Token': options.session.csrf }
        : {}),
      ...(options.key ? { 'Idempotency-Key': options.key } : {}),
    },
    ...(options.body !== undefined ? { body: JSON.stringify(options.body) } : {}),
  });
}
async function login(email: string): Promise<Login> {
  const response = await call('/auth/login', {
    method: 'POST',
    body: { email, password: process.env.DEMO_PASSWORD },
  });
  expect(response.status).toBe(200);
  expect(response.headers.get('set-cookie')).toContain('HttpOnly');
  expect(response.headers.get('set-cookie')).toContain('SameSite=Lax');
  const session = (await response.json()) as SessionView;
  return { cookie: response.headers.get('set-cookie')!.split(';')[0]!, csrf: session.csrfToken };
}
beforeAll(async () => {
  ({ app } = await createApp(loadConfig(), true));
  await app.listen(0, '127.0.0.1');
  base = await app.getUrl();
  resources = app.get(Resources);
  organizer = await login('organizer@ticketflow.demo');
  user = await login('user@ticketflow.demo');
  other = await login('other@ticketflow.demo');
});
afterAll(async () => {
  await app?.close();
});

describe('real infrastructure and authentication', () => {
  it('reports PostgreSQL and Redis health and denies DDL to the application role', async () => {
    const response = await call('/health/ready');
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ postgres: true, redis: true });
    await expect(
      sql.raw('create table forbidden_probe (id int)').execute(resources.db),
    ).rejects.toThrow();
  });
  it('returns a session, rejects missing sessions, rejects invalid credentials without account disclosure', async () => {
    expect((await call('/auth/me')).status).toBe(401);
    expect((await call('/auth/me', { session: user })).status).toBe(200);
    const first = await call('/auth/login', {
      method: 'POST',
      body: { email: 'missing@ticketflow.demo', password: 'incorrect' },
    });
    const second = await call('/auth/login', {
      method: 'POST',
      body: { email: 'user@ticketflow.demo', password: 'incorrect' },
    });
    expect(first.status).toBe(401);
    expect(second.status).toBe(401);
    expect(((await first.json()) as { message: string }).message).toBe(
      ((await second.json()) as { message: string }).message,
    );
  });
  it('preserves seed accounts and does not duplicate events when seeded again', async () => {
    const before = await resources.db
      .selectFrom('events')
      .select(sql<number>`count(*)::int`.as('count'))
      .executeTakeFirstOrThrow();
    await seed(resources.db, 'different-demo-password');
    const after = await resources.db
      .selectFrom('events')
      .select(sql<number>`count(*)::int`.as('count'))
      .executeTakeFirstOrThrow();
    expect(after.count).toBe(before.count);
    expect(
      (
        await call('/auth/login', {
          method: 'POST',
          body: { email: 'user@ticketflow.demo', password: process.env.DEMO_PASSWORD },
        })
      ).status,
    ).toBe(200);
  });
  it('requires organizer, CSRF and a matching origin for mutations', async () => {
    expect(
      (
        await call('/organizer/events', {
          method: 'POST',
          body: input(),
          session: user,
          key: randomUUID(),
        })
      ).status,
    ).toBe(403);
    expect(
      (
        await call('/organizer/events', {
          method: 'POST',
          body: input(),
          session: { ...organizer, csrf: '' },
          key: randomUUID(),
        })
      ).status,
    ).toBe(403);
    const response = await fetch(base + '/api/v1/organizer/events', {
      method: 'POST',
      headers: {
        Cookie: organizer.cookie,
        Origin: 'https://other.example',
        'Content-Type': 'application/json',
        'X-CSRF-Token': organizer.csrf,
        'Idempotency-Key': randomUUID(),
      },
      body: JSON.stringify(input()),
    });
    expect(response.status).toBe(403);
  });
  it('invalidates a session on logout', async () => {
    const temporary = await login('user@ticketflow.demo');
    expect((await call('/auth/logout', { method: 'POST', session: temporary })).status).toBe(204);
    expect((await call('/auth/me', { session: temporary })).status).toBe(401);
  });
});
describe('activity commands and transaction boundaries', () => {
  it('rejects malformed and oversized JSON before executing a command', async () => {
    for (const [payload, status] of [
      ['{broken', 400],
      [JSON.stringify({ text: 'x'.repeat(40_000) }), 413],
    ] as const) {
      const response = await fetch(base + '/api/v1/organizer/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: payload,
      });
      expect(response.status).toBe(status);
      expect(await response.json()).toMatchObject({ code: 'INVALID_REQUEST_BODY' });
    }
  });
  it('replays concurrent duplicate creates and rejects different input with the same key', async () => {
    const key = randomUUID();
    const body = input();
    const responses = await Promise.all(
      Array.from({ length: 8 }, () =>
        call('/organizer/events', { method: 'POST', session: organizer, key, body }),
      ),
    );
    expect(responses.map((response) => response.status)).toEqual(Array(8).fill(201));
    const results = await Promise.all(
      responses.map((response) => response.json() as Promise<EventView>),
    );
    expect(new Set(results.map((result) => result.id)).size).toBe(1);
    expect(
      responses.filter((response) => response.headers.get('idempotency-replayed') === 'false'),
    ).toHaveLength(1);
    expect(
      (
        await call('/organizer/events', {
          method: 'POST',
          session: organizer,
          key,
          body: { ...body, title: '不同输入' },
        })
      ).status,
    ).toBe(409);
  });
  it('hides drafts publicly and isolates organizer ownership', async () => {
    const response = await call('/organizer/events', {
      method: 'POST',
      session: organizer,
      key: randomUUID(),
      body: input(),
    });
    const event = (await response.json()) as EventView;
    expect((await call('/events/' + event.id)).status).toBe(404);
    expect((await call('/organizer/events/' + event.id, { session: other })).status).toBe(404);
    expect(
      (
        await call('/organizer/events/' + event.id, {
          method: 'PUT',
          session: other,
          key: randomUUID(),
          body: { ...input(), expectedRevision: 1 },
        })
      ).status,
    ).toBe(404);
  });
  it('serializes concurrent edits, preserves inventory and publishes with one Outbox record', async () => {
    const body = input();
    const event = (await (
      await call('/organizer/events', {
        method: 'POST',
        session: organizer,
        key: randomUUID(),
        body,
      })
    ).json()) as EventView;
    const edits = await Promise.all(
      ['first', 'second'].map((suffix) =>
        call('/organizer/events/' + event.id, {
          method: 'PUT',
          session: organizer,
          key: randomUUID(),
          body: { ...body, title: '修改 ' + suffix, expectedRevision: 1 },
        }),
      ),
    );
    expect(edits.map((response) => response.status).sort()).toEqual([200, 409]);
    const updated = (await (
      await call('/organizer/events/' + event.id, { session: organizer })
    ).json()) as EventView;
    expect(updated.revision).toBe(2);
    for (const slot of updated.slots)
      expect(slot.capacity).toBe(slot.available + slot.held + slot.confirmed);
    const key = randomUUID();
    const published = await call('/organizer/events/' + event.id + '/publish', {
      method: 'POST',
      session: organizer,
      key,
      body: { expectedRevision: 2 },
    });
    expect(published.status).toBe(200);
    expect(((await published.json()) as EventView).status).toBe('PUBLISHED');
    expect((await call('/events/' + event.id)).status).toBe(200);
    expect(
      (
        await call('/organizer/events/' + event.id + '/publish', {
          method: 'POST',
          session: organizer,
          key,
          body: { expectedRevision: 2 },
        })
      ).headers.get('idempotency-replayed'),
    ).toBe('true');
    const records = await resources.db
      .selectFrom('outbox_events')
      .selectAll()
      .where('aggregate_id', '=', event.id)
      .execute();
    expect(records).toHaveLength(1);
    expect(records[0]?.state).toBe('PENDING');
    expect(
      (
        await call('/organizer/events/' + event.id, {
          method: 'PUT',
          session: organizer,
          key: randomUUID(),
          body: { ...body, expectedRevision: 3 },
        })
      ).status,
    ).toBe(409);
  });
  it('rejects invalid schedules and fractional money without partial writes', async () => {
    const before = await resources.db
      .selectFrom('events')
      .select(sql<number>`count(*)::int`.as('count'))
      .executeTakeFirstOrThrow();
    const body = input();
    expect(
      (
        await call('/organizer/events', {
          method: 'POST',
          session: organizer,
          key: randomUUID(),
          body: { ...body, salesClosesAt: body.salesOpensAt },
        })
      ).status,
    ).toBe(400);
    expect(
      (
        await call('/organizer/events', {
          method: 'POST',
          session: organizer,
          key: randomUUID(),
          body: { ...body, slots: [{ ...body.slots[0], priceCents: 4.9 }] },
        })
      ).status,
    ).toBe(400);
    const after = await resources.db
      .selectFrom('events')
      .select(sql<number>`count(*)::int`.as('count'))
      .executeTakeFirstOrThrow();
    expect(after.count).toBe(before.count);
  });
  it('enforces inventory conservation at the database boundary', async () => {
    const slot = await resources.db
      .selectFrom('slot_inventory')
      .select('slot_id')
      .executeTakeFirstOrThrow();
    await expect(
      resources.db
        .updateTable('slot_inventory')
        .set({ available: -1 })
        .where('slot_id', '=', slot.slot_id)
        .execute(),
    ).rejects.toThrow();
    await expect(
      resources.db
        .updateTable('slot_inventory')
        .set({ held: 1 })
        .where('slot_id', '=', slot.slot_id)
        .execute(),
    ).rejects.toThrow();
  });
});
