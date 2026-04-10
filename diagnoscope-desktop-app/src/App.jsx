import { BrowserRouter, Routes, Route, Outlet, useLocation, NavLink } from 'react-router-dom';
import Sidebar from './components/layout/Sidebar';
import TopBar from './components/layout/TopBar';
import StatusBar from './components/layout/StatusBar';
import ProtectedRoute from './components/layout/ProtectedRoute';

import InitialLoader from './pages/InitialLoader/InitialLoader';
import LoginPage from './pages/Login/LoginPage';
import ScanView from './pages/ScanView/ScanView';
import CaseDashboard from './pages/CaseDashboard/CaseDashboard';
import ClinicalReport from './pages/ClinicalReport/ClinicalReport';
import DoctorVerification from './pages/DoctorVerification/DoctorVerification';
import DoctorDirectory from './pages/DoctorDirectory/DoctorDirectory';
import DoctorInbox from './pages/DoctorInbox/DoctorInbox';
import SecondOpinion from './pages/SecondOpinion/SecondOpinion';
import CredentialModal from './pages/CredentialModal/CredentialModal';

import SystemSync from './pages/SystemSync/SystemSync';
import Terminal from './pages/Terminal/Terminal';
import Security from './pages/Security/Security';
import UploadScan from './pages/UploadScan/UploadScan';
import Analytics from './pages/Analytics/Analytics';
import Settings from './pages/Settings/Settings';
import SystemStatus from './pages/SystemStatus/SystemStatus';

import './styles/global.css';

/* ── Route-to-Title Map ── */
const ROUTE_TITLES = {
  '/scan': 'NEURAL_SCAN',
  '/scans': 'SCAN_QUEUE',
  '/history': 'SCAN_HISTORY',
  '/doctors': 'DOCTOR_DIRECTORY',
  '/stats': 'ANALYTICS',
  '/metrics': 'BIO_METRICS',
  '/logs': 'CHRONO_LOGS',
  '/sync': 'SYSTEM_SYNC',
  '/terminal': 'TERMINAL',
  '/security': 'SECURITY',
  '/dashboard': 'DASHBOARD',
  '/upload': 'UPLOAD_SCAN',
  '/verification': 'DOCTOR_VERIFICATION',
  '/directory': 'DIRECTORY',
  '/inbox': 'INBOX',
  '/analytics': 'ANALYTICS',
  '/settings': 'SETTINGS',
  '/status': 'SYSTEM_STATUS',
  '/report': 'CLINICAL_REPORT',
  '/second-opinion': 'SECOND_OPINION',
};

/* ── Single Unified Hub Layout ── */
function HubLayout() {
  const location = useLocation();
  const title = ROUTE_TITLES[location.pathname] || 'CORE';

  const topTabs = [
    { label: 'ANALYSIS', path: '/scan' },
    { label: 'PACS', path: '/scans' },
    { label: 'NETWORK', path: '/stats' },
  ];

  return (
    <div className="app-layout">
      {/* Sidebar now lives on the right gracefully because of flex-direction: row-reverse */}
      <Sidebar />
      <div className="app-main">
        <TopBar title={title}>
           <nav className="topbar-nav">
             {topTabs.map((tab) => (
               <NavLink
                 key={tab.path}
                 to={tab.path}
                 className={({ isActive }) => `topbar-nav__tab ${isActive ? 'topbar-nav__tab--active' : ''}`}
               >
                 {tab.label}
               </NavLink>
             ))}
           </nav>
        </TopBar>
        <div className="page-content">
          <Outlet />
        </div>
        <StatusBar />
      </div>
    </div>
  );
}



export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Auth — No sidebar */}
        <Route path="/" element={<InitialLoader />} />
        <Route path="/auth" element={<LoginPage />} />
        <Route path="/credential-success" element={<CredentialModal />} />

        {/* Unified Hub views */}
        <Route element={<ProtectedRoute><HubLayout /></ProtectedRoute>}>
          <Route path="/dashboard" element={<CaseDashboard />} />
          <Route path="/scans" element={<UploadScan />} />
          <Route path="/doctors" element={<DoctorDirectory />} />
          <Route path="/history" element={<ClinicalReport />} />
          <Route path="/stats" element={<Analytics />} />
          <Route path="/settings" element={<Settings />} />
          
          {/* Detailed specific analysis views */}
          <Route path="/scan" element={<ScanView />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
