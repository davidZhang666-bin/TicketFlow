import { Controller, Get, HttpException, Inject } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Resources } from './resources.js';
@ApiTags('health')
@Controller('health')
export class HealthController {
  constructor(@Inject(Resources) private readonly resources: Resources) {}
  @Get('live')
  @ApiOperation({ operationId: 'liveness' })
  live() {
    return { status: 'alive' };
  }
  @Get('ready')
  @ApiOperation({ operationId: 'readiness' })
  async ready() {
    const health = await this.resources.ready();
    if (health.status !== 'ready') throw new HttpException('依赖服务尚未就绪。', 503);
    return health;
  }
}
