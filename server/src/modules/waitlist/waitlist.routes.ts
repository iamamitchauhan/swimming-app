import { Router } from "express";
import { WaitlistRepository } from "./waitlist.repository";
import { TryoutRepository } from "../tryout/tryout.repository";
import { WaitlistService } from "./waitlist.service";
import { WaitlistController } from "./waitlist.controller";

const repository = new WaitlistRepository();
const tryoutRepository = new TryoutRepository();
const service = new WaitlistService(repository, tryoutRepository);
const controller = new WaitlistController(service);

/**
 * Waitlist router — mounted at /api/v1/waitlist by app.ts
 *
 * POST /waitlist/:tryoutId — Join waitlist (public, no auth required)
 */
const waitlistRouter = Router();

waitlistRouter.get("/tryout/:tryoutId", controller.listByTryout);
waitlistRouter.get("/entry/:id", controller.getEntry);
waitlistRouter.delete("/entry/:id", controller.removeEntry);
waitlistRouter.post("/:tryoutId", controller.join);

export { waitlistRouter, service as waitlistService };
