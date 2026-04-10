import * as reportService from '../services/report.service.js';
import * as response from '../utils/apiResponse.js';

export async function submitReport(req, res, next) {
  try {
    const report = await reportService.submitReport({
      scanId: req.params.id,
      doctorId: req.user.id,
      orgId: req.user.orgId,
      ...req.body,
    });
    return response.created(res, report, 'Report submitted successfully');
  } catch (err) { next(err); }
}

export async function getReportByScan(req, res, next) {
  try {
    const report = await reportService.getReportByScan(req.params.id, req.orgId);
    if (!report) return response.notFound(res, 'No report found for this scan');
    return response.success(res, report);
  } catch (err) { next(err); }
}

export async function listReports(req, res, next) {
  try {
    const { limit, offset } = req.query;
    const reports = await reportService.listReports(req.orgId, {
      limit: limit ? parseInt(limit) : 50,
      offset: offset ? parseInt(offset) : 0,
    });
    return response.success(res, reports);
  } catch (err) { next(err); }
}

export async function sendReportToPatient(req, res, next) {
  try {
    const result = await reportService.sendReportToPatient({
      scanId: req.params.scanId,
      orgId: req.orgId,
      patientEmailOverride: req.body?.email,
    });
    return response.success(res, result, 'Report emailed to patient');
  } catch (err) { next(err); }
}
