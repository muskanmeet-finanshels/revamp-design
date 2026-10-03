export type LearnableIntent = 'my_today' | 'overdue' | 'pending' | 'blockers';
export const INTENTS: LearnableIntent[] = ['my_today', 'overdue', 'pending', 'blockers'];
export const INTENT_PROMPTS: Record<LearnableIntent, string> = {
  my_today: "What is my today's work?",
  overdue: 'Show me overdue tasks',
  pending: 'What work is pending across my clients?',
  blockers: 'What blockers are recorded?',
};
export const MAX_COUNT = 20;
export const EXPIRY_MS = 90 * 24 * 60 * 60 * 1000;
const KEY_RE = /^[a-f0-9]{64}$/;
const PREFIX = 'pms-assistant-intent-prefs:v1:';

export type Prefs = Partial<Record<LearnableIntent, { n: number; t: number }>>;
export interface StorageLike { getItem(k: string): string | null; setItem(k: string, v: string): void; removeItem(k: string): void }

export const isLearnable = (v: unknown): v is LearnableIntent => typeof v === 'string' && (INTENTS as string[]).includes(v);

function clean(raw: unknown, now: number): Prefs {
  const out: Prefs = {};
  if (!raw || typeof raw !== 'object') return out;
  for (const intent of INTENTS) {
    const e = (raw as Record<string, unknown>)[intent];
    if (!e || typeof e !== 'object') continue;
    const { n, t } = e as { n?: unknown; t?: unknown };
    if (typeof n !== 'number' || typeof t !== 'number' || !Number.isFinite(n) || !Number.isFinite(t) || n <= 0 || t < 0) continue;
    if (t > now + 60000 || now - t > EXPIRY_MS) continue;
    out[intent] = { n: Math.min(MAX_COUNT, Math.max(1, Math.floor(n))), t };
  }
  return out;
}

export function loadPrefs(storage: StorageLike | null, key: string | null, now = Date.now()): Prefs {
  if (!storage || !key || !KEY_RE.test(key)) return {};
  try {
    const raw = storage.getItem(PREFIX + key);
    return raw && raw.length <= 2048 ? clean(JSON.parse(raw), now) : {};
  } catch { return {}; }
}

function save(storage: StorageLike | null, key: string, prefs: Prefs) {
  try { storage?.setItem(PREFIX + key, JSON.stringify(prefs)); } catch { /* storage unavailable */ }
}

export function recordIntent(storage: StorageLike | null, key: string | null, intent: unknown, now = Date.now()): Prefs {
  if (!key || !KEY_RE.test(key) || !isLearnable(intent)) return loadPrefs(storage, key, now);
  const prefs = loadPrefs(storage, key, now);
  prefs[intent] = { n: Math.min(MAX_COUNT, (prefs[intent]?.n ?? 0) + 1), t: now };
  save(storage, key, prefs);
  return prefs;
}

export function resetPrefs(storage: StorageLike | null, key: string | null): Prefs {
  if (storage && key && KEY_RE.test(key)) { try { storage.removeItem(PREFIX + key); } catch { /* ignore */ } }
  return {};
}

/** Frequency first, then recency, then fixed default order (stable). */
export function rankIntents(prefs: Prefs): LearnableIntent[] {
  return [...INTENTS].sort((a, b) => {
    const pa = prefs[a], pb = prefs[b];
    return ((pb?.n ?? 0) - (pa?.n ?? 0)) || ((pb?.t ?? 0) - (pa?.t ?? 0)) || INTENTS.indexOf(a) - INTENTS.indexOf(b);
  });
}
export const chipPrompts = (prefs: Prefs) => rankIntents(prefs).map((i) => INTENT_PROMPTS[i]);
