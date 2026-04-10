import { DataCard } from '../../components/ui';

export default function Terminal() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <DataCard title="COMMAND TERMINAL" icon="terminal" style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        <div style={{ backgroundColor: 'rgba(0,0,0,0.5)', padding: '1rem', fontFamily: 'var(--font-mono)', minHeight: '300px', color: 'var(--primary)', flex: 1 }}>
          <p>&gt; INIT DIAG_CORE_v4.0.2</p>
          <p>&gt; LOADING MODULES...</p>
          <p>&gt; OK.</p>
          <p className="text-error">&gt; WARNING: UNAUTHORIZED ACCESS ATTEMPT DETECTED.</p>
          <p>&gt; _<span style={{ animation: 'pulse-glow 1s infinite' }}>█</span></p>
        </div>
      </DataCard>
    </div>
  );
}
