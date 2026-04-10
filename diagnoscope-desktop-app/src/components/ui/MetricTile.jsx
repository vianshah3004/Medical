import './MetricTile.css';

/**
 * MetricTile — Displays a single KPI/metric with label and value.
 */
export default function MetricTile({ label, value, unit, trend, status = 'default' }) {
  return (
    <div className={`metric-tile metric-tile--${status}`}>
      <span className="metric-tile__label">{label}</span>
      <div className="metric-tile__value-row">
        <span className="metric-tile__value">{value}</span>
        {unit && <span className="metric-tile__unit">{unit}</span>}
      </div>
      {trend && (
        <span className={`metric-tile__trend metric-tile__trend--${trend > 0 ? 'up' : 'down'}`}>
          {trend > 0 ? '▲' : '▼'} {Math.abs(trend)}%
        </span>
      )}
    </div>
  );
}
