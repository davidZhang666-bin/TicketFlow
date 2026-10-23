import type { z } from 'zod';
import type { paths } from '../../../packages/contracts/src/api.generated.js';
import { errorSchema } from '../../../packages/contracts/src/index.js';
type ApiPath = keyof paths;
export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
  ) {
    super(message);
  }
}
let csrfToken: string | undefined;
export function setCsrfToken(token: string | undefined) {
  csrfToken = token;
}
export async function request<T>(
  path: ApiPath | `/api/v1/events/${string}` | `/api/v1/organizer/events/${string}`,
  schema: z.ZodType<T>,
  options: { method?: 'GET' | 'POST' | 'PUT'; body?: unknown; key?: string } = {},
): Promise<T> {
  const headers: Record<string, string> = {};
  if (options.body !== undefined) headers['Content-Type'] = 'application/json';
  if (csrfToken) headers['X-CSRF-Token'] = csrfToken;
  if (options.key) headers['Idempotency-Key'] = options.key;
  let response: Response;
  try {
    response = await fetch(path, {
      credentials: 'same-origin',
      method: options.method ?? 'GET',
      headers,
      ...(options.body !== undefined ? { body: JSON.stringify(options.body) } : {}),
    });
  } catch {
    throw new ApiError(0, 'NETWORK_ERROR', '无法连接服务，请检查连接后重试。');
  }
  const data: unknown = response.status === 204 ? undefined : await response.json();
  if (!response.ok) {
    const error = errorSchema.safeParse(data);
    throw new ApiError(
      response.status,
      error.success ? error.data.code : 'HTTP_ERROR',
      error.success ? error.data.message : '请求失败，请稍后重试。',
    );
  }
  return schema.parse(data);
}
