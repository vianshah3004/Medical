import config from '../config/index.js';

const MAX_RETRIES = 2;
const RETRY_BACKOFF_MS = 400;

const SCAN_TYPE_MAP = {
  mri: 'brain',
  ct: 'brain',
  xray: 'fracture',
  lung: 'lung',
  skin: 'skin',
  ecg: 'ecg_image',
};

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function mapScanType(scanType) {
  return SCAN_TYPE_MAP[String(scanType || '').toLowerCase()] || 'brain';
}

function parsePythonError(payload) {
  if (!payload) return 'Unknown Python API error';
  if (typeof payload === 'string') return payload;
  if (payload.detail) {
    if (Array.isArray(payload.detail)) {
      return payload.detail.map((d) => d?.msg || JSON.stringify(d)).join(', ');
    }
    return String(payload.detail);
  }
  return JSON.stringify(payload);
}

export function handleResponse(result) {
  const first = result?.results?.[0] || {};
  const prediction = first?.prediction || 'unknown';
  const confidence = typeof first?.confidence === 'number' ? first.confidence : null;

  return {
    raw: result,
    prediction,
    confidence,
    details: first?.details || {},
    insights: first?.ai_insight || null,
    visuals: first?.visuals || [],
    scanType: first?.scan_type || result?.scan_type || null,
    source: first?.source || null,
    probabilities: first?.probabilities || [],
  };
}

export async function sendScanToPython({ scanType, file, scanId, mcSamples = 1 }) {
  const endpoint = `${config.mlApi.url}/api/v1/scans/analyze`;
  const normalizedScanType = mapScanType(scanType);

  let lastError = null;
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt += 1) {
    try {
      const form = new FormData();
      form.append('scan_type', normalizedScanType);
      form.append('mc_samples', String(mcSamples));
      form.append('analysis_mode', 'standard');

      const fileName = file?.originalname || `${scanId}.bin`;
      const mimeType = file?.mimetype || 'application/octet-stream';
      const blob = new Blob([file.buffer], { type: mimeType });
      form.append('files', blob, fileName);

      const response = await fetch(endpoint, {
        method: 'POST',
        body: form,
      });

      if (!response.ok) {
        const payload = await response.json().catch(async () => ({ detail: await response.text() }));
        throw Object.assign(new Error(parsePythonError(payload)), {
          statusCode: response.status,
          payload,
        });
      }

      const payload = await response.json();
      return handleResponse(payload);
    } catch (err) {
      lastError = err;
      if (attempt < MAX_RETRIES) {
        await sleep(RETRY_BACKOFF_MS * (attempt + 1));
      }
    }
  }

  throw Object.assign(new Error(`Python API failed after retries: ${lastError?.message || 'unknown error'}`), {
    statusCode: 502,
    error: lastError?.message || 'python_api_error',
  });
}

export async function checkPythonHealth() {
  try {
    const response = await fetch(`${config.mlApi.url}/health`, { method: 'GET' });
    return { healthy: response.ok, status: response.status };
  } catch {
    return { healthy: false, status: 0 };
  }
}

export async function generateReportPdf(reportRequest) {
  const endpoint = `${config.mlApi.url}/api/v1/reports/generate`;
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(reportRequest),
  });

  if (!response.ok) {
    const payload = await response.json().catch(async () => ({ detail: await response.text() }));
    throw Object.assign(new Error(parsePythonError(payload)), {
      statusCode: response.status,
      payload,
    });
  }

  const arrayBuffer = await response.arrayBuffer();
  return Buffer.from(arrayBuffer);
}
