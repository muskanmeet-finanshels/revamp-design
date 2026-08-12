'use client';

import { useEffect, useState } from 'react';
import { X, Timer } from 'lucide-react';
import { toast } from 'sonner';
import { useTimer } from '@/contexts/TimerContext';
import { StopTimerDialog } from './StopTimerDialog';
import {
  Tooltip, TooltipContent, TooltipProvider, TooltipTrigger,
} from '@/components/ui/tooltip';

/* ── elapsed helpers ── */
function calcElapsedMs(startedAt: number, totalPausedMs: number, pausedAt: number | null): number {
  const effectiveNow = pausedAt ?? Date.now();
  return Math.max(0, effectiveNow - startedAt - totalPausedMs);
}

function fmtMs(ms: number): string {
  const totalSec = Math.floor(ms / 1000);
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  if (h > 0) {
    return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  }
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export function TimerWidget() {
  const { active, minimised, taskName, startedAt, totalPausedMs, pausedAt, stopTimer, setMinimised } = useTimer();

  const [elapsed,        setElapsed]        = useState('00:00');
  const [stopDialogOpen, setStopDialogOpen] = useState(false);

  /* Tick every second while timer is active */
  useEffect(() => {
    if (!active || !startedAt) { setElapsed('00:00'); return; }
    function tick() {
      setElapsed(fmtMs(calcElapsedMs(startedAt!, totalPausedMs, pausedAt)));
    }
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [active, startedAt, totalPausedMs, pausedAt]);

  if (!active) return null;

  const stopDialog = (
    <StopTimerDialog
      open={stopDialogOpen}
      onClose={() => setStopDialogOpen(false)}
      onConfirm={({ notes: _notes, newStatus: _newStatus }) => {
        stopTimer();
        setStopDialogOpen(false);
        toast.success(`Timer stopped for "${taskName}"`);
      }}
    />
  );

  /* ── minimised: pulsing dot ── */
  if (minimised) {
    return (
      <>
        {stopDialog}
        <button
          type="button"
          onClick={() => setMinimised(false)}
          title="Restore timer"
          aria-label="Restore timer"
          className="fixed bottom-6 right-6 z-50 flex h-12 w-12 items-center justify-center rounded-full bg-white border border-gray-200 shadow-lg hover:scale-105 active:scale-95 transition-transform"
        >
          <span className="absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-20 animate-ping" />
          <Timer size={18} className="relative text-emerald-500" />
        </button>
      </>
    );
  }

  /* ── expanded widget ── */
  return (
    <>
      {stopDialog}
      <div
        role="status"
        aria-live="polite"
        aria-label={`Timer running for ${taskName}: ${elapsed}`}
        className="fixed bottom-6 right-6 z-50 flex w-[240px] flex-col gap-3 rounded-2xl bg-white p-4 shadow-[0_4px_24px_rgba(0,0,0,0.10)] border border-gray-200"
      >
        {/* Header row */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex min-w-0 items-center gap-2">
            <span className="relative flex h-2 w-2 flex-shrink-0">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-60" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
            </span>
            <span className="min-w-0 flex-1 whitespace-normal break-words text-[11.5px] font-semibold text-gray-700 leading-snug">
              {taskName}
            </span>
          </div>
          <button
            type="button"
            onClick={() => setMinimised(true)}
            title="Minimise (timer keeps running)"
            aria-label="Minimise timer widget"
            className="flex-shrink-0 rounded-md p-0.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
          >
            <X size={13} />
          </button>
        </div>

        {/* Elapsed time */}
        <div className="flex items-baseline justify-center">
          <span className="font-mono text-[32px] font-semibold leading-none tracking-tight text-gray-900 tabular-nums">
            {elapsed}
          </span>
        </div>

        {/* Stop button */}
        <TooltipProvider delayDuration={150}>
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                onClick={() => setStopDialogOpen(true)}
                className="flex w-full items-center justify-center gap-1.5 rounded-xl bg-red-500 py-2 text-[12px] font-semibold text-white transition-colors hover:bg-red-600 active:scale-[0.98]"
              >
                Stop Timer
              </button>
            </TooltipTrigger>
            <TooltipContent side="top" className="rounded-md bg-[#082032] px-2.5 py-1.5 text-[12px] font-medium text-white shadow-lg">
              Stop timer
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
    </>
  );
}
