import { Inject, Injectable } from '@nestjs/common';
import type { OnModuleDestroy } from '@nestjs/common';
import { connectDatabase, connectRedis, readiness } from '../../../packages/data/src/database.js';
import { CONFIG } from './config.js';
import type { Config } from './config.js';

@Injectable()
export class Resources implements OnModuleDestroy {
  readonly db;
  readonly redis;
  constructor(@Inject(CONFIG) config: Config) {
    this.db = connectDatabase(config.DATABASE_URL);
    this.redis = connectRedis(config.REDIS_URL);
  }
  ready() {
    return readiness(this.db, this.redis);
  }
  async onModuleDestroy() {
    this.redis.disconnect();
    await this.db.destroy();
  }
}
