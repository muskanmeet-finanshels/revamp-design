import assert from 'node:assert/strict';
import { test } from 'node:test';
import { chipPrompts, EXPIRY_MS, loadPrefs, MAX_COUNT, recordIntent, resetPrefs, type StorageLike } from './assistant-preferences.ts';

const mem = (): StorageLike & { m: Map<string, string> } => {
  const m = new Map<string, string>();
  return { m, getItem: (k) => m.get(k) ?? null, setItem: (k, v) => { m.set(k, v); }, removeItem: (k) => { m.delete(k); } };
};
const A = 'a'.repeat(64), B = 'b'.repeat(64);

test('defaults are exact and ordered', () => {
  assert.deepEqual(chipPrompts({}).slice(0, 3), ["What is my today's work?", 'Show me overdue tasks', 'What work is pending across my clients?']);
  assert.equal(chipPrompts({})[3], 'What blockers are recorded?');
});
test('ranks by frequency, bounded, isolated per key, reset', () => {
  const s = mem(); const now = 1e12;
  for (let i = 0; i < 50; i++) recordIntent(s, A, 'blockers', now);
  assert.equal(loadPrefs(s, A, now).blockers?.n, MAX_COUNT);
  assert.equal(chipPrompts(loadPrefs(s, A, now))[0], 'What blockers are recorded?');
  assert.equal(chipPrompts(loadPrefs(s, B, now))[0], "What is my today's work?");
  resetPrefs(s, A);
  assert.deepEqual(loadPrefs(s, A, now), {});
});
test('recency breaks ties; general, bad keys and no key not learned', () => {
  const s = mem();
  recordIntent(s, A, 'pending', 1e12); recordIntent(s, A, 'overdue', 1e12 + 5);
  assert.equal(chipPrompts(loadPrefs(s, A, 1e12 + 5))[0], 'Show me overdue tasks');
  recordIntent(s, A, 'general'); recordIntent(s, null, 'pending'); recordIntent(s, 'zz', 'pending');
  assert.equal(s.m.size, 1);
});
test('corruption and expiry are discarded', () => {
  const s = mem();
  s.m.set('pms-assistant-intent-prefs:v1:' + A, '{bad');
  assert.deepEqual(loadPrefs(s, A), {});
  recordIntent(s, A, 'pending', 1000);
  assert.deepEqual(loadPrefs(s, A, 1000 + EXPIRY_MS + 1), {});
  s.m.set('pms-assistant-intent-prefs:v1:' + A, JSON.stringify({ pending: { n: 'x', t: 1 }, overdue: { n: 1e9, t: 1000 } }));
  assert.equal(loadPrefs(s, A, 2000).overdue?.n, MAX_COUNT);
  assert.equal(loadPrefs(s, A, 2000).pending, undefined);
});
test('failing storage is safe', () => {
  const bad: StorageLike = { getItem() { throw new Error('x'); }, setItem() { throw new Error('x'); }, removeItem() { throw new Error('x'); } };
  recordIntent(bad, A, 'pending');
  resetPrefs(bad, A);
});
