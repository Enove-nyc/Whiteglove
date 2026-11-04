// Disposable runtime profiling only. Never part of production NODE_OPTIONS.
import { appendFileSync, mkdirSync } from 'node:fs';
import { getHeapStatistics } from 'node:v8';
if (process.env.AUDIT_ISOLATED !== '1' || new URL(process.env.DATABASE_URL || 'https://invalid').hostname !== '127.0.0.1' || new URL(process.env.UPSTASH_REDIS_REST_URL || 'https://invalid').hostname !== '127.0.0.1') throw Error('Memory profiling requires disposable loopback stores.');
const instance = process.env.MEMORY_STUDY_INSTANCE;
if (!['a', 'b'].includes(instance)) throw Error('Missing memory profile instance.');
mkdirSync('/tmp/memory-study', { recursive: true });
const file = `/tmp/memory-study/${instance}.jsonl`;
const role = /next/.test(process.argv[1] || '') ? 'server' : 'wrapper';
function sample() {
  appendFileSync(file, JSON.stringify({ at: Date.now(), pid: process.pid, ppid: process.ppid, instance, role, ...process.memoryUsage(), heapLimit: getHeapStatistics().heap_size_limit, cpu: process.cpuUsage() }) + '\n');
}
sample();
setInterval(sample, 2000).unref();
