import { useState } from 'react';
import { DataCard, StatusChip, GlowButton } from '../../components/ui';
import './DoctorInbox.css';

const CASES_QUEUE = [
  { id: 'PX-7700-11', name: 'N. VASQUEZ', type: 'NEURAL MAPPING', preview: 'Anomalous synaptic discharge in temporal lobe...', urgent: true },
  { id: 'PX-7701-04', name: 'J. STERLING', type: 'PULMONARY', preview: 'Shadowing on lower right lobe region...', urgent: false },
  { id: 'PX-7702-09', name: 'A. CHEN', type: 'CARDIAC', preview: 'Persistent arrhythmia post-synthetic graft...', urgent: false },
];

const SELECTED_CASE = {
  name: 'NINA VASQUEZ',
  id: 'PX-7700-11',
  dob: '04.12.2064',
  sec: 'CLASSIFIED',
  referringInst: 'Neo-Tokyo General Hospital',
  scanVersion: 'Neural Flux Map v4.2',
  coords: 'XYZ: 44.1 // 12.8 // -0.4',
  anomalyMatch: '88.2%',
  clinicalContext: 'Patient presents with recurring cortical spikes during REM cycles. Previous MRI scans showed trace amounts of synthetic polymer near the hippocampal junction. Previous hospital notes indicate a history of neuro-interface rejects (Model 4-B).',
};

export default function DoctorInbox() {
  const [selectedIdx, setSelectedIdx] = useState(0);

  return (
    <div className="inbox">
      <div className="inbox__header">
        <h1>Case Queue</h1>
        <p className="text-micro">PENDING_REVIEW: {CASES_QUEUE.length} | PRIORITY_FLAGS: 1</p>
      </div>

      <div className="inbox__layout">
        {/* Case Queue List */}
        <div className="inbox__queue">
          {CASES_QUEUE.map((c, i) => (
            <div
              key={c.id}
              className={`inbox__queue-item ${selectedIdx === i ? 'inbox__queue-item--selected' : ''}`}
              onClick={() => setSelectedIdx(i)}
            >
              <div className="inbox__queue-top">
                <span className="inbox__queue-name">{c.name}</span>
                <span className="inbox__queue-type">{c.type}</span>
              </div>
              <p className="inbox__queue-preview">{c.preview}</p>
              {c.urgent && <StatusChip label="URGENT" status="critical" />}
            </div>
          ))}
        </div>

        {/* Case Detail */}
        <div className="inbox__detail">
          <DataCard variant="active" scanning>
            <div className="inbox__detail-header">
              <h2>{SELECTED_CASE.name}</h2>
              <div className="inbox__detail-meta">
                <span className="text-micro">Patient ID: {SELECTED_CASE.id} / DOB: {SELECTED_CASE.dob} / SEC: {SELECTED_CASE.sec}</span>
              </div>
            </div>

            <div className="inbox__detail-grid">
              <div className="inbox__detail-item">
                <span className="text-label">Referring Inst.</span>
                <span>{SELECTED_CASE.referringInst}</span>
              </div>
              <div className="inbox__detail-item">
                <span className="text-label">Scan Version</span>
                <span>{SELECTED_CASE.scanVersion}</span>
              </div>
              <div className="inbox__detail-item">
                <span className="text-label">Coordinates</span>
                <span className="text-mono">{SELECTED_CASE.coords}</span>
              </div>
              <div className="inbox__detail-item">
                <span className="text-label">Anomaly Match</span>
                <span className="inbox__anomaly-value">{SELECTED_CASE.anomalyMatch}</span>
              </div>
            </div>
          </DataCard>

          {/* Scan Preview */}
          <DataCard>
            <div className="inbox__scan-preview">
              <span className="material-symbols-outlined">radiology</span>
              <span className="text-label">NEURAL_FLUX_MAP_RENDER</span>
              <span className="text-micro">LIVE_RENDER_ACTIVE</span>
            </div>
          </DataCard>

          {/* Clinical Context */}
          <DataCard title="Clinical Context" icon="clinical_notes">
            <p className="inbox__context-text">{SELECTED_CASE.clinicalContext}</p>
          </DataCard>

          {/* Vitals History Placeholder */}
          <DataCard title="Vitals History" icon="monitoring">
            <div className="inbox__vitals-chart">
              <div className="inbox__chart-placeholder">
                <span className="material-symbols-outlined">show_chart</span>
                <span className="text-micro">VITALS_TIMELINE_RENDER</span>
              </div>
            </div>
          </DataCard>

          {/* Report Section */}
          <DataCard title="Diagnostic Report" icon="edit_note" subtitle="Reviewer: Dr. Architect (L5-Clinical)">
            <div className="inbox__report-section">
              <textarea
                className="inbox__report-textarea"
                placeholder="Enter diagnostic findings..."
                rows={5}
              />
              <div className="inbox__report-upload">
                <span className="material-symbols-outlined">cloud_upload</span>
                <span className="text-label">Drag & Drop .DICOM or .ANNOT</span>
              </div>
              <div className="inbox__report-actions">
                <GlowButton icon="send">SUBMIT_REPORT</GlowButton>
                <GlowButton variant="ghost" icon="save">SAVE_DRAFT</GlowButton>
              </div>
            </div>
          </DataCard>
        </div>
      </div>
    </div>
  );
}
