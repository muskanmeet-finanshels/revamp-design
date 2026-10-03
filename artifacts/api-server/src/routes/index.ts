import { Router, type IRouter } from "express";
import healthRouter from "./health";
import timerRouter from "./timer";
import pmsAssistantRouter from "./pms-assistant";

const router: IRouter = Router();

router.get("/", (_req, res) => {
  res.json({
    status: "ok",
    service: "Finanshels API",
    health: "/api/healthz",
  });
});

router.use(healthRouter);
router.use(timerRouter);
router.use(pmsAssistantRouter);

export default router;
