import { expect, type Download, type Page, type Route } from '@playwright/test';
import type { PmsAssistantAnswer } from '../src/components/pms-chat/assistant-api';

// Opaque test-only server namespaces, not users/roles supplied by the browser.
export const SESSION_A = 'a'.repeat(64);
export const SESSION_B = 'b'.repeat(64);
export const PERMISSION_A = 'c'.repeat(64);
export const PREF_PREFIX = 'pms-assistant-intent-prefs:v1:';
export const DEFAULTS = [
  "What is my today's work?",
  'Show me overdue tasks',
  'What work is pending across my clients?',
  'What blockers are recorded?',
];
export const panel = (page: Page) => page.getByRole('region', { name: 'PMS assistant chat' });
export const transcript = (page: Page) => page.getByRole('log', { name: 'Live assistant transcript' });
export const chips = (page: Page) => panel(page).getByTestId('chip-intent');
export const composer = (page: Page) => page.getByRole('textbox', { name: 'Ask about authorized records' });

export function verifiedStatus(key: string) {
  return { ready: true, reason: 'ready', personalization: { key, timeZone: 'UTC' } };
}

type StatusFailure = 'transport' | 'unreadable JSON' | null;

export function answer(key: string, intent: PmsAssistantAnswer['intent'], status: PmsAssistantAnswer['status'] = 'answered', excerpt = 'Test-only source excerpt'): PmsAssistantAnswer {
  const text = `Intercepted ${intent} ${status} response`;
  return {
    status, answer: text, intent, personalizationKey: key,
    citations: status === 'answered' ? [{ kind: 'task', id: 'test-record', title: 'Intercepted record', excerpt }] : [],
    claims: status === 'answered' ? [{ text, basis: 'recorded', citationIds: ['task:test-record'] }] : [],
  };
}

export interface TestTimerSnapshot {
  taskId: string;
  taskName: string;
  projectName: string;
  startedAt: number;
  totalPausedMs: number;
  pausedAt: number | null;
}

