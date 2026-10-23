import { describe, expect, it } from 'vitest';
import { eventInputSchema, idempotencyKeySchema } from '../../packages/contracts/src/index.js';
import { assertDraft, validateEventSchedule } from '../../packages/domain/src/events.js';
import { fingerprint } from '../../packages/data/src/idempotency.js';
const valid = {
  title: '系统设计讲座',
  description: '真实并发实践',
  location: '上海',
  category: 'LECTURE',
  salesOpensAt: '2030-01-01T00:00:00Z',
  salesClosesAt: '2030-01-02T00:00:00Z',
  slots: [
    {
      label: '上午场',
      startsAt: '2030-01-03T00:00:00Z',
      endsAt: '2030-01-03T02:00:00Z',
      capacity: 100,
      priceCents: 4900,
    },
  ],
};
describe('event boundaries', () => {
  it('accepts an integer-cent event with UTC dates', () => {
    const input = eventInputSchema.parse(valid);
    expect(() => validateEventSchedule(input, new Date('2029-01-01'))).not.toThrow();
  });
  it.each([0, -1, 100_001, 1.5])('rejects invalid capacity %s', (capacity) => {
    expect(
      eventInputSchema.safeParse({ ...valid, slots: [{ ...valid.slots[0], capacity }] }).success,
    ).toBe(false);
  });
  it('rejects unknown fields, float money and missing timezone', () => {
    expect(eventInputSchema.safeParse({ ...valid, ownerId: 'override' }).success).toBe(false);
    expect(
      eventInputSchema.safeParse({ ...valid, slots: [{ ...valid.slots[0], priceCents: 4.9 }] })
        .success,
    ).toBe(false);
    expect(eventInputSchema.safeParse({ ...valid, salesOpensAt: '2030-01-01T00:00' }).success).toBe(
      false,
    );
  });
  it('rejects zero slots', () =>
    expect(eventInputSchema.safeParse({ ...valid, slots: [] }).success).toBe(false));
  it('rejects invalid sales and slot ordering', () => {
    const input = eventInputSchema.parse(valid);
    expect(() => validateEventSchedule({ ...input, salesClosesAt: input.salesOpensAt })).toThrow();
    expect(() =>
      validateEventSchedule({ ...input, salesClosesAt: '2031-01-01T00:00:00Z' }),
    ).toThrow();
    expect(() =>
      validateEventSchedule({
        ...input,
        slots: [{ ...input.slots[0]!, endsAt: input.slots[0]!.startsAt }],
      }),
    ).toThrow();
  });
  it('rejects publishing a closed event, including exact deadline', () => {
    const input = eventInputSchema.parse(valid);
    expect(() => validateEventSchedule(input, new Date(input.salesClosesAt))).toThrow();
  });
  it('rejects stale revisions and non-draft states', () => {
    expect(() => assertDraft('DRAFT', 2, 1)).toThrow();
    expect(() => assertDraft('PUBLISHED', 2, 2)).toThrow();
    expect(() => assertDraft('DRAFT', 2, 2)).not.toThrow();
  });
  it('normalizes object key ordering but preserves array order', () => {
    expect(fingerprint({ b: [1, 2], a: { y: 2, x: 1 } })).toBe(
      fingerprint({ a: { x: 1, y: 2 }, b: [1, 2] }),
    );
    expect(fingerprint([1, 2])).not.toBe(fingerprint([2, 1]));
  });
  it('requires a safe nonempty idempotency key', () => {
    expect(idempotencyKeySchema.safeParse('too-short').success).toBe(false);
    expect(idempotencyKeySchema.safeParse('a'.repeat(16)).success).toBe(true);
  });
});
