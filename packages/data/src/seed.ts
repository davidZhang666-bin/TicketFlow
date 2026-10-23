import { randomUUID } from 'node:crypto';
import type { Kysely } from 'kysely';
import type { Database } from './database.js';
import { hashPassword } from './password.js';

export const demoAccounts = [
  {
    id: '10000000-0000-4000-8000-000000000001',
    email: 'organizer@ticketflow.demo',
    name: '林知行',
    role: 'ORGANIZER' as const,
  },
  {
    id: '10000000-0000-4000-8000-000000000002',
    email: 'user@ticketflow.demo',
    name: '周以宁',
    role: 'USER' as const,
  },
  {
    id: '10000000-0000-4000-8000-000000000003',
    email: 'other@ticketflow.demo',
    name: '陈予安',
    role: 'ORGANIZER' as const,
  },
];
export async function seed(db: Kysely<Database>, password: string): Promise<void> {
  if (password.length < 12) throw new Error('DEMO_PASSWORD must contain at least 12 characters.');
  const passwordHash = await hashPassword(password);
  await db.transaction().execute(async (tx) => {
    for (const account of demoAccounts) {
      await tx
        .insertInto('users')
        .values({ ...account, password_hash: passwordHash })
        .onConflict((conflict) => conflict.column('email').doNothing())
        .execute();
    }
    const owner = await tx
      .selectFrom('users')
      .select('id')
      .where('email', '=', demoAccounts[0]!.email)
      .executeTakeFirstOrThrow();
    const base = Date.now();
    const hour = 60 * 60 * 1000;
    const examples = [
      {
        id: '20000000-0000-4000-8000-000000000001',
        title: '从一张票开始：高并发系统设计',
        category: 'LECTURE' as const,
        location: '上海 · 创新剧场',
        description: '从报名到入场，一起拆解库存、幂等与消息一致性。面向对工程实践感兴趣的开发者。',
        capacity: 120,
        price: 4900,
        day: 7,
      },
      {
        id: '20000000-0000-4000-8000-000000000002',
        title: '城市夜色 · 室内乐现场',
        category: 'PERFORMANCE' as const,
        location: '上海 · 江岸音乐空间',
        description: '弦乐与钢琴的近距离现场。在城市夜色里，为一段旋律留一个位置。',
        capacity: 80,
        price: 12800,
        day: 9,
      },
      {
        id: '20000000-0000-4000-8000-000000000003',
        title: '周末编码挑战赛',
        category: 'COMPETITION' as const,
        location: '上海 · 开放实验室',
        description: '在限定时间里完成真实问题，与其他开发者交流设计思路。个人参加，现场分组。',
        capacity: 60,
        price: 0,
        day: 11,
      },
    ];
    for (const example of examples) {
      const inserted = await tx
        .insertInto('events')
        .values({
          id: example.id,
          owner_id: owner.id,
          title: example.title,
          description: example.description,
          category: example.category,
          location: example.location,
          status: 'PUBLISHED',
          sales_opens_at: new Date(base - hour),
          sales_closes_at: new Date(base + example.day * 24 * hour - hour),
        })
        .onConflict((conflict) => conflict.column('id').doNothing())
        .returning('id')
        .executeTakeFirst();
      if (!inserted) continue;
      const slotId = randomUUID();
      const starts = base + example.day * 24 * hour;
      await tx
        .insertInto('event_slots')
        .values({
          id: slotId,
          event_id: example.id,
          label: '标准场',
          starts_at: new Date(starts),
          ends_at: new Date(starts + 2 * hour),
          price_cents: example.price,
        })
        .execute();
      await tx
        .insertInto('slot_inventory')
        .values({ slot_id: slotId, capacity: example.capacity, available: example.capacity })
        .execute();
    }
  });
}
