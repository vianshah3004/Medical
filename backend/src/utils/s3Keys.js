/**
 * S3 key generation helpers.
 * Format: lab/{orgId}/case/{scanId}/{filename}
 */

export function scanOriginalKey(orgId, patientId, scanId, filename) {
  return `lab/${orgId}/case/${scanId}/${filename}`;
}

export function scanDerivedKey(orgId, scanId, derivedName) {
  return `lab/${orgId}/case/${scanId}/derived/${derivedName}`;
}

export function reportKey(orgId, scanId, reportFilename) {
  return `lab/${orgId}/case/${scanId}/reports/${reportFilename}`;
}
