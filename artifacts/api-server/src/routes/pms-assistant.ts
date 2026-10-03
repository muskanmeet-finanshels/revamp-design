import { Router, type IRouter } from "express";
import {
  CreatePmsAssistantAnswerBody,
  CreatePmsAssistantAnswerResponse,
  GetPmsAssistantStatusResponse,
} from "@workspace/api-zod";
import {
  createPmsAssistantService,
  type PmsAssistantServiceDependencies,
} from "../lib/pms-assistant";

const unavailableAnswer = {
  status: "unavailable" as const,
  answer:
    "I can’t answer this question with the currently available trusted records.",
  citations: [],
  claims: [],
};

export function createPmsAssistantRouter(
  dependencies: PmsAssistantServiceDependencies = { adapter: null },
): IRouter {
  const router: IRouter = Router();
  const service = createPmsAssistantService(dependencies);

  router.use((_req, res, next): void => {
    res.setHeader("Cache-Control", "no-store");
    next();
  });

  router.get("/pms-assistant/status", async (req, res): Promise<void> => {
    const status = await service.getStatus(req);
    res.json(GetPmsAssistantStatusResponse.parse(status));
  });

  router.post("/pms-assistant/answers", async (req, res): Promise<void> => {
    const body = req.body as unknown;
    if (
      typeof body !== "object" ||
      body === null ||
      Array.isArray(body) ||
      Object.keys(body).length !== 1 ||
      !Object.hasOwn(body, "question")
    ) {
      res.status(400).json({ error: "Request must contain only question." });
      return;
    }

    const parsed = CreatePmsAssistantAnswerBody.safeParse(body);
    if (!parsed.success) {
      res.status(400).json({ error: "A valid question is required." });
      return;
    }

    const answer = await service.answer(req, parsed.data.question);
    const validated = CreatePmsAssistantAnswerResponse.safeParse(answer);
    if (!validated.success) {
      res.json(unavailableAnswer);
      return;
    }
    res.json(validated.data);
  });

  return router;
}

// The live authentication and PMS data adapters are not available yet.
// Keep the production route fail-closed until those trusted integrations exist.
const router = createPmsAssistantRouter({ adapter: null });

export default router;