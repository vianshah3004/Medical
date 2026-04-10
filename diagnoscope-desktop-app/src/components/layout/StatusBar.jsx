import './StatusBar.css';

export default function StatusBar() {
  return (
    <footer className="statusbar">
      <div className="statusbar__left">
        <span className="statusbar__item">
          <span className="statusbar__dot statusbar__dot--ok" />
          CORE_VER_88.4
        </span>
        <span className="statusbar__item">LATENCY: 12MS</span>
        <span className="statusbar__item">NODE_ALPHA</span>
      </div>
      <div className="statusbar__center">
        <div className="statusbar__ticker">
          <span className="statusbar__ticker-text">
            SYS_INTEGRITY: 99.97% &nbsp;│&nbsp; ENCRYPTION: AES-256 &nbsp;│&nbsp;
            DATA_FLUX: 2.4 GB/S &nbsp;│&nbsp; SYNC_TOKEN: 0x99283AA &nbsp;│&nbsp;
            LOAD_BALANCER: OPTIMAL &nbsp;│&nbsp;
            SYS_INTEGRITY: 99.97% &nbsp;│&nbsp; ENCRYPTION: AES-256 &nbsp;│&nbsp;
            DATA_FLUX: 2.4 GB/S &nbsp;│&nbsp; SYNC_TOKEN: 0x99283AA &nbsp;│&nbsp;
            LOAD_BALANCER: OPTIMAL
          </span>
        </div>
      </div>
      <div className="statusbar__right">
        <span className="statusbar__item">AES-256_SIGNAL_LOCK</span>
        <span className="statusbar__item statusbar__item--time">
          {new Date().toLocaleTimeString('en-US', { hour12: false })}
        </span>
      </div>
    </footer>
  );
}
