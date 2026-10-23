import { eventInputSchema } from '../../../packages/contracts/src/index.js';
import type {
  EventCategory,
  EventInput,
  EventView,
} from '../../../packages/contracts/src/index.js';

export interface Draft {
  title: string;
  description: string;
  location: string;
  category: EventCategory;
  salesOpensAt: string;
  salesClosesAt: string;
  slots: { label: string; startsAt: string; endsAt: string; capacity: string; price: string }[];
}
const localInput = (iso: string) =>
  new Date(new Date(iso).getTime() + 8 * 3600_000).toISOString().slice(0, 16);
const utcInstant = (local: string) => new Date(local + ':00+08:00').toISOString();

export function initialDraft(event?: EventView, now = Date.now()): Draft {
  const later = (hours: number) => localInput(new Date(now + hours * 3600_000).toISOString());
  if (!event)
    return {
      title: '',
      description: '',
      location: '',
      category: 'LECTURE',
      salesOpensAt: later(0),
      salesClosesAt: later(24 * 6),
      slots: [
        {
          label: '标准场',
          startsAt: later(24 * 7),
          endsAt: later(24 * 7 + 2),
          capacity: '100',
          price: '0.00',
        },
      ],
    };
  return {
    title: event.title,
    description: event.description,
    location: event.location,
    category: event.category,
    salesOpensAt: localInput(event.salesOpensAt),
    salesClosesAt: localInput(event.salesClosesAt),
    slots: event.slots.map((slot) => ({
      label: slot.label,
      startsAt: localInput(slot.startsAt),
      endsAt: localInput(slot.endsAt),
      capacity: String(slot.capacity),
      price: (slot.priceCents / 100).toFixed(2),
    })),
  };
}
export function toEventInput(draft: Draft): EventInput {
  return eventInputSchema.parse({
    title: draft.title,
    description: draft.description,
    location: draft.location,
    category: draft.category,
    salesOpensAt: utcInstant(draft.salesOpensAt),
    salesClosesAt: utcInstant(draft.salesClosesAt),
    slots: draft.slots.map((slot) => {
      if (!/^\d+(\.\d{1,2})?$/.test(slot.price)) throw new Error('价格最多包含两位小数。');
      const [whole, decimals = ''] = slot.price.split('.');
      return {
        label: slot.label,
        startsAt: utcInstant(slot.startsAt),
        endsAt: utcInstant(slot.endsAt),
        capacity: Number(slot.capacity),
        priceCents: Number(whole) * 100 + Number(decimals.padEnd(2, '0')),
      };
    }),
  });
}
