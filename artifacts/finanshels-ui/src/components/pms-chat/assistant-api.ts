import type {
  PmsAssistantAnswer, PmsAssistantStatus,
} from '../../../../../lib/api-client-react/src/generated/api.schemas';

export type { PmsAssistantAnswer, PmsAssistantStatus };

// The API is a sibling artifact mounted at /api, not a Next.js page route.
const API = '/api/pms-assistant';
const KEY_RE = /^[a-f0-9]{64}$/;
const INTENTS = ['my_today', 'overdue', 'pending', 'blockers', 'general'];
export const LIVE_UNAVAILABLE = 'I can’t answer from live records right now. Authorized project and task sources or the AI service are unavailable. No fictional demo data was used.';

export async function assistantStatus(signal?: AbortSignal): Promise<PmsAssistantStatus> {
  const response = await fetch(`${API}/status`, { credentials: 'same-origin', cache: 'no-store', signal });
  if (!response.ok) throw new Error('Assistant status unavailable');
  const data: unknown = await response.json();
  if (!data || typeof data !== 'object' || !('ready' in data) || typeof data.ready !== 'boolean' ||
    !('reason' in data) || typeof data.reason !== 'string') throw new Error('Invalid assistant status');
  const p = (data as { personalization?: unknown }).personalization;
  if (p !== undefined) {
    if (!p || typeof p !== 'object' || !('key' in p) || typeof p.key !== 'string' || !KEY_RE.test(p.key) ||
      !('timeZone' in p) || typeof p.timeZone !== 'string') throw new Error('Invalid personalization');
  }
  return data as PmsAssistantStatus;
}

export async function assistantAnswer(question: string, signal?: AbortSignal): Promise<PmsAssistantAnswer> {
  const response = await fetch(`${API}/answers`, {
    method: 'POST',
    credentials: 'same-origin',
    cache: 'no-store',
    headers: { 'Content-Type': 'application/json' },
    // Never send page data, browser roles, record snapshots, or a user identity.
    body: JSON.stringify({ question }),
    signal,
  });
  if (!response.ok) throw new Error('Assistant answer unavailable');
  const data = await response.json() as PmsAssistantAnswer;
  if (!data || !['answered', 'empty', 'clarification', 'unavailable'].includes(data.status) || typeof data.answer !== 'string' ||
    !Array.isArray(data.citations) || !Array.isArray(data.claims)) throw new Error('Invalid assistant answer');
  if (data.intent !== undefined && !INTENTS.includes(data.intent)) throw new Error('Invalid intent');
  if (data.personalizationKey !== undefined && (typeof data.personalizationKey !== 'string' || !KEY_RE.test(data.personalizationKey))) throw new Error('Invalid key');
  if (data.status !== 'answered') {
    if (data.citations.length || data.claims.length) throw new Error('Invalid non-evidence answer');
  } else {
    if (!data.claims.length || !data.citations.length) throw new Error('Missing evidence');
    const refs = new Set<string>();
    for (const citation of data.citations) {
      if (!citation || !['client', 'project', 'task'].includes(citation.kind) || typeof citation.id !== 'string' ||
        typeof citation.title !== 'string' || typeof citation.excerpt !== 'string') throw new Error('Invalid citation');
      refs.add(`${citation.kind}:${citation.id}`);
    }
    for (const claim of data.claims) {
      if (!claim || typeof claim.text !== 'string' || !['recorded', 'inference'].includes(claim.basis) ||
        !Array.isArray(claim.citationIds) || !claim.citationIds.length ||
        claim.citationIds.some((ref) => !refs.has(ref))) throw new Error('Invalid claim');
    }
    if (data.answer !== data.claims.map((claim) => claim.text).join(' ')) throw new Error('Uncited explanation');
  }
  return data;
}