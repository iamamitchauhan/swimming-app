import crypto from 'crypto';

const OTP_LENGTH = 6;

/**
 * Generates a cryptographically random 6-digit OTP string.
 * Pads with leading zeros if necessary.
 */
export function generateOtp(): string {
  const max = Math.pow(10, OTP_LENGTH);
  const bytes = crypto.randomBytes(4);
  const num = bytes.readUInt32BE(0) % max;
  return num.toString().padStart(OTP_LENGTH, '0');
}

/**
 * Hashes a plain OTP code with SHA-256 for safe storage.
 *
 * @param code - Plain 6-digit OTP string
 * @returns Hex-encoded SHA-256 hash
 */
export function hashOtp(code: string): string {
  return crypto.createHash('sha256').update(code).digest('hex');
}

/**
 * Compares a plain OTP against a stored hash using constant-time comparison.
 *
 * @param plain - Plain OTP submitted by the user
 * @param hash - Stored SHA-256 hash
 * @returns True if they match
 */
export function verifyOtp(plain: string, hash: string): boolean {
  const inputHash = hashOtp(plain);
  const inputBuf = Buffer.from(inputHash, 'hex');
  const storedBuf = Buffer.from(hash, 'hex');

  if (inputBuf.length !== storedBuf.length) return false;
  return crypto.timingSafeEqual(inputBuf, storedBuf);
}
