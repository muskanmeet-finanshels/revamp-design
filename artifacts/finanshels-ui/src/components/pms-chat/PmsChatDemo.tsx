'use client';

import { useEffect, useRef, useState } from 'react';
import { MessageCircle, Minus, Maximize2, Minimize2, RotateCcw } from 'lucide-react';
import { useTimer } from '@/contexts/TimerContext';
import { assistantStatus } from './assistant-api';
import { SourceBackedChat } from './SourceBackedChat';

export function PmsChatDemo() {
  const { active, minimised } = useTimer();
  const [open, setOpen] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [announce, setAnnounce] = useState('');
  const [timerHeight, setTimerHeight] = useState(240);
  const [liveReady, setLiveReady] = useState(false);
  const [contextKey, setContextKey] = useState<string | null>(null);
  const panelRef = useRef<HTMLElement>(null);
  const [liveReset, setLiveReset] = useState(0);
  const launcherRef = useRef<HTMLButtonElement>(null);
  const wasOpen = useRef(false);

  useEffect(() => {
    if (!open) { setLiveReady(false); setContextKey(null); return; }
    let disposed = false;
    let controller: AbortController | null = null;
    let seq = 0;
    async function refresh() {
      controller?.abort();
      controller = new AbortController();
      const turn = ++seq;
      try {
        const status = await assistantStatus(controller.signal);
        if (disposed || turn !== seq) return;
        setLiveReady(status.ready);
        setContextKey(status.ready && status.personalization ? status.personalization.key : null);
      } catch {
        if (disposed || turn !== seq || controller?.signal.aborted) return;
        setLiveReady(false);
        setContextKey(null);
      }
    }
    // Learning is off until a fresh status arrives after blur.
    const onBlur = () => { seq++; controller?.abort(); setLiveReady(false); setContextKey(null); };
    const onVisibility = () => {
      if (document.visibilityState === 'hidden') onBlur();
      else void refresh();
    };
    void refresh();
    const timer = window.setInterval(() => { if (document.visibilityState === 'visible') void refresh(); }, 5000);
    window.addEventListener('focus', refresh);
    window.addEventListener('blur', onBlur);
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      disposed = true; controller?.abort(); window.clearInterval(timer);
      window.removeEventListener('focus', refresh); window.removeEventListener('blur', onBlur);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [open]);

  useEffect(() => {
    if (open) panelRef.current?.querySelector<HTMLTextAreaElement>('textarea[data-composer]')?.focus();
    else if (wasOpen.current) launcherRef.current?.focus();
    wasOpen.current = open;
  }, [open]);

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

  function reset() {
    setLiveReset((value) => value + 1);
    setAnnounce('Conversation reset.');
    window.requestAnimationFrame(() => {
      panelRef.current?.querySelector<HTMLTextAreaElement>('textarea[data-composer]')?.focus();
    });
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
          ref={panelRef}
          role="region"
          id="pms-assistant-panel"
           aria-label="PMS assistant chat"
          onKeyDown={(e) => {
            if (e.key === 'Escape') {
              if (expanded) setExpanded(false);
              else setOpen(false);
            }
          }}
          style={{
            bottom,
            height: expanded ? `calc(100dvh - ${bottom + 24}px)` : 640,
            maxHeight: `calc(100dvh - ${bottom + 24}px)`,
          }}
          className={`fixed right-3 z-40 flex w-[calc(100%-1.5rem)] flex-col overflow-hidden rounded-3xl border border-gray-200 bg-white shadow-[0_8px_40px_rgba(0,0,0,0.16)] sm:right-6 sm:max-w-[calc(100%-3rem)] ${expanded ? 'sm:w-[720px]' : 'sm:w-[400px]'}`}
        >
          <header className="flex shrink-0 items-center gap-3 border-b border-gray-100 px-4 py-3">
            <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-[#F16611] text-[13px] font-semibold text-white">P</span>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <h2 className="truncate text-[14px] font-semibold text-[#082032]">PMS AI Assistant</h2>
                 <span className="shrink-0 rounded-full bg-[#FEF0E7] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[#C1520E]">App-wide</span>
              </div>
               <p className="truncate text-[11px] text-gray-500">{liveReady ? 'Authorized sources · read-only' : 'Live sources unavailable'}</p>
            </div>
            <button type="button" onClick={reset} aria-label="Reset conversation" title="Reset conversation" className="rounded-md p-1.5 text-gray-500 hover:bg-gray-100"><RotateCcw size={15} /></button>
            <button
              type="button"
              onClick={() => setExpanded((value) => !value)}
              aria-label={expanded ? 'Collapse window' : 'Expand window'}
              aria-expanded={expanded}
              aria-controls="pms-assistant-panel"
              title={expanded ? 'Collapse window (Esc)' : 'Expand window'}
              className="shrink-0 rounded-md p-1.5 text-gray-500 hover:bg-gray-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#F16611]"
            >
              {expanded ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
            </button>
            <button type="button" onClick={() => setOpen(false)} aria-label="Minimise chat" title="Minimise chat (Esc)" className="rounded-md p-1.5 text-gray-500 hover:bg-gray-100"><Minus size={16} /></button>
          </header>

          <div className="shrink-0 border-b border-gray-100 px-4 py-2">
            <p className="text-[11.5px] text-gray-600">Application-wide scope · All accessible clients and projects</p>
            {!liveReady && <p className="mt-1.5 text-[11px] text-gray-500">Live records are unavailable. Answers need a verified session.</p>}
          </div>
          <SourceBackedChat key={`${liveReset}:${contextKey ?? 'none'}`} ready={liveReady} contextKey={contextKey} />
        </section>
      )}
    </>
  );
}
