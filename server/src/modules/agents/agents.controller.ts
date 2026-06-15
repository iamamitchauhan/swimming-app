import { Request, Response, NextFunction } from 'express';
import { AgentsService } from './agents.service';
import {
  agentIdParamSchema,
  updateAgentConfigSchema,
  agentActivityQuerySchema,
} from './agents.validation';
import { HTTP_STATUS } from '../../shared/constants/httpStatus';
import { MESSAGES } from '../../shared/constants/messages';
import { sendSuccess } from '../../shared/utils/response';
import { ForbiddenError, UnauthorizedError } from '../../shared/errors/domain.errors';
import { ADMIN_ROLES, UserRole } from '../../shared/constants/roles';

// ─── Role helpers ─────────────────────────────────────────────────────────────

function isAdminRole(role: string): role is UserRole {
  return (ADMIN_ROLES as string[]).includes(role);
}

// ─── Controller ───────────────────────────────────────────────────────────────

/**
 * Handles HTTP layer for agent configuration and activity endpoints.
 * Validates input, enforces authorization, delegates to AgentsService, and shapes responses.
 * Contains no business logic.
 */
export class AgentsController {
  constructor(private readonly service: AgentsService) {}

  /**
   * Handles GET /agents — returns all agent configurations.
   *
   * @param req - Express request
   * @param res - Express response
   * @param next - Express next for error propagation
   */
  getConfigs = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) return next(new UnauthorizedError());

      const configs = await this.service.getAllAgentConfigs();
      sendSuccess(res, configs, MESSAGES.SUCCESS, HTTP_STATUS.OK);
    } catch (err) {
      next(err);
    }
  };

  /**
   * Handles GET /agents/activity — returns recent agent activity.
   * Accepts optional query params: agentId, limit (1–100, default 20).
   *
   * @param req - Express request (query: AgentActivityQuery)
   * @param res - Express response
   * @param next - Express next for error propagation
   */
  getActivity = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) return next(new UnauthorizedError());

      const { agentId, limit } = agentActivityQuerySchema.parse(req.query);
      const activity = await this.service.getAgentActivity(agentId, limit);
      sendSuccess(res, activity, MESSAGES.SUCCESS, HTTP_STATUS.OK);
    } catch (err) {
      next(err);
    }
  };

  /**
   * Handles PATCH /agents/:agentId — updates an agent configuration.
   * Restricted to super_admin and firm_admin roles.
   *
   * @param req - Express request (params: { agentId }, body: UpdateAgentConfigBody)
   * @param res - Express response
   * @param next - Express next for error propagation
   */
  updateConfig = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) return next(new UnauthorizedError());

      if (!isAdminRole(req.user.role)) {
        return next(new ForbiddenError('Only administrators may update agent configurations'));
      }

      const { agentId } = agentIdParamSchema.parse(req.params);
      const body = updateAgentConfigSchema.parse(req.body);

      const updated = await this.service.updateAgentConfig(agentId, body, req.user.id);
      sendSuccess(res, updated, MESSAGES.UPDATED, HTTP_STATUS.OK);
    } catch (err) {
      next(err);
    }
  };
}