export async function assistantFixture(page: Page, timerState: TestTimerSnapshot | null = null) {
  const timer = {
    state: timerState, reads: 0, writes: [] as string[],
    snapshots: [] as (TestTimerSnapshot | null)[],
    async setState(state: TestTimerSnapshot | null) {
      // Let the provider's real polling consume the change, without a timer
      // mutation or a test-only fetch that would bypass the React update.
      const response = page.waitForResponse((response) =>
        new URL(response.url()).pathname === '/api/timer'
        && response.request().method() === 'GET');
      timer.state = state;
      await response;
    },
  };
  // Install before navigation: even the initial hydration and later polls must
  // never read live timer records. Unexpected mutations are blocked, not forwarded.
  await page.route(/\/api\/timer(?:\/[^?]*)?(?:\?.*)?$/, async (route) => {
    const method = route.request().method();
    if (method !== 'GET') {
      timer.writes.push(method);
      await route.abort('blockedbyclient');
      return;
    }
    timer.reads++;
    const snapshot = timer.state;
    timer.snapshots.push(snapshot);
    await route.fulfill({ status: 200, json: snapshot });
  });
  const api = {
    status: { ready: false, reason: 'adapters_unavailable' } as unknown,
    statusCode: 200,
    statusFailure: null as StatusFailure,
    response: { status: 'unavailable', answer: 'Test-only unavailable response', citations: [], claims: [] } as unknown,
    answerCode: 200,
    questions: [] as string[],
  };
  type Deferred = {
    gate: Promise<void>; release: () => void; done: Promise<void>; finish: () => void;
    requested: Promise<void>; capture: () => void;
  };
  let held: Deferred | undefined;
  let heldStatus: Deferred | undefined;
  function deferred(): Deferred {
    let release!: () => void;
    let finish!: () => void;
    let capture!: () => void;
    const gate = new Promise<void>((resolve) => { release = resolve; });
    const done = new Promise<void>((resolve) => { finish = resolve; });
    const requested = new Promise<void>((resolve) => { capture = resolve; });
    return { gate, release, done, finish, requested, capture };
  }
  await page.route('**/api/pms-assistant/**', async (route: Route) => {
    const path = new URL(route.request().url()).pathname;
    if (path.endsWith('/status')) {
      expect(route.request().method()).toBe('GET');
      const status = api.status;
      const code = api.statusCode;
      const failure = api.statusFailure;
      const pending = heldStatus;
      heldStatus = undefined;
      // Signal only after snapshotting the old status/code/failure. A request event
      // alone can fire before the route captures them for a later race release.
      pending?.capture();
      if (pending) await pending.gate;
      try {
        if (failure === 'transport') {
          await route.abort('connectionfailed');
        } else if (failure === 'unreadable JSON') {
          // Successful HTTP response, but response.json() must reject.
          await route.fulfill({ status: code, contentType: 'application/json', body: '{"ready":' });
        } else {
          await route.fulfill({ status: code, json: status });
        }
      } finally {
        pending?.finish();
      }
      return;
    }
    expect(path).toBe('/api/pms-assistant/answers');
    expect(route.request().method()).toBe('POST');
    const body = route.request().postDataJSON();
    // Both input paths must send question ONLY: no browser identity or authority.
    expect(body).toEqual({ question: expect.any(String) });
    api.questions.push(body.question);
    const response = api.response;
    const code = api.answerCode;
    const deferred = held;
    held = undefined;
    if (deferred) await deferred.gate;
    try {
      await route.fulfill({ status: code, json: response });
    } finally {
      deferred?.finish();
    }
  });
  return {
    api,
    timer,
    async open(key?: string) {
      if (key) api.status = verifiedStatus(key);
      // This request starts in the provider's client effect. Waiting for it
      // prevents clicking the server-rendered launcher before hydration.
      const hydrated = page.waitForRequest('**/api/timer');
      await page.goto('/projects', { waitUntil: 'domcontentloaded' });
      await hydrated;
      await page.getByRole('button', { name: 'Open PMS assistant chat' }).click();
      await expect(panel(page)).toBeVisible();
      await expect(panel(page).getByRole('button', { name: 'Reset suggestions', exact: true }))
        [key ? 'toBeEnabled' : 'toBeDisabled']();
    },
    async refresh(status: unknown = api.status, code = 200, failure: StatusFailure = null) {
      api.status = status;
      api.statusCode = code;
      api.statusFailure = failure;
      // Aborted requests never emit a response. Listen before triggering focus
      // so the transport failure cannot race past the fixture's waiter.
      const settled = failure === 'transport'
        ? page.waitForEvent('requestfailed', (request) => new URL(request.url()).pathname === '/api/pms-assistant/status')
        : page.waitForResponse('**/api/pms-assistant/status');
      await page.evaluate(() => window.dispatchEvent(new Event('focus')));
      await settled;
    },
    holdAnswer() {
      const pending = deferred();
      held = pending;
      return { async release() { pending.release(); await pending.done; } };
    },
    holdStatus() {
      const pending = deferred();
      heldStatus = pending;
      return {
        requested: pending.requested,
        async release() { pending.release(); await pending.done; },
      };
    },
  };
}

export async function sendText(page: Page, question: string) {
  await composer(page).fill(question);
  await composer(page).press('Enter');
}

export async function expectResponse(page: Page, text: string) {
  await expect(transcript(page).getByText(text, { exact: true })).toBeVisible();
  await expect(transcript(page).getByText('Checking authorized records…')).toHaveCount(0);
}

export async function storedPrefs(page: Page, key: string) {
  return page.evaluate((storageKey) => {
    const raw = localStorage.getItem(storageKey);
    return raw ? JSON.parse(raw) : null;
  }, PREF_PREFIX + key);
}

export async function trackTranscriptDownloads(page: Page) {
  const downloads: Download[] = [];
  page.on('download', (download) => downloads.push(download));
  // Observe Blob creation synchronously too: a negative download-event check
  // alone can pass before the browser has delivered the event. Keep the real
  // implementation so successful exports still produce genuine browser files.
  await page.evaluate(() => {
    const createObjectURL = URL.createObjectURL.bind(URL);
    document.documentElement.dataset.assistantDownloadBlobs = '0';
    URL.createObjectURL = (object) => {
      if (object instanceof Blob && object.type.startsWith('text/plain')) {
        const root = document.documentElement;
        root.dataset.assistantDownloadBlobs = String(Number(root.dataset.assistantDownloadBlobs) + 1);
      }
      return createObjectURL(object);
    };
  });
  return {
    downloads,
    async expectNone() {
      await expect(page.locator('html')).toHaveAttribute('data-assistant-download-blobs', '0');
      expect(downloads).toHaveLength(0);
    },
    async expectOne() {
      await expect(page.locator('html')).toHaveAttribute('data-assistant-download-blobs', '1');
      expect(downloads).toHaveLength(1);
    },
  };
}