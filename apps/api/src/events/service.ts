import { randomUUID } from 'node:crypto';
import { Inject, Injectable } from '@nestjs/common';
import { sql } from 'kysely';
import type { Kysely, Transaction, Selectable } from 'kysely';
import type { Database } from '../../../../packages/data/src/database.js';
import { idempotent } from '../../../../packages/data/src/idempotency.js';
import type { EventInput, EventView } from '../../../../packages/contracts/src/index.js';
import {
  DomainError,
  assertDraft,
  validateEventSchedule,
} from '../../../../packages/domain/src/events.js';
import { Resources } from '../resources.js';

type Connection = Kysely<Database> | Transaction<Database>;
async function view(db: Connection, event: Selectable<Database['events']>): Promise<EventView> {
  const slots = await db
    .selectFrom('event_slots')
    .innerJoin('slot_inventory', 'slot_inventory.slot_id', 'event_slots.id')
    .select([
      'event_slots.id',
      'label',
      'starts_at',
      'ends_at',
      'price_cents',
      'capacity',
      'available',
      'held',
      'confirmed',
    ])
    .where('event_id', '=', event.id)
    .orderBy('starts_at')
    .orderBy('event_slots.id')
    .execute();
  return {
    id: event.id,
    title: event.title,
    description: event.description,
    location: event.location,
    category: event.category,
    status: event.status,
    revision: event.revision,
    salesOpensAt: event.sales_opens_at.toISOString(),
    salesClosesAt: event.sales_closes_at.toISOString(),
    slots: slots.map((slot) => ({
      id: slot.id,
      label: slot.label,
      startsAt: slot.starts_at.toISOString(),
      endsAt: slot.ends_at.toISOString(),
      priceCents: slot.price_cents,
      capacity: slot.capacity,
      available: slot.available,
      held: slot.held,
      confirmed: slot.confirmed,
    })),
  };
}
async function writeSlots(tx: Transaction<Database>, id: string, input: EventInput) {
  for (const slot of input.slots) {
    const slotId = randomUUID();
    await tx
      .insertInto('event_slots')
      .values({
        id: slotId,
        event_id: id,
        label: slot.label,
        starts_at: new Date(slot.startsAt),
        ends_at: new Date(slot.endsAt),
        price_cents: slot.priceCents,
      })
      .execute();
    await tx
      .insertInto('slot_inventory')
      .values({ slot_id: slotId, capacity: slot.capacity, available: slot.capacity })
      .execute();
  }
}
function attributes(input: EventInput) {
  return {
    title: input.title,
    description: input.description,
    location: input.location,
    category: input.category,
    sales_opens_at: new Date(input.salesOpensAt),
    sales_closes_at: new Date(input.salesClosesAt),
  };
}
@Injectable()
export class Events {
  constructor(@Inject(Resources) private readonly resources: Resources) {}
  async list(ownerId?: string) {
    let query = this.resources.db.selectFrom('events').selectAll();
    query = ownerId
      ? query.where('owner_id', '=', ownerId)
      : query.where('status', '=', 'PUBLISHED');
    const events = await query.orderBy('created_at', 'desc').orderBy('id').limit(100).execute();
    return { items: await Promise.all(events.map((event) => view(this.resources.db, event))) };
  }
  async get(id: string, ownerId?: string) {
    let query = this.resources.db.selectFrom('events').selectAll().where('id', '=', id);
    query = ownerId
      ? query.where('owner_id', '=', ownerId)
      : query.where('status', '=', 'PUBLISHED');
    const event = await query.executeTakeFirst();
    if (!event) throw new DomainError('EVENT_NOT_FOUND', '活动不存在或无权访问。', 404);
    return view(this.resources.db, event);
  }
  async create(ownerId: string, key: string, input: EventInput) {
    validateEventSchedule(input);
    return idempotent(
      this.resources.db,
      { userId: ownerId, scope: 'event:create', key, input, status: 201 },
      async (tx) => {
        const id = randomUUID();
        const event = await tx
          .insertInto('events')
          .values({ id, owner_id: ownerId, status: 'DRAFT', ...attributes(input) })
          .returningAll()
          .executeTakeFirstOrThrow();
        await writeSlots(tx, id, input);
        return view(tx, event);
      },
    );
  }
  async update(
    ownerId: string,
    id: string,
    key: string,
    input: EventInput & { expectedRevision: number },
  ) {
    validateEventSchedule(input);
    return idempotent(
      this.resources.db,
      { userId: ownerId, scope: 'event:update:' + id, key, input, status: 200 },
      async (tx) => {
        const previous = await tx
          .selectFrom('events')
          .selectAll()
          .where('id', '=', id)
          .where('owner_id', '=', ownerId)
          .forUpdate()
          .executeTakeFirst();
        if (!previous) throw new DomainError('EVENT_NOT_FOUND', '活动不存在或无权访问。', 404);
        assertDraft(previous.status, previous.revision, input.expectedRevision);
        const event = await tx
          .updateTable('events')
          .set({
            ...attributes(input),
            revision: previous.revision + 1,
            updated_at: sql<Date>`clock_timestamp()`,
          })
          .where('id', '=', id)
          .returningAll()
          .executeTakeFirstOrThrow();
        await tx.deleteFrom('event_slots').where('event_id', '=', id).execute();
        await writeSlots(tx, id, input);
        return view(tx, event);
      },
    );
  }
  async publish(ownerId: string, id: string, key: string, input: { expectedRevision: number }) {
    return idempotent(
      this.resources.db,
      { userId: ownerId, scope: 'event:publish:' + id, key, input, status: 200 },
      async (tx) => {
        const previous = await tx
          .selectFrom('events')
          .selectAll()
          .where('id', '=', id)
          .where('owner_id', '=', ownerId)
          .forUpdate()
          .executeTakeFirst();
        if (!previous) throw new DomainError('EVENT_NOT_FOUND', '活动不存在或无权访问。', 404);
        assertDraft(previous.status, previous.revision, input.expectedRevision);
        const existing = await view(tx, previous);
        if (!existing.slots.length) throw new DomainError('NO_SLOTS', '发布前至少需要一个场次。');
        const time = await sql<{ now: Date }>`select clock_timestamp() as now`.execute(tx);
        validateEventSchedule(existing, time.rows[0]?.now ?? new Date());
        const event = await tx
          .updateTable('events')
          .set({
            status: 'PUBLISHED',
            revision: previous.revision + 1,
            updated_at: sql<Date>`clock_timestamp()`,
          })
          .where('id', '=', id)
          .returningAll()
          .executeTakeFirstOrThrow();
        await tx
          .insertInto('outbox_events')
          .values({
            aggregate_id: id,
            event_type: 'event.published',
            payload: JSON.stringify({ eventId: id, revision: event.revision }),
          })
          .execute();
        return view(tx, event);
      },
    );
  }
}
