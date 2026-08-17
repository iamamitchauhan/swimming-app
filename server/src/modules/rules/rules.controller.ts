import { Request, Response, NextFunction } from "express";
import { RulesService } from "./rules.service";
import { stateParamSchema, updateRuleSchema } from "./rules.validation";
import { HTTP_STATUS } from "../../shared/constants/httpStatus";
import { MESSAGES } from "../../shared/constants/messages";
import { sendSuccess } from "../../shared/utils/response";
import { ForbiddenError, UnauthorizedError } from "../../shared/errors/domain.errors";
import { ADMIN_ROLES, UserRole } from "../../shared/constants/roles";

// ─── Role helpers ─────────────────────────────────────────────────────────────

function isAdminRole(role: string): role is UserRole {
  return (ADMIN_ROLES as string[]).includes(role);
}

// ─── Controller ───────────────────────────────────────────────────────────────

/**
 * Handles HTTP layer for rules endpoints.
 * Validates input, checks authorization, delegates to RulesService, and shapes responses.
 * Contains no business logic.
 */
export class RulesController {
  constructor(private readonly service: RulesService) {}

  /**
   * Handles GET /rules — returns all state rules.
   *
   * @param req - Express request
   * @param res - Express response
   * @param next - Express next function for error propagation
   */
  getAll = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      req.step?.("received", { params: req.params, query: req.query, body: req.body });
      if (!req.user) return next(new UnauthorizedError());
      req.step?.("validated");

      req.step?.("delegating to service");
      const rules = await this.service.getAllRules();
      req.step?.("responding", { status: HTTP_STATUS.OK });
      sendSuccess(res, rules, MESSAGES.SUCCESS, HTTP_STATUS.OK);
    } catch (err) {
      next(err);
    }
  };

  /**
   * Handles GET /rules/:state — returns the rule for a single state.
   *
   * @param req - Express request (params: { state: RuleState })
   * @param res - Express response
   * @param next - Express next function for error propagation
   */
  getByState = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      req.step?.("received", { params: req.params, query: req.query, body: req.body });
      if (!req.user) return next(new UnauthorizedError());

      const { state } = stateParamSchema.parse(req.params);
      req.step?.("validated");

      req.step?.("delegating to service");
      const rule = await this.service.getRuleByState(state);
      req.step?.("responding", { status: HTTP_STATUS.OK });
      sendSuccess(res, rule, MESSAGES.SUCCESS, HTTP_STATUS.OK);
    } catch (err) {
      next(err);
    }
  };

  /**
   * Handles PUT /rules/:state — creates or updates the rule for a state.
   * Restricted to super_admin and firm_admin roles.
   *
   * @param req - Express request (params: { state: RuleState }, body: UpdateRuleBody)
   * @param res - Express response
   * @param next - Express next function for error propagation
   */
  updateRule = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      req.step?.("received", { params: req.params, query: req.query, body: req.body });
      if (!req.user) return next(new UnauthorizedError());

      if (!isAdminRole(req.user.role)) {
        return next(new ForbiddenError("Only administrators may update state rules"));
      }

      const { state } = stateParamSchema.parse(req.params);
      const body = updateRuleSchema.parse(req.body);
      req.step?.("validated");

      req.step?.("delegating to service");
      const rule = await this.service.updateRule(state, body, req.user.id);
      req.step?.("responding", { status: HTTP_STATUS.OK });
      sendSuccess(res, rule, MESSAGES.UPDATED, HTTP_STATUS.OK);
    } catch (err) {
      next(err);
    }
  };
}
