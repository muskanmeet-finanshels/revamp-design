import { Router, type IRouter } from "express";
import healthRouter from "./health";
import timerRouter from "./timer";

const router: IRouter = Router();

router.use(healthRouter);
router.use(timerRouter);

export default router;
