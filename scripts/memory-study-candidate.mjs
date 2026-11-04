import assert from 'node:assert/strict';
import { readFileSync, writeFileSync } from 'node:fs';

assert.equal(process.env.AUDIT_ISOLATED, '1');
for (const name of ['DATABASE_URL', 'UPSTASH_REDIS_REST_URL']) assert.equal(new URL(process.env[name]).hostname, '127.0.0.1');
const variant = process.argv[2];
assert(['baseline', 'disk-cache', 'lean'].includes(variant));
const anchor = 'const nextConfig: NextConfig = {';
let config = readFileSync('next.config.ts', 'utf8').replace(/^\s*cacheMaxMemorySize:.*\n/gm, '\n');
assert(config.includes(anchor));
if (variant !== 'baseline') config = config.replace(anchor, anchor + '\n  cacheMaxMemorySize: 0,');
writeFileSync('next.config.ts', config);
const start = readFileSync('scripts/start.mjs', 'utf8');
const pattern = /const next = spawn\([\s\S]*?\);\n/;
assert(pattern.test(start));
const command = variant === 'lean'
  ? 'const next = spawn(process.execPath, ["--max-old-space-size=384", "--max-semi-space-size=8", "./node_modules/next/dist/bin/next", "start"], { stdio: "inherit" });\n'
  : 'const next = spawn("./node_modules/.bin/next", ["start"], { stdio: "inherit" });\n';
writeFileSync('scripts/start.mjs', start.replace(pattern, command));
console.log('MEMORY_CANDIDATE', JSON.stringify({ variant, filesystemCache: true, memoryCache: variant === 'baseline', oldSpaceMiB: variant === 'lean' ? 384 : 'default' }));
