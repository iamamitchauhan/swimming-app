import swaggerJsdoc from "swagger-jsdoc";
import { config } from "./env";

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: "3.0.3",
    info: {
      title: "Swimming Club Management API",
      version: "1.0.0",
      description:
        "REST API for the Swimming Club Management Platform. Covers authentication (email-verify + OTP), club onboarding, approval workflow, invitation system, and user management.",
      contact: { name: "Swimtryout Team" },
    },
    servers: [
      {
        url: `http://localhost:${process.env["PORT"] ?? 5000}/api/v1`,
        description: "Local development",
      },
      {
        url: `${config.APP_BASE_URL}/api/v1`,
        description: "Configured base URL",
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "JWT",
          description: "Paste the JWT token returned by POST /auth/verify-otp",
        },
      },
      schemas: {
        // ─── Generic ──────────────────────────────────────────────────────────
        SuccessResponse: {
          type: "object",
          properties: {
            success: { type: "boolean", example: true },
            message: { type: "string", example: "Success" },
            data: { type: "object", nullable: true },
            error: { type: "string", nullable: true, example: null },
          },
        },
        ErrorResponse: {
          type: "object",
          properties: {
            success: { type: "boolean", example: false },
            message: { type: "string", example: "An error occurred" },
            data: { type: "object", nullable: true, example: null },
            error: { type: "string", example: "ERROR_CODE" },
          },
        },
        // ─── User ─────────────────────────────────────────────────────────────
        PublicUser: {
          type: "object",
          properties: {
            id: { type: "string", example: "665f1a2b3c4d5e6f7a8b9c0d" },
            email: { type: "string", format: "email", example: "user@example.com" },
            role: {
              type: "string",
              enum: ["super_admin", "admin", "coach"],
              example: "admin",
            },
            status: {
              type: "string",
              enum: ["pending", "active", "suspended"],
              example: "active",
            },
            clubId: {
              type: "string",
              nullable: true,
              example: "665f1a2b3c4d5e6f7a8b9c0e",
            },
            onboardingStep: { type: "integer", minimum: 0, maximum: 3, example: 2 },
            emailVerified: { type: "boolean", example: true },
            firstName: { type: "string", example: "Jane" },
            lastName: { type: "string", example: "Doe" },
          },
        },
        // ─── Club ─────────────────────────────────────────────────────────────
        Club: {
          type: "object",
          properties: {
            _id: { type: "string", example: "665f1a2b3c4d5e6f7a8b9c0e" },
            name: { type: "string", example: "Blue Dolphins Swim Club" },
            address: { type: "string", example: "12 Poolside Lane, Miami, FL" },
            phone: { type: "string", example: "+1-305-555-0100" },
            logoUrl: {
              type: "string",
              format: "uri",
              nullable: true,
              example: "https://cdn.example.com/logo.png",
            },
            ownerId: { type: "string", example: "665f1a2b3c4d5e6f7a8b9c0d" },
            status: {
              type: "string",
              enum: ["draft", "pending_review", "approved", "rejected"],
              example: "approved",
            },
            rejectionReason: {
              type: "string",
              nullable: true,
              example: null,
            },
          },
        },
        // ─── Invitation ───────────────────────────────────────────────────────
        Invitation: {
          type: "object",
          properties: {
            _id: { type: "string", example: "665f1a2b3c4d5e6f7a8b9c10" },
            email: { type: "string", format: "email", example: "coach@example.com" },
            role: { type: "string", enum: ["admin", "coach"], example: "coach" },
            clubId: { type: "string", example: "665f1a2b3c4d5e6f7a8b9c0e" },
            invitedBy: { type: "string", example: "665f1a2b3c4d5e6f7a8b9c0d" },
            status: {
              type: "string",
              enum: ["pending", "accepted", "expired"],
              example: "pending",
            },
            expiresAt: { type: "string", format: "date-time" },
            createdAt: { type: "string", format: "date-time" },
          },
        },
        // ─── Tryout ───────────────────────────────────────────────────────
        Tryout: {
          type: "object",
          properties: {
            _id: { type: "string", example: "665f1a2b3c4d5e6f7a8b9c11" },
            name: { type: "string", example: "Summer Swim Team Tryouts 2024" },
            location: { type: "string", example: "Main Pool - Blue Dolphins Aquatic Center" },
            description: {
              type: "string",
              example: "Join our competitive swim team! We're looking for talented young swimmers ages 6-18 to join our award-winning program.",
            },
            theme: {
              type: "string",
              enum: ["ocean", "sunset", "forest", "city"],
              example: "ocean",
            },
            bannerUrl: {
              type: "string",
              format: "uri",
              nullable: true,
              example: "https://cdn.example.com/tryout-banner.jpg",
            },
            slotDuration: { type: "integer", minimum: 15, maximum: 120, example: 30 },
            swimmersPerSlot: { type: "integer", minimum: 1, maximum: 100, example: 24 },
            lanesAvailable: {
              type: "integer",
              minimum: 1,
              maximum: 10,
              example: 6,
              description: "Number of pool lanes; laneDetails are generated from this value",
            },
            laneDetails: {
              type: "array",
              items: {
                type: "object",
                required: ["_id", "name", "order"],
                properties: {
                  _id: { type: "string", example: "665f1a2b3c4d5e6f7a8b9c12" },
                  name: { type: "string", example: "Lane 1" },
                  order: { type: "integer", minimum: 1, example: 1 },
                },
              },
            },
            coachAssignments: {
              type: "array",
              items: {
                type: "object",
                required: ["_id", "coachId", "role"],
                properties: {
                  _id: { type: "string" },
                  coachId: { type: "string" },
                  role: { type: "string", enum: ["Lead Coach", "Assistant Coach", "Evaluator"] },
                  segmentIds: { type: "array", items: { type: "string" } },
                  laneIds: { type: "array", items: { type: "string" } },
                },
              },
            },
            swimmersPerLane: { type: "integer", minimum: 1, maximum: 10, example: 4 },
            ctaLabel: { type: "string", example: "Sign up today" },
            highlights: {
              type: "string",
              example: "• Professional coaching staff\n• State-of-the-art facility\n• Competitive team environment\n• All skill levels welcome",
            },
            additionalInstructions: {
              type: "string",
              nullable: true,
              example: "Please bring swimsuit, towel, goggles, and water bottle. Arrive 15 minutes early for check-in.",
            },
            status: {
              type: "string",
              enum: ["draft", "active", "closed", "cancelled"],
              example: "active",
            },
            sessions: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  date: { type: "string", format: "date", example: "2024-07-15" },
                  startTime: { type: "string", pattern: "^([01]?[0-9]|2[0-3]):[0-5][0-9]$", example: "09:00" },
                  endTime: { type: "string", pattern: "^([01]?[0-9]|2[0-3]):[0-5][0-9]$", example: "12:00" },
                  label: { type: "string", example: "Morning Session - Ages 6-10" },
                },
              },
            },
            segments: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  name: { type: "string", example: "Junior Swimmers" },
                  minAge: { type: "integer", minimum: 4, maximum: 18, example: 6 },
                  maxAge: { type: "integer", minimum: 4, maximum: 18, example: 10 },
                  level: {
                    type: "string",
                    enum: ["beginner", "intermediate", "advanced", "elite"],
                    example: "beginner",
                  },
                },
              },
            },
            steps: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  title: { type: "string", example: "Registration & Check-in" },
                  description: { type: "string", example: "Complete registration forms and receive your tryout number" },
                },
              },
            },
            faqs: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  question: { type: "string", example: "What should my child bring to the tryout?" },
                  answer: { type: "string", example: "Please bring a swimsuit, towel, goggles, cap, and water bottle." },
                },
              },
            },
            clubId: { type: "string", example: "665f1a2b3c4d5e6f7a8b9c0e" },
            createdBy: { type: "string", example: "665f1a2b3c4d5e6f7a8b9c0d" },
            isTest: { type: "boolean", example: false, description: "Whether this is test data (set automatically based on TEST_USER_IDS)" },
            createdAt: { type: "string", format: "date-time" },
            updatedAt: { type: "string", format: "date-time" },
          },
        },
        TryoutListResult: {
          type: "object",
          properties: {
            tryouts: {
              type: "array",
              items: { $ref: "#/components/schemas/Tryout" },
            },
            total: { type: "integer", example: 25 },
            page: { type: "integer", minimum: 1, example: 1 },
            limit: { type: "integer", minimum: 1, maximum: 100, example: 10 },
            totalPages: { type: "integer", example: 3 },
          },
        },
        CreateTryoutRequest: {
          type: "object",
          required: ["name", "status"],
          properties: {
            name: { type: "string", example: "Summer Swim Team Tryouts 2024" },
            location: { type: "string", example: "Main Pool - Blue Dolphins Aquatic Center" },
            description: { type: "string", example: "Join our competitive swim team!" },
            theme: {
              type: "string",
              enum: ["ocean", "sunset", "forest", "city"],
              example: "ocean",
            },
            bannerUrl: { type: "string", format: "uri", nullable: true },
            slotDuration: { type: "integer", minimum: 15, maximum: 120, example: 30 },
            swimmersPerSlot: { type: "integer", minimum: 1, maximum: 100, example: 24 },
            lanesAvailable: { type: "integer", minimum: 1, maximum: 10, example: 6 },
            swimmersPerLane: { type: "integer", minimum: 1, maximum: 10, example: 4 },
            ctaLabel: { type: "string", example: "Sign up today" },
            highlights: { type: "string", example: "Professional coaching staff" },
            additionalInstructions: { type: "string", nullable: true },
            status: {
              type: "string",
              enum: ["draft", "active", "closed", "cancelled"],
              example: "draft",
            },
            sessions: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  date: { type: "string", format: "date" },
                  startTime: { type: "string", pattern: "^([01]?[0-9]|2[0-3]):[0-5][0-9]$" },
                  endTime: { type: "string", pattern: "^([01]?[0-9]|2[0-3]):[0-5][0-9]$" },
                  label: { type: "string" },
                },
              },
            },
            segments: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  name: { type: "string" },
                  minAge: { type: "integer" },
                  maxAge: { type: "integer" },
                  level: {
                    type: "string",
                    enum: ["beginner", "intermediate", "advanced", "elite"],
                  },
                },
              },
            },
            steps: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  title: { type: "string" },
                  description: { type: "string" },
                },
              },
            },
            faqs: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  question: { type: "string" },
                  answer: { type: "string" },
                },
              },
            },
          },
        },
        EmailTemplate: {
          type: "object",
          properties: {
            _id: { type: "string", example: "665f1a2b3c4d5e6f7a8b9c0e" },
            clubId: { type: "string", example: "665f1a2b3c4d5e6f7a8b9c0e" },
            groupId: { type: "string", nullable: true, example: "platinum" },
            type: { type: "string", enum: ["offered", "rejection"], example: "offered" },
            subject: { type: "string", example: "🎉 You've been offered a spot!" },
            body: {
              type: "string",
              example: "Hi {{parent_name}},\n\nWe are thrilled to offer {{swimmer_name}} a spot on our team!",
            },
            createdBy: { type: "string", example: "665f1a2b3c4d5e6f7a8b9c0d" },
            updatedBy: { type: "string", example: "665f1a2b3c4d5e6f7a8b9c0d" },
            createdAt: { type: "string", format: "date-time" },
            updatedAt: { type: "string", format: "date-time" },
          },
        },
        EmailTemplateBulkRequest: {
          type: "object",
          required: ["templates"],
          properties: {
            templates: {
              type: "array",
              items: {
                type: "object",
                required: ["type", "subject", "body"],
                properties: {
                  groupId: { type: "string", nullable: true, example: "platinum" },
                  type: { type: "string", enum: ["offered", "rejection"], example: "offered" },
                  subject: { type: "string", example: "🎉 You've been offered a spot!" },
                  body: {
                    type: "string",
                    example: "Hi {{parent_name}},\n\nWe are thrilled to offer {{swimmer_name}} a spot on our team!",
                  },
                },
              },
            },
          },
        },
        EmailTemplateListResponse: {
          type: "object",
          properties: {
            templates: {
              type: "array",
              items: { $ref: "#/components/schemas/EmailTemplate" },
            },
          },
        },
        Group: {
          type: "object",
          properties: {
            _id: { type: "string", example: "665f1a2b3c4d5e6f7a8b9c20" },
            name: { type: "string", example: "Platinum" },
            color: { type: "string", example: "#7c3aed" },
            description: { type: "string", nullable: true, example: "Top-tier competitive swimmers" },
            clubId: { type: "string", example: "665f1a2b3c4d5e6f7a8b9c0e" },
            createdBy: {
              type: "object",
              properties: {
                _id: { type: "string", example: "665f1a2b3c4d5e6f7a8b9c0d" },
                email: { type: "string", example: "admin@club.com" },
                firstName: { type: "string", example: "Jane" },
                lastName: { type: "string", example: "Doe" },
              },
            },
            updatedBy: {
              type: "object",
              properties: {
                _id: { type: "string", example: "665f1a2b3c4d5e6f7a8b9c0d" },
                email: { type: "string", example: "admin@club.com" },
                firstName: { type: "string", example: "Jane" },
                lastName: { type: "string", example: "Doe" },
              },
            },
            deletedBy: { type: "string", nullable: true, example: null },
            createdAt: { type: "string", format: "date-time" },
            updatedAt: { type: "string", format: "date-time" },
            deletedAt: { type: "string", format: "date-time", nullable: true, example: null },
          },
        },
        CreateGroupRequest: {
          type: "object",
          required: ["name"],
          properties: {
            name: { type: "string", example: "Platinum" },
            color: { type: "string", example: "#7c3aed" },
            description: { type: "string", nullable: true, example: "Top-tier competitive swimmers" },
          },
        },
        UpdateGroupRequest: {
          type: "object",
          required: ["name"],
          properties: {
            name: { type: "string", example: "Gold" },
            color: { type: "string", example: "#f59e0b" },
            description: { type: "string", nullable: true, example: "Experienced competitive swimmers" },
          },
        },
        GroupListResponse: {
          type: "object",
          properties: {
            groups: {
              type: "array",
              items: { $ref: "#/components/schemas/Group" },
            },
          },
        },
        UpdateTryoutRequest: {
          type: "object",
          properties: {
            name: { type: "string" },
            location: { type: "string" },
            description: { type: "string" },
            theme: {
              type: "string",
              enum: ["ocean", "sunset", "forest", "city"],
            },
            bannerUrl: { type: "string", format: "uri", nullable: true },
            slotDuration: { type: "integer", minimum: 15, maximum: 120 },
            swimmersPerSlot: { type: "integer", minimum: 1, maximum: 100 },
            lanesAvailable: { type: "integer", minimum: 1, maximum: 10 },
            laneDetails: {
              type: "array",
              description: "Pool lanes with editable names and stable IDs",
              items: {
                type: "object",
                required: ["_id", "name", "order"],
                properties: {
                  _id: { type: "string" },
                  name: { type: "string" },
                  order: { type: "integer", minimum: 1 },
                },
              },
            },
            coachAssignments: {
              type: "array",
              description: "Coaches assigned to segments and lanes",
              items: {
                type: "object",
                required: ["coachId", "role"],
                properties: {
                  coachId: { type: "string" },
                  role: { type: "string", enum: ["Lead Coach", "Assistant Coach", "Evaluator"] },
                  segmentIds: { type: "array", items: { type: "string" } },
                  laneIds: { type: "array", items: { type: "string" } },
                },
              },
            },
            swimmersPerLane: { type: "integer", minimum: 1, maximum: 10 },
            ctaLabel: { type: "string" },
            highlights: { type: "string" },
            additionalInstructions: { type: "string", nullable: true },
            status: {
              type: "string",
              enum: ["draft", "active", "closed", "cancelled"],
            },
            sessions: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  date: { type: "string", format: "date" },
                  startTime: { type: "string", pattern: "^([01]?[0-9]|2[0-3]):[0-5][0-9]$" },
                  endTime: { type: "string", pattern: "^([01]?[0-9]|2[0-3]):[0-5][0-9]$" },
                  label: { type: "string" },
                },
              },
            },
            segments: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  name: { type: "string" },
                  minAge: { type: "integer" },
                  maxAge: { type: "integer" },
                  level: {
                    type: "string",
                    enum: ["beginner", "intermediate", "advanced", "elite"],
                  },
                },
              },
            },
            steps: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  title: { type: "string" },
                  description: { type: "string" },
                },
              },
            },
            faqs: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  question: { type: "string" },
                  answer: { type: "string" },
                },
              },
            },
          },
        },
      },
      responses: {
        Unauthorized: {
          description: "Missing or invalid JWT token",
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/ErrorResponse" },
              example: {
                success: false,
                message: "Unauthorized",
                data: null,
                error: "MISSING_TOKEN",
              },
            },
          },
        },
        Forbidden: {
          description: "Authenticated but lacking required role or club access",
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/ErrorResponse" },
              example: {
                success: false,
                message: "Forbidden",
                data: null,
                error: "INSUFFICIENT_ROLE",
              },
            },
          },
        },
        NotFound: {
          description: "Resource not found",
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/ErrorResponse" },
              example: {
                success: false,
                message: "Not found",
                data: null,
                error: null,
              },
            },
          },
        },
        ValidationError: {
          description: "Request body / query failed validation",
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/ErrorResponse" },
              example: {
                success: false,
                message: "Validation error",
                data: null,
                error: [{ field: "email", message: "Must be a valid email address" }],
              },
            },
          },
        },
        TooManyRequests: {
          description: "Rate limit exceeded",
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/ErrorResponse" },
              example: {
                success: false,
                message: "Too many requests",
                data: null,
                error: "RATE_LIMIT_EXCEEDED",
              },
            },
          },
        },
      },
    },
    tags: [
      { name: "Health", description: "Server liveness check" },
      { name: "Auth", description: "Registration, email verification, OTP login" },
      { name: "Onboarding", description: "Multi-step club onboarding for admin users" },
      { name: "Clubs", description: "Club management and approval workflow (super_admin)" },
      { name: "Invitations", description: "Send and accept user invitations" },
      { name: "Users", description: "User profile and listing" },
      { name: "Tryouts", description: "Swim tryout management for clubs and public registration" },
      { name: "Email Templates", description: "Per-group email template configuration" },
      { name: "Groups", description: "Club group management" },
      { name: "Public", description: "Public endpoints for the landing page (no auth required)" },
      { name: "Parent Auth", description: "Parent authentication (registration, email verification, OTP login)" },
    ],
  },
  apis: ["./src/docs/**/*.yaml"],
};

export const swaggerSpec = swaggerJsdoc(options);
