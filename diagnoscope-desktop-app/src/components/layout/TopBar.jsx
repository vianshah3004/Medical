import { useLocation } from 'react-router-dom';
import './TopBar.css';

export default function TopBar({ title, children }) {
  const location = useLocation();

  return (
    <header className="topbar">
      <div className="topbar__left">
        <div className="topbar__breadcrumb">
          <span className="topbar__system-id">DIAGNOSCOPE //</span>
          <span className="topbar__separator">&gt;</span>
          <span className="topbar__page-title">{title || 'CORE'}</span>
        </div>
      </div>

      <div className="topbar__center">
        {children}
      </div>

      <div className="topbar__right">
        <div className="topbar__coord text-micro">
          34.0522° N, 118.2437° W
        </div>
        <div className="topbar__status-pill">
          <span className="topbar__status-dot" />
          <span className="topbar__status-text">OPERATIONAL</span>
        </div>
        <button className="topbar__icon-btn" title="Alerts">
          <span className="material-symbols-outlined">notifications</span>
        </button>
        <button className="topbar__icon-btn" title="Terminal">
          <span className="material-symbols-outlined">terminal</span>
        </button>
      </div>
    </header>
  );
}
