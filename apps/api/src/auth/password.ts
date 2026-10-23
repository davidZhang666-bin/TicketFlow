import { randomBytes, scrypt as scryptCallback, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';
const scrypt = promisify(scryptCallback);
export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString('hex');
  const hash = (await scrypt(password, salt, 64)) as Buffer;
  return 'scrypt$' + salt + '$' + hash.toString('hex');
}
export async function verifyPassword(password: string, encoded: string): Promise<boolean> {
  const [algorithm, salt, hex] = encoded.split('$');
  if (algorithm !== 'scrypt' || !salt || !hex || !/^[0-9a-f]{128}$/.test(hex)) return false;
  const actual = (await scrypt(password, salt, 64)) as Buffer;
  return timingSafeEqual(actual, Buffer.from(hex, 'hex'));
}
