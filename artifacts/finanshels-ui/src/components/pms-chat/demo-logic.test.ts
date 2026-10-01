import test from 'node:test';
import assert from 'node:assert/strict';
import { demoReply, buildHandover } from './demo-logic.ts';

test('work reply lists both tasks', () => {
  assert.match(demoReply('What work is pending?').text, /DEMO-102/);
});
test('blocker reply cites sources', () => {
  const r = demoReply('what is blocking?');
  assert.match(r.text, /DEMO-101/);
  assert.ok(r.sources?.length);
});
test('follow-up returns draft', () => assert.equal(demoReply('draft a follow-up').draft, true));
test('unsupported is honest', () => assert.match(demoReply('weather?').text, /cannot answer/));
test('handover includes chat and refs', () => {
  const h = buildHandover([{ id: '1', role: 'user', text: 'hello' }], null);
  assert.match(h, /You: hello/);
  assert.match(h, /DEMO-101/);
  assert.match(h, /\(none saved\)/);
});
