import assert from 'node:assert/strict';
import { readFileSync, mkdirSync, writeFileSync, existsSync } from 'node:fs';
import { performance } from 'node:perf_hooks';

assert.equal(process.env.AUDIT_ISOLATED, '1');
for (const name of ['DATABASE_URL', 'UPSTASH_REDIS_REST_URL']) assert.equal(new URL(process.env[name]).hostname, '127.0.0.1');
const variant = process.env.MEMORY_STUDY_VARIANT;
assert(['baseline', 'disk-cache', 'lean'].includes(variant));
const origins = ['http://127.0.0.1:3002', 'http://127.0.0.1:3003'];
const manifest = JSON.parse(readFileSync('.next/prerender-manifest.json', 'utf8'));
const paths = [...new Set(['/', '/login', '/sample-itinerary', '/app/preview', '/itinerary', '/pricing', '/about', '/packing', ...Object.keys(manifest.routes)])].filter(path => !/^\/(?:_|api(?:\/|$)|admin(?:\/|$)|account(?:\/|$)|i\/)/.test(path) && !/\.(?:xml|txt|js|json|png|webp|ico)$/.test(path));
const report = { variant, paths: paths.length, requests: 0, mismatches: [], latencies: [[], []], memory: {}, startedAt: new Date().toISOString() };
let cursor = 0;
async function request(origin, path, index) {
  const started = performance.now();
  const response = await fetch(origin + path, { signal: AbortSignal.timeout(30000) });
  const body = await response.text();
  report.latencies[index].push(performance.now() - started);
  report.requests++;
  assert(response.status < 500, `${origin}${path} HTTP ${response.status}`);
  assert(!/application error: a server-side exception/i.test(body), path);
  return response.status;
}
await Promise.all(Array.from({ length: 6 }, async () => {
  while (cursor < paths.length) {
    const path = paths[cursor++];
    const codes = await Promise.all(origins.map((origin, i) => request(origin, path, i)));
    if (codes[0] !== codes[1]) report.mismatches.push({ path, codes });
  }
}));
assert.equal(report.mismatches.length, 0, 'Independent instances must preserve route status behavior.');
// Leave time for normal idle garbage collection; do not force GC or change the budget.
await new Promise(resolve => setTimeout(resolve, 20000));
for (let i = 0; i < origins.length; i++) {
  const instance = i === 0 ? 'a' : 'b';
  const file = `/tmp/memory-study/${instance}.jsonl`;
  assert(existsSync(file), 'The real production wrapper must be profiled.');
  const samples = readFileSync(file, 'utf8').trim().split('\n').map(line => JSON.parse(line));
  const serverSamples = samples.filter(sample => sample.role === 'server');
  assert(serverSamples.length, 'No server process was measured.');
  const byPid = new Map();
  for (const sample of samples) byPid.set(sample.pid, sample);
  const latestAt = Math.max(...samples.map(sample => sample.at));
  const current = [...byPid.values()].filter(sample => latestAt - sample.at < 6000);
  const buckets = new Map();
  for (const sample of samples) {
    const bucket = Math.floor(sample.at / 4000);
    if (!buckets.has(bucket)) buckets.set(bucket, new Map());
    buckets.get(bucket).set(sample.pid, sample.rss);
  }
  const rssPeak = Math.max(...[...buckets.values()].map(values => [...values.values()].reduce((a, b) => a + b, 0)));
  const latencies = report.latencies[i].sort((a, b) => a - b);
  const heapLimit = serverSamples.at(-1).heapLimit;
  if (variant === 'lean') assert(heapLimit < 480 * 1024 * 1024, 'Candidate heap settings did not reach the server.');
  report.memory[instance] = { measuredProcesses: current.length, currentRssMiB: current.reduce((sum, sample) => sum + sample.rss, 0) / 1024 ** 2, peakRssMiB: rssPeak / 1024 ** 2, currentHeapUsedMiB: current.reduce((sum, sample) => sum + sample.heapUsed, 0) / 1024 ** 2, serverHeapLimitMiB: heapLimit / 1024 ** 2, p95RequestMs: latencies[Math.floor(latencies.length * 0.95)] };
}
delete report.latencies;
report.finishedAt = new Date().toISOString();
mkdirSync('memory-results', { recursive: true });
writeFileSync('memory-results/report.json', JSON.stringify(report, null, 2));
console.log('MEMORY_SUMMARY', JSON.stringify(report));
