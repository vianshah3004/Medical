import { DataCard, GlowButton, StatusChip } from '../../components/ui';
import './DoctorVerification.css';

const PENDING_DOCTORS = [
  {
    name: 'DR. ELIAS THORNE',
    role: 'Lead Neuro-Consultant',
    university: 'STANFORD MED COLL',
    licenseId: 'LIC-4491-X8',
    institutions: ['Central Neuro-Center Basel', 'Alpine Research Lab', 'NYC General Surgical'],
    status: 'pending',
  },
  {
    name: 'DR. AMARA OSEI',
    role: 'Genetic Pathologist',
    university: 'JOHNS HOPKINS',
    licenseId: 'LIC-7823-B2',
    institutions: ['Nairobi General', 'Geneva BioLab'],
    status: 'pending',
  },
];

export default function DoctorVerification() {
  return (
    <div className="doc-verify">
      <div className="doc-verify__header">
        <h1>Pending Doctor Verifications</h1>
        <p className="text-micro">QUEUE: {PENDING_DOCTORS.length} | PROTOCOL: BIOMETRIC_AUTH_v4.02</p>
      </div>

      <div className="doc-verify__list">
        {PENDING_DOCTORS.map((doc, i) => (
          <DataCard key={i} variant="active" scanning={i === 0}>
            <div className="doc-verify__card">
              {/* Left: Avatar */}
              <div className="doc-verify__avatar">
                <span className="material-symbols-outlined">person</span>
              </div>

              {/* Center: Details */}
              <div className="doc-verify__details">
                <div className="doc-verify__name-row">
                  <h2>{doc.name}</h2>
                  <StatusChip label={doc.status.toUpperCase()} status={doc.status} />
                </div>
                <span className="text-label">{doc.role}</span>

                <div className="doc-verify__bio-section">
                  <h4>Clinical Bio-Data</h4>
                  <div className="doc-verify__bio-grid">
                    <div className="doc-verify__bio-item">
                      <span className="text-label">University</span>
                      <span>{doc.university}</span>
                    </div>
                    <div className="doc-verify__bio-item">
                      <span className="text-label">License ID</span>
                      <span className="text-mono">{doc.licenseId}</span>
                    </div>
                    <div className="doc-verify__bio-item doc-verify__bio-item--full">
                      <span className="text-label">Verified Institutions</span>
                      <span>{doc.institutions.join(', ')}</span>
                    </div>
                  </div>
                </div>

                {/* Credential Asset Placeholder */}
                <div className="doc-verify__credential">
                  <h4>Credential Asset</h4>
                  <div className="doc-verify__credential-box">
                    <span className="material-symbols-outlined">description</span>
                    <span className="text-micro">MEDICAL_LICENSE.pdf — VERIFIED_HASH</span>
                  </div>
                </div>
              </div>

              {/* Right: Actions */}
              <div className="doc-verify__actions">
                <h4>Verification Protocol</h4>
                <GlowButton icon="check_circle" fullWidth>APPROVE</GlowButton>
                <GlowButton variant="danger" icon="cancel" fullWidth>REJECT</GlowButton>
                <GlowButton variant="ghost" icon="info" fullWidth>REQUEST_INFO</GlowButton>
              </div>
            </div>
          </DataCard>
        ))}
      </div>
    </div>
  );
}
