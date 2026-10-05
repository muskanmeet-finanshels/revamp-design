import { expect, test, type Page } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import {
  answer, assistantFixture, chips, composer, DEFAULTS, expectResponse, panel,
  PERMISSION_A, PREF_PREFIX, sendText, SESSION_A, SESSION_B, storedPrefs, trackTranscriptDownloads, transcript, verifiedStatus,
} from './assistant-fixture';
import { expectUsableAssistant, expectUsableAssistantAboveTimer, expectUsableLauncher, floatingTimer, forceScrollbar } from './assistant-timer-layout';

async function resetConversation(page: Page) {
  await panel(page).getByRole('button', { name: 'Chat options', exact: true }).click();
  await panel(page).getByRole('menuitem', { name: 'Reset conversation', exact: true }).click();
}

test('the circular chevron sits below the open chat and minimises it', async ({ page }) => {
  const fixture = await assistantFixture(page);
  await fixture.open();
  const toggle = page.getByRole('button', { name: 'Minimise PMS assistant chat', exact: true });
  await expect(toggle).toBeVisible();
  await expect(toggle).toHaveAttribute('aria-expanded', 'true');
  await page.mouse.move(0, 0);
  await expect.poll(async () => {
    const chatBounds = (await panel(page).boundingBox())!;
    const toggleBounds = (await toggle.boundingBox())!;
    return toggleBounds.y - (chatBounds.y + chatBounds.height);
  }).toBeCloseTo(16, 0);
  await toggle.click();
  await expect(panel(page)).toHaveCount(0);
  const launcher = page.getByRole('button', { name: 'Open PMS assistant chat', exact: true });
  await expect(launcher).toBeFocused();
  await expect(launcher).toHaveAttribute('aria-expanded', 'false');
  await launcher.click();
  await expect(panel(page)).toBeVisible();
  await expect(toggle).toBeVisible();
});

test('opening the assistant does not wait for a slow session check or scroll the page', async ({ page }) => {
  const fixture = await assistantFixture(page);
  const status = fixture.holdStatus();
  await fixture.open();
  await status.requested;
  await expect(panel(page)).toBeVisible();
  await expect(composer(page)).toBeFocused();
  await expect(chips(page)).toHaveText(DEFAULTS);
  await page.addStyleTag({ content: 'body { min-height: 2000px !important; }' });
  await page.evaluate(() => window.scrollTo(0, 400));
  await panel(page).getByRole('button', { name: 'Minimise chat', exact: true }).click();
  await expect(panel(page)).toHaveCount(0);
  const scrollY = await page.evaluate(() => window.scrollY);
  await page.getByRole('button', { name: 'Open PMS assistant chat', exact: true }).click();
  await expect(panel(page)).toBeVisible();
  await expect(composer(page)).toBeFocused();
  expect(await page.evaluate(() => window.scrollY)).toBe(scrollY);
  await status.release();
});

test('messenger menu resizes without losing drafts and downloads only the current transcript', async ({ page }) => {
  const fixture = await assistantFixture(page);
  await fixture.open(SESSION_A);
  const chat = panel(page);
  const options = chat.getByRole('button', { name: 'Chat options', exact: true });
  await options.click();
  await expect(chat.getByRole('menuitem', { name: 'Download transcript', exact: true })).toBeDisabled();
  await page.keyboard.press('Escape');
  await expect(options).toBeFocused();
  await expect(chat).toBeVisible();

  fixture.api.response = answer(SESSION_A, 'overdue');
  await sendText(page, 'Show me overdue tasks');
  await expectResponse(page, 'Intercepted overdue answered response');
  await composer(page).fill('Keep my unsent draft');
  const compactWidth = (await chat.boundingBox())!.width;
  await options.click();
  await chat.getByRole('menuitem', { name: 'Expand window', exact: true }).click();
  await expect.poll(async () => (await chat.boundingBox())!.width).toBeGreaterThan(compactWidth + 200);
  await expect(composer(page)).toHaveValue('Keep my unsent draft');
  await expectResponse(page, 'Intercepted overdue answered response');

  await options.click();
  const downloading = page.waitForEvent('download');
  await chat.getByRole('menuitem', { name: 'Download transcript', exact: true }).click();
  const download = await downloading;
  expect(download.suggestedFilename()).toMatch(/^pms-assistant-transcript-.*\.txt$/);
  const text = await readFile((await download.path())!, 'utf8');
  expect(text).toContain('You: Show me overdue tasks');
  expect(text).toContain('Intercepted overdue answered response');
  expect(text).toContain('Test-only source excerpt');
  expect(text).not.toContain('Keep my unsent draft');
  expect(text).not.toContain(SESSION_A);

  await options.click();
  await chat.getByRole('menuitem', { name: 'Collapse window', exact: true }).click();
  await expect.poll(async () => (await chat.boundingBox())!.width).toBe(compactWidth);
  await expect(composer(page)).toHaveValue('Keep my unsent draft');
  await resetConversation(page);
  await expect(composer(page)).toHaveValue('');
  await expect(composer(page)).toBeFocused();
  await options.click();
  await expect(chat.getByRole('menuitem', { name: 'Download transcript', exact: true })).toBeDisabled();
});

