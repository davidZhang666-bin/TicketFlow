import { z } from 'zod';
import type { OpenAPIObject } from '@nestjs/swagger';
type NestSchema = Exclude<
  NonNullable<NonNullable<OpenAPIObject['components']>['schemas']>[string],
  { $ref: string }
>;
export function apiSchema(schema: z.ZodType) {
  const result = z.toJSONSchema(schema, { target: 'openapi-3.0', io: 'input' });
  // Zod and Nest expose different TypeScript representations of the same OpenAPI schema.
  return result as unknown as NestSchema;
}
