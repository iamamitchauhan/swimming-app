import { Router } from "express";
import { TryoutRepository } from "../tryout/tryout.repository";
import { PublicController } from "./public.controller";

const tryoutRepository = new TryoutRepository();
const controller = new PublicController(tryoutRepository);

/**
 * Public router — mounted at /api/v1/public by app.ts
 *
 * No authentication required for these endpoints
 * Only open tryouts are accessible to the public
 *
 * GET /public/stats         — Platform-wide stats for landing page
 * GET /public/tryouts       — List open tryouts
 * GET /public/tryouts/:id   — Get tryout details
 */
const publicRouter = Router();

publicRouter.get("/stats", controller.getStats);
publicRouter.get("/clubs", controller.getClubs);
publicRouter.get("/tryouts", controller.listTryouts);
publicRouter.get("/tryouts/:id", controller.getTryoutById);

export { publicRouter };
