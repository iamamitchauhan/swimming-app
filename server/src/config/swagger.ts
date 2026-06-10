import swaggerJsdoc from 'swagger-jsdoc';
import { config } from './env';

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: '3.0.3',
    info: {
      title: 'Swimming Club Management API',
      version: '1.0.0',
      description:
        'REST API for the Swimming Club Management Platform. Covers authentication (email-verify + OTP), club onboarding, approval workflow, invitation system, and user management.',
      contact: { name: 'Swimming App Team' },
    },
    servers: [
      {
        url: `http://localhost:${process.env['PORT'] ?? 3001}/api/v1`,
        description: 'Local development',
      },
      {
        url: `${config.APP_BASE_URL}/api/v1`,
        description: 'Configured base URL',
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'Paste the JWT token returned by POST /auth/verify-otp',
        },
      },
      schemas: {
        // ─── Generic ──────────────────────────────────────────────────────────
        SuccessResponse: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: true },
            message: { type: 'string', example: 'Success' },
            data: { type: 'object', nullable: true },
            error: { type: 'string', nullable: true, example: null },
          },
        },
        ErrorResponse: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: false },
            message: { type: 'string', example: 'An error occurred' },
            data: { type: 'object', nullable: true, example: null },
            error: { type: 'string', example: 'ERROR_CODE' },
          },
        },
        // ─── User ─────────────────────────────────────────────────────────────
        PublicUser: {
          type: 'object',
          properties: {
            id: { type: 'string', example: '665f1a2b3c4d5e6f7a8b9c0d' },
            email: { type: 'string', format: 'email', example: 'user@example.com' },
            role: {
              type: 'string',
              enum: ['super_admin', 'admin', 'coach'],
              example: 'admin',
            },
            status: {
              type: 'string',
              enum: ['pending', 'active', 'suspended'],
              example: 'active',
            },
            clubId: {
              type: 'string',
              nullable: true,
              example: '665f1a2b3c4d5e6f7a8b9c0e',
            },
            onboardingStep: { type: 'integer', minimum: 0, maximum: 3, example: 2 },
            emailVerified: { type: 'boolean', example: true },
            firstName: { type: 'string', example: 'Jane' },
            lastName: { type: 'string', example: 'Doe' },
          },
        },
        // ─── Club ─────────────────────────────────────────────────────────────
        Club: {
          type: 'object',
          properties: {
            _id: { type: 'string', example: '665f1a2b3c4d5e6f7a8b9c0e' },
            name: { type: 'string', example: 'Blue Dolphins Swim Club' },
            address: { type: 'string', example: '12 Poolside Lane, Miami, FL' },
            phone: { type: 'string', example: '+1-305-555-0100' },
            logoUrl: {
              type: 'string',
              format: 'uri',
              nullable: true,
              example: 'https://cdn.example.com/logo.png',
            },
            ownerId: { type: 'string', example: '665f1a2b3c4d5e6f7a8b9c0d' },
            status: {
              type: 'string',
              enum: ['draft', 'pending_review', 'approved', 'rejected'],
              example: 'approved',
            },
            rejectionReason: {
              type: 'string',
              nullable: true,
              example: null,
            },
          },
        },
        // ─── Invitation ───────────────────────────────────────────────────────
        Invitation: {
          type: 'object',
          properties: {
            _id: { type: 'string', example: '665f1a2b3c4d5e6f7a8b9c10' },
            email: { type: 'string', format: 'email', example: 'coach@example.com' },
            role: { type: 'string', enum: ['admin', 'coach'], example: 'coach' },
            clubId: { type: 'string', example: '665f1a2b3c4d5e6f7a8b9c0e' },
            invitedBy: { type: 'string', example: '665f1a2b3c4d5e6f7a8b9c0d' },
            status: {
              type: 'string',
              enum: ['pending', 'accepted', 'expired'],
              example: 'pending',
            },
            expiresAt: { type: 'string', format: 'date-time' },
            createdAt: { type: 'string', format: 'date-time' },
          },
        },
      },
      responses: {
        Unauthorized: {
          description: 'Missing or invalid JWT token',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/ErrorResponse' },
              example: {
                success: false,
                message: 'Unauthorized',
                data: null,
                error: 'MISSING_TOKEN',
              },
            },
          },
        },
        Forbidden: {
          description: 'Authenticated but lacking required role or club access',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/ErrorResponse' },
              example: {
                success: false,
                message: 'Forbidden',
                data: null,
                error: 'INSUFFICIENT_ROLE',
              },
            },
          },
        },
        NotFound: {
          description: 'Resource not found',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/ErrorResponse' },
              example: {
                success: false,
                message: 'Not found',
                data: null,
                error: null,
              },
            },
          },
        },
        ValidationError: {
          description: 'Request body / query failed validation',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/ErrorResponse' },
              example: {
                success: false,
                message: 'Validation error',
                data: null,
                error: [{ field: 'email', message: 'Must be a valid email address' }],
              },
            },
          },
        },
        TooManyRequests: {
          description: 'Rate limit exceeded',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/ErrorResponse' },
              example: {
                success: false,
                message: 'Too many requests',
                data: null,
                error: 'RATE_LIMIT_EXCEEDED',
              },
            },
          },
        },
      },
    },
    tags: [
      { name: 'Health', description: 'Server liveness check' },
      { name: 'Auth', description: 'Registration, email verification, OTP login' },
      { name: 'Onboarding', description: 'Multi-step club onboarding for admin users' },
      { name: 'Clubs', description: 'Club management and approval workflow (super_admin)' },
      { name: 'Invitations', description: 'Send and accept user invitations' },
      { name: 'Users', description: 'User profile and listing' },
    ],
  },
  apis: ['./src/docs/**/*.yaml'],
};

export const swaggerSpec = swaggerJsdoc(options);
