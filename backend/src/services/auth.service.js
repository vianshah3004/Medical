import { db } from '../db/index.js';
import { medOrganizations, medUsers } from '../db/schema.js';
import { eq } from 'drizzle-orm';
import { hashPassword, comparePassword } from '../utils/password.js';
import { signToken } from '../utils/jwt.js';

/**
 * Register a new organization with its first admin user.
 */
export async function signup({ orgName, orgType, name, email, password }) {
  // 1. Create organization
  const [org] = await db.insert(medOrganizations).values({
    name: orgName,
    type: orgType || 'hospital',
    email,
  }).returning();

  // 2. Create admin user
  const passwordHash = await hashPassword(password);
  const [user] = await db.insert(medUsers).values({
    orgId: org.id,
    name,
    email,
    passwordHash,
    role: 'admin',
  }).returning();

  // 3. Generate JWT
  const token = signToken({ id: user.id, orgId: org.id, role: 'admin', type: 'user' });

  return {
    token,
    user: { id: user.id, name: user.name, email: user.email, role: user.role },
    organization: { id: org.id, name: org.name, type: org.type },
  };
}

/**
 * Org user login.
 */
export async function login({ email, password }) {
  const [user] = await db.select().from(medUsers).where(eq(medUsers.email, email)).limit(1);
  if (!user) throw Object.assign(new Error('Invalid credentials'), { statusCode: 401 });

  const valid = await comparePassword(password, user.passwordHash);
  if (!valid) throw Object.assign(new Error('Invalid credentials'), { statusCode: 401 });

  // Update last login
  await db.update(medUsers).set({ lastLoginAt: new Date() }).where(eq(medUsers.id, user.id));

  const token = signToken({ id: user.id, orgId: user.orgId, role: user.role, type: 'user' });

  return {
    token,
    user: { id: user.id, name: user.name, email: user.email, role: user.role, orgId: user.orgId },
  };
}

/**
 * Get user profile by ID.
 */
export async function getProfile(userId) {
  const user = await db.query.medUsers.findFirst({
    where: eq(medUsers.id, userId),
    with: { organization: true },
  });
  if (!user) throw Object.assign(new Error('User not found'), { statusCode: 404 });

  const { passwordHash, ...safe } = user;
  return safe;
}