for (const change of ['identity', 'permission', 'authorization lost', 'status HTTP error', 'status transport failure', 'status unreadable JSON', 'invalid status key', 'invalid status data', 'blur', 'hidden'] as const) {
  test(`${change} invalidates an already-open download menu and exports only the current conversation`, async ({ page }) => {
    const fixture = await assistantFixture(page);
    await fixture.open(SESSION_A);
    const exports = await trackTranscriptDownloads(page);
    const options = panel(page).getByRole('button', { name: 'Chat options', exact: true });
    const downloadItem = panel(page).getByRole('menuitem', { name: 'Download transcript', exact: true });
    const nextKey = change === 'permission' ? PERMISSION_A
      : change === 'identity' || change === 'authorization lost' ? SESSION_B : SESSION_A;
    const oldQuestion = 'Test-only old conversation question';
    const oldExcerpt = 'Test-only old authorized source excerpt';
    const lateQuestion = 'Test-only delayed old conversation question';
    const lateExcerpt = 'Test-only delayed old authorized source excerpt';
    const draft = 'Test-only unsent old conversation draft';

    fixture.api.response = answer(SESSION_A, 'blockers', 'answered', oldExcerpt);
    await sendText(page, oldQuestion);
    await expectResponse(page, 'Intercepted blockers answered response');
    await transcript(page).getByRole('button', { name: 'Source task:test-record: Intercepted record', exact: true }).click();
    await expect(transcript(page).getByText(oldExcerpt, { exact: true })).toBeVisible();
    fixture.api.response = answer(SESSION_A, 'overdue', 'answered', lateExcerpt);
    const held = fixture.holdAnswer();
    await sendText(page, lateQuestion);
    await expect.poll(() => fixture.api.questions.length).toBe(2);
    await expect(transcript(page)).toContainText('Checking authorized records…');
    await composer(page).fill(draft);
    await options.click();
    await expect(downloadItem).toBeEnabled();
    const aborted = page.waitForEvent('requestfailed', (request) => request.url().endsWith('/answers'));

    if (change === 'blur' || change === 'hidden') {
      // Click the already-enabled button in the SAME browser task as the
      // invalidation, before React can rerender or replace the child. This must
      // fail if clearing only queues setMessages([]) but retains the export ref.
      await downloadItem.evaluate((button, event) => {
        if (event === 'hidden') {
          Object.defineProperty(document, 'visibilityState', { configurable: true, value: 'hidden' });
          document.dispatchEvent(new Event('visibilitychange'));
        } else {
          window.dispatchEvent(new Event('blur'));
        }
        (button as HTMLButtonElement).click();
      }, change);
    } else {
      const status = change === 'authorization lost' ? { ready: false, reason: 'adapters_unavailable' }
        : change === 'invalid status key' ? verifiedStatus('not-a-server-key')
        : change === 'invalid status data' ? { ready: 'true', reason: 'ready' }
        : verifiedStatus(nextKey);
      await fixture.refresh(status, change === 'status HTTP error' ? 503 : 200,
        change === 'status transport failure' ? 'transport'
          : change === 'status unreadable JSON' ? 'unreadable JSON' : null);
      if (change === 'authorization lost' || change === 'status HTTP error'
        || change === 'status transport failure' || change === 'status unreadable JSON'
        || change === 'invalid status key' || change === 'invalid status data') {
        await expect(panel(page).getByRole('button', { name: 'Reset suggestions', exact: true })).toBeDisabled();
        await expect(chips(page)).toHaveText(DEFAULTS);
      }
      await expect(transcript(page)).not.toContainText(oldQuestion);
      // The menu was opened while old evidence existed. Its enabled state must
      // not let its retained click callback download the cleared conversation.
      await expect(downloadItem).toBeEnabled();
      await downloadItem.click();
    }
    await aborted;
    await held.release();
    await expect(transcript(page)).not.toContainText(oldQuestion);
    await expect(transcript(page)).not.toContainText(oldExcerpt);
    await expect(transcript(page)).not.toContainText(lateQuestion);
    await expect(transcript(page)).not.toContainText('Intercepted');
    await expect(composer(page)).toHaveValue('');
    await exports.expectNone();

    await options.click();
    await expect(downloadItem).toBeDisabled();
    await exports.expectNone();
    await page.keyboard.press('Escape');
    if (change === 'hidden') {
      await page.evaluate(() => {
        // Restore the browser's real visibility getter for later polling.
        delete (document as unknown as { visibilityState?: string }).visibilityState;
      });
    }
    await fixture.refresh(verifiedStatus(nextKey));
    await expect(panel(page).getByRole('button', { name: 'Reset suggestions', exact: true })).toBeEnabled();
    const currentQuestion = 'Test-only current conversation question';
    const currentExcerpt = 'Test-only current authorized source excerpt';
    fixture.api.response = answer(nextKey, 'pending', 'answered', currentExcerpt);
    await sendText(page, currentQuestion);
    await expectResponse(page, 'Intercepted pending answered response');
    await composer(page).fill('Test-only current unsent draft');
    await options.click();
    await expect(downloadItem).toBeEnabled();
    const downloading = page.waitForEvent('download');
    await downloadItem.click();
    const download = await downloading;
    expect(download.suggestedFilename()).toMatch(/^pms-assistant-transcript-.*\.txt$/);
    const text = await readFile((await download.path())!, 'utf8');
    expect(text.split('\n').filter((line) => line.startsWith('You: '))).toEqual([`You: ${currentQuestion}`]);
    expect(text).toContain('Intercepted pending answered response');
    expect(text).toContain(currentExcerpt);
    for (const excluded of [oldQuestion, oldExcerpt, lateQuestion, lateExcerpt, draft,
      'Intercepted blockers', 'Intercepted overdue', 'Test-only current unsent draft',
      SESSION_A, SESSION_B, PERMISSION_A]) {
      expect(text).not.toContain(excluded);
    }
    await exports.expectOne();
    expect(fixture.api.questions).toEqual([oldQuestion, lateQuestion, currentQuestion]);
  });
}

