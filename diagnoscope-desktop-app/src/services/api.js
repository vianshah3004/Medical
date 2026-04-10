import { getToken } from './auth';

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001/api/v1';
const UNIFIED_API_BASE = import.meta.env.VITE_UNIFIED_API_BASE_URL || 'http://127.0.0.1:8010/api/v1';

function getValidationMessage(details) {
  if (!details || typeof details !== 'object') return null;
  const firstKey = Object.keys(details)[0];
  if (!firstKey) return null;
  const firstValue = details[firstKey];
  if (Array.isArray(firstValue) && firstValue.length > 0) {
    return `${firstKey}: ${firstValue[0]}`;
  }
  return null;
}

async function parseJson(response) {
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message =
      getValidationMessage(payload?.details) ||
      payload?.message ||
      `Request failed (${response.status})`;
    throw new Error(message);
  }
  return payload;
}

async function parseUnifiedJson(response) {
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(payload?.detail || payload?.message || `Unified analysis failed (${response.status})`);
  }
  return payload;
}

function authHeaders(extra = {}) {
  const token = getToken();
  return {
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...extra,
  };
}

export async function login({ email, password }) {
  const response = await fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  return parseJson(response);
}

export async function signup({ orgName, orgType, name, email, password }) {
  const response = await fetch(`${API_BASE}/auth/signup`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ orgName, orgType, name, email, password }),
  });
  return parseJson(response);
}

export async function me() {
  const response = await fetch(`${API_BASE}/auth/me`, {
    headers: authHeaders(),
  });
  return parseJson(response);
}

export async function uploadScan({ file, scanType, bodyRegion, notes, patientId }) {
  const form = new FormData();
  form.append('file', file);
  form.append('scanType', scanType);
  if (bodyRegion) form.append('bodyRegion', bodyRegion);
  if (notes) form.append('notes', notes);
  if (patientId) form.append('patientId', patientId);

  const response = await fetch(`${API_BASE}/scans`, {
    method: 'POST',
    headers: authHeaders(),
    body: form,
  });
  return parseJson(response);
}

export async function listScans() {
  const response = await fetch(`${API_BASE}/scans/history`, {
    headers: authHeaders(),
  });
  return parseJson(response);
}

export async function getScan(scanId) {
  const response = await fetch(`${API_BASE}/scans/${scanId}`, {
    headers: authHeaders(),
  });
  return parseJson(response);
}

export async function assignScanDoctor({ scanId, doctorId, notes }) {
  const response = await fetch(`${API_BASE}/scans/${scanId}/assign`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...authHeaders(),
    },
    body: JSON.stringify({ doctorId, notes }),
  });
  return parseJson(response);
}

function toUnifiedScanType(scanType) {
  const map = {
    brain_tumor: 'brain',
    tumor: 'brain',
    fracture: 'fracture',
    diabetic_retinopathy: 'diabetic_retinopathy',
    pneumonia: 'lung',
    skin_lesion: 'skin',
    mri: 'brain',
    ct: 'brain',
    xray: 'fracture',
    lung: 'lung',
    skin: 'skin',
    ecg: 'ecg',
  };
  return map[String(scanType || '').toLowerCase()] || 'fracture';
}

export async function analyzeUnifiedScan({ file, scanType, mcSamples = 1, analysisMode = 'standard' }) {
  const unifiedScanType = toUnifiedScanType(scanType);
  const formData = new FormData();
  let response;

  if (unifiedScanType === 'ecg') {
    formData.append('files', file);
    response = await fetch(`${UNIFIED_API_BASE}/ecg/analyze`, {
      method: 'POST',
      body: formData,
    });
  } else {
    formData.append('scan_type', unifiedScanType);
    formData.append('mc_samples', String(mcSamples));
    formData.append('analysis_mode', analysisMode);
    formData.append('files', file);
    response = await fetch(`${UNIFIED_API_BASE}/scans/analyze`, {
      method: 'POST',
      body: formData,
    });
  }

  return parseUnifiedJson(response);
}

export async function generateUnifiedReport(reportRequest) {
  const response = await fetch(`${UNIFIED_API_BASE}/reports/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(reportRequest),
  });

  if (!response.ok) {
    const payload = await response.json().catch(() => ({}));
    const detail = payload?.detail || payload?.message;
    let message = '';
    if (Array.isArray(detail)) {
      message = detail
        .map((entry) => (typeof entry === 'string' ? entry : JSON.stringify(entry)))
        .join(', ');
    } else if (detail && typeof detail === 'object') {
      message = JSON.stringify(detail);
    } else if (typeof detail === 'string') {
      message = detail;
    }
    throw new Error(message || `Report generation failed (${response.status})`);
  }

  return response.blob();
}

export async function sendReportToPatient({ scanId, email }) {
  const response = await fetch(`${API_BASE}/reports/${scanId}/email`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...authHeaders(),
    },
    body: JSON.stringify({ email }),
  });
  return parseJson(response);
}

export async function listDoctors() {
  const response = await fetch(`${API_BASE}/doctors`, {
    headers: authHeaders(),
  });
  return parseJson(response);
}

export async function createDoctor({ name, email, specialty, licenseId, university, institutions, phone }) {
  const response = await fetch(`${API_BASE}/doctors`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...authHeaders(),
    },
    body: JSON.stringify({ name, email, specialty, licenseId, university, institutions, phone }),
  });
  return parseJson(response);
}

export async function createPatient({ name, email, age, patientCode }) {
  const response = await fetch(`${API_BASE}/patients`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...authHeaders(),
    },
    body: JSON.stringify({
      name,
      email: email || undefined,
      patientCode: patientCode || undefined,
      metadata: typeof age === 'number' ? { age } : undefined,
    }),
  });
  return parseJson(response);
}
