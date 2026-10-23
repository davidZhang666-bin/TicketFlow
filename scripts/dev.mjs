import { spawn } from 'node:child_process';
const pnpm = process.platform === 'win32' ? 'pnpm.cmd' : 'pnpm';
const children = ['dev:api', 'dev:worker', 'dev:web'].map((task) =>
  spawn(pnpm, [task], { stdio: 'inherit', shell: process.platform === 'win32' }),
);
let stopping = false;
function stop(code = 0) {
  if (stopping) return;
  stopping = true;
  for (const child of children) {
    if (process.platform === 'win32' && child.pid) {
      spawn('taskkill', ['/pid', String(child.pid), '/t', '/f'], { stdio: 'ignore' });
    } else child.kill('SIGTERM');
  }
  process.exitCode = code;
}
process.on('SIGINT', () => stop());
process.on('SIGTERM', () => stop());
for (const child of children) child.on('exit', (code) => stop(code ?? 1));