test('application-wide assistant has no default client or fictional demo; focus and Escape return to launcher', async ({ page }) => {
  const fixture = await assistantFixture(page);
  await fixture.open();
  await expect(panel(page)).toContainText('Application-wide scope');
  await expect(panel(page).getByRole('button', { name: 'Fictional demo', exact: true })).toHaveCount(0);
  await expect(composer(page)).toBeFocused();
  await expect(chips(page)).toHaveText(DEFAULTS);
  await expect(transcript(page)).toContainText('all the clients you are authorized to see');
  await expect(transcript(page)).not.toContainText('Nexora');
  await expect(transcript(page)).toContainText('No client or project is selected by default');
  await expect(transcript(page)).toContainText('No fictional data');
  await sendText(page, 'Show me overdue tasks');
  await expectResponse(page, 'Test-only unavailable response');
  await expect(chips(page)).toHaveText(DEFAULTS);
  await composer(page).press('Escape');
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
  await resetConversation(page);
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
    } else if (event === 'reset') {
      await resetConversation(page);
    } else {
      await panel(page).getByRole('button', { name: 'Minimise chat', exact: true }).click();
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

test('a late trusted status cannot restore an older namespace or export after a newer session refresh', async ({ page }) => {
  const fixture = await assistantFixture(page);
  await fixture.open(SESSION_A);
  const exports = await trackTranscriptDownloads(page);
  const options = panel(page).getByRole('button', { name: 'Chat options', exact: true });
  const downloadItem = panel(page).getByRole('menuitem', { name: 'Download transcript', exact: true });
  const oldQuestion = 'Test-only old session before stale status';
  const oldExcerpt = 'Test-only old session source before stale status';
  const oldDraft = 'Test-only unsent draft before stale status';
  fixture.api.response = answer(SESSION_A, 'pending', 'answered', oldExcerpt);
  await sendText(page, oldQuestion);
  await expectResponse(page, 'Intercepted pending answered response');
  const oldPrefs = await storedPrefs(page, SESSION_A);
  await composer(page).fill(oldDraft);
  await options.click();
  await expect(downloadItem).toBeEnabled();
  const held = fixture.holdStatus();
  await page.evaluate(() => window.dispatchEvent(new Event('focus')));
  await held.requested;
  const aborted = page.waitForEvent('requestfailed', (request) => request.url().endsWith('/status'));
  await fixture.refresh(verifiedStatus(SESSION_B));
  await aborted;
  await expect(transcript(page)).not.toContainText(oldQuestion);
  await expect(chips(page)).toHaveText(DEFAULTS);
  await expect(composer(page)).toHaveValue('');
  // Release the captured A status only after B has cleared the transcript.
  // Neither that response nor the menu's retained callback may revive A data.
  await held.release();
  await expect(downloadItem).toBeEnabled();
  await downloadItem.click();
  await exports.expectNone();
  await options.click();
  await expect(downloadItem).toBeDisabled();
  await page.keyboard.press('Escape');
  const currentQuestion = 'new session after stale status';
  const currentExcerpt = 'Test-only current session source after stale status';
  fixture.api.response = answer(SESSION_B, 'blockers', 'answered', currentExcerpt);
  await sendText(page, currentQuestion);
  await expectResponse(page, 'Intercepted blockers answered response');
  await expect(chips(page).first()).toHaveText(DEFAULTS[3]);
  expect(await storedPrefs(page, SESSION_A)).toEqual(oldPrefs);
  expect(await storedPrefs(page, SESSION_B)).toEqual({ blockers: { n: 1, t: expect.any(Number) } });
  await composer(page).fill('Test-only current unsent draft');
  await options.click();
  await expect(downloadItem).toBeEnabled();
  const downloading = page.waitForEvent('download');
  await downloadItem.click();
  const download = await downloading;
  expect(download.suggestedFilename()).toMatch(/^pms-assistant-transcript-.*\.txt$/);
  const text = await readFile((await download.path())!, 'utf8');
  expect(text.split('\n').filter((line) => line.startsWith('You: '))).toEqual([`You: ${currentQuestion}`]);
  expect(text).toContain('Intercepted blockers answered response');
  expect(text).toContain(currentExcerpt);
  for (const excluded of [oldQuestion, oldExcerpt, oldDraft, 'Intercepted pending',
    'Test-only current unsent draft', SESSION_A, SESSION_B, PERMISSION_A]) {
    expect(text).not.toContain(excluded);
  }
  await exports.expectOne();
  expect(fixture.api.questions).toEqual([oldQuestion, currentQuestion]);
});

for (const failure of ['HTTP error', 'transport', 'unreadable JSON'] as const) {
  test(`a late ${failure} status failure cannot clear recovered evidence or disable its current-only export`, async ({ page }) => {
    const fixture = await assistantFixture(page);
    await fixture.open(SESSION_A);
    const exports = await trackTranscriptDownloads(page);
    const options = panel(page).getByRole('button', { name: 'Chat options', exact: true });
    const downloadItem = panel(page).getByRole('menuitem', { name: 'Download transcript', exact: true });
    const resetSuggestions = panel(page).getByRole('button', { name: 'Reset suggestions', exact: true });
    const oldQuestion = 'Test-only old session before failed status';
    const oldExcerpt = 'Test-only old source before failed status';
    const oldDraft = 'Test-only old unsent draft before failed status';
    const currentQuestion = 'Test-only recovered session question';
    const currentExcerpt = 'Test-only recovered session source';
    const currentDraft = 'Test-only recovered unsent draft';
    fixture.api.response = answer(SESSION_A, 'pending', 'answered', oldExcerpt);
    await sendText(page, oldQuestion);
    await expectResponse(page, 'Intercepted pending answered response');
    const oldPrefs = await storedPrefs(page, SESSION_A);
    await composer(page).fill(oldDraft);

    // Let ONLY the next intercepted status fetch survive cancellation. Otherwise
    // refresh aborts it before B is verified, so releasing holdStatus would never
    // exercise an old failure reaching the catch branch after recovery.
    await page.evaluate(() => {
      const realFetch = window.fetch.bind(window);
      window.fetch = (input, init) => {
        const url = input instanceof Request ? input.url : String(input);
        if (new URL(url, window.location.href).pathname === '/api/pms-assistant/status') {
          window.fetch = realFetch;
          return realFetch(input, { ...init, signal: undefined });
        }
        return realFetch(input, init);
      };
    });
    fixture.api.statusCode = failure === 'HTTP error' ? 503 : 200;
    fixture.api.statusFailure = failure === 'HTTP error' ? null : failure;
    const held = fixture.holdStatus();
    await page.evaluate(() => window.dispatchEvent(new Event('focus')));
    await held.requested;
    await fixture.refresh(verifiedStatus(SESSION_B));
    await expect(resetSuggestions).toBeEnabled();
    await expect(transcript(page)).not.toContainText(oldQuestion);
    await expect(transcript(page)).not.toContainText(oldExcerpt);
    await expect(composer(page)).toHaveValue('');
    await expect(chips(page)).toHaveText(DEFAULTS);

    fixture.api.response = answer(SESSION_B, 'blockers', 'answered', currentExcerpt);
    await sendText(page, currentQuestion);
    await expectResponse(page, 'Intercepted blockers answered response');
    await transcript(page).getByRole('button', { name: 'Source task:test-record: Intercepted record', exact: true }).click();
    await expect(transcript(page).getByText(currentExcerpt, { exact: true })).toBeVisible();
    const currentPrefs = await storedPrefs(page, SESSION_B);
    await composer(page).fill(currentDraft);
    await options.click();
    await expect(downloadItem).toBeEnabled();

    // Register settlement before release; transport errors have no response.
    const settled = failure === 'transport'
      ? page.waitForEvent('requestfailed', (request) => new URL(request.url()).pathname === '/api/pms-assistant/status')
      : page.waitForResponse('**/api/pms-assistant/status').then(async (response) => {
        expect(response.status()).toBe(failure === 'HTTP error' ? 503 : 200);
        expect(await response.finished()).toBeNull();
      });
    await held.release();
    await settled;
    // Let the failed fetch/JSON continuation and any queued React update finish
    // before asserting that the current evidence and retained menu stayed valid.
    await page.evaluate(() => new Promise<void>((resolve) =>
      requestAnimationFrame(() => requestAnimationFrame(() => resolve()))));
    await expect(resetSuggestions).toBeEnabled();
    await expect(chips(page).first()).toHaveText(DEFAULTS[3]);
    await expectResponse(page, 'Intercepted blockers answered response');
    await expect(transcript(page)).toContainText(currentQuestion);
    await expect(transcript(page).getByText(currentExcerpt, { exact: true })).toBeVisible();
    await expect(transcript(page)).not.toContainText(oldQuestion);
    await expect(transcript(page)).not.toContainText(oldExcerpt);
    await expect(composer(page)).toHaveValue(currentDraft);
    expect(await storedPrefs(page, SESSION_A)).toEqual(oldPrefs);
    expect(await storedPrefs(page, SESSION_B)).toEqual(currentPrefs);
    await expect(downloadItem).toBeEnabled();
    await exports.expectNone();

    const downloading = page.waitForEvent('download');
    await downloadItem.click();
    const download = await downloading;
    expect(download.suggestedFilename()).toMatch(/^pms-assistant-transcript-.*\.txt$/);
    const text = await readFile((await download.path())!, 'utf8');
    expect(text.split('\n').filter((line) => line.startsWith('You: '))).toEqual([`You: ${currentQuestion}`]);
    expect(text).toContain('Intercepted blockers answered response');
    expect(text).toContain(currentExcerpt);
    for (const excluded of [oldQuestion, oldExcerpt, oldDraft, currentDraft,
      'Intercepted pending', SESSION_A, SESSION_B, PERMISSION_A, PREF_PREFIX]) {
      expect(text).not.toContain(excluded);
    }
    await exports.expectOne();
    expect(fixture.api.questions).toEqual([oldQuestion, currentQuestion]);
  });
}

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
    await resetConversation(page);
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

for (const width of [390, 680]) {
  test(`expanded messenger stays usable when a timer starts and stops at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 720 });
    const fixture = await assistantFixture(page);
    await fixture.open();
    await forceScrollbar(page);
    await panel(page).getByRole('button', { name: 'Chat options', exact: true }).click();
    await panel(page).getByRole('menuitem', { name: 'Expand window', exact: true }).click();
    const running = {
      taskId: 'test-only-expanded-chat-timer',
      taskName: 'Test-only task: reconcile quarterly client accounts and prepare the supporting financial documentation',
      projectName: 'Test Client- Expanded Assistant',
      startedAt: Date.now() - 60_000, totalPausedMs: 0, pausedAt: null,
    };
    for (const state of [null, running, null]) {
      await fixture.timer.setState(state);
      await expectUsableAssistant(page, state !== null);
      await expect(composer(page)).toHaveValue('Test-only timer layout question');
    }
    expect(fixture.timer.writes).toEqual([]);
  });

  test(`timer activation and removal preserve open assistant and reclaim space at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 720 });
    const fixture = await assistantFixture(page);
    await fixture.open();
    await forceScrollbar(page);
    const running = {
      taskId: 'test-only-transition-timer',
      taskName: 'Test-only task: reconcile quarterly accounts and prepare supporting documentation for the financial review',
      projectName: 'Test Client- Timer Transitions',
      startedAt: Date.now() - 60_000, totalPausedMs: 0, pausedAt: null,
    };
    const chat = panel(page);
    const baseline = await chat.boundingBox();
    expect(baseline).not.toBeNull();
    // Holding this DOM node proves timer polling never closes/reopens the chat.
    const originalPanel = await chat.elementHandle();
    try {
      for (const state of [null, running, null]) {
        await fixture.timer.setState(state);
        await expectUsableAssistant(page, state !== null);
        expect(await originalPanel!.evaluate((node) =>
          node.isConnected && node === document.getElementById('pms-assistant-panel'))).toBe(true);
        if (state) {
          await expect(floatingTimer(page).getByText(running.taskName, { exact: true })).toBeVisible();
          expect((await chat.boundingBox())!.height).toBeLessThan(baseline!.height);
        } else {
          await expect.poll(async () => {
            const bounds = (await chat.boundingBox())!;
            return Math.abs(bounds.height - baseline!.height) <= 1
              && Math.abs(bounds.y - baseline!.y) <= 1;
          }).toBe(true);
        }
        // Use the composer and header in all three states, not just the end.
        await chat.getByRole('button', { name: 'Send live question', exact: true }).click();
        await expectResponse(page, 'Test-only unavailable response');
        await resetConversation(page);
        await expect(transcript(page)).not.toContainText('Test-only timer layout question');
        await expect(composer(page)).toHaveValue('');
        await expect(composer(page)).toBeFocused();
      }
      expect(fixture.api.questions).toEqual(Array(3).fill('Test-only timer layout question'));
      expect(fixture.timer.snapshots.map((state) => state?.taskId ?? null).filter((id, index, ids) =>
        index === 0 || id !== ids[index - 1])).toEqual([null, running.taskId, null]);
      expect(fixture.timer.writes).toEqual([]);
    } finally {
      await originalPanel?.dispose();
    }
  });

  test(`launcher moves above an activated timer and reclaims space after removal at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 720 });
    const fixture = await assistantFixture(page);
    await fixture.open();
    await forceScrollbar(page);
    await panel(page).getByRole('button', { name: 'Minimise chat', exact: true }).click();
    const running = {
      taskId: 'test-only-launcher-timer', taskName: 'Test-only launcher task',
      projectName: 'Test Client- Timer Transitions',
      startedAt: Date.now() - 60_000, totalPausedMs: 0, pausedAt: null,
    };
    for (const state of [null, running, null]) {
      await fixture.timer.setState(state);
      await expectUsableLauncher(page, state !== null);
    }
    // The reclaimed launcher must still open a usable chat.
    await page.getByRole('button', { name: 'Open PMS assistant chat', exact: true }).click();
    await expectUsableAssistant(page, false);
    expect(fixture.timer.snapshots.map((state) => state?.taskId ?? null).filter((id, index, ids) =>
      index === 0 || id !== ids[index - 1])).toEqual([null, running.taskId, null]);
    expect(fixture.timer.writes).toEqual([]);
  });
}

for (const width of [390, 680]) {
  test(`running timer preserves usable assistant controls through name, minimize and resize transitions from ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 720 });
    const fixture = await assistantFixture(page, {
      taskId: 'test-only-layout-timer',
      taskName: 'Test-only short task',
      projectName: 'Test Client- Layout Regression',
      startedAt: Date.now() - 60_000,
      totalPausedMs: 0,
      pausedAt: null,
    });
    await fixture.open();
    await forceScrollbar(page);
    await expect(floatingTimer(page)).toHaveAttribute('role', 'status');
    await expectUsableAssistantAboveTimer(page);
    const shortHeight = await floatingTimer(page).evaluate((node) => node.getBoundingClientRect().height);
    // The polling response changes only the name while the same running timer
    // remains mounted. This exercises measured-height updates independently of
    // the active/minimised effect dependencies.
    const longName = 'Test-only task: reconcile the quarterly client accounts, investigate outstanding invoice discrepancies, and prepare detailed supporting documentation for the financial review meeting';
    fixture.timer.state = { ...fixture.timer.state!, taskName: longName };
    await expect(floatingTimer(page).getByText(longName, { exact: true })).toBeVisible();
    await expect.poll(() => floatingTimer(page).evaluate((node) => node.getBoundingClientRect().height))
      .toBeGreaterThan(shortHeight + 48);
    await expectUsableAssistantAboveTimer(page);

    for (const viewport of [{ width: 1280, height: 900 }, { width: 390, height: 720 }]) {
      await page.setViewportSize(viewport);
      await expectUsableAssistantAboveTimer(page);
    }
    await floatingTimer(page).getByRole('button', { name: 'Minimise timer widget', exact: true }).click();
    await expect(page.getByRole('button', { name: 'Restore timer', exact: true })).toBeVisible();
    await expectUsableAssistantAboveTimer(page);
    await expect.poll(() => floatingTimer(page).evaluate((node) => node.getBoundingClientRect().height)).toBeLessThan(shortHeight);
    await page.setViewportSize({ width: 680, height: 640 });
    await expectUsableAssistantAboveTimer(page);

    await page.getByRole('button', { name: 'Restore timer', exact: true }).click();
    await expect(floatingTimer(page).getByText(longName, { exact: true })).toBeVisible();
    await expectUsableAssistantAboveTimer(page);
    await page.setViewportSize({ width, height: 720 });
    await expectUsableAssistantAboveTimer(page);

    // Actually use composer and header controls too; visibility alone does not
    // establish that the higher-z-index timer leaves them actionable.
    await panel(page).getByRole('button', { name: 'Send live question', exact: true }).click();
    await expectResponse(page, 'Test-only unavailable response');
    expect(fixture.api.questions).toEqual(['Test-only timer layout question']);
    await resetConversation(page);
    await expect(transcript(page)).not.toContainText('Test-only timer layout question');
    await panel(page).getByRole('button', { name: 'Minimise chat', exact: true }).click();
    await expect(panel(page)).toHaveCount(0);
    await page.getByRole('button', { name: 'Open PMS assistant chat', exact: true }).click();
    await expectUsableAssistantAboveTimer(page);
    expect(fixture.timer.reads).toBeGreaterThanOrEqual(2);
    expect(fixture.timer.writes).toEqual([]);
  });
}