import './DataCard.css';

/**
 * DataCard — HUD Panel stylized to match reference aesthetic
 */
export default function DataCard({
  title,
  subtitle,
  icon,
  children,
  variant = 'default',
  className = '',
  style = {},
  scanning = false,
}) {
  return (
    <div className={`data-card data-card--${variant} ${className}`} style={style}>
      
      {/* Corner Brackets */}
      <div className="data-card__brackets"></div>

      {scanning && <div className="data-card__scan-line" />}
      
      {/* Tab Header Structure */}
      {(title || icon) && (
        <div className="data-card__tab">
          <div className="data-card__tab-inner">
             {icon && <span className="material-symbols-outlined data-card__tab-icon">{icon}</span>}
             <h4 className="data-card__tab-title">{title}</h4>
          </div>
          {/* Angled cut on the right side of the tab */}
          <svg className="data-card__tab-angle" viewBox="0 0 20 30" preserveAspectRatio="none">
             <polygon points="0,0 10,0 20,30 0,30" fill="currentColor" />
          </svg>
        </div>
      )}
      
      <div className="data-card__body">{children}</div>
    </div>
  );
}
