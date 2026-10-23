import { randomUUID } from 'node:crypto';
import { Catch, HttpException } from '@nestjs/common';
import type { ArgumentsHost, ExceptionFilter } from '@nestjs/common';
import type { Request, Response } from 'express';
import { z } from 'zod';
import { DomainError } from '../../../packages/domain/src/events.js';
import type { SessionView } from '../../../packages/contracts/src/index.js';

export interface AppRequest extends Request {
  auth?: SessionView;
  requestId?: string;
}
export function sessionOf(request: AppRequest): SessionView {
  if (!request.auth) throw new HttpException('请先登录。', 401);
  return request.auth;
}
@Catch()
export class ErrorFilter implements ExceptionFilter {
  catch(error: unknown, host: ArgumentsHost) {
    const response = host.switchToHttp().getResponse<Response>();
    const request = host.switchToHttp().getRequest<AppRequest>();
    const requestId = request.requestId ?? randomUUID();
    if (
      error &&
      typeof error === 'object' &&
      'type' in error &&
      (error.type === 'entity.parse.failed' || error.type === 'entity.too.large')
    ) {
      response.status(error.type === 'entity.too.large' ? 413 : 400).json({
        code: 'INVALID_REQUEST_BODY',
        message: '请求内容无效或过大。',
        requestId,
      });
      return;
    }
    if (error instanceof z.ZodError) {
      response.status(400).json({
        code: 'VALIDATION_ERROR',
        message: '请检查输入内容。',
        requestId,
        issues: error.issues.map((issue) => ({
          path: issue.path.join('.'),
          message: issue.message,
        })),
      });
      return;
    }
    if (error instanceof DomainError) {
      response.status(error.status).json({ code: error.code, message: error.message, requestId });
      return;
    }
    if (error instanceof HttpException) {
      response.status(error.getStatus()).json({
        code: 'HTTP_' + error.getStatus(),
        message: error.message,
        requestId,
      });
      return;
    }
    console.error(
      JSON.stringify({
        event: 'unhandled_error',
        requestId,
        type: error instanceof Error ? error.name : 'unknown',
      }),
    );
    response
      .status(500)
      .json({ code: 'INTERNAL_ERROR', message: '服务暂时无法完成请求，请稍后重试。', requestId });
  }
}
