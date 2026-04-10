import { DataCard, GlowButton, StatusChip } from '../../components/ui';
import './CredentialModal.css';

export default function CredentialModal() {
  return (
    <div className="cred-modal-page">
      {/* Background overlay effect */}
      <div className="cred-modal-page__bg" />

      <div className="cred-modal">
        {/* Success Header */}
        <div className="cred-modal__header">
          <div className="cred-modal__icon-success">
            <span className="material-symbols-outlined">check_circle</span>
          </div>
          <h2>Doctor Verified Successfully</h2>
          <p className="text-label">Clinical Credentialing Portal // Auth_v.4.02</p>
        </div>

        {/* Credential Details */}
        <DataCard variant="active">
          <div className="cred-modal__details">
            <div className="cred-modal__detail-row">
              <span className="text-label">Operator</span>
              <span>DR. ELIAS THORNE</span>
            </div>
            <div className="cred-modal__detail-row">
              <span className="text-label">License_ID</span>
              <span className="text-mono">LIC-4491-X8</span>
            </div>
            <div className="cred-modal__detail-row">
              <span className="text-label">Clearance</span>
              <StatusChip label="LEVEL 5" status="stable" />
            </div>
            <div className="cred-modal__detail-row">
              <span className="text-label">Auth_Hash</span>
              <span className="text-mono text-micro">SHA256:8f2b3c...4y5z</span>
            </div>
          </div>
        </DataCard>

        <p className="cred-modal__footer-text text-micro">
          Secured by Biometric Architect Protocol 0.8
        </p>

        <div className="cred-modal__actions">
          <GlowButton icon="dashboard" fullWidth>RETURN_TO_DASHBOARD</GlowButton>
          <GlowButton variant="ghost" icon="print" fullWidth>EXPORT_CREDENTIAL</GlowButton>
        </div>
      </div>
    </div>
  );
}
