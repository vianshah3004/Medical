import { DataCard } from '../../components/ui';

export default function SystemStatus() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <DataCard title="CORE VITALS" icon="sensors" variant="active">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem' }}>
          <div><p className="text-muted">CPU TEMP</p><p className="text-primary text-headline-sm">45°C</p></div>
          <div><p className="text-muted">GPU TEMP</p><p className="text-primary text-headline-sm">62°C</p></div>
          <div><p className="text-muted">VRAM USAGE</p><p className="text-primary text-headline-sm">22 GB</p></div>
          <div><p className="text-muted">NETWORK</p><p className="text-primary text-headline-sm">STABLE</p></div>
        </div>
      </DataCard>
    </div>
  );
}
