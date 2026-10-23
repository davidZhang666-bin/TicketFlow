import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpException,
  Inject,
  Post,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { ApiBody, ApiCookieAuth, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';
import { loginSchema, sessionSchema } from '../../../../packages/contracts/src/index.js';
import { apiSchema } from '../openapi.js';
import { CONFIG } from '../config.js';
import type { Config } from '../config.js';
import type { AppRequest } from '../http.js';
import { sessionOf } from '../http.js';
import { AuthGuard } from './guards.js';
import { Sessions } from './sessions.js';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(
    @Inject(Sessions) private readonly sessions: Sessions,
    @Inject(CONFIG) private readonly config: Config,
  ) {}
  @Post('login')
  @HttpCode(200)
  @ApiOperation({ operationId: 'login', summary: 'Create an eight-hour database session' })
  @ApiBody({ schema: apiSchema(loginSchema) })
  @ApiOkResponse({ schema: apiSchema(sessionSchema) })
  async login(
    @Body() body: unknown,
    @Req() request: AppRequest,
    @Res({ passthrough: true }) response: Response,
  ) {
    if (request.headers.origin && request.headers.origin !== this.config.APP_ORIGIN) {
      throw new HttpException('请求来源无效。', 403);
    }
    const input = loginSchema.parse(body);
    const result = await this.sessions.login(input.email, input.password);
    response.cookie('tf_session', result.token, {
      httpOnly: true,
      secure: this.config.COOKIE_SECURE,
      sameSite: 'lax',
      path: '/api',
      maxAge: 8 * 60 * 60 * 1000,
    });
    response.setHeader('Cache-Control', 'no-store');
    return result.session;
  }
  @Get('me')
  @UseGuards(AuthGuard)
  @ApiCookieAuth()
  @ApiOperation({ operationId: 'getSession' })
  @ApiOkResponse({ schema: apiSchema(sessionSchema) })
  me(@Req() request: AppRequest, @Res({ passthrough: true }) response: Response) {
    response.setHeader('Cache-Control', 'no-store');
    return sessionOf(request);
  }
  @Post('logout')
  @UseGuards(AuthGuard)
  @HttpCode(204)
  @ApiCookieAuth()
  @ApiOperation({ operationId: 'logout' })
  async logout(@Req() request: AppRequest, @Res({ passthrough: true }) response: Response) {
    await this.sessions.logout((request.cookies as Record<string, unknown>).tf_session);
    response.clearCookie('tf_session', {
      path: '/api',
      secure: this.config.COOKIE_SECURE,
      httpOnly: true,
      sameSite: 'lax',
    });
  }
}
