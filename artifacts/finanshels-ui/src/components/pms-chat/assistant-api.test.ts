import assert from 'node:assert/strict';
import { test } from 'node:test';
import { assistantAnswer, assistantStatus } from './assistant-api.ts';

test('live request sends only the question, never page records or identity', async () => {
  const previous = globalThis.fetch;
  globalThis.fetch = async (url, options) => {
    assert.equal(url, '/api/pms-assistant/answers');
    assert.equal(options?.method, 'POST');
    assert.equal(options?.credentials, 'same-origin');
    assert.equal(options?.cache, 'no-store');
    assert.deepEqual(JSON.parse(options?.body as string), { question: 'What is pending?' });
    return Response.json({ status: 'unavailable', answer: 'No accessible evidence.', citations: [], claims: [] });
  };
  try {
    const result = await assistantAnswer('What is pending?');
    assert.equal(result.status, 'unavailable');
    assert.deepEqual(result.citations, []);
  } finally { globalThis.fetch = previous; }
});

test('live answer validates exact citations and distinguishes recorded facts from inference', async () => {
  const previous = globalThis.fetch;
  const citations = [{ kind: 'task', id: 't1', title: 'Review', excerpt: 'Status: Blocked.' }];
  const claims = [
    { text: 'Status: Blocked.', basis: 'recorded', citationIds: ['task:t1'] },
    { text: 'The review may be delayed.', basis: 'inference', citationIds: ['task:t1'] },
  ];
  globalThis.fetch = async () => Response.json({ status: 'answered', answer: claims.map((c) => c.text).join(' '), citations, claims });
  try {
    const result = await assistantAnswer('Explain');
    assert.equal(result.claims[1].basis, 'inference');
    assert.deepEqual(result.citations, citations);
  } finally { globalThis.fetch = previous; }
});

test('malformed, unavailable-with-evidence, and uncited answers are rejected rather than demo-filled', async () => {
  const previous = globalThis.fetch;
  try {
    for (const value of [
      null,
      { status: 'answered', answer: 'Invented', citations: [], claims: [] },
      { status: 'unavailable', answer: 'No', citations: [{ id: 't1' }], claims: [] },
      { status: 'answered', answer: 'Cause.', citations: [{ kind: 'task', id: 't1', title: 'Review', excerpt: 'Blocked' }],
        claims: [{ text: 'Cause.', basis: 'recorded', citationIds: ['task:foreign'] }] },
      { status: 'answered', answer: 'Extra uncited cause.', citations: [{ kind: 'task', id: 't1', title: 'Review', excerpt: 'Blocked' }],
        claims: [{ text: 'Blocked', basis: 'recorded', citationIds: ['task:t1'] }] },
    ]) {
      globalThis.fetch = async () => Response.json(value);
      await assert.rejects(assistantAnswer('Why?'));
    }
    globalThis.fetch = async () => new Response(null, { status: 503 });
    await assert.rejects(assistantAnswer('Why?'));
  } finally { globalThis.fetch = previous; }
});

test('status fails closed for an invalid or failed readiness response', async () => {
  const previous = globalThis.fetch;
  try {
    globalThis.fetch = async () => Response.json({ ready: false, reason: 'trusted_data_unavailable' });
    assert.equal((await assistantStatus()).ready, false);
    globalThis.fetch = async () => Response.json({ ready: 'yes' });
    await assert.rejects(assistantStatus());
    globalThis.fetch = async () => new Response(null, { status: 500 });
    await assert.rejects(assistantStatus());
  } finally { globalThis.fetch = previous; }
});