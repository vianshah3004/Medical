import { DataCard, GlowButton } from '../../components/ui';

export default function SystemSync() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <DataCard title="NODE SYNCHRONIZATION" icon="sync_alt" variant="active">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <p className="text-primary" style={{ fontFamily: 'var(--font-mono)' }}>STATUS: SYNCING...</p>
            <p className="text-muted">Connecting to mainframe 192.168.1.104</p>
          </div>
          <GlowButton>FORCE SYNC</GlowButton>
        </div>
      </DataCard>
      <DataCard title="DATA TRANSMISSION" icon="cloud_upload">
        <p className="text-muted">Establishing secure handshakes...</p>
      </DataCard>
    </div>
  );
}
