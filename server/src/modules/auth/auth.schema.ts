// Re-export domain models used by the auth module.
// All schema definitions live in src/models/ for centralized access.
export { UserModel, IUser } from '../../models/user.model';
export { OtpModel, IOtp } from '../../models/otp.model';
export { EmailVerificationModel, IEmailVerification } from '../../models/email-verification.model';
