import { DataCard, GlowButton, InputField } from '../../components/ui';

export default function Settings() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', maxWidth: '600px' }}>
      <DataCard title="SYSTEM PREFERENCES" icon="settings">
        <form style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <InputField label="Host Address" defaultValue="127.0.0.1:5173" />
          <InputField label="API Key" type="password" defaultValue="****************" />
          <GlowButton>SAVE PERMUTATIONS</GlowButton>
        </form>
      </DataCard>
    </div>
  );
}
