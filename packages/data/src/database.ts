import { Kysely, PostgresDialect, sql } from 'kysely';
import type { ColumnType, Generated } from 'kysely';
import pg from 'pg';
import { Redis } from 'ioredis';
import type { EventCategory, EventStatus } from '../../contracts/src/index.js';

export interface Database {
  users: {
    id: string;
    email: string;
    name: string;
    role: 'USER' | 'ORGANIZER';
    password_hash: string;
    created_at: Generated<Date>;
  };
  sessions: { token_hash: string; user_id: string; expires_at: Date; created_at: Generated<Date> };
  events: {
    id: string;
    owner_id: string;
    title: string;
    description: string;
    location: string;
    category: EventCategory;
    status: EventStatus;
    revision: Generated<number>;
    sales_opens_at: Date;
    sales_closes_at: Date;
    created_at: Generated<Date>;
    updated_at: Generated<Date>;
  };
  event_slots: {
    id: string;
    event_id: string;
    label: string;
    starts_at: Date;
    ends_at: Date;
    price_cents: number;
  };
  slot_inventory: {
    slot_id: string;
    capacity: number;
    available: number;
    held: Generated<number>;
    confirmed: Generated<number>;
    revision: Generated<number>;
  };
  idempotency_records: {
    user_id: string;
    scope: string;
    key: string;
    request_hash: string;
    response_json: ColumnType<unknown, string | null, string | null>;
    status_code: number | null;
    created_at: Generated<Date>;
  };
  outbox_events: {
    id: Generated<string>;
    aggregate_id: string;
    event_type: string;
    payload: ColumnType<unknown, string, string>;
    state: Generated<string>;
    attempts: Generated<number>;
    available_at: Generated<Date>;
    created_at: Generated<Date>;
  };
}

export function connectDatabase(url: string, max = 10): Kysely<Database> {
  return new Kysely<Database>({
    dialect: new PostgresDialect({
      pool: new pg.Pool({
        connectionString: url,
        max,
        connectionTimeoutMillis: 3000,
        statement_timeout: 5000,
        idle_in_transaction_session_timeout: 10_000,
      }),
    }),
  });
}

export function connectRedis(url: string): Redis {
  const redis = new Redis(url, {
    lazyConnect: true,
    connectTimeout: 3000,
    commandTimeout: 3000,
    maxRetriesPerRequest: 1,
    retryStrategy: () => null,
  });
  // Readiness reports failures without logging connection URLs or credentials.
  redis.on('error', () => undefined);
  return redis;
}

export async function readiness(db: Kysely<Database>, redis: Redis) {
  const checks = await Promise.allSettled([sql`select 1`.execute(db), redis.ping()]);
  return {
    status: checks.every((check) => check.status === 'fulfilled') ? 'ready' : 'unavailable',
    postgres: checks[0]?.status === 'fulfilled',
    redis: checks[1]?.status === 'fulfilled',
  };
}
