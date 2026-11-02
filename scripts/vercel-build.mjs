import { spawnSync } from 'node:child_process';
import { checkProductionEnvironment } from './check-production-env.mjs';

if (process.env.VERCEL_ENV === 'production') {
  checkProductionEnvironment();
  const migration = spawnSync('npm', ['run', 'db:deploy'], { stdio: 'inherit', env: process.env });
  if (migration.status !== 0) process.exit(migration.status || 1);
}
const build = spawnSync('npm', ['run', 'build'], { stdio: 'inherit', env: process.env });
process.exit(build.status || (build.error ? 1 : 0));
