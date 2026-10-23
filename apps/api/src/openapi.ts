import {
  OpenAPIRegistry,
  OpenApiGeneratorV3,
  extendZodWithOpenApi,
} from '@asteasolutions/zod-to-openapi';
import { z } from 'zod';
import type { SchemaObject } from '@nestjs/swagger/dist/interfaces/open-api-spec.interface.js';
extendZodWithOpenApi(z);
export function apiSchema(schema: z.ZodType): SchemaObject {
  const registry = new OpenAPIRegistry();
  registry.register('Payload', schema);
  const generator = new OpenApiGeneratorV3(registry.definitions);
  return generator.generateComponents().components?.schemas?.Payload as SchemaObject;
}
