import { DataCard, GlowButton, InputField } from '../../components/ui';
import './SecondOpinion.css';

export default function SecondOpinion() {
  return (
    <div className="second-op">
      <h1>Second Opinion Request</h1>

      <div className="second-op__grid">
        {/* Upload Section */}
        <DataCard title="Initialize Data Transfer" icon="cloud_upload" className="second-op__full-width">
          <div className="second-op__upload-zone">
            <span className="material-symbols-outlined">medical_information</span>
            <span className="second-op__upload-title">Drag and drop MRI, CT, or X-RAY DICOM files here</span>
            <span className="text-micro">Supported formats: .dcm, .nii, .jpg (HD)</span>
            <GlowButton variant="ghost" icon="folder_open">BROWSE_FILES</GlowButton>
          </div>
        </DataCard>

        {/* Subject Identity */}
        <DataCard title="Subject Identity" icon="fingerprint">
          <div className="second-op__form">
            <InputField label="Patient_Name" id="patient-name" placeholder="LAST, FIRST" icon="person" />
            <InputField label="Patient_ID" id="patient-id" placeholder="PX-XXXX-XX" icon="badge" />
            <InputField label="DOB" id="dob" type="date" icon="calendar_today" />
            <InputField label="Referring_Inst" id="inst" placeholder="Institution Name" icon="business" />
          </div>
        </DataCard>

        {/* Select Consultant */}
        <DataCard title="Select Consultant" icon="person_search">
          <div className="second-op__consultant">
            <div className="second-op__consultant-card second-op__consultant-card--selected">
              <div className="second-op__consultant-avatar">
                <span className="material-symbols-outlined">person</span>
              </div>
              <div className="second-op__consultant-info">
                <span className="second-op__consultant-name">Dr. Elias Vance</span>
                <span className="text-micro">Senior Neuro-Radiologist • Level 5</span>
              </div>
              <span className="material-symbols-outlined second-op__check">check_circle</span>
            </div>
            <div className="second-op__consultant-card">
              <div className="second-op__consultant-avatar">
                <span className="material-symbols-outlined">person</span>
              </div>
              <div className="second-op__consultant-info">
                <span className="second-op__consultant-name">Dr. Sarah Kinetic</span>
                <span className="text-micro">Genetic Pathologist • Level 4</span>
              </div>
            </div>
          </div>
        </DataCard>

        {/* Clinical Intent */}
        <DataCard title="Clinical Intent" icon="contract_edit" className="second-op__full-width">
          <div className="second-op__intent">
            <textarea
              className="second-op__textarea"
              placeholder="Describe the clinical question or concern..."
              rows={4}
            />
            <p className="text-micro" style={{ opacity: 0.5, marginTop: 'var(--space-2)' }}>
              By transmitting, you confirm patient consent for clinical data sharing under Protocol 11-A.
            </p>
            <div className="second-op__submit">
              <GlowButton icon="send" fullWidth>TRANSMIT_REQUEST</GlowButton>
            </div>
          </div>
        </DataCard>
      </div>
    </div>
  );
}
