import { DataCard } from '../../components/ui';

export default function Analytics() {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1.5rem' }}>
      
      <DataCard title="TOTAL SCANS" icon="dataset">
        <h1 className="text-primary" style={{ fontSize: '3rem', margin: '1rem 0' }}>4,208</h1>
        <p className="text-muted text-micro">+12% from last cycle.</p>
      </DataCard>
      
      <DataCard title="CRITICAL CASES" icon="warning" variant="alert">
        <h1 className="text-error" style={{ fontSize: '3rem', margin: '1rem 0' }}>142</h1>
        <p className="text-muted text-micro">High priority flagged.</p>
      </DataCard>

      <DataCard title="AI CONFIDENCE" icon="psychology" variant="active">
        <h1 className="text-primary" style={{ fontSize: '3rem', margin: '1rem 0' }}>99.8%</h1>
        <p className="text-muted text-micro">Neural network nominal.</p>
      </DataCard>

      <DataCard title="VOLUME OVER TIME (SIMULATOR)" icon="monitoring" style={{ gridColumn: 'span 2' }}>
        <div style={{ height: '200px', display: 'flex', alignItems: 'flex-end', gap: '4px', marginTop: '2rem' }}>
          {Array.from({ length: 40 }).map((_, i) => {
             const heightPos = Math.abs(Math.sin(i * 0.4) * 100) + Math.random() * 20;
             return (
               <div key={i} style={{ 
                 flex: 1, 
                 height: `${heightPos}%`, 
                 background: i > 30 ? 'var(--color-critical)' : 'var(--primary)',
                 boxShadow: `0 0 10px ${i > 30 ? 'var(--color-critical)' : 'var(--primary)'}`
               }} />
             );
          })}
        </div>
      </DataCard>

      <DataCard title="RADAR MATRIX" icon="radar">
         <div style={{ display: 'flex', justifyContent: 'center', margin: '2rem 0' }}>
            {/* Fake radar chart using conic gradient and borders */}
            <div style={{ 
              width: '180px', height: '180px', borderRadius: '50%',
              background: 'conic-gradient(from 0deg, transparent 0deg, transparent 320deg, rgba(0, 240, 255, 0.4) 360deg)',
              border: '2px dashed var(--primary-fixed-dim)',
              position: 'relative',
              animation: 'spin 4s linear infinite'
            }}>
               <div style={{ position: 'absolute', inset: '30px', border: '1px solid rgba(0,240,255,0.3)', borderRadius: '50%' }} />
               <div style={{ position: 'absolute', inset: '60px', border: '1px solid rgba(0,240,255,0.3)', borderRadius: '50%' }} />
               {/* Blips */}
               <div style={{ position: 'absolute', top: '40px', left: '120px', width: '8px', height: '8px', background: 'var(--color-critical)', borderRadius: '50%', boxShadow: '0 0 10px red' }} />
               <div style={{ position: 'absolute', top: '100px', left: '40px', width: '6px', height: '6px', background: 'var(--primary)', borderRadius: '50%', boxShadow: '0 0 10px var(--primary)' }} />
            </div>
         </div>
         <style>{`@keyframes spin { 100% { transform: rotate(360deg); } }`}</style>
      </DataCard>

    </div>
  );
}
