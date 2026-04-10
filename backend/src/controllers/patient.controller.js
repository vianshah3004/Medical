import { db } from '../db/index.js';
import { medPatients } from '../db/schema.js';
import { eq, and } from 'drizzle-orm';
import * as response from '../utils/apiResponse.js';

export async function createPatient(req, res, next) {
  try {
    const [patient] = await db.insert(medPatients).values({
      orgId: req.orgId,
      ...req.validated,
    }).returning();
    return response.created(res, patient, 'Patient created');
  } catch (err) { next(err); }
}

export async function listPatients(req, res, next) {
  try {
    const patients = await db.query.medPatients.findMany({
      where: eq(medPatients.orgId, req.orgId),
      with: { scans: { columns: { id: true, scanType: true, status: true, createdAt: true } } },
    });
    return response.success(res, patients);
  } catch (err) { next(err); }
}

export async function getPatient(req, res, next) {
  try {
    const patient = await db.query.medPatients.findFirst({
      where: and(eq(medPatients.id, req.params.id), eq(medPatients.orgId, req.orgId)),
      with: {
        scans: {
          with: { aiResults: true, reports: true },
        },
      },
    });
    if (!patient) return response.notFound(res, 'Patient not found');
    return response.success(res, patient);
  } catch (err) { next(err); }
}
