import { expect, test } from '@playwright/test';
import {
  answer, assistantFixture, chips, composer, DEFAULTS, expectResponse, panel,
  PERMISSION_A, PREF_PREFIX, sendText, SESSION_A, SESSION_B, storedPrefs, transcript, verifiedStatus,
} from './assistant-fixture';

test('neutral portfolio is default; fictional demo is opt-in; focus and Escape return to launcher', async ({ page }) => {
  const fixture = await assistantFixture(page);
  await fixture.open();
  await expect(panel(page).getByRole('button', { name: 'Authorized portfolio', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await expect(composer(page)).toBeFocused();
  await expect(chips(page)).toHaveText(DEFAULTS);
  await expect(transcript(page)).toContainText('all the clients you are authorized to see');
  await expect(transcript(page)).not.toContainText('Nexora');
  await expect(transcript(page)).toContainText('No fictional data');
  await sendText(page, 'Show me overdue tasks');
  await expectResponse(page, 'Test-only unavailable response');
  await expect(chips(page)).toHaveText(DEFAULTS);
  await panel(page).getByRole('button', { name: 'Fictional demo', exact: true }).click();
  await expect(page.getByRole('textbox', { name: 'Message', exact: true })).toBeFocused();
  await expect(panel(page)).toContainText('Fictional data, no live AI');
  await expect(page.getByRole('log', { name: 'Chat transcript', exact: true })).toContainText('Nexora');
  await page.getByRole('textbox', { name: 'Message', exact: true }).press('Escape');
  await expect(panel(page)).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Open PMS assistant chat' })).toBeFocused();
  expect(fixture.api.questions).toEqual(['Show me overdue tasks']);
  expect(await page.evaluate(() => Object.keys(localStorage).filter((key) => key.startsWith('pms-assistant')))).toEqual([]);
});

test('chips and free text share submission; answered/verified-empty intents rank; resets are independent', async ({ page }) => {
  const fixture = await assistantFixture(page);
  await fixture.open(SESSION_A);
  fixture.api.response = answer(SESSION_A, 'blockers');
  await chips(page).filter({ hasText: DEFAULTS[3] }).click();
  await expectResponse(page, 'Intercepted blockers answered response');
  await expect(chips(page).first()).toHaveText(DEFAULTS[3]);
  await expect(transcript(page).getByText(DEFAULTS[3], { exact: true })).toBeVisible();
  await transcript(page).getByRole('button', { name: 'Source task:test-record: Intercepted record' }).click();
  await expect(transcript(page)).toContainText('Test-only source excerpt');
  fixture.api.response = answer(SESSION_A, 'pending', 'empty');
  await sendText(page, '  pending across clients  ');
  await expectResponse(page, 'Intercepted pending empty response');
  await expect(chips(page).first()).toHaveText(DEFAULTS[2]);
  expect(fixture.api.questions).toEqual([DEFAULTS[3], 'pending across clients']);
  const preferences = await storedPrefs(page, SESSION_A);
  expect(preferences).toEqual({
    blockers: { n: 1, t: expect.any(Number) }, pending: { n: 1, t: expect.any(Number) },
  });
  await panel(page).getByRole('button', { name: 'Reset conversation', exact: true }).click();
  await expect(transcript(page)).not.toContainText('Intercepted');
  await expect(chips(page).first()).toHaveText(DEFAULTS[2]);
  expect(await storedPrefs(page, SESSION_A)).toEqual(preferences);
  fixture.api.response = answer(SESSION_A, 'general', 'empty');
  await sendText(page, 'retain this turn');
  await expectResponse(page, 'Intercepted general empty response');
  await panel(page).getByRole('button', { name: 'Reset suggestions', exact: true }).click();
  await expect(chips(page)).toHaveText(DEFAULTS);
  expect(await storedPrefs(page, SESSION_A)).toBeNull();
  await expect(transcript(page)).toContainText('retain this turn');
});

for (const failure of ['unavailable', 'http error', 'invalid evidence', 'clarification', 'general', 'wrong namespace', 'missing namespace'] as const) {
  test(`${failure} cannot learn a suggestion`, async ({ page }) => {
    const fixture = await assistantFixture(page);
    await fixture.open(SESSION_A);
    const response = answer(SESSION_A, 'blockers', 'empty');
    if (failure === 'unavailable') response.status = 'unavailable';
    if (failure === 'http error') fixture.api.answerCode = 503;
    if (failure === 'invalid evidence') response.status = 'answered';
    if (failure === 'clarification') response.status = 'clarification';
    if (failure === 'general') response.intent = 'general';
    if (failure === 'wrong namespace') response.personalizationKey = SESSION_B;
    if (failure === 'missing namespace') delete response.personalizationKey;
    fixture.api.response = response;
    await sendText(page, 'an unlearnable question');
    await expectResponse(page, failure === 'http error' || failure === 'invalid evidence'
      ? 'I can’t answer from live records right now. Authorized project and task sources or the AI service are unavailable. No fictional demo data was used.'
      : response.answer);
    await expect(chips(page)).toHaveText(DEFAULTS);
    expect(await storedPrefs(page, SESSION_A)).toBeNull();
    expect(await storedPrefs(page, SESSION_B)).toBeNull();
  });
}

for (const [label, nextKey] of [['identity', SESSION_B], ['permission', PERMISSION_A]] as const) {
  test(`${label} namespace switches abort pending work, discard stale replies, and restore bounded preferences`, async ({ page }) => {
    await page.addInitScript(({ prefix, key }) => {
      localStorage.setItem(prefix + key, JSON.stringify({ blockers: { n: 999, t: Date.now() } }));
    }, { prefix: PREF_PREFIX, key: SESSION_A });
    const fixture = await assistantFixture(page);
    await fixture.open(SESSION_A);
    await expect(chips(page).first()).toHaveText(DEFAULTS[3]);
    fixture.api.response = answer(SESSION_A, 'blockers');
    await sendText(page, 'first session question');
    await expectResponse(page, 'Intercepted blockers answered response');
    expect((await storedPrefs(page, SESSION_A)).blockers.n).toBe(20);
    const original = await storedPrefs(page, SESSION_A);
    fixture.api.response = answer(SESSION_A, 'overdue');
    const held = fixture.holdAnswer();
    await sendText(page, 'stale old namespace question');
    await expect(transcript(page)).toContainText('Checking authorized records…');
    const aborted = page.waitForEvent('requestfailed', (request) => request.url().endsWith('/answers'));
    await fixture.refresh(verifiedStatus(nextKey));
    await aborted;
    await expect(transcript(page)).not.toContainText('first session question');
    await expect(transcript(page)).not.toContainText('stale old namespace question');
    await expect(chips(page)).toHaveText(DEFAULTS);
    await held.release();
    fixture.api.response = answer(nextKey, 'pending', 'empty');
    await sendText(page, 'new namespace question');
    await expectResponse(page, 'Intercepted pending empty response');
    await expect(transcript(page)).not.toContainText('Intercepted overdue');
    await expect(chips(page).first()).toHaveText(DEFAULTS[2]);
    expect(await storedPrefs(page, SESSION_A)).toEqual(original);
    const nextPrefs = await storedPrefs(page, nextKey);
    expect(Object.keys(nextPrefs)).toEqual(['pending']);
    await fixture.refresh(verifiedStatus(SESSION_A));
    await expect(chips(page).first()).toHaveText(DEFAULTS[3]);
    await expect(transcript(page)).not.toContainText('new namespace question');
    await fixture.refresh(verifiedStatus(nextKey));
    await expect(chips(page).first()).toHaveText(DEFAULTS[2]);
    expect(await storedPrefs(page, nextKey)).toEqual(nextPrefs);
  });
}

for (const event of ['hidden', 'blur', 'reset', 'close'] as const) {
  test(`${event} clears pending transcripts and ignores delayed replies`, async ({ page }) => {
    const fixture = await assistantFixture(page);
    await fixture.open(SESSION_A);
    fixture.api.response = answer(SESSION_A, 'pending', 'empty');
    await sendText(page, 'previous verified turn');
    await expectResponse(page, 'Intercepted pending empty response');
    const prefs = await storedPrefs(page, SESSION_A);
    fixture.api.response = answer(SESSION_A, 'overdue');
    const held = fixture.holdAnswer();
    await sendText(page, 'delayed secret turn');
    await expect(transcript(page)).toContainText('Checking authorized records…');
    const aborted = page.waitForEvent('requestfailed', (request) => request.url().endsWith('/answers'));
    if (event === 'hidden') {
      await page.evaluate(() => {
        Object.defineProperty(document, 'visibilityState', { configurable: true, value: 'hidden' });
        document.dispatchEvent(new Event('visibilitychange'));
      });
    } else if (event === 'blur') {
      await page.evaluate(() => window.dispatchEvent(new Event('blur')));
    } else {
      await panel(page).getByRole('button', { name: event === 'reset' ? 'Reset conversation' : 'Minimise chat', exact: true }).click();
    }
    await aborted;
    await held.release();
    if (event === 'close') {
      await page.getByRole('button', { name: 'Open PMS assistant chat' }).click();
    } else if (event === 'hidden') {
      await page.evaluate(() => {
        Object.defineProperty(document, 'visibilityState', { configurable: true, value: 'visible' });
        document.dispatchEvent(new Event('visibilitychange'));
      });
    } else if (event === 'blur') {
      await fixture.refresh();
    }
    await expect(panel(page).getByRole('button', { name: 'Reset suggestions', exact: true })).toBeEnabled();
    await expect(chips(page).first()).toHaveText(DEFAULTS[2]);
    await expect(transcript(page)).not.toContainText('previous verified turn');
    await expect(transcript(page)).not.toContainText('delayed secret turn');
    await expect(transcript(page)).not.toContainText('Intercepted overdue');
    await expect(transcript(page)).not.toContainText('Checking authorized records…');
    expect(await storedPrefs(page, SESSION_A)).toEqual(prefs);
    await expect(composer(page)).toHaveValue('');
  });
}

test('a late trusted status cannot restore an older namespace after a newer session refresh', async ({ page }) => {
  const fixture = await assistantFixture(page);
  await fixture.open(SESSION_A);
  const held = fixture.holdStatus();
  const requested = page.waitForRequest('**/api/pms-assistant/status');
  await page.evaluate(() => window.dispatchEvent(new Event('focus')));
  await requested;
  const aborted = page.waitForEvent('requestfailed', (request) => request.url().endsWith('/status'));
  await fixture.refresh(verifiedStatus(SESSION_B));
  await aborted;
  await held.release();
  fixture.api.response = answer(SESSION_B, 'blockers', 'empty');
  await sendText(page, 'new session after stale status');
  await expectResponse(page, 'Intercepted blockers empty response');
  await expect(chips(page).first()).toHaveText(DEFAULTS[3]);
  expect(await storedPrefs(page, SESSION_A)).toBeNull();
  expect(await storedPrefs(page, SESSION_B)).toEqual({ blockers: { n: 1, t: expect.any(Number) } });
});

for (const failure of ['http', 'invalid key', 'invalid status', 'not ready'] as const) {
  test(`verified status ${failure} failure clears authorization and restores neutral defaults`, async ({ page }) => {
    const fixture = await assistantFixture(page);
    await fixture.open(SESSION_A);
    fixture.api.response = answer(SESSION_A, 'blockers', 'empty');
    await sendText(page, 'previous authorized question');
    await expectResponse(page, 'Intercepted blockers empty response');
    const prefs = await storedPrefs(page, SESSION_A);
    const status = failure === 'invalid key' ? verifiedStatus('not-a-server-key')
      : failure === 'invalid status' ? { ready: 'true', reason: 'ready' }
      : failure === 'not ready' ? { ready: false, reason: 'unavailable', personalization: { key: SESSION_A, timeZone: 'UTC' } }
      : verifiedStatus(SESSION_A);
    await fixture.refresh(status, failure === 'http' ? 503 : 200);
    await expect(panel(page).getByRole('button', { name: 'Reset suggestions', exact: true })).toBeDisabled();
    await expect(chips(page)).toHaveText(DEFAULTS);
    await expect(transcript(page)).not.toContainText('previous authorized question');
    // An answer cannot override the failed status to enable learning.
    fixture.api.response = answer(SESSION_A, 'overdue', 'empty');
    await sendText(page, 'unverified question');
    await expectResponse(page, 'Intercepted overdue empty response');
    await expect(chips(page)).toHaveText(DEFAULTS);
    expect(await storedPrefs(page, SESSION_A)).toEqual(prefs);
    await fixture.refresh(verifiedStatus(SESSION_A));
    await expect(chips(page).first()).toHaveText(DEFAULTS[3]);
    await expect(transcript(page)).not.toContainText('unverified question');
  });
}

for (const storage of ['denied', 'corrupt', 'oversized', 'expired'] as const) {
  test(`${storage} storage safely starts with defaults and never persists transcripts`, async ({ page }) => {
    await page.addInitScript(({ mode, storageKey }) => {
      if (mode === 'denied') {
        Object.defineProperty(window, 'localStorage', { configurable: true, get() { throw new DOMException('Denied', 'SecurityError'); } });
      } else {
        localStorage.setItem(storageKey, mode === 'corrupt' ? '{broken'
          : mode === 'oversized' ? 'x'.repeat(2049)
          : JSON.stringify({ blockers: { n: 20, t: Date.now() - 91 * 24 * 60 * 60 * 1000 } }));
      }
    }, { mode: storage, storageKey: PREF_PREFIX + SESSION_A });
    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));
    const fixture = await assistantFixture(page);
    await fixture.open(SESSION_A);
    await expect(chips(page)).toHaveText(DEFAULTS);
    fixture.api.response = answer(SESSION_A, 'pending', 'empty');
    await sendText(page, 'private text must never be stored');
    await expectResponse(page, 'Intercepted pending empty response');
    await expect(chips(page).first()).toHaveText(DEFAULTS[2]);
    await panel(page).getByRole('button', { name: 'Reset conversation', exact: true }).click();
    await expect(chips(page).first()).toHaveText(storage === 'denied' ? DEFAULTS[0] : DEFAULTS[2]);
    await panel(page).getByRole('button', { name: 'Reset suggestions', exact: true }).click();
    await expect(chips(page)).toHaveText(DEFAULTS);
    if (storage !== 'denied') {
      expect(await storedPrefs(page, SESSION_A)).toBeNull();
      expect(await page.evaluate(() => JSON.stringify(localStorage))).not.toContain('private text');
    }
    expect(errors).toEqual([]);
  });
}

for (const width of [390, 680]) {
  test(`panel and composer remain inside ${width}px scrollbar-bearing viewport`, async ({ page }) => {
    await page.setViewportSize({ width, height: 720 });
    const fixture = await assistantFixture(page);
    await fixture.open();
    await page.addStyleTag({ content: 'html { overflow-y: scroll !important; } body { min-height: 2000px !important; } ::-webkit-scrollbar { width: 16px; }' });
    // With scrollbar-gutter: stable, Chromium's clientWidth includes the
    // reserved gutter; the root's layout bounds exclude it.
    expect(await page.evaluate(() => window.innerWidth - document.documentElement.getBoundingClientRect().right)).toBeGreaterThan(0);
    for (const element of [panel(page), composer(page), panel(page).getByRole('button', { name: 'Send live question' })]) {
      await expect(element).toBeVisible();
      await expect.poll(() => element.evaluate((node) => {
        const rect = node.getBoundingClientRect();
        const usableRight = Math.min(document.documentElement.clientWidth, document.documentElement.getBoundingClientRect().right);
        return rect.left >= 0 && rect.top >= 0 && rect.right <= usableRight && rect.bottom <= window.innerHeight;
      })).toBe(true);
    }
    await expect(composer(page)).toBeFocused();
    await composer(page).press('Escape');
    await expect(page.getByRole('button', { name: 'Open PMS assistant chat' })).toBeFocused();
  });
}