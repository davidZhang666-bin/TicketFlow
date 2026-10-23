import { expect, it } from 'vitest';
import { initialDraft, toEventInput } from '../../apps/web/src/event-form.js';
import type { EventView } from '../../packages/contracts/src/index.js';
const event: EventView = {
  id: '20000000-0000-4000-8000-000000000001',
  title: '表单回归测试',
  description: '编辑已创建的活动。',
  location: '上海',
  category: 'LECTURE',
  status: 'DRAFT',
  revision: 2,
  salesOpensAt: '2030-01-01T00:00:00.000Z',
  salesClosesAt: '2030-01-02T00:00:00.000Z',
  slots: [
    {
      id: '30000000-0000-4000-8000-000000000001',
      label: '上午场',
      startsAt: '2030-01-03T00:00:00.000Z',
      endsAt: '2030-01-03T02:00:00.000Z',
      capacity: 100,
      available: 100,
      held: 0,
      confirmed: 0,
      priceCents: 4901,
    },
  ],
};
it('converts a persisted event to an editable command without read-only fields', () => {
  const draft = initialDraft(event);
  const input = toEventInput({ ...draft, title: '已经修改的活动' });
  expect(input.title).toBe('已经修改的活动');
  expect(input).not.toHaveProperty('id');
  expect(input).not.toHaveProperty('status');
  expect(input).not.toHaveProperty('revision');
  expect(input.slots[0]).not.toHaveProperty('available');
  expect(input.slots[0]?.priceCents).toBe(4901);
});
it('round-trips Beijing time independently of the host timezone', () => {
  const draft = initialDraft(event);
  expect(draft.slots[0]?.startsAt).toBe('2030-01-03T08:00');
  expect(toEventInput(draft).slots[0]?.startsAt).toBe(event.slots[0]?.startsAt);
});
it('converts fractional yuan exactly and rejects unsupported precision', () => {
  const draft = initialDraft(event);
  draft.slots[0]!.price = '0.29';
  expect(toEventInput(draft).slots[0]?.priceCents).toBe(29);
  draft.slots[0]!.price = '0.291';
  expect(() => toEventInput(draft)).toThrow('价格最多包含两位小数');
});
