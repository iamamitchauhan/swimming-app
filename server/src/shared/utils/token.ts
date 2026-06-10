import crypto from 'crypto';

/**
 * Generates a cryptographically secure random URL-safe token (32 bytes = 64 hex chars).
 */
export function generateSecureToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

/**
 * Hashes a plain token with SHA-256 for safe storage.
 *
 * @param token - Plain token string
 * @returns Hex-encoded SHA-256 hash
 */
export function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

/**
 * Compares a plain token against a stored hash using constant-time comparison.
 *
 * @param plain - Plain token submitted by the user
 * @param hash - Stored SHA-256 hash
 * @returns True if they match
 */
export function verifyToken(plain: string, hash: string): boolean {
  const inputHash = hashToken(plain);
  const inputBuf = Buffer.from(inputHash, 'hex');
  const storedBuf = Buffer.from(hash, 'hex');

  if (inputBuf.length !== storedBuf.length) return false;
  return crypto.timingSafeEqual(inputBuf, storedBuf);
}
