import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { DataCard, GlowButton } from '../../components/ui';
import './ClinicalReport.css';

const mockHistory = [
  { id: 'SCN-0901', date: '2026-04-09', doc: 'Dr. S. Connor', status: 'CRITICAL', result: 'Hemorrhage Detected' },
  { id: 'SCN-0902', date: '2026-04-09', doc: 'Dr. M. Dyson', status: 'BENIGN', result: 'Normal Tissue' },
  { id: 'SCN-0888', date: '2026-04-08', doc: 'Dr. S. Connor', status: 'WARN', result: 'Minor Ischemia' },
];

export default function ClinicalReport() {
  const navigate = useNavigate();
  const [filter, setFilter] = useState('ALL');

  return (
    <div className="clinical-report" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <div className="clinical-report__header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2 className="text-primary" style={{ margin: 0 }}>SCAN HISTORY DB</h2>
        
        <div className="clinical-report__actions" style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
          {['ALL', 'CRITICAL', 'BENIGN'].map(f => (
             <button 
               key={f}
               onClick={() => setFilter(f)}
               className="btn" 
               style={{ opacity: filter === f ? 1 : 0.5 }}
             >
               {f}
             </button>
          ))}
        </div>
      </div>

      <DataCard title="CHRONOLOGICAL LOGS" icon="history">
        <div style={{ width: '100%', overflowX: 'auto' }}>
        <table style={{ width: '100%', minWidth: '920px', borderCollapse: 'collapse', textAlign: 'left', color: 'var(--on-surface-variant)' }}>
           <thead>
             <tr style={{ borderBottom: '1px solid var(--outline-variant)' }}>
               <th style={{ padding: '1rem', color: 'var(--primary)' }}>SCAN ID</th>
               <th style={{ padding: '1rem', color: 'var(--primary)' }}>DATE</th>
               <th style={{ padding: '1rem', color: 'var(--primary)' }}>OPERATOR</th>
               <th style={{ padding: '1rem', color: 'var(--primary)' }}>RESULT</th>
               <th style={{ padding: '1rem', color: 'var(--primary)' }}>STATUS</th>
               <th style={{ padding: '1rem', color: 'var(--primary)' }}>ACTION</th>
             </tr>
           </thead>
           <tbody>
             {mockHistory.filter(h => filter === 'ALL' || h.status === filter).map(h => (
               <tr key={h.id} style={{ borderBottom: '1px solid rgba(0, 240, 255, 0.1)' }}>
                 <td style={{ padding: '1rem', fontFamily: 'var(--font-mono)', color: 'var(--primary)' }}>{h.id}</td>
                 <td style={{ padding: '1rem', fontFamily: 'var(--font-mono)' }}>{h.date}</td>
                 <td style={{ padding: '1rem' }}>{h.doc}</td>
                 <td style={{ padding: '1rem' }}>{h.result}</td>
                 <td style={{ padding: '1rem' }}>
                    <span style={{ 
                      color: h.status === 'CRITICAL' ? 'var(--color-critical)' : h.status === 'WARN' ? 'var(--color-pending)' : 'var(--color-stable)',
                    }}>
                       {h.status}
                    </span>
                 </td>
                 <td style={{ padding: '1rem' }}>
                    <GlowButton onClick={() => navigate('/scan')} variant="outline" style={{ padding: '4px 12px', fontSize: '10px' }}>OPEN ANALYSIS</GlowButton>
                 </td>
               </tr>
             ))}
           </tbody>
         </table>
         </div>
      </DataCard>
    </div>
  );
}
