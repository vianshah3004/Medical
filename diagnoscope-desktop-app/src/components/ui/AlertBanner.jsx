import './AlertBanner.css';

/**
 * AlertBanner — Critical/warning alert strip.
 */
export default function AlertBanner({ severity = 'warning', icon = 'warning', children }) {
  return (
    <div className={`alert-banner alert-banner--${severity}`}>
      <span className="material-symbols-outlined alert-banner__icon">{icon}</span>
      <div className="alert-banner__content">{children}</div>
    </div>
  );
}
