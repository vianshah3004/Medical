import { useEffect, useState } from 'react';
import { DataCard, GlowButton, InputField } from '../../components/ui';
import { createDoctor, listDoctors } from '../../services/api';

const DOCTOR_SPECIALTIES = [
  { value: 'all', label: 'All Scans' },
  { value: 'brain_tumor', label: 'Brain Tumor' },
  { value: 'fracture', label: 'Fracture' },
  { value: 'diabetic_retinopathy', label: 'Diabetic Retinopathy' },
  { value: 'ecg', label: 'ECG' },
  { value: 'pneumonia', label: 'Pneumonia' },
  { value: 'skin_lesion', label: 'Skin Lesion' },
];

export default function DoctorDirectory() {
  const [doctors, setDoctors] = useState([]);
  const [showAdd, setShowAdd] = useState(false);
  const [newDoc, setNewDoc] = useState({ name: '', license: '', email: '', specialty: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const loadDoctors = async () => {
    try {
      const payload = await listDoctors();
      setDoctors(payload?.data || []);
    } catch (err) {
      setError(err.message || 'Failed to load doctors');
    }
  };

  useEffect(() => {
    loadDoctors();
  }, []);

  const handleVerify = async () => {
    setLoading(true);
    setError('');
    try {
      await createDoctor({
        name: newDoc.name,
        email: newDoc.email,
        specialty: newDoc.specialty || undefined,
        licenseId: newDoc.license || undefined,
      });
      await loadDoctors();
      setShowAdd(false);
      setNewDoc({ name: '', license: '', email: '', specialty: '' });
      alert(`DOCTOR CREATED. Credentials dispatched to ${newDoc.email}`);
    } catch (err) {
      setError(err.message || 'Failed to create doctor');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2 className="text-primary" style={{ margin: 0 }}>MEDICAL STAFF DB</h2>
        <GlowButton onClick={() => setShowAdd(!showAdd)}>
          {showAdd ? 'CANCEL' : '➕ ADD DOCTOR'}
        </GlowButton>
      </div>

      {error ? (
        <p className="text-micro" style={{ color: 'var(--color-critical)' }}>{error}</p>
      ) : null}

      {showAdd && (
        <DataCard title="NEW DOCTOR REGISTRATION" icon="person_add">
           <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'flex-end' }}>
              <div style={{ flex: 1, minWidth: '200px' }}>
                <InputField label="Name" value={newDoc.name} onChange={e => setNewDoc({...newDoc, name: e.target.value})} placeholder="Dr. Full Name" />
              </div>
              <div style={{ flex: 1, minWidth: '200px' }}>
                <InputField label="License Number" value={newDoc.license} onChange={e => setNewDoc({...newDoc, license: e.target.value})} placeholder="MD-XXXXXX" />
              </div>
              <div style={{ flex: 1, minWidth: '200px' }}>
                <InputField label="Email" value={newDoc.email} onChange={e => setNewDoc({...newDoc, email: e.target.value})} placeholder="doctor@hospital.com" />
              </div>
              <div style={{ flex: 1, minWidth: '200px' }}>
                <label className="text-micro" htmlFor="doctor-specialty">Specialty</label>
                <select
                  id="doctor-specialty"
                  value={newDoc.specialty}
                  onChange={e => setNewDoc({ ...newDoc, specialty: e.target.value })}
                  style={{
                    width: '100%',
                    marginTop: '0.5rem',
                    padding: '0.75rem',
                    background: 'rgba(0,0,0,0.4)',
                    color: '#fff',
                    border: '1px solid rgba(0,240,255,0.3)',
                  }}
                >
                  <option value="">Select Specialty</option>
                  {DOCTOR_SPECIALTIES.map((item) => (
                    <option key={item.value} value={item.value}>{item.label}</option>
                  ))}
                </select>
              </div>
              <div style={{ marginTop: '1rem' }}>
                 <GlowButton onClick={handleVerify} disabled={!newDoc.name || !newDoc.license || !newDoc.email || loading}>
                   {loading ? 'VERIFYING...' : 'VERIFY DOCTOR'}
                 </GlowButton>
              </div>
           </div>
        </DataCard>
      )}

      <DataCard title="REGISTERED PERSONNEL" icon="group">
         <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', color: 'var(--on-surface-variant)' }}>
           <thead>
             <tr style={{ borderBottom: '1px solid var(--outline-variant)' }}>
               <th style={{ padding: '1rem', color: 'var(--primary)' }}>NAME</th>
               <th style={{ padding: '1rem', color: 'var(--primary)' }}>LICENSE</th>
               <th style={{ padding: '1rem', color: 'var(--primary)' }}>EMAIL</th>
               <th style={{ padding: '1rem', color: 'var(--primary)' }}>SPECIALTY</th>
               <th style={{ padding: '1rem', color: 'var(--primary)' }}>STATUS</th>
             </tr>
           </thead>
           <tbody>
             {doctors.map(d => (
               <tr key={d.id} style={{ borderBottom: '1px solid rgba(0, 240, 255, 0.1)' }}>
                 <td style={{ padding: '1rem' }}>{d.name}</td>
                 <td style={{ padding: '1rem', fontFamily: 'var(--font-mono)' }}>{d.licenseId || '-'}</td>
                 <td style={{ padding: '1rem' }}>{d.email}</td>
                 <td style={{ padding: '1rem' }}>{String(d.specialty || '-').replace(/_/g, ' ').toUpperCase()}</td>
                 <td style={{ padding: '1rem' }}>
                    <span style={{ 
                      color: String(d.status || '').toUpperCase() === 'VERIFIED' ? 'var(--color-stable)' : 'var(--color-pending)',
                      border: `1px solid ${String(d.status || '').toUpperCase() === 'VERIFIED' ? 'var(--color-stable)' : 'var(--color-pending)'}`,
                      padding: '4px 8px', fontSize: '12px'
                    }}>
                       {String(d.status || 'PENDING').toUpperCase()}
                    </span>
                 </td>
               </tr>
             ))}
             {!doctors.length ? (
               <tr>
                 <td colSpan={5} style={{ padding: '1rem', color: 'var(--on-surface-variant)' }}>No doctors found.</td>
               </tr>
             ) : null}
           </tbody>
         </table>
      </DataCard>
    </div>
  );
}
