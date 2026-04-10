import './StatusChip.css';

/**
 * StatusChip — Data status tag with left-edge color accent.
 * @param {'stable'|'critical'|'pending'|'active'|'muted'} status
 */
export default function StatusChip({ label, status = 'stable', icon }) {
  return (
    <span className={`status-chip status-chip--${status}`}>
      {icon && (
        <span className="material-symbols-outlined status-chip__icon">{icon}</span>
      )}
      <span className="status-chip__label">{label}</span>
    </span>
  );
}
