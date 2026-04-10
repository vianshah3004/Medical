import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { DataCard, GlowButton } from '../../components/ui';
import { analyzeUnifiedScan, createPatient, listScans, uploadScan } from '../../services/api';
import './UploadScan.css';

const SCAN_OPTIONS = [
  { value: 'brain_tumor', label: 'Brain Tumor', backendType: 'mri', bodyRegion: 'brain' },
  { value: 'fracture', label: 'Fracture', backendType: 'xray' },
  { value: 'diabetic_retinopathy', label: 'Diabetic Retinopathy', backendType: 'skin' },
  { value: 'ecg', label: 'ECG', backendType: 'ecg' },
  { value: 'pneumonia', label: 'Pneumonia', backendType: 'lung' },
  { value: 'skin_lesion', label: 'Skin Lesion', backendType: 'skin' },
];

function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error('Failed to read uploaded file'));
    reader.readAsDataURL(file);
  });
}

export default function UploadScan() {
  const navigate = useNavigate();
  const fileInputRef = useRef(null);
  const [selectedFile, setSelectedFile] = useState(null);
  const [scanType, setScanType] = useState('brain_tumor');
  const [patientName, setPatientName] = useState('');
  const [patientAge, setPatientAge] = useState('');
  const [patientEmail, setPatientEmail] = useState('');
  const [patientGender, setPatientGender] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [scans, setScans] = useState([]);

  const loadScans = async () => {
    try {
      const payload = await listScans();
      const data = payload?.data || [];
      setScans(
        data.slice(0, 6).map((scan) => ({
          id: scan.id,
          status: String(scan.status || 'unknown').toUpperCase(),
          time: new Date(scan.createdAt || Date.now()).toLocaleTimeString(),
          hasAnalysis: Array.isArray(scan.aiResults) && scan.aiResults.length > 0,
        }))
      );
    } catch (err) {
      setError(err.message || 'Failed to load scans');
    }
  };

  useEffect(() => {
    loadScans();
  }, []);

  const handlePickFile = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (event) => {
    const [file] = event.target.files || [];
    setSelectedFile(file || null);
    setError('');
  };

  const handleAnalyze = async () => {
    if (!selectedFile) {
      setError('Please select a scan file first');
      return;
    }
    if (!patientName.trim() || !patientAge || !scanType) {
      setError('Please fill patient name, age, and scan type before creating a new case');
      return;
    }

    setLoading(true);
    setError('');
    try {
      const selectedScanOption = SCAN_OPTIONS.find((option) => option.value === scanType) || SCAN_OPTIONS[0];
      const uploadedImageDataUrl = await fileToDataUrl(selectedFile).catch(() => null);

      let unifiedAnalysis = null;
      try {
        const unifiedPayload = await analyzeUnifiedScan({
          file: selectedFile,
          scanType,
          mcSamples: 1,
          analysisMode: 'standard',
        });
        unifiedAnalysis = unifiedPayload?.results?.[0] || null;
      } catch {
        unifiedAnalysis = null;
      }

      const ageValue = Number(patientAge);
      const patientPayload = await createPatient({
        name: patientName.trim(),
        email: patientEmail.trim(),
        gender: patientGender || undefined,
        age: Number.isFinite(ageValue) ? ageValue : undefined,
      });
      const patientId = patientPayload?.data?.id;

      const payload = await uploadScan({
        file: selectedFile,
        scanType: selectedScanOption.backendType,
        bodyRegion: selectedScanOption.bodyRegion,
        patientId,
      });
      setSelectedFile(null);
      setPatientName('');
      setPatientAge('');
      setPatientEmail('');
      if (fileInputRef.current) fileInputRef.current.value = '';
      await loadScans();
      const createdScanId = payload?.data?.id;
      if (createdScanId || unifiedAnalysis) {
        navigate('/scan', {
          state: {
            scanId: createdScanId,
            unifiedAnalysis,
            sourceFileName: selectedFile.name,
            sourceScanType: selectedScanOption.label,
            uploadedImageDataUrl,
            patientName: patientName.trim(),
            patientAge: patientAge,
            patientEmail: patientEmail.trim(),
            patientGender: patientGender,
          },
        });
      }
    } catch (err) {
      setError(err.message || 'Scan upload failed');
    } finally {
      setLoading(false);
    }
  };

  const colorForStatus = (status) => {
    if (status === 'CRITICAL') return 'var(--color-critical)';
    if (status === 'PROCESSING') return 'var(--color-pending)';
    return 'var(--color-stable)';
  };

  return (
    <div className="upload-scan">
      {error ? <p className="text-micro" style={{ color: 'var(--color-critical)' }}>{error}</p> : null}
      
      <div className="upload-scan__grid">
        <DataCard title="UPLOAD PROTOCOL" icon="cloud_upload" style={{ flex: 1 }}>
          <div style={{ display: 'grid', gap: '0.75rem', marginBottom: '1rem' }}>
            <label className="text-micro" htmlFor="patient-name">PATIENT NAME</label>
            <input
              id="patient-name"
              value={patientName}
              onChange={(e) => setPatientName(e.target.value)}
              placeholder="Patient full name"
              style={{ width: '100%', padding: '0.75rem', background: 'rgba(0,0,0,0.4)', color: '#fff', border: '1px solid rgba(0,240,255,0.3)' }}
            />

            <label className="text-micro" htmlFor="patient-age">PATIENT AGE</label>
            <input
              id="patient-age"
              type="number"
              min="0"
              value={patientAge}
              onChange={(e) => setPatientAge(e.target.value)}
              placeholder="Age"
              style={{ width: '100%', padding: '0.75rem', background: 'rgba(0,0,0,0.4)', color: '#fff', border: '1px solid rgba(0,240,255,0.3)' }}
            />

            <label className="text-micro" htmlFor="patient-email">PATIENT EMAIL</label>
            <input
              id="patient-email"
              type="email"
              value={patientEmail}
              onChange={(e) => setPatientEmail(e.target.value)}
              placeholder="patient@example.com"
              style={{ width: '100%', padding: '0.75rem', background: 'rgba(0,0,0,0.4)', color: '#fff', border: '1px solid rgba(0,240,255,0.3)' }}
            />

            <label className="text-micro" htmlFor="patient-gender">PATIENT GENDER</label>
            <select
              id="patient-gender"
              value={patientGender}
              onChange={(e) => setPatientGender(e.target.value)}
              style={{ width: '100%', padding: '0.75rem', background: 'rgba(0,0,0,0.4)', color: '#fff', border: '1px solid rgba(0,240,255,0.3)' }}
            >
              <option value="">Select gender</option>
              <option value="male">Male</option>
              <option value="female">Female</option>
              <option value="other">Other</option>
            </select>
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept={scanType === 'ecg' ? '.txt,.csv,.dat,.jpg,.jpeg,.png,.dcm' : '.jpg,.jpeg,.png,.dcm'}
            style={{ display: 'none' }}
            onChange={handleFileChange}
          />
          <div style={{ 
            padding: '3rem 1rem', 
            border: '2px dashed var(--primary-fixed-dim)', 
            background: 'rgba(0, 240, 255, 0.05)', 
            textAlign: 'center',
            cursor: 'pointer'
          }} onClick={handlePickFile}>
            <span className="material-symbols-outlined text-primary" style={{ fontSize: '48px', marginBottom: '1rem' }}>file_upload</span>
            <h3 style={{ margin: '0 0 0.5rem 0' }}>SELECT SCAN FILE</h3>
            <p className="text-muted text-micro">{selectedFile ? selectedFile.name : 'Click to choose file'}</p>
          </div>
          <div style={{ marginTop: '1rem' }}>
            <label className="text-micro" htmlFor="scan-type">SCAN TYPE</label>
            <select
              id="scan-type"
              value={scanType}
              onChange={(e) => setScanType(e.target.value)}
              style={{ width: '100%', marginTop: '0.5rem', padding: '0.75rem', background: 'rgba(0,0,0,0.4)', color: '#fff', border: '1px solid rgba(0,240,255,0.3)' }}
            >
              {SCAN_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
          </div>
          <div style={{ marginTop: '1rem', textAlign: 'center' }}>
             <GlowButton fullWidth onClick={handleAnalyze} disabled={loading}>
               {loading ? 'ANALYZING...' : 'ANALYZE SCAN'}
             </GlowButton>
          </div>
        </DataCard>

        <DataCard title="ACTIVE QUEUE" icon="list" style={{ flex: 1 }}>
           <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
             {scans.map(s => (
                <div key={s.id} style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr auto auto',
                  rowGap: '0.5rem',
                  columnGap: '0.75rem',
                  alignItems: 'center',
                  padding: '1rem', background: 'rgba(0,0,0,0.4)',
                  borderLeft: `4px solid ${colorForStatus(s.status)}`
                }}>
                   <span className="text-mono text-primary">{s.id}</span>
                   <span className="text-muted text-micro">{s.time}</span>
                   <span style={{ 
                      color: colorForStatus(s.status)
                   }}>{s.status}</span>
                   <div style={{ gridColumn: '1 / -1', display: 'flex', justifyContent: 'flex-end' }}>
                     <GlowButton
                       variant="outline"
                       style={{ padding: '4px 12px', fontSize: '10px' }}
                       onClick={() => navigate('/scan', { state: { scanId: s.id } })}
                       disabled={!s.hasAnalysis}
                     >
                       {s.hasAnalysis ? 'OPEN ANALYSIS' : 'ANALYSIS PENDING'}
                     </GlowButton>
                   </div>
                </div>
             ))}
             {!scans.length ? <p className="text-micro text-muted">No scans available.</p> : null}
           </div>
        </DataCard>
      </div>

    </div>
  );
}
