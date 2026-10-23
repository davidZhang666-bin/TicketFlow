import { HttpException, Inject, Injectable } from '@nestjs/common';
import type { CanActivate, ExecutionContext } from '@nestjs/common';
import type { AppRequest } from '../http.js';
import { CONFIG } from '../config.js';
import type { Config } from '../config.js';
import { Sessions } from './sessions.js';

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    @Inject(Sessions) protected readonly sessions: Sessions,
    @Inject(CONFIG) protected readonly config: Config,
  ) {}
  async canActivate(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest<AppRequest>();
    const cookies = request.cookies as Record<string, unknown> | undefined;
    const session = await this.sessions.resolve(cookies?.tf_session);
    if (!session) throw new HttpException('请先登录。', 401);
    if (!['GET', 'HEAD', 'OPTIONS'].includes(request.method)) {
      if (request.headers.origin && request.headers.origin !== this.config.APP_ORIGIN) {
        throw new HttpException('请求来源无效。', 403);
      }
      if (!this.sessions.validCsrf(request.headers['x-csrf-token'], session.csrfToken)) {
        throw new HttpException('会话校验失败，请刷新后重试。', 403);
      }
    }
    request.auth = session;
    return true;
  }
}
@Injectable()
export class OrganizerGuard extends AuthGuard {
  override async canActivate(context: ExecutionContext) {
    await super.canActivate(context);
    if (context.switchToHttp().getRequest<AppRequest>().auth?.user.role !== 'ORGANIZER') {
      throw new HttpException('需要活动运营权限。', 403);
    }
    return true;
  }
}
