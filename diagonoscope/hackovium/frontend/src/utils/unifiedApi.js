const API_ROOT = import.meta.env.VITE_UNIFIED_API_BASE_URL || 'http://127.0.0.1:8010/api/v1';

const SCAN_TYPE_MAP = {
    'Tumor': 'brain',
    'Fracture': 'fracture',
    'Diabetic Retinopathy Scan': 'diabetic_retinopathy',
    'ECG': 'ecg',
    'Pneumonia': 'lung',
    'Skin Lesion': 'skin'
};

const MODALITY_MAP = {
    'Tumor': 'MRI - Brain',
    'Fracture': 'X-Ray',
    'Diabetic Retinopathy Scan': 'Retinal Scan',
    'ECG': 'ECG',
    'Pneumonia': 'Lung Scan',
    'Skin Lesion': 'Skin Analysis'
};

export function diseaseTypeToScanType(diseaseType) {
    return SCAN_TYPE_MAP[diseaseType] || 'fracture';
}

export function diseaseTypeToModality(diseaseType) {
    return MODALITY_MAP[diseaseType] || 'Medical Scan';
}

export function resultVisualToDataUrl(visual) {
    if (!visual?.base64_data) return null;
    return `data:${visual.media_type || 'image/png'};base64,${visual.base64_data}`;
}

export async function analyzeDisease(
    diseaseType,
    files,
    { mcSamples = 1, analysisMode = 'standard', preferredEngine = null } = {}
) {
    if (!files || files.length === 0) {
        throw new Error('No files selected for analysis.');
    }

    const firstFile = files[0];
    const scanType = diseaseTypeToScanType(diseaseType);

    if (scanType === 'ecg') {
        const formData = new FormData();
        Array.from(files).forEach(file => formData.append('files', file));

        const response = await fetch(`${API_ROOT}/ecg/analyze`, {
            method: 'POST',
            body: formData
        });

        if (!response.ok) {
            const detail = await safeError(response);
            throw new Error(detail);
        }

        return response.json();
    }

    const formData = new FormData();
    formData.append('scan_type', scanType);
    formData.append('mc_samples', String(mcSamples));
    formData.append('analysis_mode', analysisMode);
    if (preferredEngine) {
        formData.append('preferred_engine', preferredEngine);
    }
    Array.from(files).forEach((file) => formData.append('files', file));

    const response = await fetch(`${API_ROOT}/scans/analyze`, {
        method: 'POST',
        body: formData
    });

    if (!response.ok) {
        const detail = await safeError(response);
        throw new Error(detail);
    }

    return response.json();
}

export async function generateUnifiedReport(reportReq) {
    const response = await fetch(`${API_ROOT}/reports/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(reportReq)
    });

    if (!response.ok) {
        const detail = await safeError(response);
        throw new Error(detail);
    }

    return response.blob();
}

async function safeError(response) {
    try {
        const payload = await response.json();
        return payload.detail || 'Request failed.';
    } catch {
        return `Request failed with status ${response.status}.`;
    }
}

export async function generateAITreatmentPlan(req) {
    const response = await fetch(`${API_ROOT}/treatment_plan/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(req)
    });

    if (!response.ok) {
        const detail = await safeError(response);
        throw new Error(detail);
    }

    return response.json();
}
