import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { GlowButton, InputField } from '../../components/ui';
import { login, signup } from '../../services/api';
import { setToken } from '../../services/auth';
import './LoginPage.css';

export default function LoginPage() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('LOGIN'); // 'LOGIN' | 'SIGNUP'
  const [signupType, setSignupType] = useState('LAB'); // 'LAB' | 'HOSPITAL'
  const [signupStep, setSignupStep] = useState(1); // 1 or 2
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [loginForm, setLoginForm] = useState({ email: '', password: '' });
  const [signupStepOne, setSignupStepOne] = useState({
    orgName: '',
    orgReg: '',
    orgAddress: '',
    orgLocation: '',
  });
  const [signupStepTwo, setSignupStepTwo] = useState({
    name: '',
    email: '',
    password: '',
  });

  const updateLoginForm = (key) => (e) => {
    setLoginForm((prev) => ({ ...prev, [key]: e.target.value }));
  };

  const updateSignupStepOne = (key) => (e) => {
    setSignupStepOne((prev) => ({ ...prev, [key]: e.target.value }));
  };

  const updateSignupStepTwo = (key) => (e) => {
    setSignupStepTwo((prev) => ({ ...prev, [key]: e.target.value }));
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const payload = await login({
        email: loginForm.email,
        password: loginForm.password,
      });
      setToken(payload?.data?.token || payload?.token);
      navigate('/dashboard');
    } catch (err) {
      setError(err.message || 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  const handleSignup = async (e) => {
    e.preventDefault();
    const normalizedOrgName = signupStepOne.orgName.trim();
    const normalizedName = signupStepTwo.name.trim();
    const normalizedEmail = signupStepTwo.email.trim();

    if (normalizedOrgName.length < 2) {
      setError('orgName: Organization name is required');
      return;
    }

    setLoading(true);
    setError('');
    try {
      const payload = await signup({
        orgName: normalizedOrgName,
        orgType: signupType.toLowerCase(),
        name: normalizedName,
        email: normalizedEmail,
        password: signupStepTwo.password,
      });
      setToken(payload?.data?.token || payload?.token);
      navigate('/dashboard');
    } catch (err) {
      setError(err.message || 'Signup failed');
    } finally {
      setLoading(false);
    }
  };

  const renderLogin = () => (
    <form className="auth-form" onSubmit={handleLogin}>
      <p className="text-micro" style={{ marginBottom: '1rem', color: 'var(--color-critical)' }}>
        [ Authorized Lab / Hospital Access Only ]
      </p>
      <InputField
        label="Email"
        id="login-email"
        placeholder="lab@hospital.com"
        icon="mail"
        value={loginForm.email}
        onChange={updateLoginForm('email')}
        required
      />
      <InputField
        label="Password"
        id="login-password"
        type="password"
        placeholder="••••••••••"
        icon="key"
        value={loginForm.password}
        onChange={updateLoginForm('password')}
        required
      />
      
      <div style={{ marginTop: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <GlowButton type="submit" fullWidth disabled={loading}>
          {loading ? 'AUTHENTICATING...' : 'ACCESS SYSTEM'}
        </GlowButton>
        
        <a 
          href="#"
          onClick={(e) => { e.preventDefault(); setActiveTab('SIGNUP'); setSignupStep(1); }}
          className="text-micro"
          style={{ display: 'inline-block', textAlign: 'center', color: 'var(--primary-fixed-dim)', textDecoration: 'none', marginTop: '0.5rem', letterSpacing: '2px' }}
        >
          [ NO ACCESS? REQUEST CREDENTIALS ]
        </a>
      </div>
    </form>
  );

  const renderSignupStep1 = () => (
    <div className="auth-form">
      <InputField
        label={`${signupType === 'LAB' ? 'Lab' : 'Hospital'} Name`}
        id="org-name"
        placeholder="Official Name"
        icon="badge"
        value={signupStepOne.orgName}
        onChange={updateSignupStepOne('orgName')}
        required
      />
      <InputField
        label="Registration Number"
        id="org-reg"
        placeholder="Reg No."
        icon="tag"
        value={signupStepOne.orgReg}
        onChange={updateSignupStepOne('orgReg')}
      />
      <InputField
        label="Address"
        id="org-addr"
        placeholder="Street Address"
        icon="location_on"
        value={signupStepOne.orgAddress}
        onChange={updateSignupStepOne('orgAddress')}
      />
      <InputField
        label="Location"
        id="org-loc"
        placeholder="City / State"
        icon="map"
        value={signupStepOne.orgLocation}
        onChange={updateSignupStepOne('orgLocation')}
      />
      <div style={{ marginTop: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
         <GlowButton fullWidth onClick={() => setSignupStep(2)} disabled={!signupStepOne.orgName}>
           VERIFY ORGANIZATION
         </GlowButton>
         <a 
          href="#" 
          onClick={(e) => { e.preventDefault(); setActiveTab('LOGIN'); }}
          className="text-micro" 
          style={{ display: 'inline-block', textAlign: 'center', color: 'var(--primary-fixed-dim)', textDecoration: 'none', letterSpacing: '2px' }}
         >
           [ RETURN TO SECURE LOGIN ]
         </a>
      </div>
    </div>
  );

  const renderSignupStep2 = () => (
      <form className="auth-form" onSubmit={handleSignup}>
       <p className="text-muted text-micro" style={{ marginBottom: '1rem' }}>ORGANIZATION VERIFIED. CREATE OPERATOR CREDENTIALS.</p>
       <InputField
         label="Admin Name"
         id="reg-name"
         placeholder="Authorized operator"
         icon="person"
         value={signupStepTwo.name}
         onChange={updateSignupStepTwo('name')}
         required
       />
       <InputField
         label="Admin Email"
         id="reg-email"
         placeholder="admin@hospital.com"
         icon="mail"
         value={signupStepTwo.email}
         onChange={updateSignupStepTwo('email')}
         required
       />
       <InputField
         label="Password"
         id="reg-password"
         type="password"
         placeholder="••••••••••"
         icon="key"
         value={signupStepTwo.password}
         onChange={updateSignupStepTwo('password')}
         required
       />
       <div style={{ marginTop: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <GlowButton fullWidth type="submit" disabled={loading}>
            {loading ? 'CREATING ACCOUNT...' : 'CREATE SYSTEM ACCESS'}
          </GlowButton>
          <a 
           href="#" 
           onClick={(e) => { e.preventDefault(); setActiveTab('LOGIN'); }}
           className="text-micro" 
           style={{ display: 'inline-block', textAlign: 'center', color: 'var(--primary-fixed-dim)', textDecoration: 'none', letterSpacing: '2px' }}
          >
            [ CANCEL REQUEST ]
          </a>
       </div>
      </form>
  );

  const renderSignup = () => (
    <div className="signup-flow">
      {signupStep === 1 && (
        <div className="signup-tabs" style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem' }}>
          <button 
            type="button" 
            className={`tab-btn ${signupType === 'LAB' ? 'active' : ''}`}
            onClick={() => setSignupType('LAB')}
          >
            LAB SIGNUP
          </button>
          <button 
            type="button" 
            className={`tab-btn ${signupType === 'HOSPITAL' ? 'active' : ''}`}
            onClick={() => setSignupType('HOSPITAL')}
          >
            HOSPITAL SIGNUP
          </button>
        </div>
      )}
      
      {signupStep === 1 ? renderSignupStep1() : renderSignupStep2()}
    </div>
  );

  return (
    <div className="login-page">
      <div className="login-page__content hud-box" style={{ 
          position: 'relative', 
          border: '1px solid rgba(0, 240, 255, 0.4)', 
          background: 'rgba(0, 5, 8, 0.8)', 
          padding: '3rem 2.5rem', 
          width: '100%', 
          maxWidth: '480px' 
      }}>
        <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
           <h1 style={{ margin: 0, fontFamily: 'var(--font-display)', fontSize: '3rem', color: '#fff', textShadow: '0 0 10px rgba(0,240,255,0.8)' }}>Yitu</h1>
           <h2 className="text-primary" style={{ marginTop: '0', letterSpacing: '4px' }}>HEALTHCARE</h2>
        </div>

        {error ? (
          <p className="text-micro" style={{ color: 'var(--color-critical)', marginBottom: '1rem', textAlign: 'center' }}>
            {error}
          </p>
        ) : null}

        {activeTab === 'LOGIN' ? renderLogin() : renderSignup()}
      </div>
    </div>
  );
}
