import { db } from '../db/index.js';
import { medScans, medScanAssets, medScanAssignments, medAiJobs, medAiResults } from '../db/schema.js';
import { eq, and, desc } from 'drizzle-orm';
import { uploadFile, getSignedDownloadUrl } from './storage.service.js';
import { sendScanToPython } from './python.service.js';
import { scanOriginalKey } from '../utils/s3Keys.js';
import config from '../config/index.js';

function buildTestAnalysis(scanType, fileName) {
  return {
    prediction: 'Normal Tissue',
    confidence: 0.95,
    details: { finding: 'Test mode analysis', fileName, scanType },
    insights: 'Test-mode AI insight',
    visuals: [],
    source: { selected_engine: 'test-engine' },
    probabilities: [],
  };
}

/**
 * Upload a scan: create DB record, upload file to S3, create AI job.
 */
export async function uploadScan({ orgId, userId, patientId, scanType, bodyRegion, priority, notes, file }) {
  if (!scanType) {
    throw Object.assign(new Error('scanType is required'), { statusCode: 400 });
  }

  // 1. Create scan record
  const [scan] = await db.insert(medScans).values({
    orgId,
    patientId: patientId || null,
    uploadedBy: userId,
    scanType,
    bodyRegion,
    priority: priority || 'normal',
    notes,
    status: 'uploaded',
  }).returning();

  // 2. Upload file to S3
  const s3Key = scanOriginalKey(orgId, patientId || 'unknown', scan.id, file.originalname);
  const uploadResult = await uploadFile({
    key: s3Key,
    body: file.buffer,
    contentType: file.mimetype,
  });

  // 3. Create scan asset record
  await db.insert(medScanAssets).values({
    scanId: scan.id,
    assetType: 'original',
    fileName: file.originalname,
    s3Key: uploadResult.key,
    bucketName: uploadResult.bucket || config.storage.bucket,
    mimeType: file.mimetype,
    fileSize: file.size,
  });

  // 4. Create AI job
  const jobType = mapScanTypeToJobType(scanType);
  const [job] = await db.insert(medAiJobs).values({
    scanId: scan.id,
    jobType,
    status: 'queued',
  }).returning();

  // 5. Update scan status
  await db.update(medScans).set({ status: 'processing', updatedAt: new Date() }).where(eq(medScans.id, scan.id));

  try {
    // 6. Mark job as processing and run Python inference
    await db.update(medAiJobs).set({
      status: 'processing',
      attempt: 1,
      startedAt: new Date(),
    }).where(eq(medAiJobs.id, job.id));

    const pythonResult = process.env.NODE_ENV === 'test'
      ? buildTestAnalysis(scanType, file.originalname)
      : await sendScanToPython({
        scanType,
        file,
        scanId: scan.id,
      });

    // 7. Persist AI result
    const isCritical = Number(pythonResult.confidence || 0) >= 0.9;
    await db.insert(medAiResults).values({
      scanId: scan.id,
      jobId: job.id,
      modelName: pythonResult.source?.selected_engine || 'unified-medical-api',
      prediction: {
        label: pythonResult.prediction,
        probabilities: pythonResult.probabilities,
      },
      insights: pythonResult.insights || {},
      confidence: pythonResult.confidence,
      isCritical,
      metadata: {
        details: pythonResult.details,
        visuals: pythonResult.visuals,
        source: pythonResult.source,
      },
    });

    // 8. Complete job and scan status
    await db.update(medAiJobs).set({
      status: 'completed',
      completedAt: new Date(),
      error: null,
    }).where(eq(medAiJobs.id, job.id));

    await db.update(medScans).set({
      status: isCritical ? 'critical' : 'completed',
      updatedAt: new Date(),
    }).where(eq(medScans.id, scan.id));

    return getScanById(scan.id, orgId);
  } catch (err) {
    await db.update(medAiJobs).set({
      status: 'failed',
      completedAt: new Date(),
      error: err.message,
      attempt: 1,
    }).where(eq(medAiJobs.id, job.id));

    await db.update(medScans).set({
      status: 'failed',
      updatedAt: new Date(),
      metadata: {
        aiError: err.message,
      },
    }).where(eq(medScans.id, scan.id));

    throw Object.assign(new Error('Scan uploaded but AI analysis failed'), {
      statusCode: 502,
      error: err.message,
    });
  }
}

