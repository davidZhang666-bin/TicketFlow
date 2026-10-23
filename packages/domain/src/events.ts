import type { EventInput } from '../../contracts/src/index.js';

export class DomainError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly status = 409,
  ) {
    super(message);
    this.name = 'DomainError';
  }
}

export function validateEventSchedule(input: EventInput, now?: Date): void {
  const opens = new Date(input.salesOpensAt).getTime();
  const closes = new Date(input.salesClosesAt).getTime();
  if (opens >= closes) {
    throw new DomainError('INVALID_SALES_WINDOW', '报名结束时间必须晚于开始时间。', 400);
  }
  for (const slot of input.slots) {
    const start = new Date(slot.startsAt).getTime();
    const end = new Date(slot.endsAt).getTime();
    if (end <= start) {
      throw new DomainError('INVALID_SLOT_WINDOW', '场次结束时间必须晚于开始时间。', 400);
    }
    if (closes > start) {
      throw new DomainError('SALES_AFTER_START', '报名必须在所有场次开始前结束。', 400);
    }
  }
  if (now && closes <= now.getTime()) {
    throw new DomainError('SALES_ALREADY_CLOSED', '报名已经截止，请先调整活动时间。');
  }
}

export function assertDraft(status: string, revision: number, expectedRevision: number): void {
  if (status !== 'DRAFT') throw new DomainError('EVENT_NOT_DRAFT', '只有草稿可以修改或发布。');
  if (revision !== expectedRevision) {
    throw new DomainError('REVISION_CONFLICT', '活动已被更新，请刷新后重试。');
  }
}
