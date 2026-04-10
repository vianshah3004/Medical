import './GlowButton.css';

/**
 * GlowButton — Tactical trigger with bracket detail.
 * @param {'primary'|'ghost'|'danger'} variant
 */
export default function GlowButton({
  children,
  variant = 'primary',
  icon,
  onClick,
  disabled = false,
  fullWidth = false,
  type = 'button',
}) {
  return (
    <button
      type={type}
      className={`glow-btn glow-btn--${variant} ${fullWidth ? 'glow-btn--full' : ''}`}
      onClick={onClick}
      disabled={disabled}
    >
      {variant === 'primary' && <span className="glow-btn__bracket">[</span>}
      {icon && (
        <span className="material-symbols-outlined glow-btn__icon">{icon}</span>
      )}
      <span className="glow-btn__label">{children}</span>
      {variant === 'primary' && <span className="glow-btn__bracket">]</span>}
    </button>
  );
}
