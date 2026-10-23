import { createHash, createHmac, randomBytes, timingSafeEqual } from 'node:crypto';
import { HttpException, Inject, Injectable } from '@nestjs/common';
import { sql } from 'kysely';
import type { SessionView, UserView } from '../../../../packages/contracts/src/index.js';
import { CONFIG } from '../config.js';
import type { Config } from '../config.js';
import { Resources } from '../resources.js';
import { hashPassword, verifyPassword } from '../../../../packages/data/src/password.js';

const tokenHash = (value: string) => createHash('sha256').update(value).digest('hex');
@Injectable()
export class Sessions {
  private readonly dummyHash = hashPassword('not-a-valid-account-password');
  constructor(
    @Inject(Resources) private readonly resources: Resources,
    @Inject(CONFIG) private readonly config: Config,
  ) {}
  private csrf(token: string) {
    return createHmac('sha256', this.config.SESSION_SECRET).update(token).digest('hex');
  }
  async login(email: string, password: string) {
    const row = await this.resources.db
      .selectFrom('users')
      .selectAll()
      .where('email', '=', email)
      .executeTakeFirst();
    const valid = await verifyPassword(password, row?.password_hash ?? (await this.dummyHash));
    if (!row || !valid) throw new HttpException('邮箱或密码不正确。', 401);
    const token = randomBytes(32).toString('hex');
    await this.resources.db
      .insertInto('sessions')
      .values({
        token_hash: tokenHash(token),
        user_id: row.id,
        expires_at: sql<Date>`clock_timestamp() + interval '8 hours'`,
      })
      .execute();
    const user: UserView = { id: row.id, name: row.name, email: row.email, role: row.role };
    return { token, session: { user, csrfToken: this.csrf(token) } satisfies SessionView };
  }
  async resolve(token: unknown): Promise<SessionView | undefined> {
    if (typeof token !== 'string' || !/^[a-f0-9]{64}$/.test(token)) return undefined;
    const user = await this.resources.db
      .selectFrom('sessions')
      .innerJoin('users', 'users.id', 'sessions.user_id')
      .select(['users.id', 'users.name', 'users.email', 'users.role'])
      .where('sessions.token_hash', '=', tokenHash(token))
      .where('sessions.expires_at', '>', sql<Date>`clock_timestamp()`)
      .executeTakeFirst();
    return user ? { user, csrfToken: this.csrf(token) } : undefined;
  }
  validCsrf(token: unknown, expected: string) {
    return (
      typeof token === 'string' &&
      /^[a-f0-9]{64}$/.test(token) &&
      timingSafeEqual(Buffer.from(token, 'hex'), Buffer.from(expected, 'hex'))
    );
  }
  async logout(token: unknown) {
    if (typeof token === 'string') {
      await this.resources.db
        .deleteFrom('sessions')
        .where('token_hash', '=', tokenHash(token))
        .execute();
    }
  }
}
