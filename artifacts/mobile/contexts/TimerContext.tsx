import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';
import { API_BASE_URL } from '@/constants/api';

/* ── shared timer shape (matches API server) ── */
interface TimerState {
  taskId:        string;
  taskName:      string;
  startedAt:     number;       // Unix ms
  totalPausedMs: number;
  pausedAt:      number | null; // non-null while paused
}

const POLL_MS = 3_000;

/* ── API helpers ── */
async function fetchTimer(): Promise<TimerState | null> {
  try {
    const res = await fetch(`${API_BASE_URL}/timer`);
    if (!res.ok) return null;
    return (await res.json()) as TimerState | null;
  } catch {
    return null;
  }
}

async function putTimer(state: TimerState): Promise<void> {
  try {
    await fetch(`${API_BASE_URL}/timer`, {
      method:  'PUT',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify(state),
    });
  } catch {}
}

async function deleteTimer(): Promise<void> {
  try {
    await fetch(`${API_BASE_URL}/timer`, { method: 'DELETE' });
  } catch {}
}

/* ── context value ── */
export interface TimerContextValue {
  taskId:        string | null;
  taskName:      string;
  startedAt:     number | null;
  totalPausedMs: number;
  pausedAt:      number | null;
  running: boolean;  // timer exists AND not paused
  active:  boolean;  // timer exists (running or paused)

  startTimer:  (taskId: string, taskName: string) => void;
  pauseTimer:  () => void;
  resumeTimer: () => void;
  stopTimer:   () => void;
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
  const [startedAt,     setStartedAt]     = useState<number | null>(null);
  const [totalPausedMs, setTotalPausedMs] = useState(0);
  const [pausedAt,      setPausedAt]      = useState<number | null>(null);
  const [hydrated,      setHydrated]      = useState(false);

  /* Refs let action callbacks read current values without stale closures */
  const stateRef = useRef({ taskId, taskName, startedAt, totalPausedMs, pausedAt });
  stateRef.current = { taskId, taskName, startedAt, totalPausedMs, pausedAt };

  /* apply a server snapshot to local state */
  const applySnapshot = useCallback((s: TimerState | null) => {
    if (s && s.taskId && s.startedAt) {
      setTaskId(s.taskId);
      setTaskName(s.taskName ?? '');
      setStartedAt(s.startedAt);
      setTotalPausedMs(typeof s.totalPausedMs === 'number' ? s.totalPausedMs : 0);
      setPausedAt(s.pausedAt ?? null);
    } else {
      setTaskId(null);
      setTaskName('');
      setStartedAt(null);
      setTotalPausedMs(0);
      setPausedAt(null);
    }
  }, []);

  /* Hydrate from API after mount */
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
  const startTimer = useCallback((id: string, name: string) => {
    const now = Date.now();
    setTaskId(id);
    setTaskName(name);
    setStartedAt(now);
    setTotalPausedMs(0);
    setPausedAt(null);
    putTimer({ taskId: id, taskName: name, startedAt: now, totalPausedMs: 0, pausedAt: null });
  }, []);

  const pauseTimer = useCallback(() => {
    const now = Date.now();
    const { taskId: id, taskName: name, startedAt: sa, totalPausedMs: tpm } = stateRef.current;
    setPausedAt(now);
    if (id && sa) {
      putTimer({ taskId: id, taskName: name, startedAt: sa, totalPausedMs: tpm, pausedAt: now });
    }
  }, []);

  const resumeTimer = useCallback(() => {
    const { taskId: id, taskName: name, startedAt: sa, totalPausedMs: tpm, pausedAt: pa } = stateRef.current;
    if (pa !== null) {
      const newTpm = tpm + (Date.now() - pa);
      setTotalPausedMs(newTpm);
      setPausedAt(null);
      if (id && sa) {
        putTimer({ taskId: id, taskName: name, startedAt: sa, totalPausedMs: newTpm, pausedAt: null });
      }
    }
  }, []);

  const stopTimer = useCallback(() => {
    setTaskId(null);
    setTaskName('');
    setStartedAt(null);
    setTotalPausedMs(0);
    setPausedAt(null);
    deleteTimer();
  }, []);

  const running = startedAt !== null && pausedAt === null;
  const active  = startedAt !== null;

  const value: TimerContextValue = {
    taskId,
    taskName,
    startedAt,
    totalPausedMs,
    pausedAt,
    running,
    active,
    startTimer,
    pauseTimer,
    resumeTimer,
    stopTimer,
  };

  return (
    <TimerContext.Provider value={value}>
      {children}
    </TimerContext.Provider>
  );
}
