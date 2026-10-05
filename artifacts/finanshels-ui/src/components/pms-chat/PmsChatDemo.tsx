'use client';

import { useEffect, useRef, useState } from 'react';
import { MessageCircle, Minus, Maximize2, Minimize2, RotateCcw, MoreHorizontal, Download } from 'lucide-react';
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
  const [menuOpen, setMenuOpen] = useState(false);
  const [canDownload, setCanDownload] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const transcriptRef = useRef<(() => string) | null>(null);

  useEffect(() => {
    if (!menuOpen) return;
    menuRef.current?.querySelector<HTMLButtonElement>('button:not([disabled])')?.focus();
    const onDown = (e: MouseEvent) => {
      const t = e.target as Node;
      if (!menuRef.current?.contains(t) && !menuButtonRef.current?.contains(t)) setMenuOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [menuOpen]);
  useEffect(() => { if (!open) setMenuOpen(false); }, [open]);

  function toggleMenu() {
    if (!menuOpen) setCanDownload(!!transcriptRef.current?.());
    setMenuOpen((v) => !v);
  }
  function closeMenu(focus = true) {
    setMenuOpen(false);
    if (focus) window.requestAnimationFrame(() => menuButtonRef.current?.focus());
  }
  function toggleExpanded() {
    const next = !expanded;
    setExpanded(next);
    setAnnounce(next ? 'Chat window expanded.' : 'Chat window collapsed.');
    closeMenu();
  }
  function download() {
    const text = transcriptRef.current?.();
    closeMenu();
    if (!text) return;
    const url = URL.createObjectURL(new Blob([text], { type: 'text/plain;charset=utf-8' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = `pms-assistant-transcript-${new Date().toISOString().slice(0, 10)}.txt`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    setAnnounce('Transcript downloaded.');
  }
  function onMenuKey(e: React.KeyboardEvent) {
    if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp') return;
    e.preventDefault();
    const items = Array.from(menuRef.current?.querySelectorAll<HTMLButtonElement>('button:not([disabled])') ?? []);
    const i = items.indexOf(document.activeElement as HTMLButtonElement);
    items[(i + (e.key === 'ArrowDown' ? 1 : -1) + items.length) % items.length]?.focus();
  }

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
    setMenuOpen(false);
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
          className="fixed right-6 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-[#0B0B0C] text-white shadow-[0_6px_24px_rgba(8,32,50,0.28)] transition duration-200 hover:scale-105 hover:shadow-[0_8px_28px_rgba(8,32,50,0.36)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#F16611] active:scale-95 motion-reduce:transition-none motion-reduce:hover:scale-100"
        >
          <MessageCircle size={22} aria-hidden="true" />
        </button>
      )}
      {open && (
        <section
          ref={panelRef}
          role="region"
          id="pms-assistant-panel"
           aria-label="PMS assistant chat"
          onKeyDown={(e) => {
            if (e.key !== 'Escape') return;
            e.stopPropagation();
            if (menuOpen) closeMenu();
            else if (expanded) {
              setExpanded(false);
              setAnnounce('Chat window collapsed.');
              window.requestAnimationFrame(() => panelRef.current?.querySelector<HTMLTextAreaElement>('textarea[data-composer]')?.focus());
            } else setOpen(false);
          }}
          style={{
            bottom,
            height: expanded ? `calc(100dvh - ${bottom + 24}px)` : 640,
            maxHeight: `calc(100dvh - ${bottom + 24}px)`,
          }}
          className={`fixed right-3 z-40 flex w-[calc(100%-1.5rem)] flex-col overflow-hidden rounded-[28px] border border-[#E7E9EC] bg-white shadow-[0_12px_48px_rgba(8,32,50,0.18)] transition-[width] duration-200 ease-out motion-reduce:transition-none sm:right-6 sm:max-w-[calc(100%-3rem)] ${expanded ? 'sm:w-[720px]' : 'sm:w-[400px]'}`}
        >
          <header className="flex shrink-0 items-center gap-3 px-4 py-3.5">
            <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-[#F16611] text-[13px] font-semibold text-white">P</span>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <h2 className="truncate text-[14px] font-semibold text-[#082032]">PMS AI Assistant</h2>
                 <span className="shrink-0 rounded-full bg-[#FEF0E7] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[#C1520E]">App-wide</span>
              </div>
               <p className="truncate text-[11px] text-gray-500">{liveReady ? 'Authorized sources · read-only' : 'Live sources unavailable'}</p>
            </div>
            <div className="relative shrink-0">
              <button
                ref={menuButtonRef}
                type="button"
                onClick={toggleMenu}
                aria-label="Chat options"
                title="Chat options"
                aria-haspopup="menu"
                aria-expanded={menuOpen}
                aria-controls="pms-assistant-menu"
                className="rounded-full p-1.5 text-gray-500 transition-colors hover:bg-gray-100 hover:text-[#082032] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#F16611] motion-reduce:transition-none"
              ><MoreHorizontal size={18} aria-hidden="true" /></button>
              {menuOpen && (
                <div
                  ref={menuRef}
                  id="pms-assistant-menu"
                  role="menu"
                  aria-label="Chat options"
                  onKeyDown={onMenuKey}
                  className="absolute right-0 top-full z-10 mt-1 w-56 origin-top-right rounded-2xl border border-[#E7E9EC] bg-white p-1.5 shadow-[0_8px_30px_rgba(8,32,50,0.16)] animate-in fade-in zoom-in-95 duration-150 motion-reduce:animate-none"
                >
                  <button type="button" role="menuitem" onClick={toggleExpanded} className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-left text-[13px] text-[#082032] transition-colors hover:bg-[#F5F6F7] focus-visible:bg-[#F5F6F7] focus-visible:outline-none">
                    {expanded ? <Minimize2 size={15} aria-hidden="true" /> : <Maximize2 size={15} aria-hidden="true" />}
                    {expanded ? 'Collapse window' : 'Expand window'}
                  </button>
                  <button type="button" role="menuitem" disabled={!canDownload} title={canDownload ? undefined : 'Nothing to download yet'} onClick={download} className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-left text-[13px] text-[#082032] transition-colors hover:bg-[#F5F6F7] focus-visible:bg-[#F5F6F7] focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent">
                    <Download size={15} aria-hidden="true" /> Download transcript
                  </button>
                  <div role="separator" className="my-1 h-px bg-gray-100" />
                  <button type="button" role="menuitem" aria-label="Reset conversation" onClick={reset} className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-left text-[13px] text-[#082032] transition-colors hover:bg-[#FEF0E7] focus-visible:bg-[#FEF0E7] focus-visible:outline-none">
                    <RotateCcw size={15} aria-hidden="true" /> Reset conversation
                  </button>
                </div>
              )}
            </div>
            <button type="button" onClick={() => setOpen(false)} aria-label="Minimise chat" title="Minimise chat (Esc)" className="shrink-0 rounded-full p-1.5 text-gray-500 transition-colors hover:bg-gray-100 hover:text-[#082032] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#F16611] motion-reduce:transition-none"><Minus size={17} aria-hidden="true" /></button>
          </header>

          <div className="shrink-0 border-y border-gray-100 bg-[#FAFAFB] px-4 py-2">
            <p className="text-[11.5px] text-gray-600">Application-wide scope · All accessible clients and projects</p>
            {!liveReady && <p className="mt-1.5 text-[11px] text-gray-500">Live records are unavailable. Answers need a verified session.</p>}
          </div>
          <SourceBackedChat transcriptRef={transcriptRef} key={`${liveReset}:${contextKey ?? 'none'}`} ready={liveReady} contextKey={contextKey} />
        </section>
      )}
    </>
  );
}
