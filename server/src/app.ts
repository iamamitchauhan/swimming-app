import express, { Request, Response } from "express";
import path from "path";
import helmet from "helmet";
import cors from "cors";
import rateLimit from "express-rate-limit";
import swaggerUi from "swagger-ui-express";
import { config } from "./config/env";
import { swaggerSpec } from "./config/swagger";
import { requestId } from "./middleware/requestId.middleware";
import { requestLogger } from "./middleware/requestLogger.middleware";
import { errorHandler } from "./middleware/error.middleware";
import { HTTP_STATUS } from "./shared/constants/httpStatus";
import { MESSAGES } from "./shared/constants/messages";
import { sendError } from "./shared/utils/response";
import { API_PREFIX } from "./shared/constants/routes";
import { authRouter } from "./modules/auth/auth.routes";
import { onboardingRouter } from "./modules/onboarding/onboarding.routes";
import { clubRouter } from "./modules/club/club.routes";
import { invitationRouter } from "./modules/invitation/invitation.routes";
import { userRouter } from "./modules/user/user.routes";
import { tryoutRouter } from "./modules/tryout/tryout.routes";
import { swimmerRouter } from "./modules/swimmer/swimmer.routes";
import { registrationRouter, adminRegistrationRouter } from "./modules/registration/registration.routes";
import { publicRouter } from "./modules/public/public.routes";
import { parentRouter } from "./modules/parent/parent.routes";
import { questionLibraryRouter } from "./modules/question-library/question-library.routes";
import { waitlistRouter } from "./modules/waitlist/waitlist.routes";
import { emailTemplateRouter } from "./modules/email-template/email-template.routes";
import { groupRouter } from "./modules/group/group.routes";

const rateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 500,
  statusCode: HTTP_STATUS.TOO_MANY_REQUESTS,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (_req, res) => sendError(res, "Too many requests. Please try again later.", HTTP_STATUS.TOO_MANY_REQUESTS, MESSAGES.RATE_LIMIT_EXCEEDED),
});

/**
 * Creates and configures the Express application.
 * Does not call app.listen — that is the responsibility of server.ts.
 *
 * @returns Configured Express application instance
 */
export function createApp(): express.Application {
  const app = express();

  // Trust the first proxy hop (nginx) so X-Forwarded-* headers are respected
  app.set("trust proxy", 1);

  // Security & parsing middleware
  app.use(helmet());
  app.use(
    cors({
      origin: true,
      credentials: true,
    }),
  );
  app.use(express.json());
  app.use(requestId);
  app.use(requestLogger);
  // app.use(rateLimiter);

  // Swagger UI — available in all environments for this project
  // Helmet's default CSP blocks swagger-ui inline scripts, so we override it for this path only.
  app.use(
    "/api-docs",
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'", "'unsafe-inline'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          imgSrc: ["'self'", "data:", "https:"],
        },
      },
    }),
    swaggerUi.serve,
    swaggerUi.setup(swaggerSpec, {
      customSiteTitle: "Swimming Club API Docs",
      swaggerOptions: { persistAuthorization: true },
    }),
  );
  // Raw OpenAPI JSON spec (useful for code generation / Postman import)
  app.get("/api-docs.json", (_req: Request, res: Response) => {
    res.setHeader("Content-Type", "application/json");
    res.send(swaggerSpec);
  });

  // Static assets — served before API routes
  // CORP header required because client/landing are on different subdomains
  app.use(
    "/assets",
    (_req, res, next) => {
      res.setHeader("Cross-Origin-Resource-Policy", "cross-origin");
      next();
    },
    express.static(path.join(__dirname, "assets")),
  );

  // Health check — intentionally before module routes
  app.get(`${API_PREFIX}/health`, (_req: Request, res: Response) => {
    res.status(HTTP_STATUS.OK).json({
      success: true,
      message: "OK",
      data: { uptime: process.uptime() },
      error: null,
    });
  });

  // Module routes
  app.use(`${API_PREFIX}/auth`, authRouter);
  app.use(`${API_PREFIX}/onboarding`, onboardingRouter);
  app.use(`${API_PREFIX}/clubs`, clubRouter);
  app.use(`${API_PREFIX}/invitations`, invitationRouter);
  app.use(`${API_PREFIX}/users`, userRouter);
  app.use(`${API_PREFIX}/tryouts`, tryoutRouter);
  app.use(`${API_PREFIX}/swimmers`, swimmerRouter);
  app.use(`${API_PREFIX}/registrations`, registrationRouter);
  app.use(`${API_PREFIX}/admin/registrations`, adminRegistrationRouter);
  app.use(`${API_PREFIX}/public`, publicRouter);
  app.use(`${API_PREFIX}/parent`, parentRouter);
  app.use(`${API_PREFIX}/question-library`, questionLibraryRouter);
  app.use(`${API_PREFIX}/waitlist`, waitlistRouter);
  app.use(`${API_PREFIX}/email-templates`, emailTemplateRouter);
  app.use(`${API_PREFIX}/groups`, groupRouter);

  // Global error handler — must be last
  app.use(errorHandler);

  return app;
}
