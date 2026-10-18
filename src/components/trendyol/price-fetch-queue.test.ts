import { test } from 'node:test';
import assert from 'node:assert/strict';
import { fetchPriceQueue } from './price-fetch-queue';

test('fetches two prices concurrently and saves each exactly once', async () => {
  let active = 0; let peak = 0;
  const calls: string[] = []; const saved: string[] = [];
  const result = await fetchPriceQueue({
    asins: ['A', 'B', 'C', 'D'], stopped: () => false,
    lookup: async asin => { calls.push(asin); peak = Math.max(peak, ++active); await new Promise(resolve => setTimeout(resolve, 5)); active--; return asin; },
    saved: asin => { saved.push(asin); }, failed: () => assert.fail('unexpected failure'), progress: () => {},
  });
  assert.equal(peak, 2); assert.equal(result.saved, 4); assert.deepEqual(result.remaining, []);
  assert.deepEqual(calls.sort(), ['A', 'B', 'C', 'D']); assert.equal(new Set(saved).size, 4);
});

test('stop drains in-flight lookups and leaves only unsaved ASINs for resume', async () => {
  let stopped = false; const calls: string[] = [];
  const result = await fetchPriceQueue({ asins: ['A', 'B', 'C'], stopped: () => stopped,
    lookup: async asin => { calls.push(asin); await new Promise(resolve => setTimeout(resolve, 5)); return asin; },
    saved: () => { stopped = true; }, failed: () => {}, progress: () => {},
  });
  assert.deepEqual(calls, ['A', 'B']); assert.equal(result.saved, 2); assert.deepEqual(result.remaining, ['C']);
});

test('rate limit stops new lookups without retrying billed requests', async () => {
  let stopped = false; const calls: string[] = [];
  const result = await fetchPriceQueue({ asins: ['A', 'B', 'C'], stopped: () => stopped,
    lookup: async asin => { calls.push(asin); if (asin === 'A') throw new Error('429'); return asin; },
    saved: () => {}, failed: () => { stopped = true; }, progress: () => {},
  });
  assert.deepEqual(calls, ['A', 'B']); assert.equal(result.saved, 1); assert.deepEqual(result.remaining, ['C']);
});

test('isolated errors do not block other prices or enter the resume queue', async () => {
  const calls: string[] = []; let failures = 0;
  const result = await fetchPriceQueue({ asins: ['A', 'B', 'C'], stopped: () => false,
    lookup: async asin => { calls.push(asin); if (asin === 'A') throw new Error('502'); return asin; },
    saved: () => {}, failed: () => { failures++; }, progress: () => {},
  });
  assert.equal(failures, 1); assert.equal(result.saved, 2); assert.deepEqual(result.remaining, []);
  assert.deepEqual(calls.sort(), ['A', 'B', 'C']);
});