import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { isAuthenticated } from '../../services/auth';
import './InitialLoader.css';

export default function InitialLoader() {
  const navigate = useNavigate();
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    let current = 0;
    const interval = setInterval(() => {
      current += Math.random() * 8 + 2;
      if (current >= 100) {
        current = 100;
        clearInterval(interval);
        // Add a slight delay before transitioning
        setTimeout(() => {
            navigate(isAuthenticated() ? '/dashboard' : '/auth');
        }, 800);
      }
      setProgress(current);
    }, 150);
    return () => clearInterval(interval);
  }, [navigate]);

  return (
    <div className="initial-loader">
      <div className="initial-loader__backdrop"></div>
      <div className="initial-loader__content">
        <h1 className="initial-loader__title flicker-text">AI Medical Diagnosis System</h1>
        <h2 className="initial-loader__subtitle text-primary">INITIALIZING...</h2>
        
        <div className="initial-loader__progress-box">
          <div className="initial-loader__progress-bar" style={{ width: `${progress}%` }}></div>
        </div>
        
        <p className="initial-loader__subtext">Please wait... {Math.floor(progress)}%</p>
      </div>
    </div>
  );
}
