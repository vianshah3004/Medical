import { DataCard, StatusChip, GlowButton, MetricTile } from '../../components/ui';
import { useNavigate } from 'react-router-dom';
import { useEffect, useMemo, useState } from 'react';
import { listScans } from '../../services/api';
import './CaseDashboard.css';

const CASES = [
  { id: 'DX-8802', name: 'ZHANG W.', diagnosis: 'Acute Cerebral Infarction', status: 'critical', age: '65', nihss: '12', time: '14:22' },
  { id: 'DX-8803', name: 'VASQUEZ N.', diagnosis: 'Neural Mapping Anomaly', status: 'pending', age: '32', nihss: '6', time: '15:01' },
  { id: 'DX-8804', name: 'STERLING J.', diagnosis: 'Pulmonary Shadow', status: 'active', age: '58', nihss: '—', time: '15:30' },
  { id: 'DX-8805', name: 'CHEN A.', diagnosis: 'Cardiac Arrhythmia', status: 'stable', age: '44', nihss: '—', time: '16:12' },
  { id: 'DX-8806', name: 'THORNE E.', diagnosis: 'Glioblastoma Recurrence', status: 'critical', age: '71', nihss: '18', time: '16:45' },
];

function formatDiagnosis(aiResult, scanType) {
  if (!aiResult) {
    return String(scanType || 'Unknown Scan').toUpperCase();
  }

  if (typeof aiResult.summary === 'string' && aiResult.summary.trim()) {
    return aiResult.summary;
  }

  const prediction = aiResult.prediction;
  if (typeof prediction === 'string' && prediction.trim()) {
    return prediction;
  }

  if (prediction && typeof prediction === 'object') {
    if (typeof prediction.label === 'string' && prediction.label.trim()) {
      return prediction.label;
    }
    if (typeof prediction.predicted_label === 'string' && prediction.predicted_label.trim()) {
      return prediction.predicted_label;
    }
  }

  if (typeof aiResult.label === 'string' && aiResult.label.trim()) {
    return aiResult.label;
  }

  return String(scanType || 'Unknown Scan').toUpperCase();
}

export default function CaseDashboard() {
  const navigate = useNavigate();
  const [cases, setCases] = useState(CASES);
  const safeCases = Array.isArray(cases) ? cases : [];

  useEffect(() => {
    const loadCases = async () => {
      try {
        const payload = await listScans();
        const scans = Array.isArray(payload?.data) ? payload.data : [];
        if (!scans.length) return;

        setCases(
          scans.slice(0, 20).map((scan, index) => {
            const createdAt = scan?.createdAt ? new Date(scan.createdAt) : new Date();
            const safeTime = Number.isNaN(createdAt.getTime())
              ? new Date().toLocaleTimeString()
              : createdAt.toLocaleTimeString();
            return {
              id: scan?.id ?? scan?.scanId ?? scan?._id ?? `scan-${index}`,
              name: scan?.patient?.name || 'Unknown Subject',
              diagnosis: formatDiagnosis(scan?.aiResults?.[0], scan.scanType),
              status: mapStatusToChip(scan?.status),
              age: scan?.patient?.age || '—',
              nihss: scan?.patient?.nihss || '—',
              time: safeTime,
            };
          })
        );
      } catch {
        setCases(CASES);
      }
    };

    loadCases();
  }, []);

  const criticalCount = useMemo(
    () => safeCases.filter((c) => c?.status === 'critical').length,
    [safeCases]
  );

  function mapStatusToChip(status) {
    const normalized = String(status || '').toLowerCase();
    if (['critical', 'failed', 'error'].includes(normalized)) return 'critical';
    if (['processing', 'queued', 'pending'].includes(normalized)) return 'pending';
    if (['active', 'assigned'].includes(normalized)) return 'active';
    return 'stable';
  }

  return (
    <div className="case-dash">
      {/* Header Row */}
      <div className="case-dash__header">
        <div>
          <h1 className="case-dash__title">Active Case Repository</h1>
            <p className="text-micro">TOTAL_ACTIVE: {safeCases.length} | QUEUE_DEPTH: {safeCases.length} | PRIORITY_FLAG: {criticalCount}</p>
        </div>
          <GlowButton icon="add" onClick={() => navigate('/scans')}>NEW_CASE</GlowButton>
      </div>

      {/* Stats Row */}
      <div className="case-dash__stats">
        <MetricTile label="Scan_Efficiency" value="98.4" unit="%" status="highlight" />
        <MetricTile label="Avg_Latency" value="12" unit="MS" />
        <MetricTile label="Active_Nodes" value="4" />
        <MetricTile label="Queue_Depth" value={String(safeCases.length)} />
      </div>

      {/* Neural Sync Info */}
      <DataCard title="Scan_Efficiency" subtitle="NODE_THROUGHPUT" icon="speed" variant="active" scanning>
        <p className="text-body-sm" style={{ color: 'var(--color-stable)' }}>
          STATUS: NEURAL_SYNC_OPTIMAL. LATENCY &lt; 12MS.
        </p>
      </DataCard>

      {/* Case Table */}
      <DataCard title="Case_Log" icon="dataset">
        <div className="case-dash__table-wrapper">
          <table className="case-dash__table">
            <thead>
              <tr>
                <th>SERIAL</th>
                <th>SUBJECT</th>
                <th>DIAGNOSIS</th>
                <th>AGE</th>
                <th>NIHSS</th>
                <th>TIME</th>
                <th>STATUS</th>
                <th>ACTION</th>
              </tr>
            </thead>
            <tbody>
              {safeCases.map((c, index) => {
                const statusValue = typeof c?.status === 'string' ? c.status : 'stable';
                const statusLabel = typeof c?.status === 'string' ? c.status.toUpperCase() : 'STABLE';
                return (
                <tr key={c?.id ?? `case-${index}`} className="case-dash__row">
                  <td className="text-mono">{c?.id ?? '—'}</td>
                  <td className="case-dash__name">{c?.name ?? 'Unknown Subject'}</td>
                  <td>{c?.diagnosis ?? 'Unknown Scan'}</td>
                  <td className="text-mono">{c?.age ?? '—'}</td>
                  <td className="text-mono">{c?.nihss ?? '—'}</td>
                  <td className="text-mono">{c?.time ?? '—'}</td>
                  <td><StatusChip label={statusLabel} status={statusValue} /></td>
                  <td>
                    <GlowButton variant="ghost" onClick={() => navigate('/scan', { state: { scanId: c.id } })}>VIEW</GlowButton>
                  </td>
                </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </DataCard>

      {/* Operator Log */}
      <DataCard title="Operator_Log // Sector_07" icon="terminal">
        <div className="case-dash__log">
          <div className="case-dash__log-entry">
            <span className="case-dash__log-time">16:45:02</span>
            <span className="case-dash__log-msg">Case DX-8806 flagged CRITICAL — awaiting operator review.</span>
          </div>
          <div className="case-dash__log-entry">
            <span className="case-dash__log-time">16:12:30</span>
            <span className="case-dash__log-msg">Neural sync completed for Node_Alpha. Throughput nominal.</span>
          </div>
          <div className="case-dash__log-entry">
            <span className="case-dash__log-time">15:30:11</span>
            <span className="case-dash__log-msg">DICOM upload for DX-8804 processed. Awaiting analysis.</span>
          </div>
        </div>
      </DataCard>
    </div>
  );
}
