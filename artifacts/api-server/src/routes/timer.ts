import { Router, type IRouter } from "express";

/* ── in-memory timer state ── */
interface TimerState {
  taskId: string;
  taskName: string;
  startedAt: number;       // Unix ms
  totalPausedMs: number;
  pausedAt: number | null; // non-null while paused
}

let timerState: TimerState | null = null;

const router: IRouter = Router();

/* GET /api/timer — returns current timer state or null */
router.get("/timer", (_req, res) => {
  res.json(timerState);
});

/* PUT /api/timer — upsert timer state */
router.put("/timer", (req, res) => {
  const body = req.body as Partial<TimerState>;
  if (!body || !body.taskId || !body.startedAt) {
    res.status(400).json({ error: "taskId and startedAt are required" });
    return;
  }
  timerState = {
    taskId: body.taskId,
    taskName: body.taskName ?? "",
    startedAt: body.startedAt,
    totalPausedMs: typeof body.totalPausedMs === "number" ? body.totalPausedMs : 0,
    pausedAt: body.pausedAt ?? null,
  };
  res.json(timerState);
});

/* DELETE /api/timer — clear timer state */
router.delete("/timer", (_req, res) => {
  timerState = null;
  res.json(null);
});

export default router;
