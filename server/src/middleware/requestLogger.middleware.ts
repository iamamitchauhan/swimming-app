import { Request, Response, NextFunction } from "express";
import pino from "pino";
import logger from "../shared/utils/logger";

/**
 * Request lifecycle logging middleware.
 *
 * Produces a "story-telling" timeline for every API call:
 *
 *   → POST /api/v1/auth/login | body={...} | user=anon | request_id=abc
 *     [  0ms] AuthController.login: received
 *     [  3ms] AuthController.login: validated
 *     [  3ms] AuthController.login: delegating to service
 *     [ 48ms] AuthController.login: responding 200
 *   ← 200 POST /api/v1/auth/login | 49ms | request_id=abc
 *
 * It does three things:
 *  1. Logs the request arrival (`→`) with method, path, body, user, request id.
 *  2. Builds a child logger pre-bound with request context and exposes it as
 *     `req.log`, plus a `req.step(msg, data?)` helper that logs a beat with
 *     `step_ms` = milliseconds since request start.
 *  3. Logs the request completion (`←`) with status code and total duration
 *     via `res.on('finish')`.
 *
 * Must be mounted AFTER `requestId` so `req.requestId` is already set.
 */
export function requestLogger(req: Request, res: Response, next: NextFunction): void {
  const startedAt = process.hrtime.bigint();
  req.startedAt = startedAt;

  const bindings: pino.Bindings = {
    request_id: req.requestId,
    method: req.method,
    path: req.path,
  };
  if (req.user?.id) {
    bindings.user_id = req.user.id;
  }

  const reqLogger = logger.child(bindings);
  req.log = reqLogger;

  /**
   * Logs a single narrative beat at `info` level with `step_ms` =
   * milliseconds elapsed since the request started. Controllers call
   * `req.step?.("received" | "validated" | "delegating to service" | "responding", data?)`.
   */
  req.step = (msg: string, data?: Record<string, unknown>): void => {
    const elapsedNs = process.hrtime.bigint() - startedAt;
    const stepMs = Number(elapsedNs) / 1_000_000;
    reqLogger.info({ step_ms: Math.round(stepMs), ...data }, msg);
  };

  // Arrival bookend
  reqLogger.info({ body: req.body, query: req.query, user: req.user?.id ?? "anon" }, `→ ${req.method} ${req.path}`);

  // Completion bookend — fires after response is sent to the client
  res.on("finish", () => {
    const totalMs = Number(process.hrtime.bigint() - startedAt) / 1_000_000;
    reqLogger.info({ status: res.statusCode, duration_ms: Math.round(totalMs) }, `← ${res.statusCode} ${req.method} ${req.path}`);
  });

  next();
}
