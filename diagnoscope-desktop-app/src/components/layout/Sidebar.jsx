import { NavLink } from 'react-router-dom';
import './Sidebar.css';

const NAV_ITEMS = [
  { icon: 'dashboard',   label: 'Dashboard', path: '/dashboard' },
  { icon: 'masks',       label: 'Scans',     path: '/scans' },
  { icon: 'lab_profile', label: 'Analysis',  path: '/scan' },
  { icon: 'group',       label: 'Doctors',   path: '/doctors' },
  { icon: 'history',     label: 'History',   path: '/history' },
  { icon: 'analytics',   label: 'Stats',     path: '/stats' },
  { icon: 'settings',    label: 'Settings',  path: '/settings' },
];

export default function Sidebar() {
  return (
    <aside className="sidebar sidebar--full">
      {/* Logo/Brand */}
      <div className="sidebar__brand">
        <div className="sidebar__brand-icon">
          <span className="material-symbols-outlined text-primary">cardiology</span>
        </div>
        <div className="sidebar__brand-text">
          <span className="sidebar__brand-name text-primary">DIAG_CORE</span>
          <span className="sidebar__brand-version text-muted">V_5.0</span>
        </div>
      </div>

      {/* Navigation */}
      <nav className="sidebar__nav">
        {NAV_ITEMS.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) =>
              `sidebar__link ${isActive ? 'sidebar__link--active' : ''}`
            }
          >
            <span className="sidebar__link-indicator" />
            <span className="material-symbols-outlined sidebar__link-icon">
              {item.icon}
            </span>
            <span className="sidebar__link-label">{item.label}</span>
          </NavLink>
        ))}
      </nav>

      {/* User Section */}
      <div className="sidebar__footer">
        <div className="sidebar__user">
          <div className="sidebar__user-avatar">
             <span className="material-symbols-outlined">person</span>
          </div>
          <div className="sidebar__user-info">
             <span className="sidebar__user-name text-primary">ADM_ARCHITECT</span>
             <span className="text-micro text-muted">Authorized</span>
          </div>
        </div>
        <NavLink to="/auth" className="sidebar__link sidebar__link--logout">
          <span className="material-symbols-outlined sidebar__link-icon">power_settings_new</span>
          <span className="sidebar__link-label">DISENGAGE</span>
        </NavLink>
      </div>
    </aside>
  );
}
