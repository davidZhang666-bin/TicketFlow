import { expect, it } from 'vitest';
import { hashPassword, verifyPassword } from '../../apps/api/src/auth/password.js';
it('uses distinct salts and verifies passwords without storing plaintext', async () => {
  const first = await hashPassword('test-password');
  const second = await hashPassword('test-password');
  expect(first).not.toBe(second);
  expect(first).not.toContain('test-password');
  expect(await verifyPassword('test-password', first)).toBe(true);
  expect(await verifyPassword('wrong-password', first)).toBe(false);
  expect(await verifyPassword('test-password', 'malformed')).toBe(false);
});
