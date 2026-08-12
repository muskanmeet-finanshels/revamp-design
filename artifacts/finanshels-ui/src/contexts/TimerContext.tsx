'use client';

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';

/* ── shared timer shape (matches API server) ── */
interface TimerState {
  taskId:        string;
  taskName:      string;
  projectName?:  string;
  startedAt:     number; // Unix ms
  totalPausedMs: number;
  pausedAt:      number | null;
}

/* ── API helpers ── */
const TIMER_API = '/api/timer';
const POLL_MS   = 3_000;

async function fetchTimer(): Promise<TimerState | null> {
  try {
    const res = await fetch(TIMER_API, { cache: 'no-store' });
    if (!res.ok) return null;
    return (await res.json()) as TimerState | null;
  } catch {
    return null;
  }
}

async function putTimer(state: TimerState): Promise<void> {
  try {
    await fetch(TIMER_API, {
      method:  'PUT',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify(state),
    });
  } catch {}
}

async function deleteTimer(): Promise<void> {
  try {
    await fetch(TIMER_API, { method: 'DELETE' });
  } catch {}
}

/* ── context value ── */
export interface TimerContextValue {
  taskId:        string | null;
  taskName:      string;
  projectName:   string;
  startedAt:     number | null;
  totalPausedMs: number;
  pausedAt:      number | null;
  active:        boolean;
  running:       boolean; // active AND not paused
  minimised:     boolean;

  startTimer:   (taskId: string, taskName: string, projectName?: string) => void;
  pauseTimer:   () => void;
  resumeTimer:  () => void;
  stopTimer:    () => void;
  setMinimised: (v: boolean) => void;
}

const TimerContext = createContext<TimerContextValue | null>(null);

export function useTimer(): TimerContextValue {
  const ctx = useContext(TimerContext);
  if (!ctx) throw new Error('useTimer must be used inside <TimerProvider>');
  return ctx;
}

/* ── provider ── */
export function TimerProvider({ children }: { children: React.ReactNode }) {
  const [taskId,        setTaskId]        = useState<string | null>(null);
  const [taskName,      setTaskName]      = useState('');
  const [projectName,   setProjectName]   = useState('');
  const [startedAt,     setStartedAt]     = useState<number | null>(null);
  const [totalPausedMs, setTotalPausedMs] = useState(0);
  const [pausedAt,      setPausedAt]      = useState<number | null>(null);
  const [minimised,     setMinimised]     = useState(false);
  const [hydrated,      setHydrated]      = useState(false);

  /* Refs let action callbacks read current values without stale closures */
  const stateRef = useRef({ taskId, taskName, projectName, startedAt, totalPausedMs, pausedAt });
  stateRef.current = { taskId, taskName, projectName, startedAt, totalPausedMs, pausedAt };

  /* apply a server snapshot to local state */
  const applySnapshot = useCallback((s: TimerState | null) => {
    if (s && s.taskId && s.startedAt) {
      setTaskId(s.taskId);
      setTaskName(s.taskName ?? '');
      setProjectName(s.projectName ?? '');
      setStartedAt(s.startedAt);
      setTotalPausedMs(typeof s.totalPausedMs === 'number' ? s.totalPausedMs : 0);
      setPausedAt(s.pausedAt ?? null);
    } else {
      setTaskId(null);
      setTaskName('');
      setProjectName('');
      setStartedAt(null);
      setTotalPausedMs(0);
      setPausedAt(null);
    }
  }, []);

  /* Hydrate from API on first client render */
  useEffect(() => {
    fetchTimer().then(s => {
      applySnapshot(s);
      setHydrated(true);
    });
  }, [applySnapshot]);

  /* Poll every 3 s to pick up changes from other devices */
  const hydratedRef = useRef(false);
  hydratedRef.current = hydrated;
  useEffect(() => {
    const id = setInterval(async () => {
      if (!hydratedRef.current) return;
      const s = await fetchTimer();
      applySnapshot(s);
    }, POLL_MS);
    return () => clearInterval(id);
  }, [applySnapshot]);

  /* ── actions ── */
  const startTimer = useCallback((id: string, name: string, project = '') => {
    const now = Date.now();
    setTaskId(id);
    setTaskName(name);
    setProjectName(project);
    setStartedAt(now);
    setTotalPausedMs(0);
    setPausedAt(null);
    setMinimised(false);
    putTimer({ taskId: id, taskName: name, projectName: project, startedAt: now, totalPausedMs: 0, pausedAt: null });
  }, []);

  const pauseTimer = useCallback(() => {
    const now = Date.now();
    const { taskId: id, taskName: name, projectName: proj, startedAt: sa, totalPausedMs: tpm } = stateRef.current;
    setPausedAt(now);
    if (id && sa) {
      putTimer({ taskId: id, taskName: name, projectName: proj, startedAt: sa, totalPausedMs: tpm, pausedAt: now });
    }
  }, []);

  const resumeTimer = useCallback(() => {
    const { taskId: id, taskName: name, projectName: proj, startedAt: sa, totalPausedMs: tpm, pausedAt: pa } = stateRef.current;
    if (pa !== null) {
      const newTpm = tpm + (Date.now() - pa);
      setTotalPausedMs(newTpm);
      setPausedAt(null);
      if (id && sa) {
        putTimer({ taskId: id, taskName: name, projectName: proj, startedAt: sa, totalPausedMs: newTpm, pausedAt: null });
      }
    }
  }, []);

  const stopTimer = useCallback(() => {
    setTaskId(null);
    setTaskName('');
    setProjectName('');
    setStartedAt(null);
    setTotalPausedMs(0);
    setPausedAt(null);
    setMinimised(false);
    deleteTimer();
  }, []);

  const active  = startedAt !== null;
  const running = active && pausedAt === null;

  /* Warn user before closing/refreshing the tab while a timer is running */
  useEffect(() => {
    if (!active) return;

    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = '';
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [active]);

  const value: TimerContextValue = {
    taskId,
    taskName,
    projectName,
    startedAt,
    totalPausedMs,
    pausedAt,
    active,
    running,
    minimised,
    startTimer,
    pauseTimer,
    resumeTimer,
    stopTimer,
    setMinimised,
  };

  return (
    <TimerContext.Provider value={value}>
      {children}
    </TimerContext.Provider>
  );
}
