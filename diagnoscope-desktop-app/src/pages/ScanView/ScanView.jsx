import { DataCard, MetricTile, StatusChip, GlowButton, AlertBanner } from '../../components/ui';
import { useEffect, useMemo, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { assignScanDoctor, getScan, listDoctors, listScans, sendReportToPatient } from '../../services/api';
import './ScanView.css';

const PATIENT_DATA = {
  name: 'ZHANG **',
  id: 'PX-15642628',
  institution: 'PLA GENERAL HOSP',
  age: '65',
  sex: 'MALE',
  nihss: '12',
  diseaseDate: '21/02/2018',
  onsetTime: '3h 20min',
  scanTime: '14:22:01',
};

const SCAN_META = {
  rootFolder: 'CT_IMAGE_HEAD',
  voxelRes: '0.125mm × 0.125mm',
  snr: '42.1dB',
  mode: 'STATIC_3D_WIRE',
  coords: { x: '510', y: '119', val: '-3024', wc: '30', ww: '100' },
  slice: 'IM 16/32',
};


export default function ScanView() {
  const location = useLocation();
  const [scan, setScan] = useState(null);
  const [loadingScan, setLoadingScan] = useState(false);
  const [loadError, setLoadError] = useState('');
  const [doctors, setDoctors] = useState([]);
  const [selectedDoctorId, setSelectedDoctorId] = useState('');
  const [sending, setSending] = useState(false);
  const [sendFeedback, setSendFeedback] = useState('');
  const [sendingPatient, setSendingPatient] = useState(false);
  const [patientSendFeedback, setPatientSendFeedback] = useState('');
  const [brightness, setBrightness] = useState(100);
  const [contrast, setContrast] = useState(100);

  const locationScanId = location.state?.scanId || '';
  const [resolvedScanId, setResolvedScanId] = useState(locationScanId);
  const unifiedAnalysis = location.state?.unifiedAnalysis || null;
  const sourceFileName = location.state?.sourceFileName || '';
  const sourceScanType = location.state?.sourceScanType || '';
  const uploadedImageDataUrl = location.state?.uploadedImageDataUrl || '';
  const fallbackPatientName = location.state?.patientName || '';
  const fallbackPatientAge = location.state?.patientAge || '';
  const fallbackPatientEmail = location.state?.patientEmail || '';
  const fallbackPatientGender = location.state?.patientGender || '';

  useEffect(() => {
    let isActive = true;

    const resolveScan = async () => {
      if (locationScanId) {
        setResolvedScanId(locationScanId);
        return;
      }

      const cached = localStorage.getItem('diagnoscope:lastScanId');
      if (cached) {
        setResolvedScanId(cached);
        return;
      }

      try {
        const payload = await listScans();
        const latest = Array.isArray(payload?.data) ? payload.data[0] : null;
        if (latest?.id && isActive) {
          setResolvedScanId(latest.id);
          localStorage.setItem('diagnoscope:lastScanId', latest.id);
        }
      } catch {
        // ignore - fallback UI will show
      }
    };

    resolveScan();
    return () => {
      isActive = false;
    };
  }, [locationScanId]);

  useEffect(() => {
    const loadDoctors = async () => {
      try {
        const payload = await listDoctors();
        const affiliatedDoctors = (payload?.data || []).filter((doc) => String(doc.status || '').toLowerCase() === 'verified');
        setDoctors(affiliatedDoctors);
        if (affiliatedDoctors.length > 0) {
          setSelectedDoctorId(affiliatedDoctors[0].id);
        }
      } catch {
        setDoctors([]);
      }
    };

    loadDoctors();
  }, []);

  useEffect(() => {
    const loadScan = async () => {
      if (!resolvedScanId) {
        setScan(null);
        return;
      }

      setLoadingScan(true);
      setLoadError('');
      try {
        const payload = await getScan(resolvedScanId);
        setScan(payload?.data || null);
        localStorage.setItem('diagnoscope:lastScanId', resolvedScanId);
      } catch (err) {
        setLoadError(err.message || 'Failed to load analysis');
        setScan(null);
      } finally {
        setLoadingScan(false);
      }
    };

    loadScan();
  }, [resolvedScanId]);

  const activeAnalysis = useMemo(() => {
    if (unifiedAnalysis) return unifiedAnalysis;

    const first = scan?.aiResults?.[0];
    if (!first) return null;

    return {
      prediction:
        first.summary ||
        first.label ||
        first.prediction?.label ||
        first.prediction?.predicted_label ||
        'Analysis available',
      confidence: typeof first.confidence === 'number' ? first.confidence : 0,
      details: {
        status: scan?.status,
        severity: first.severity || first.metadata?.details?.severity || 'not_specified',
      },
      visuals: first.metadata?.visuals || [],
      ai_insight: first.insights || first.metadata?.details?.ai_insight || null,
    };
  }, [scan, unifiedAnalysis]);

  const visualDataUrl = useMemo(() => {
    const visual = activeAnalysis?.visuals?.[0];
    if (!visual?.base64_data) return null;
    return `data:${visual.media_type || 'image/png'};base64,${visual.base64_data}`;
  }, [activeAnalysis]);

  const visualEntries = useMemo(() => {
    const entries = (activeAnalysis?.visuals || []).map((visual) => ({
      key: visual.key || 'visual',
      label: String(visual.key || visual.label || 'visual').replace(/_/g, ' ').toUpperCase(),
      dataUrl: visual.base64_data ? `data:${visual.media_type || 'image/png'};base64,${visual.base64_data}` : null,
    })).filter((entry) => Boolean(entry.dataUrl));

    const hasOriginal = entries.some((entry) => entry.label === 'ORIGINAL');
    if (uploadedImageDataUrl && !hasOriginal) {
      return [
        ...entries,
        { key: 'original_upload', label: 'ORIGINAL', dataUrl: uploadedImageDataUrl },
      ];
    }

    if (!hasOriginal && scan?.assets?.length) {
      const originalAsset = scan.assets.find((asset) => asset.assetType === 'original' && asset.url);
      if (originalAsset?.url) {
        return [
          ...entries,
          { key: 'original_asset', label: 'ORIGINAL', dataUrl: originalAsset.url },
        ];
      }
    }

    return entries;
  }, [activeAnalysis, uploadedImageDataUrl, scan]);

  const mainVisual = useMemo(() => {
    const preferredKeys = ['detection', 'overlay', 'segmentation', 'heatmap'];
    const preferred = visualEntries.find((entry) =>
      preferredKeys.some((key) =>
        entry.key.toLowerCase().includes(key) || entry.label.toLowerCase().includes(key)
      )
    );

    const originalAssetUrl = scan?.assets?.find((asset) => asset.assetType === 'original' && asset.url)?.url;
    return preferred?.dataUrl || visualEntries[0]?.dataUrl || uploadedImageDataUrl || visualDataUrl || originalAssetUrl;
  }, [uploadedImageDataUrl, visualDataUrl, visualEntries, scan]);

  const confidencePct = useMemo(() => {
    const raw = Number(activeAnalysis?.confidence || 0);
    const normalized = raw <= 1 ? raw * 100 : raw;
    return Math.max(0, Math.min(100, Math.round(normalized * 10) / 10));
  }, [activeAnalysis]);

  const insightText = (() => {
    const candidate =
      activeAnalysis?.ai_insight ||
      activeAnalysis?.details?.insight ||
      (activeAnalysis?.prediction ? `AI analysis indicates ${activeAnalysis.prediction}.` : null);
    if (!candidate) return null;
    if (typeof candidate === 'string') return candidate;
    try {
      return JSON.stringify(candidate);
    } catch {
      return String(candidate);
    }
  })();

  const patientName =
    scan?.patient?.name ||
    fallbackPatientName ||
    PATIENT_DATA.name;
  const patientAge =
    scan?.patient?.metadata?.age ||
    scan?.patient?.age ||
    fallbackPatientAge ||
    PATIENT_DATA.age;
  const patientEmail =
    scan?.patient?.email ||
    fallbackPatientEmail ||
    '';
  const patientSexRaw =
    scan?.patient?.gender ||
    scan?.patient?.sex ||
    fallbackPatientGender ||
    PATIENT_DATA.sex ||
    '—';
  const patientSex = patientSexRaw ? String(patientSexRaw).toUpperCase() : '—';
  const patientAgeLabel = patientAge === undefined || patientAge === null || patientAge === '' ? '—' : String(patientAge);
  const patientInstitution =
    scan?.patient?.institution ||
    PATIENT_DATA.institution;
  const patientId =
    scan?.patient?.id ||
    scan?.patient?.patientId ||
    PATIENT_DATA.id;

  const handleSendToDoctor = async () => {
    if (!resolvedScanId) {
      setSendFeedback('Open analysis from a specific scan before sending to a doctor.');
      return;
    }
    if (!selectedDoctorId) {
      setSendFeedback('No affiliated verified doctor available to receive this analysis.');
      return;
    }

    setSending(true);
    setSendFeedback('');
    try {
      await assignScanDoctor({
        scanId: resolvedScanId,
        doctorId: selectedDoctorId,
        notes: 'Sent from desktop analysis view',
      });
      setSendFeedback('Analysis sent to affiliated doctor successfully.');
    } catch (err) {
      setSendFeedback(err.message || 'Failed to send analysis to doctor.');
    } finally {
      setSending(false);
    }
  };

  const handleSendToPatient = async () => {
    if (!patientEmail) {
      setPatientSendFeedback('No patient email found for this scan.');
      return;
    }

    setSendingPatient(true);
    setPatientSendFeedback('');
    try {
      await sendReportToPatient({ scanId: resolvedScanId, email: patientEmail });
      setPatientSendFeedback('Report emailed to the patient successfully.');
    } catch (err) {
      const message = err?.message || 'Failed to email the report.';
      setPatientSendFeedback(String(message));
    } finally {
      setSendingPatient(false);
    }
  };

  const resetImageAdjustments = () => {
    setBrightness(100);
    setContrast(100);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', height: '100%' }}>
      {loadingScan ? <p className="text-micro text-muted">Loading analysis...</p> : null}
      {loadError ? <p className="text-micro" style={{ color: 'var(--color-critical)' }}>{loadError}</p> : null}
      
      {/* ── TOP: Patient Info ── */}
      <DataCard style={{ flexShrink: 0 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <h1 style={{ margin: 0 }}>{patientName}</h1>
            <p className="text-muted text-micro">
               {resolvedScanId || patientId} // {patientInstitution} // {(sourceScanType || scan?.scanType || 'SCAN')} // {sourceFileName || SCAN_META.rootFolder}
            </p>
          </div>
          <div style={{ display: 'flex', gap: '2rem' }}>
             <MetricTile label="Age/Sex" value={`${patientAgeLabel} / ${patientSex}`} />
             <MetricTile label="Confidence" value={`${confidencePct}`} unit="%" status={confidencePct >= 70 ? 'highlight' : 'warning'} />
          </div>
        </div>
      </DataCard>

      {/* ── CENTER & RIGHT SPLIT ── */}
      <div style={{ display: 'flex', gap: '1.5rem', flex: 1, minHeight: 0 }}>
        
        {/* CENTER: Scan Viewer */}
        <div style={{ flex: 2, display: 'flex', flexDirection: 'column', gap: '1rem', minWidth: 0 }}>
           <DataCard title="SCAN ANALYSIS" style={{ position: 'relative', overflow: 'hidden' }}>
              <div className="scanview__file-header text-micro">
                {sourceFileName || activeAnalysis?.file_name || 'Analyzed Scan'}
              </div>
              {/* Fake Wireframe Brain / Heatmap display */}
              <div style={{ 
                position: 'relative', 
                margin: '0.75rem',
                minHeight: '360px',
                border: '1px solid rgba(0,240,255,0.1)',
                background: 'radial-gradient(circle at center, rgba(0, 240, 255, 0.05) 0%, transparent 60%)',
                display: 'flex', alignItems: 'center', justifyContent: 'center'
              }}>
                 {/* Reticle UI */}
                 <div style={{ position: 'absolute', inset: '20%', border: '1px dashed rgba(0,240,255,0.2)', borderRadius: '50%', animation: 'spin 20s linear infinite' }} />
                 <div style={{ position: 'absolute', inset: '35%', border: '1px dashed rgba(0,240,255,0.4)', borderRadius: '50%', animation: 'spin 10s linear reverse infinite' }} />
                 
                  {mainVisual ? (
                   <img
                    src={mainVisual}
                    alt="Analysis visual"
                    style={{ width: '100%', height: '100%', objectFit: 'contain', filter: `brightness(${brightness}%) contrast(${contrast}%)` }}
                   />
                  ) : (
                   <>
                    <div style={{
                      position: 'absolute', top: '40%', left: '30%',
                      width: '60px', height: '60px',
                      background: 'radial-gradient(circle, rgba(255,255,0,0.4) 0%, rgba(255,0,0,0.1) 70%)',
                      filter: 'blur(8px)',
                      animation: 'pulse-glow 2s infinite'
                    }} />
                    <div style={{
                      position: 'absolute', top: '38%', left: '28%',
                      width: '64px', height: '64px',
                      border: '1px solid var(--primary)',
                      clipPath: 'polygon(0 0, 10px 0, 10px 2px, 2px 2px, 2px 10px, 0 10px, 0 calc(100% - 10px), 2px calc(100% - 10px), 2px calc(100% - 2px), 10px calc(100% - 2px), 10px 100%, 0 100%, calc(100% - 10px) 100%, calc(100% - 10px) calc(100% - 2px), calc(100% - 2px) calc(100% - 2px), calc(100% - 2px) calc(100% - 10px), 100% calc(100% - 10px), 100% 10px, calc(100% - 2px) 10px, calc(100% - 2px) 2px, calc(100% - 10px) 2px, calc(100% - 10px) 0, 100% 0)'
                    }} />
                    <span className="material-symbols-outlined text-primary" style={{ fontSize: '120px', opacity: 0.1 }}>neurology</span>
                   </>
                  )}
              </div>

              {/* Coordinates Grid Overlay */}
              <div style={{ position: 'absolute', bottom: '1rem', left: '1rem', display: 'flex', gap: '1rem' }} className="text-micro text-primary">
                <span>X: {SCAN_META.coords.x}</span>
                <span>Y: {SCAN_META.coords.y}</span>
                <span>Val: {SCAN_META.coords.val}</span>
                <span>WC: {SCAN_META.coords.wc}</span>
                <span>WW: {SCAN_META.coords.ww}</span>
              </div>
              <div style={{ position: 'absolute', top: '1rem', right: '1rem' }} className="text-micro text-primary">
                PAGE 120 // {SCAN_META.slice}
              </div>

              <div className="scanview__controls-row">
                <div className="scanview__control">
                  <span className="material-symbols-outlined">light_mode</span>
                  <input type="range" min="0" max="200" value={brightness} onChange={(e) => setBrightness(Number(e.target.value))} />
                  <span>{brightness}%</span>
                </div>
                <div className="scanview__control">
                  <span className="material-symbols-outlined">contrast</span>
                  <input type="range" min="0" max="200" value={contrast} onChange={(e) => setContrast(Number(e.target.value))} />
                  <span>{contrast}%</span>
                </div>
                <div className="scanview__icon-group">
                  <button className="scanview__icon-btn" onClick={resetImageAdjustments} title="Reset">⟳</button>
                  <button className="scanview__icon-btn" title="Zoom out">−</button>
                  <button className="scanview__icon-btn" title="Zoom in">+</button>
                  <button className="scanview__icon-btn" title="Fullscreen">⤢</button>
                </div>
              </div>
           </DataCard>

           <DataCard title="FILTER OUTPUTS" icon="grid_view">
             {visualEntries.length ? (
               <div className="scanview__visual-grid">
                 {visualEntries.map((entry) => (
                   <div key={entry.key} className="scanview__visual-card">
                     <div className="scanview__visual-title">{entry.label}</div>
                     <img src={entry.dataUrl} alt={entry.label} className="scanview__visual-image" />
                   </div>
                 ))}
               </div>
             ) : (
               <p className="text-micro text-muted">No processed visual variants available for this scan.</p>
             )}
           </DataCard>
        </div>

        {/* RIGHT: Diagnosis Info */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '1.5rem', overflowY: 'auto', paddingRight: '4px' }}>
          
          <DataCard title="DIAGNOSIS" variant="alert">
             <h3 className="text-error" style={{ margin: 0 }}>{activeAnalysis?.prediction || 'Awaiting analysis output'}</h3>
          </DataCard>

          <DataCard title="ASPECTS" icon="analytics">
             <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
               <h1 className="text-primary" style={{ margin: 0, fontSize: '3rem' }}>6</h1>
               <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '4px' }}>
                  {['M1','M2','M3','M4','M5','M6','I','IC','C','L'].map(s => (
                     <div key={s} className="text-micro" style={{ border: '1px solid var(--outline-variant)', padding: '2px 4px', textAlign: 'center', background: ['M1','M2','I'].includes(s) ? 'rgba(255,0,0,0.2)' : 'transparent' }}>{s}</div>
                  ))}
               </div>
             </div>
          </DataCard>

          <DataCard title="AI INSIGHTS" icon="psychology">
             <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
               {insightText ? (
                 <AlertBanner severity={confidencePct >= 70 ? 'info' : 'critical'} icon="auto_awesome">
                   {insightText}
                 </AlertBanner>
               ) : (
                 <p className="text-micro text-muted">No AI insights available for this scan.</p>
               )}
             </div>
          </DataCard>

          <DataCard title="ANALYSIS DETAILS" icon="article">
             <div style={{ display: 'grid', gap: '0.5rem' }}>
               {Object.entries(activeAnalysis?.details || {}).slice(0, 8).map(([key, value]) => (
                 <div key={key} style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem' }}>
                   <span className="text-micro text-muted" style={{ textTransform: 'uppercase' }}>{key.replace(/_/g, ' ')}</span>
                   <span className="text-micro text-primary" style={{ textAlign: 'right' }}>{String(value)}</span>
                 </div>
               ))}
               {!Object.keys(activeAnalysis?.details || {}).length ? <p className="text-micro text-muted">No extra analysis metadata available.</p> : null}
             </div>
          </DataCard>

          <DataCard title="RECOMMENDATION">
             <p className="text-muted text-micro" style={{ lineHeight: 1.6 }}>
               Patients should receive mechanical thrombectomy with a stent retriever if they meet criteria: (1) pre-stroke mRS score of 0 to 1, (2) causative occlusion of the internal carotid artery or MCA segment 1, (3) age ≥ 18 years, (4) NIHSS score of ≥ 6, (5) ASPECTS of ≥ 6, and (6) treatment can be initiated (groin puncture) within 6 hours.
             </p>
             <div style={{ marginTop: '1rem' }}>
                <GlowButton fullWidth>AUTHORIZE PROCEDURE</GlowButton>
             </div>
          </DataCard>

          <DataCard title="SEND TO PATIENT" icon="mail">
             <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
               <label className="text-micro" htmlFor="patient-email">PATIENT EMAIL</label>
               <input
                 id="patient-email"
                 value={patientEmail}
                 readOnly
                 placeholder="No email on record"
                 style={{ width: '100%', padding: '0.75rem', background: 'rgba(0,0,0,0.4)', color: '#fff', border: '1px solid rgba(0,240,255,0.3)' }}
               />
               <GlowButton fullWidth onClick={handleSendToPatient} disabled={sendingPatient || !patientEmail}>
                 {sendingPatient ? 'SENDING...' : 'SEND REPORT'}
               </GlowButton>
               {patientSendFeedback ? (
                 <p className="text-micro" style={{ color: /success|emailed|sent/i.test(patientSendFeedback) ? 'var(--color-stable)' : 'var(--color-critical)' }}>
                   {patientSendFeedback}
                 </p>
               ) : null}
             </div>
          </DataCard>

        </div>

      </div>
    </div>
  );
}