function mapScanTypeToJobType(scanType) {
  const map = {
    mri: 'brain_tumor',
    ct: 'brain_tumor',
    xray: 'fracture',
    lung: 'lung_disease',
    skin: 'skin_lesion',
    ecg: 'ecg',
  };
  return map[scanType?.toLowerCase()] || 'brain_tumor';
}

/**
 * List scans for an organization with optional filters.
 */
export async function listScans(orgId, { status, scanType, limit = 50, offset = 0 } = {}) {
  const conditions = [eq(medScans.orgId, orgId)];
  if (status) conditions.push(eq(medScans.status, status));
  if (scanType) conditions.push(eq(medScans.scanType, scanType));

  const scans = await db.query.medScans.findMany({
    where: and(...conditions),
    with: {
      patient: true,
      uploader: { columns: { id: true, name: true } },
      assets: true,
      aiResults: true,
      assignments: {
        with: { doctor: { columns: { id: true, name: true, specialty: true } } },
      },
    },
    orderBy: [desc(medScans.createdAt)],
    limit,
    offset,
  });

  return scans;
}

/**
 * Get a single scan with all related data and signed URLs.
 */
export async function getScanById(scanId, orgId) {
  const scan = await db.query.medScans.findFirst({
    where: and(eq(medScans.id, scanId), eq(medScans.orgId, orgId)),
    with: {
      patient: true,
      uploader: { columns: { id: true, name: true } },
      assets: true,
      aiResults: true,
      aiJobs: true,
      assignments: {
        with: { doctor: { columns: { id: true, name: true, specialty: true } } },
      },
      reports: {
        with: { doctor: { columns: { id: true, name: true } } },
      },
    },
  });

  if (!scan) throw Object.assign(new Error('Scan not found'), { statusCode: 404 });

  // Generate signed URLs for assets
  const assetsWithUrls = await Promise.all(
    (scan.assets || []).map(async (asset) => ({
      ...asset,
      url: await getSignedDownloadUrl(asset.s3Key, asset.bucketName),
    }))
  );

  return { ...scan, assets: assetsWithUrls };
}

/**
 * Assign a doctor to a scan.
 */
export async function assignDoctor({ scanId, doctorId, assignedBy, notes, orgId }) {
  // Verify scan belongs to org
  const [scan] = await db.select().from(medScans)
    .where(and(eq(medScans.id, scanId), eq(medScans.orgId, orgId)))
    .limit(1);
  if (!scan) throw Object.assign(new Error('Scan not found'), { statusCode: 404 });

  const [assignment] = await db.insert(medScanAssignments).values({
    scanId,
    doctorId,
    assignedBy,
    notes,
    status: 'assigned',
  }).returning();

  return assignment;
}

/**
 * Update scan status.
 */
export async function updateScanStatus(scanId, orgId, status) {
  const [updated] = await db.update(medScans)
    .set({ status, updatedAt: new Date() })
    .where(and(eq(medScans.id, scanId), eq(medScans.orgId, orgId)))
    .returning();

  if (!updated) throw Object.assign(new Error('Scan not found'), { statusCode: 404 });
  return updated;
}

/**
 * Get scans assigned to a specific doctor.
 */
export async function getDoctorScans(doctorId) {
  const assignments = await db.query.medScanAssignments.findMany({
    where: eq(medScanAssignments.doctorId, doctorId),
    with: {
      scan: {
        with: {
          patient: true,
          assets: true,
          aiResults: true,
        },
      },
    },
    orderBy: [desc(medScanAssignments.assignedAt)],
  });

  // Generate signed URLs
  const withUrls = await Promise.all(
    assignments.map(async (a) => {
      const assetsWithUrls = await Promise.all(
        (a.scan.assets || []).map(async (asset) => ({
          ...asset,
          url: await getSignedDownloadUrl(asset.s3Key, asset.bucketName),
        }))
      );
      return { ...a, scan: { ...a.scan, assets: assetsWithUrls } };
    })
  );

  return withUrls;
}
