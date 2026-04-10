import { db } from '../db/index.js';
import { medScans, medDoctors, medAiResults, medReports, medScanAssignments } from '../db/schema.js';
import { eq, and, count, avg, sql, gte, desc } from 'drizzle-orm';
import * as response from '../utils/apiResponse.js';

export async function getOverview(req, res, next) {
  try {
    const orgId = req.orgId;

    // Total scans
    const [totalScans] = await db.select({ count: count() }).from(medScans).where(eq(medScans.orgId, orgId));

    // Scans by status
    const statusBreakdown = await db.select({
      status: medScans.status,
      count: count(),
    }).from(medScans).where(eq(medScans.orgId, orgId)).groupBy(medScans.status);

    // Total doctors
    const [totalDoctors] = await db.select({ count: count() }).from(medDoctors).where(eq(medDoctors.orgId, orgId));

    // Average AI confidence
    const [avgConfidence] = await db.select({
      avg: avg(medAiResults.confidence),
    }).from(medAiResults)
      .innerJoin(medScans, eq(medAiResults.scanId, medScans.id))
      .where(eq(medScans.orgId, orgId));

    // Critical scans (last 7 days)
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const [criticalCount] = await db.select({ count: count() }).from(medScans)
      .where(and(eq(medScans.orgId, orgId), eq(medScans.status, 'critical'), gte(medScans.createdAt, sevenDaysAgo)));

    // Total reports
    const [totalReports] = await db.select({ count: count() }).from(medReports).where(eq(medReports.orgId, orgId));

    return response.success(res, {
      totalScans: totalScans.count,
      totalDoctors: totalDoctors.count,
      totalReports: totalReports.count,
      avgAiConfidence: avgConfidence.avg ? parseFloat(avgConfidence.avg).toFixed(2) : null,
      criticalScansLast7Days: criticalCount.count,
      statusBreakdown: statusBreakdown.reduce((acc, s) => { acc[s.status] = s.count; return acc; }, {}),
    });
  } catch (err) { next(err); }
}

export async function getVolume(req, res, next) {
  try {
    const orgId = req.orgId;
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    const volume = await db.select({
      date: sql`DATE(${medScans.createdAt})`.as('date'),
      count: count(),
    }).from(medScans)
      .where(and(eq(medScans.orgId, orgId), gte(medScans.createdAt, thirtyDaysAgo)))
      .groupBy(sql`DATE(${medScans.createdAt})`)
      .orderBy(sql`DATE(${medScans.createdAt})`);

    return response.success(res, volume);
  } catch (err) { next(err); }
}

export async function getDoctorWorkload(req, res, next) {
  try {
    const orgId = req.orgId;

    const workload = await db.select({
      doctorId: medDoctors.id,
      doctorName: medDoctors.name,
      specialty: medDoctors.specialty,
      assignedCount: count(medScanAssignments.id),
    }).from(medDoctors)
      .leftJoin(medScanAssignments, eq(medDoctors.id, medScanAssignments.doctorId))
      .where(eq(medDoctors.orgId, orgId))
      .groupBy(medDoctors.id, medDoctors.name, medDoctors.specialty);

    return response.success(res, workload);
  } catch (err) { next(err); }
}
