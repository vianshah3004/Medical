import { db } from '../db/index.js';
import { medReports, medScans, medScanAssignments } from '../db/schema.js';
import { eq, and, desc } from 'drizzle-orm';
import { generateReportPdf } from './python.service.js';
import { sendEmail } from './email.service.js';
import { getScanById } from './scan.service.js';

function resolveDiagnosis(result) {
  if (!result) return 'Analysis available';
  const prediction = result.prediction;
  if (typeof prediction === 'string') return prediction;
  if (prediction && typeof prediction === 'object') {
    return prediction.label || prediction.predicted_label || prediction.class || 'Analysis available';
  }
  return 'Analysis available';
}

function resolveConfidence(result) {
  if (!result) return 0;
  if (typeof result.confidence === 'number') return result.confidence;
  const prediction = result.prediction;
  if (prediction && typeof prediction === 'object' && typeof prediction.confidence === 'number') {
    return prediction.confidence;
  }
  return 0;
}

function resolveDoctorName(scan) {
  const assignment = (scan.assignments || []).find((item) => item?.doctor?.name);
  if (assignment?.doctor?.name) return assignment.doctor.name;
  const reportDoctor = (scan.reports || []).find((item) => item?.doctor?.name);
  if (reportDoctor?.doctor?.name) return reportDoctor.doctor.name;
  return 'DiagnoScope AI';
}

function extractImages(result) {
  const visuals = result?.metadata?.visuals;
  if (!Array.isArray(visuals)) return {};
  return visuals.reduce((acc, visual) => {
    if (!visual?.base64_data) return acc;
    const key = String(visual.key || visual.label || 'visual').toLowerCase();
    acc[key] = visual.base64_data;
    return acc;
  }, {});
}

async function fetchBase64FromUrl(url) {
  if (!url) return null;
  const response = await fetch(url);
  if (!response.ok) return null;
  const arrayBuffer = await response.arrayBuffer();
  return Buffer.from(arrayBuffer).toString('base64');
}

/**
 * Submit a diagnostic report for a scan.
 */
export async function submitReport({ scanId, doctorId, orgId, title, findings, diagnosis, recommendations, severity, reportData }) {
  const [report] = await db.insert(medReports).values({
    scanId,
    doctorId,
    orgId,
    title,
    findings,
    diagnosis,
    recommendations,
    severity,
    reportData: reportData || {},
    status: 'submitted',
    submittedAt: new Date(),
  }).returning();

  // Update scan status to reviewed
  await db.update(medScans)
    .set({ status: 'reviewed', updatedAt: new Date() })
    .where(eq(medScans.id, scanId));

  // Update assignment status
  await db.update(medScanAssignments)
    .set({ status: 'completed', completedAt: new Date() })
    .where(and(eq(medScanAssignments.scanId, scanId), eq(medScanAssignments.doctorId, doctorId)));

  return report;
}

/**
 * Get report for a specific scan.
 */
export async function getReportByScan(scanId, orgId) {
  const report = await db.query.medReports.findFirst({
    where: and(eq(medReports.scanId, scanId), eq(medReports.orgId, orgId)),
    with: {
      doctor: { columns: { id: true, name: true, specialty: true } },
      scan: { with: { patient: true } },
    },
  });
  return report;
}

/**
 * List all reports for an organization.
 */
export async function listReports(orgId, { limit = 50, offset = 0 } = {}) {
  return db.query.medReports.findMany({
    where: eq(medReports.orgId, orgId),
    with: {
      doctor: { columns: { id: true, name: true, specialty: true } },
      scan: { columns: { id: true, scanType: true, bodyRegion: true, status: true } },
    },
    orderBy: [desc(medReports.createdAt)],
    limit,
    offset,
  });
}

export async function sendReportToPatient({ scanId, orgId, patientEmailOverride }) {
  const scan = await getScanById(scanId, orgId);
  const patientEmail = patientEmailOverride || scan?.patient?.email;
  if (!patientEmail) throw Object.assign(new Error('Patient email not found'), { statusCode: 400 });

  const result = (scan.aiResults || [])[0] || null;
  const diagnosis = resolveDiagnosis(result);
  const confidence = resolveConfidence(result);

  const images = extractImages(result);
  if (!images.original) {
    const originalAsset = (scan.assets || []).find((asset) => asset.assetType === 'original' && asset.url);
    if (originalAsset?.url) {
      const originalBase64 = await fetchBase64FromUrl(originalAsset.url);
      if (originalBase64) images.original = originalBase64;
    }
  }

  const reportRequest = {
    patient_name: scan?.patient?.name || 'Patient',
    doctor_name: resolveDoctorName(scan),
    diagnosis,
    confidence,
    metrics: result?.metadata?.details || {},
    images,
    modality: scan?.scanType || 'scan',
    ai_insight: result?.insights || result?.metadata?.details?.ai_insight || null,
  };

  const pdfBuffer = await generateReportPdf(reportRequest);
  const filename = `diagnoscope-report-${scanId}.pdf`;

  const subject = 'Your Diagnostic Report';
  const text =
    `Hello ${scan?.patient?.name || 'Patient'},\n\n` +
    `Your diagnostic report is attached.\n\n` +
    `Regards,\nDiagnoScope`;

  const html = `
    <div style="font-family: Arial, sans-serif; color: #0f172a;">
      <h2 style="margin: 0 0 12px;">Your Diagnostic Report</h2>
      <p>Hello ${scan?.patient?.name || 'Patient'},</p>
      <p>Your diagnostic report is attached to this email.</p>
      <p style="margin-top: 24px;">Regards,<br/>DiagnoScope</p>
    </div>
  `;

  await sendEmail({
    to: patientEmail,
    subject,
    html,
    text,
    attachments: [
      {
        filename,
        content: pdfBuffer,
        contentType: 'application/pdf',
      },
    ],
  });

  return { emailedTo: patientEmail, filename };
}
