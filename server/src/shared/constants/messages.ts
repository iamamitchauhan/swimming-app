/**
 * Canonical user-facing response messages.
 * Always reference these constants rather than inlining strings.
 */
export const MESSAGES = {
  SUCCESS: 'Request completed successfully.',
  CREATED: 'Resource created successfully.',
  UPDATED: 'Resource updated successfully.',
  DELETED: 'Resource deleted successfully.',
  NOT_FOUND: 'The requested resource was not found.',
  UNAUTHORIZED: 'Authentication is required to access this resource.',
  FORBIDDEN: 'You do not have permission to perform this action.',
  VALIDATION_ERROR: 'The request data failed validation.',
  INTERNAL_ERROR: 'An unexpected error occurred. Please try again later.',
  CONFLICT: 'A resource with the provided data already exists.',
  RATE_LIMIT_EXCEEDED: 'Too many requests. Please try again later.',
  EMAIL_SENT: 'Verification email sent. Please check your inbox.',
  OTP_SENT: 'OTP sent to your email address.',
  OTP_VERIFIED: 'OTP verified successfully.',
  OTP_INVALID: 'Invalid or expired OTP.',
  EMAIL_ALREADY_VERIFIED: 'Email is already verified.',
  EMAIL_VERIFY_TOKEN_INVALID: 'Invalid or expired email verification link.',
  ONBOARDING_STEP_SAVED: 'Onboarding step saved successfully.',
  CLUB_SUBMITTED: 'Club application submitted for review.',
  CLUB_APPROVED: 'Club has been approved.',
  CLUB_REJECTED: 'Club has been rejected.',
  INVITATION_SENT: 'Invitation sent successfully.',
  INVITATION_ACCEPTED: 'Invitation accepted. Your account is ready.',
  INVITATION_INVALID: 'Invalid or expired invitation link.',
} as const;

export type MessageKey = keyof typeof MESSAGES;
