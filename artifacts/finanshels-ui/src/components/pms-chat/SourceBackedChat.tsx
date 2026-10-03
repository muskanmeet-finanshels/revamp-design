'use client';

import { useEffect, useRef, useState } from 'react';
import { ChevronDown, Send } from 'lucide-react';
import { chipPrompts, loadPrefs, recordIntent, resetPrefs, type Prefs, type StorageLike } from './assistant-preferences';
import { assistantAnswer, LIVE_UNAVAILABLE, type PmsAssistantAnswer } from './assistant-api';

type Message = { id: number; role: 'user'; text: string } |
  { id: number; role: 'assistant'; response: PmsAssistantAnswer };

function browserStorage(): StorageLike | null {
  try { return window.localStorage; } catch { return null; }
}

export function SourceBackedChat({ ready, contextKey }: { ready: boolean; contextKey: string | null }) {
  const [prefs, setPrefs] = useState<Prefs>({});
  const keyRef = useRef(contextKey);
  keyRef.current = contextKey;
  // Hydrate after the deterministic first render; only for a trusted context.
  useEffect(() => {
    setPrefs(ready && contextKey ? loadPrefs(browserStorage(), contextKey) : {});
  }, [ready, contextKey]);
  const canLearn = ready && !!contextKey;
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const pending = useRef<AbortController | null>(null);
  const sequence = useRef(0);
  const end = useRef<HTMLDivElement>(null);

  useEffect(() => { end.current?.scrollIntoView({ block: 'end' }); }, [messages, busy]);
  useEffect(() => {
    // Do not keep authorized excerpts visible across tab/session switches.
    const clear = () => {
      pending.current?.abort();
      pending.current = null;
      sequence.current++;
      setBusy(false);
      setMessages([]);
      setExpanded({});
      setInput('');
      setPrefs({});
    };
    const visibility = () => { if (document.visibilityState === 'hidden') clear(); };
    window.addEventListener('blur', clear);
    document.addEventListener('visibilitychange', visibility);
    return () => {
      pending.current?.abort();
      window.removeEventListener('blur', clear);
      document.removeEventListener('visibilitychange', visibility);
    };
  }, []);
  useEffect(() => {
    if (!ready) {
      pending.current?.abort();
      pending.current = null;
      sequence.current++;
      setBusy(false);
      setMessages([]);
      setExpanded({});
    }
  }, [ready]);

  async function send(text: string) {
    const question = text.trim();
    if (!question || pending.current) return;
    const controller = new AbortController();
    pending.current = controller;
    const turn = ++sequence.current;
    setBusy(true);
    setInput('');
    setMessages((current) => [...current, { id: turn * 2, role: 'user', text: question }]);
    const sentKey = canLearn ? contextKey : null;
    const timeout = window.setTimeout(() => controller.abort(), 30000);
    let response: PmsAssistantAnswer;
    try {
      response = await assistantAnswer(question, controller.signal);
    } catch {
      response = { status: 'unavailable', answer: LIVE_UNAVAILABLE, citations: [], claims: [] };
    } finally {
      window.clearTimeout(timeout);
    }
    // Closing/resetting/switching sessions discards stale responses.
    if (sequence.current !== turn) return;
    pending.current = null;
    setBusy(false);
    if (sentKey && keyRef.current === sentKey && (response.status === 'answered' || response.status === 'empty') &&
      response.intent && response.personalizationKey === sentKey) {
      setPrefs(recordIntent(browserStorage(), sentKey, response.intent));
    }
    setMessages((current) => [...current, { id: turn * 2 + 1, role: 'assistant', response }]);
  }

  return (
    <>
      <div className="min-h-0 flex-1 space-y-3 overflow-y-auto px-4 py-4" role="log" aria-label="Live assistant transcript">
        <p className="rounded-xl bg-gray-50 p-3 text-[12px] text-gray-600">
          Hi, ask me about your work across all the clients you are authorized to see. Each answer identifies its sources; inferences are labeled, not recorded causes.
          {!ready && <span className="mt-1 block text-gray-500">Live records are not connected yet. No fictional data will be used to answer your question.</span>}
          {' '}Read-only: no tasks are changed and nothing is sent to clients.
        </p>
        {messages.map((message) => (
          <div key={message.id} className={message.role === 'user' ? 'flex justify-end' : 'flex justify-start'}>
            <div className="max-w-[90%] space-y-2">
              {message.role === 'user' ? (
                <p className="whitespace-pre-wrap break-words rounded-2xl bg-[#082032] px-3.5 py-2.5 text-[13px] text-white">{message.text}</p>
              ) : message.response.status !== 'answered' ? (
                <p className="rounded-2xl bg-gray-100 px-3.5 py-2.5 text-[13px] text-[#082032]">{message.response.answer}</p>
              ) : (
                <>
                  {message.response.claims.map((claim, index) => (
                    <div key={index} className="rounded-2xl bg-gray-100 px-3.5 py-2.5 text-[13px] text-[#082032]">
                      <p className="mb-1 text-[10px] font-semibold uppercase text-gray-500">{claim.basis === 'recorded' ? 'Recorded fact' : 'Inference — not a recorded cause'}</p>
                      <p className="whitespace-pre-wrap break-words">{claim.text}</p>
                      <p className="mt-1 break-words text-[11px] text-gray-500">References: {claim.citationIds.join(', ')}</p>
                    </div>
                  ))}
                  {message.response.citations.map((citation) => {
                    const ref = `${citation.kind}:${citation.id}`;
                    const key = `${message.id}:${ref}`;
                    return (
                      <div key={key} className="rounded-lg border border-gray-200 text-[11.5px]">
                        <button type="button" aria-expanded={!!expanded[key]} onClick={() => setExpanded((current) => ({ ...current, [key]: !current[key] }))} className="flex w-full items-center justify-between gap-2 px-2.5 py-1.5 text-left text-gray-600">
                          <span className="break-words">Source {ref}: {citation.title}</span>
                          <ChevronDown size={13} className={expanded[key] ? 'shrink-0 rotate-180' : 'shrink-0'} />
                        </button>
                        {expanded[key] && <p className="whitespace-pre-wrap break-words border-t border-gray-100 px-2.5 py-1.5 text-gray-500">{citation.excerpt}</p>}
                      </div>
                    );
                  })}
                </>
              )}
            </div>
          </div>
        ))}
        {busy && <p role="status" className="text-[12px] text-gray-500">Checking authorized records…</p>}
        <div ref={end} />
      </div>
      <div className="shrink-0 border-t border-gray-100 px-3 pb-3 pt-2">
        <div className="mb-2 flex flex-wrap gap-1.5">
          {chipPrompts(prefs).map((prompt) => (
            <button key={prompt} data-testid="chip-intent" type="button" disabled={busy} onClick={() => void send(prompt)} className="rounded-full border border-gray-200 px-2.5 py-1 text-[11.5px] text-gray-700 hover:bg-gray-50 disabled:opacity-40">{prompt}</button>
          ))}
        </div>
        <form onSubmit={(event) => { event.preventDefault(); void send(input); }} className="flex items-end gap-2 rounded-2xl border border-gray-200 p-1.5 focus-within:ring-2 focus-within:ring-[#F16611]">
          <textarea data-composer value={input} onChange={(event) => setInput(event.target.value)} maxLength={4000} rows={1} aria-label="Ask about authorized records" placeholder="Ask about your work across clients" onKeyDown={(event) => {
            if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) { event.preventDefault(); void send(input); }
          }} className="max-h-24 min-h-[36px] flex-1 resize-none bg-transparent px-2 py-2 text-[13px] focus:outline-none" />
          <button type="submit" disabled={busy || !input.trim()} aria-label="Send live question" className="flex h-9 w-9 items-center justify-center rounded-full bg-black text-white disabled:opacity-40"><Send size={15} /></button>
        </form>
        <div className="mt-1.5 flex items-center justify-between gap-2 text-[10px] text-gray-400">
          <span>{canLearn ? 'Suggestions learn from question types only.' : 'Suggestions are defaults until your session is verified.'}</span>
          <button type="button" disabled={!canLearn} title={canLearn ? 'Reset suggestions' : 'Available when your session is verified'} onClick={() => setPrefs(resetPrefs(browserStorage(), contextKey))} className="shrink-0 underline disabled:no-underline disabled:opacity-50">Reset suggestions</button>
        </div>
      </div>
    </>
  );
}