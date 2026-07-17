import { Router } from "express";
import { TryoutRepository } from "../tryout/tryout.repository";
import { PublicController } from "./public.controller";
import { optionalAuth } from "../../middleware/optionalAuth.middleware";

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

publicRouter.get("/stats", optionalAuth, controller.getStats);
publicRouter.get("/clubs", optionalAuth, controller.getClubs);
publicRouter.get("/tryouts", optionalAuth, controller.listTryouts);
publicRouter.get("/tryouts/:id", optionalAuth, controller.getTryoutById);

export { publicRouter };
