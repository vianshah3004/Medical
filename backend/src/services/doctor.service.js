import { db } from '../db/index.js';
import { medDoctors } from '../db/schema.js';
import { eq, and } from 'drizzle-orm';
import { hashPassword, comparePassword, generateTempPassword } from '../utils/password.js';
import { signToken } from '../utils/jwt.js';
import { sendDoctorCredentials } from './email.service.js';

/**
 * Add a new doctor to the organization.
 * Generates credentials and sends email.
 */
export async function addDoctor({ orgId, name, email, specialty, licenseId, university, institutions, phone }, orgName) {
  // Generate username from name — strip any existing "Dr." / "Dr" prefix first
  const cleanedName = name.replace(/^dr\.?\s*/i, '');
  const baseUsername = cleanedName.toLowerCase().replace(/[^a-z0-9]/g, '.').replace(/\.+/g, '.').replace(/^\.+|\.+$/g, '');
  const username = `dr.${baseUsername}`;

  // Generate temp password
  const tempPassword = generateTempPassword();
  const passwordHash = await hashPassword(tempPassword);

  const [doctor] = await db.insert(medDoctors).values({
    orgId,
    name,
    email,
    username,
    passwordHash,
    specialty,
    licenseId,
    university,
    institutions: institutions || [],
    phone,
    status: 'pending',
    tempPasswordSent: true,
  }).returning();

  // Send credentials email
  await sendDoctorCredentials({
    to: email,
    doctorName: name,
    email,
    username,
    tempPassword,
    orgName: orgName || 'DiagnoScope Organization',
  });

  const { passwordHash: _, ...safe } = doctor;
  return safe;
}

/**
 * Doctor login.
 */
export async function doctorLogin({ username, password }) {
  const [doctor] = await db.select().from(medDoctors)
    .where(eq(medDoctors.username, username))
    .limit(1);

  if (!doctor) throw Object.assign(new Error('Invalid credentials'), { statusCode: 401 });
  if (doctor.status !== 'verified') throw Object.assign(new Error('Account not yet verified'), { statusCode: 403 });

  const valid = await comparePassword(password, doctor.passwordHash);
  if (!valid) throw Object.assign(new Error('Invalid credentials'), { statusCode: 401 });

  const token = signToken({ id: doctor.id, orgId: doctor.orgId, role: 'doctor', type: 'doctor' });

  return {
    token,
    doctor: { id: doctor.id, name: doctor.name, email: doctor.email, specialty: doctor.specialty, orgId: doctor.orgId },
  };
}

/**
 * List doctors for an organization, optionally filtered by status.
 */
export async function listDoctors(orgId, status = null) {
  let query = db.select({
    id: medDoctors.id,
    name: medDoctors.name,
    email: medDoctors.email,
    username: medDoctors.username,
    specialty: medDoctors.specialty,
    licenseId: medDoctors.licenseId,
    university: medDoctors.university,
    institutions: medDoctors.institutions,
    level: medDoctors.level,
    status: medDoctors.status,
    tempPasswordSent: medDoctors.tempPasswordSent,
    createdAt: medDoctors.createdAt,
  }).from(medDoctors);

  if (status) {
    query = query.where(and(eq(medDoctors.orgId, orgId), eq(medDoctors.status, status)));
  } else {
    query = query.where(eq(medDoctors.orgId, orgId));
  }

  return query.orderBy(medDoctors.createdAt);
}

/**
 * Get a single doctor by ID (org-scoped).
 */
export async function getDoctorById(id, orgId) {
  const doctor = await db.query.medDoctors.findFirst({
    where: and(eq(medDoctors.id, id), eq(medDoctors.orgId, orgId)),
  });
  if (!doctor) throw Object.assign(new Error('Doctor not found'), { statusCode: 404 });

  const { passwordHash, ...safe } = doctor;
  return safe;
}

/**
 * Verify or reject a doctor.
 */
export async function verifyDoctor(id, orgId, action, verifiedByUserId) {
  const newStatus = action === 'approve' ? 'verified' : 'rejected';

  const [updated] = await db.update(medDoctors)
    .set({
      status: newStatus,
      verifiedAt: new Date(),
      verifiedBy: verifiedByUserId,
      updatedAt: new Date(),
    })
    .where(and(eq(medDoctors.id, id), eq(medDoctors.orgId, orgId)))
    .returning();

  if (!updated) throw Object.assign(new Error('Doctor not found'), { statusCode: 404 });

  const { passwordHash, ...safe } = updated;
  return safe;
}
