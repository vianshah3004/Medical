import * as scanService from '../services/scan.service.js';
import * as response from '../utils/apiResponse.js';

export async function uploadScan(req, res, next) {
  try {
    if (!req.file) return response.badRequest(res, 'No file uploaded');

    const scan = await scanService.uploadScan({
      orgId: req.orgId,
      userId: req.user.id,
      patientId: req.body.patientId,
      scanType: req.body.scanType,
      bodyRegion: req.body.bodyRegion,
      priority: req.body.priority,
      notes: req.body.notes,
      file: req.file,
    });
    return response.created(res, scan, 'Scan uploaded and queued for AI analysis');
  } catch (err) { next(err); }
}

export async function listScans(req, res, next) {
  try {
    const { status, scanType, limit, offset } = req.query;
    const scans = await scanService.listScans(req.orgId, {
      status, scanType,
      limit: limit ? parseInt(limit) : 50,
      offset: offset ? parseInt(offset) : 0,
    });
    return response.success(res, scans);
  } catch (err) { next(err); }
}

export async function getScan(req, res, next) {
  try {
    const scan = await scanService.getScanById(req.params.id, req.orgId);
    return response.success(res, scan);
  } catch (err) { next(err); }
}

export async function assignDoctor(req, res, next) {
  try {
    const assignment = await scanService.assignDoctor({
      scanId: req.params.id,
      doctorId: req.body.doctorId,
      assignedBy: req.user.id,
      notes: req.body.notes,
      orgId: req.orgId,
    });
    return response.created(res, assignment, 'Doctor assigned to scan');
  } catch (err) { next(err); }
}

export async function updateStatus(req, res, next) {
  try {
    const scan = await scanService.updateScanStatus(req.params.id, req.orgId, req.body.status);
    return response.success(res, scan, 'Scan status updated');
  } catch (err) { next(err); }
}

// Doctor-facing endpoints
export async function getDoctorScans(req, res, next) {
  try {
    const scans = await scanService.getDoctorScans(req.user.id);
    return response.success(res, scans);
  } catch (err) { next(err); }
}

export async function getDoctorScanDetail(req, res, next) {
  try {
    // Doctor gets scan through their assignment — org scope comes from doctor's orgId
    const scan = await scanService.getScanById(req.params.id, req.user.orgId);
    return response.success(res, scan);
  } catch (err) { next(err); }
}
