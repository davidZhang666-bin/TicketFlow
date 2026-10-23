import { z } from 'zod';

export const categorySchema = z.enum(['LECTURE', 'COMPETITION', 'PERFORMANCE']);
export const eventStatusSchema = z.enum(['DRAFT', 'PUBLISHED', 'CANCELING', 'CANCELED']);
export const loginSchema = z
  .object({
    email: z
      .email()
      .max(254)
      .transform((value) => value.toLowerCase()),
    password: z.string().min(1).max(128),
  })
  .strict();
export const slotInputSchema = z
  .object({
    label: z.string().trim().min(1).max(80),
    startsAt: z.iso.datetime({ offset: true }),
    endsAt: z.iso.datetime({ offset: true }),
    capacity: z.number().int().min(1).max(100_000),
    priceCents: z.number().int().min(0).max(100_000_000),
  })
  .strict();
export const eventInputSchema = z
  .object({
    title: z.string().trim().min(2).max(120),
    description: z.string().trim().min(1).max(4000),
    location: z.string().trim().min(1).max(160),
    category: categorySchema,
    salesOpensAt: z.iso.datetime({ offset: true }),
    salesClosesAt: z.iso.datetime({ offset: true }),
    slots: z.array(slotInputSchema).min(1).max(30),
  })
  .strict();
export const updateEventSchema = eventInputSchema.extend({
  expectedRevision: z.number().int().min(1),
});
export const publishEventSchema = z
  .object({
    expectedRevision: z.number().int().min(1),
  })
  .strict();
export const idSchema = z.uuid();
export const idempotencyKeySchema = z.string().regex(/^[a-zA-Z0-9_-]{16,128}$/);
export const userSchema = z.object({
  id: z.uuid(),
  name: z.string(),
  email: z.email(),
  role: z.enum(['USER', 'ORGANIZER']),
});
export const sessionSchema = z.object({ user: userSchema, csrfToken: z.string() });
export const slotViewSchema = slotInputSchema.extend({
  id: z.uuid(),
  available: z.number().int(),
  held: z.number().int(),
  confirmed: z.number().int(),
});
export const eventViewSchema = eventInputSchema.omit({ slots: true }).extend({
  id: z.uuid(),
  status: eventStatusSchema,
  revision: z.number().int(),
  slots: z.array(slotViewSchema),
});
export const eventListSchema = z.object({ items: z.array(eventViewSchema) });
export const errorSchema = z.object({
  code: z.string(),
  message: z.string(),
  requestId: z.string(),
  issues: z.array(z.object({ path: z.string(), message: z.string() })).optional(),
});
export type EventInput = z.infer<typeof eventInputSchema>;
export type EventView = z.infer<typeof eventViewSchema>;
export type EventCategory = z.infer<typeof categorySchema>;
export type EventStatus = z.infer<typeof eventStatusSchema>;
export type UserView = z.infer<typeof userSchema>;
export type SessionView = z.infer<typeof sessionSchema>;
