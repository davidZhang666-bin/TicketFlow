import { readdir, readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { sql } from 'kysely';
import type { Kysely } from 'kysely';
import { Migrator } from 'kysely/migration';
import type { Migration } from 'kysely/migration';
import type { Database } from './database.js';

export async function migrate(db: Kysely<Database>, appPassword: string): Promise<void> {
  const migrator = new Migrator({
    db,
    provider: {
      async getMigrations() {
        const entries: Record<string, Migration> = {};
        for (const file of (await readdir(resolve('migrations')))
          .filter((name) => name.endsWith('.sql'))
          .sort()) {
          const content = await readFile(resolve('migrations', file), 'utf8');
          entries[file] = {
            up: async (connection) => {
              await sql.raw(content).execute(connection);
            },
          };
        }
        return entries;
      },
    },
  });
  const result = await migrator.migrateToLatest();
  if (result.error) throw result.error;
  await db.transaction().execute(async (tx) => {
    await sql`select pg_advisory_xact_lock(72173491)`.execute(tx);
    const role = await sql<{
      exists: boolean;
    }>`select exists(select 1 from pg_roles where rolname = 'ticketflow_app')`.execute(tx);
    if (!role.rows[0]?.exists)
      await sql
        .raw('create role ticketflow_app login nosuperuser nocreatedb nocreaterole')
        .execute(tx);
    const literal = "'" + appPassword.replaceAll("'", "''") + "'";
    await sql.raw('alter role ticketflow_app password ' + literal).execute(tx);
    await sql.raw('grant usage on schema public to ticketflow_app').execute(tx);
    const tables = [
      'users',
      'sessions',
      'events',
      'event_slots',
      'slot_inventory',
      'idempotency_records',
      'outbox_events',
    ];
    for (const table of tables) {
      await sql
        .raw('grant select, insert, update, delete on table ' + table + ' to ticketflow_app')
        .execute(tx);
    }
  });
}
