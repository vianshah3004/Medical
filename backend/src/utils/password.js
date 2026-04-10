import bcrypt from 'bcrypt';
import { randomBytes } from 'crypto';

const SALT_ROUNDS = 12;

export async function hashPassword(plaintext) {
  return bcrypt.hash(plaintext, SALT_ROUNDS);
}

export async function comparePassword(plaintext, hash) {
  return bcrypt.compare(plaintext, hash);
}

/**
 * Generate a random temporary password for doctor onboarding.
 * Format: 3 uppercase + 4 digits + 3 lowercase  (e.g. "XKR4821qmz")
 */
export function generateTempPassword(length = 12) {
  return randomBytes(length).toString('base64url').slice(0, length);
}
