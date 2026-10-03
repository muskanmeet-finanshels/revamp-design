'use client';

import { useEffect, useRef, useState } from 'react';
import { MessageCircle, Minus, RotateCcw, Send, ChevronDown, FileText, Save } from 'lucide-react';
import { useTimer } from '@/contexts/TimerContext';
import { assistantStatus } from './assistant-api';
import { SourceBackedChat } from './SourceBackedChat';
import {
  GREETING, QUICK_PROMPTS, DRAFT_TEXT, SCENARIO, TASKS, demoReply, buildHandover, mid,
  type DemoMessage,
} from './demo-logic';

const initial = (): DemoMessage[] => [{ id: 'greeting', role: 'assistant', text: GREETING }];

export function PmsChatDemo() {
  const { active, minimised } = useTimer();
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<DemoMessage[]>(initial);
  const [input, setInput] = useState('');
  const [draft, setDraft] = useState(DRAFT_TEXT);
  const [savedDraft, setSavedDraft] = useState<string | null>(null);
  const [showHandover, setShowHandover] = useState(false);
  const [openSrc, setOpenSrc] = useState<Record<string, boolean>>({});
  const [announce, setAnnounce] = useState('');
  const [timerHeight, setTimerHeight] = useState(240);
  const [mode, setMode] = useState<'demo' | 'live'>('demo');
  const [liveReady, setLiveReady] = useState(false);
  const [liveReset, setLiveReset] = useState(0);
  const modeChosen = useRef(false);
  const launcherRef = useRef<HTMLButtonElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const endRef = useRef<HTMLDivElement>(null);
  const wasOpen = useRef(false);

  useEffect(() => {
    if (!open) return;
    let disposed = false;
    const controller = new AbortController();
    async function refresh() {
      try {
        const status = await assistantStatus(controller.signal);
        if (disposed) return;
        setLiveReady(status.ready);
        if (status.ready && !modeChosen.current) setMode('live');
      } catch {
        if (!disposed) setLiveReady(false);
      }
    }
    void refresh();
    window.addEventListener('focus', refresh);
    return () => { disposed = true; controller.abort(); window.removeEventListener('focus', refresh); };
  }, [open]);

  useEffect(() => {
    if (open) inputRef.current?.focus();
    else if (wasOpen.current) launcherRef.current?.focus();
    wasOpen.current = open;
  }, [open]);

  useEffect(() => { endRef.current?.scrollIntoView({ block: 'end' }); }, [messages, showHandover, open]);

  useEffect(() => {
    if (!active) return;
    const timer = document.querySelector('[data-pms-floating-timer]');
    if (!timer) return;
    const measure = () => setTimerHeight(timer.getBoundingClientRect().height);
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(timer);
    return () => observer.disconnect();
  }, [active, minimised]);

  function send(text: string) {
    const t = text.trim();
    if (!t) return;
    const r = demoReply(t);
    setMessages((m) => [...m, { id: mid(), role: 'user', text: t }, { id: mid(), role: 'assistant', ...r }]);
    setAnnounce(`Assistant replied: ${r.text}`);
    setInput('');
  }

  function reset() {
    setLiveReset((value) => value + 1);
    setMessages(initial());
    setDraft(DRAFT_TEXT);
    setSavedDraft(null);
    setShowHandover(false);
    setOpenSrc({});
    setAnnounce('Conversation reset.');
    inputRef.current?.focus();
  }

  function saveDraft() {
    setSavedDraft(draft);
    setAnnounce('Draft saved as a local preview. Nothing was sent.');
  }

  // Measure the timer instead of assuming a height: long task names can wrap.
  const bottom = active ? timerHeight + 40 : 24;

  return (
    <>
      <div className="sr-only" role="status" aria-live="polite">{announce}</div>
      {!open && (
        <button
          ref={launcherRef}
          type="button"
          onClick={() => setOpen(true)}
           aria-label="Open PMS assistant chat"
          aria-expanded={false}
          aria-controls="pms-assistant-panel"
          style={{ bottom }}
          className="fixed right-6 z-40 flex items-center gap-2 rounded-full bg-black py-3 pl-4 pr-5 text-[13px] font-semibold text-white shadow-lg transition-transform hover:scale-105 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#F16611]"
        >
          <MessageCircle size={18} /> Ask PMS assistant
        </button>
      )}
      {open && (
        <section
          role="region"
          id="pms-assistant-panel"
           aria-label="PMS assistant chat"
          onKeyDown={(e) => { if (e.key === 'Escape') setOpen(false); }}
          style={{ bottom, maxHeight: `calc(100dvh - ${bottom + 24}px)` }}
          className="fixed right-3 z-40 flex h-[640px] w-[calc(100%-1.5rem)] flex-col overflow-hidden rounded-3xl border border-gray-200 bg-white shadow-[0_8px_40px_rgba(0,0,0,0.16)] sm:right-6 sm:w-[400px]"
        >
          <header className="flex shrink-0 items-center gap-3 border-b border-gray-100 px-4 py-3">
            <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-[#F16611] text-[13px] font-semibold text-white">P</span>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <h2 className="truncate text-[14px] font-semibold text-[#082032]">PMS AI Assistant</h2>
                 <span className="rounded-full bg-[#FEF0E7] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[#C1520E]">{mode === 'demo' ? 'Demo' : 'Live'}</span>
              </div>
               <p className="truncate text-[11px] text-gray-500">{mode === 'demo' ? 'Fictional data, no live AI' : liveReady ? 'Authorized sources · read-only' : 'Live sources unavailable'}</p>
            </div>
            <button type="button" onClick={reset} aria-label="Reset conversation" title="Reset conversation" className="rounded-md p-1.5 text-gray-500 hover:bg-gray-100"><RotateCcw size={15} /></button>
            <button type="button" onClick={() => setOpen(false)} aria-label="Minimise chat" title="Minimise chat (Esc)" className="rounded-md p-1.5 text-gray-500 hover:bg-gray-100"><Minus size={16} /></button>
          </header>

          <div className="shrink-0 border-b border-gray-100 px-4 py-2">
            <div className="flex gap-2" aria-label="Assistant answer source">
              {(['demo', 'live'] as const).map((value) => (
                <button key={value} type="button" aria-pressed={mode === value} onClick={() => {
                  modeChosen.current = true;
                  setMode(value);
                  setShowHandover(false);
                }} className={`rounded-full px-3 py-1 text-[11.5px] ${mode === value ? 'bg-[#082032] text-white' : 'bg-gray-100 text-gray-600'}`}>
                  {value === 'demo' ? 'Fictional demo' : 'Authorized records'}
                </button>
              ))}
            </div>
            {!liveReady && <p className="mt-1.5 text-[11px] text-gray-500">Live answers need trusted data and server access controls.</p>}
          </div>
          {mode === 'live' ? <SourceBackedChat key={liveReset} ready={liveReady} /> : <>
          <div className="min-h-0 flex-1 space-y-3 overflow-y-auto px-4 py-4" role="log" aria-label="Chat transcript">
            <p className="text-center text-[11px] text-gray-400">{SCENARIO}</p>
            {messages.map((m) => (
              <div key={m.id} className={m.role === 'user' ? 'flex justify-end' : 'flex justify-start'}>
                <div className="max-w-[85%]">
                  <div className={`whitespace-pre-wrap break-words rounded-2xl px-3.5 py-2.5 text-[13px] leading-relaxed ${m.role === 'user' ? 'bg-[#082032] text-white' : 'bg-gray-100 text-[#082032]'}`}>
                    {m.text}
                  </div>
                  {m.sources && (
                    <div className="mt-1.5 space-y-1">
                      {m.sources.map((s) => {
                        const k = `${m.id}-${s.id}`;
                        const isOpen = !!openSrc[k];
                        return (
                          <div key={k} className="rounded-lg border border-gray-200 text-[11.5px]">
                            <button type="button" aria-expanded={isOpen} onClick={() => setOpenSrc((o) => ({ ...o, [k]: !o[k] }))} className="flex w-full items-center justify-between gap-2 px-2.5 py-1.5 text-left text-gray-600">
                              <span>Source (fictional): {s.title}</span>
                              <ChevronDown size={13} className={isOpen ? 'rotate-180' : ''} />
                            </button>
                            {isOpen && <p className="border-t border-gray-100 px-2.5 py-1.5 text-gray-500">{s.detail}</p>}
                          </div>
                        );
                      })}
                    </div>
                  )}
                  {m.draft && (
                    <div className="mt-2 rounded-xl border border-gray-200 p-2.5">
                      <label htmlFor={`pms-chat-draft-${m.id}`} className="text-[11px] font-semibold text-gray-600">Follow-up draft (editable)</label>
                      <textarea id={`pms-chat-draft-${m.id}`} value={draft} onChange={(e) => setDraft(e.target.value)} rows={8} className="mt-1 w-full resize-y rounded-lg border border-gray-200 p-2 text-[12px] focus:outline-none focus:ring-2 focus:ring-[#F16611]" />
                      <button type="button" onClick={saveDraft} className="mt-1.5 flex items-center gap-1.5 rounded-lg bg-[#082032] px-3 py-1.5 text-[12px] font-semibold text-white"><Save size={13} /> Save local preview</button>
                      {savedDraft !== null && (
                        <p className="mt-2 rounded-lg bg-[#FEF0E7] p-2 text-[11.5px] text-[#C1520E]">Saved locally in this demo. Not sent to anyone.</p>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ))}
            {showHandover && (
              <div className="rounded-xl border border-gray-200 p-3">
                <h3 className="text-[12px] font-semibold text-[#082032]">Review / handover preview</h3>
                <p className="mb-1 text-[11px] text-gray-500">Preview only. Nothing is sent or changed.</p>
                <pre className="max-h-56 overflow-auto whitespace-pre-wrap break-words rounded-lg bg-gray-50 p-2 text-[11px] text-gray-700">{buildHandover(messages, savedDraft)}</pre>
                <button type="button" onClick={() => setShowHandover(false)} className="mt-2 text-[11.5px] font-semibold text-[#C1520E]">Close preview</button>
              </div>
            )}
            <div ref={endRef} />
          </div>

          <div className="shrink-0 border-t border-gray-100 px-3 pb-3 pt-2">
            <div className="mb-2 flex flex-wrap gap-1.5">
              {QUICK_PROMPTS.map((p) => (
                <button key={p} type="button" onClick={() => send(p)} className="rounded-full border border-gray-200 px-2.5 py-1 text-[11.5px] text-gray-700 hover:bg-gray-50">{p}</button>
              ))}
              <button type="button" onClick={() => setShowHandover(true)} className="flex items-center gap-1 rounded-full border border-gray-200 px-2.5 py-1 text-[11.5px] text-gray-700 hover:bg-gray-50"><FileText size={11} /> Handover preview</button>
            </div>
            <form onSubmit={(e) => { e.preventDefault(); send(input); }} className="flex items-end gap-2 rounded-2xl border border-gray-200 bg-white p-1.5 focus-within:ring-2 focus-within:ring-[#F16611]">
              <textarea
                ref={inputRef}
                value={input}
                rows={1}
                aria-label="Message"
                placeholder="Ask about this task..."
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) { e.preventDefault(); send(input); } }}
                className="max-h-24 min-h-[36px] flex-1 resize-none bg-transparent px-2 py-2 text-[13px] focus:outline-none"
              />
              <button type="submit" disabled={!input.trim()} aria-label="Send message" className="flex h-9 w-9 items-center justify-center rounded-full bg-black text-white disabled:opacity-40"><Send size={15} /></button>
            </form>
            <p className="mt-1.5 text-center text-[10px] text-gray-400">{TASKS.length} fictional tasks. Demo replies are scripted.</p>
          </div>
          </>}
        </section>
      )}
    </>
  );
}
