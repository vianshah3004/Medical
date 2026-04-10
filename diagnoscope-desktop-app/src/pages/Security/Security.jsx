import { DataCard, GlowButton } from '../../components/ui';

export default function Security() {
  return (
    <div style={{ display: 'flex', gap: '1.5rem' }}>
      <DataCard title="FIREWALL STATUS" icon="security" variant="active" style={{ flex: 1 }}>
        <h2 className="text-primary">SECURE</h2>
        <p className="text-muted">No breaches detected in the last 72 hours.</p>
        <div style={{ marginTop: '1rem' }}>
          <GlowButton variant="ghost">VIEW LOGS</GlowButton>
        </div>
      </DataCard>
      <DataCard title="ACTIVE THREATS" icon="warning" variant="alert" style={{ flex: 1 }}>
        <h2 className="text-error">0 DETECTED</h2>
        <p className="text-muted">Awaiting intrusion detection trigger.</p>
      </DataCard>
    </div>
  );
}
