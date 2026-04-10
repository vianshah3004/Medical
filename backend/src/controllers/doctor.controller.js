import * as doctorService from '../services/doctor.service.js';
import * as response from '../utils/apiResponse.js';
import { db } from '../db/index.js';
import { medOrganizations } from '../db/schema.js';
import { eq } from 'drizzle-orm';

export async function addDoctor(req, res, next) {
  try {
    // Get org name for the credential email
    const [org] = await db.select({ name: medOrganizations.name })
      .from(medOrganizations)
      .where(eq(medOrganizations.id, req.orgId))
      .limit(1);

    const doctor = await doctorService.addDoctor({ ...req.validated, orgId: req.orgId }, org?.name);
    return response.created(res, doctor, 'Doctor added and credentials sent via email');
  } catch (err) { next(err); }
}

export async function listDoctors(req, res, next) {
  try {
    const { status } = req.query;
    const doctors = await doctorService.listDoctors(req.orgId, status);
    return response.success(res, doctors);
  } catch (err) { next(err); }
}

export async function getDoctor(req, res, next) {
  try {
    const doctor = await doctorService.getDoctorById(req.params.id, req.orgId);
    return response.success(res, doctor);
  } catch (err) { next(err); }
}

export async function verifyDoctor(req, res, next) {
  try {
    const { action } = req.body; // 'approve' or 'reject'
    if (!['approve', 'reject'].includes(action)) {
      return response.badRequest(res, 'Action must be "approve" or "reject"');
    }
    const doctor = await doctorService.verifyDoctor(req.params.id, req.orgId, action, req.user.id);
    return response.success(res, doctor, `Doctor ${action}d successfully`);
  } catch (err) { next(err); }
}
