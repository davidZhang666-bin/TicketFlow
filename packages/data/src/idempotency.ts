import { createHash } from 'node:crypto';
import type { Kysely, Transaction } from 'kysely';
import type { Database } from './database.js';
import { DomainError } from '../../domain/src/events.js';

function sorted(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sorted);
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, item]) => [key, sorted(item)]),
    );
  }
  return value;
}
export function fingerprint(value: unknown): string {
  return createHash('sha256')
    .update(JSON.stringify(sorted(value)))
    .digest('hex');
}
export async function idempotent<T>(
  db: Kysely<Database>,
  command: { userId: string; scope: string; key: string; input: unknown; status: number },
  execute: (tx: Transaction<Database>) => Promise<T>,
): Promise<{ body: T; status: number; replayed: boolean }> {
  const hash = fingerprint(command.input);
  return db.transaction().execute(async (tx) => {
    await tx
      .insertInto('idempotency_records')
      .values({
        user_id: command.userId,
        scope: command.scope,
        key: command.key,
        request_hash: hash,
        response_json: null,
        status_code: null,
      })
      .onConflict((conflict) => conflict.columns(['user_id', 'scope', 'key']).doNothing())
      .execute();
    const record = await tx
      .selectFrom('idempotency_records')
      .selectAll()
      .where('user_id', '=', command.userId)
      .where('scope', '=', command.scope)
      .where('key', '=', command.key)
      .forUpdate()
      .executeTakeFirstOrThrow();
    if (record.request_hash !== hash) {
      throw new DomainError('IDEMPOTENCY_CONFLICT', '该请求标识已用于不同内容，请重新发起操作。');
    }
    if (record.status_code !== null)
      return { body: record.response_json as T, status: record.status_code, replayed: true };
    const body = await execute(tx);
    await tx
      .updateTable('idempotency_records')
      .set({ response_json: JSON.stringify(body), status_code: command.status })
      .where('user_id', '=', command.userId)
      .where('scope', '=', command.scope)
      .where('key', '=', command.key)
      .execute();
    return { body, status: command.status, replayed: false };
  });
}
