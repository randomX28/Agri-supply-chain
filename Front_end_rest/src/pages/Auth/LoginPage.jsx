import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../AuthContext';
import { supabase } from '../../supabaseClient';

export default function LoginPage() {
  const [isSignIn, setIsSignIn] = useState(true);
  const [role, setRole] = useState('farmer');
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');
  
  const [errorMsg, setErrorMsg] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { isAuthenticated, role: authRole, getAuthHeaders } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    // If they land on this page but are already logged in, send them to dashboard
    if (isAuthenticated) {
      const target = (authRole === 'admin' || authRole === 'auditor') ? '/admin' : '/dashboard';
      navigate(target, { replace: true });
    }
  }, [isAuthenticated, authRole, navigate]);

  const toggleMode = (mode) => {
    setIsSignIn(mode === 'signin');
    setErrorMsg('');
  };

  const handleSignIn = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    
    if (!email || !password) {
      setErrorMsg('Please enter email and password.');
      return;
    }

    setIsSubmitting(true);
    const { error: authErr, data } = await supabase.auth.signInWithPassword({ email, password });
    
    if (authErr) {
      setErrorMsg(authErr.message);
      setIsSubmitting(false);
      return;
    }
    
    if (data?.user?.user_metadata?.status === "inactive") {
      await supabase.auth.signOut();
      setErrorMsg("Your account has been deactivated by an administrator.");
      setIsSubmitting(false);
      return;
    }
    
    // AuthContext subscriber will pick up the session and navigate via AppLayout
  };

  const handleSignUp = async (e) => {
    e.preventDefault();
    setErrorMsg('');

    if (!fullName || !email || !password) {
      setErrorMsg('Please fill out all required fields.');
      return;
    }
    if (password.length < 6) {
      setErrorMsg('Password must be at least 6 characters.');
      return;
    }
    if (password !== passwordConfirm) {
      setErrorMsg('Passwords do not match.');
      return;
    }

    setIsSubmitting(true);
    const { error: authErr } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: fullName, role: role }
      }
    });

    if (authErr) {
      setErrorMsg(authErr.message);
      setIsSubmitting(false);
    }
    // Success -> AuthContext redirects
  };

  return (
    <div className="login-page">
      <div className="login-bg">
        <div className="orb orb1"></div>
        <div className="orb orb2"></div>
        <div className="orb orb3"></div>
        <div className="grid-overlay"></div>
      </div>

      <div className="login-panel">
        <div className="lp-brand">
          <div className="lp-hex">
            <svg viewBox="0 0 40 40" width="42" height="42">
              <polygon points="20,2 37,11 37,29 20,38 3,29 3,11" fill="none" stroke="#84cc16" strokeWidth="1.8" />
              <polygon points="20,9 30,14.5 30,25.5 20,31 10,25.5 10,14.5" fill="none" stroke="#84cc16" strokeWidth="1" opacity="0.4" />
              <circle cx="20" cy="20" r="4.5" fill="#84cc16" />
            </svg>
          </div>
          <div className="lp-brand-text">
            <div className="lp-name">AgriChain</div>
            <div className="lp-sub">Supply Chain Intelligence</div>
          </div>
        </div>

        <div className="auth-toggle">
          <button type="button" className={`auth-tab ${isSignIn ? 'active' : ''}`} onClick={() => toggleMode('signin')}>Sign In</button>
          <button type="button" className={`auth-tab ${!isSignIn ? 'active' : ''}`} onClick={() => toggleMode('signup')}>Sign Up</button>
        </div>

        {isSignIn ? (
          <form onSubmit={handleSignIn}>
            <h1 className="lp-title">Welcome back</h1>
            <p className="lp-desc">Sign in — your role is automatically loaded from your account</p>

            <div className="lp-fields">
              <div className="lp-field">
                <label className="lp-label">Email <span className="lp-req">*</span></label>
                <input className="lp-input" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="e.g. rajesh@example.com" />
              </div>
              <div className="lp-field">
                <label className="lp-label">Password <span className="lp-req">*</span></label>
                <div className="pw-wrap">
                  <input className="lp-input" type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Enter your password" />
                </div>
              </div>
            </div>

            <button type="submit" className="lp-btn" disabled={isSubmitting}>
              <span>{isSubmitting ? 'Signing in...' : 'Sign In'}</span>
              <span className="lb-arrow">→</span>
            </button>
            {errorMsg && <div className="login-error">{errorMsg}</div>}

            <div className="auth-switch-hint">
              New to AgriChain? <button type="button" className="auth-switch-link" onClick={() => toggleMode('signup')}>Create an account</button>
            </div>
          </form>
        ) : (
          <form onSubmit={handleSignUp}>
            <h1 className="lp-title">Create account</h1>
            <p className="lp-desc">Register to get started on AgriChain</p>

            <div className="lp-section-label">Your Role</div>
            <div className="role-grid">
              <button type="button" className={`role-pill ${role === 'farmer' ? 'active' : ''}`} onClick={() => setRole('farmer')}>
                <span className="rp-icon">🌱</span><span className="rp-name">Farmer</span><span className="rp-check">✓</span>
              </button>
              <button type="button" className={`role-pill ${role === 'warehouse' ? 'active' : ''}`} onClick={() => setRole('warehouse')}>
                <span className="rp-icon">🏭</span><span className="rp-name">Warehouse</span><span className="rp-check">✓</span>
              </button>
              <button type="button" className={`role-pill ${role === 'transport' ? 'active' : ''}`} onClick={() => setRole('transport')}>
                <span className="rp-icon">🚚</span><span className="rp-name">Transport</span><span className="rp-check">✓</span>
              </button>
              <button type="button" className={`role-pill ${role === 'inspector' ? 'active' : ''}`} onClick={() => setRole('inspector')}>
                <span className="rp-icon">🔬</span><span className="rp-name">Inspector</span><span className="rp-check">✓</span>
              </button>
              <button type="button" className={`role-pill ${role === 'buyer' ? 'active' : ''}`} onClick={() => setRole('buyer')}>
                <span className="rp-icon">🛒</span><span className="rp-name">Buyer</span><span className="rp-check">✓</span>
              </button>
              <button type="button" className={`role-pill ${role === 'admin' ? 'active' : ''}`} onClick={() => setRole('admin')} style={{ borderColor: role === 'admin' ? '#f43f5e' : 'var(--border)'}}>
                <span className="rp-icon" style={{ backgroundColor: role === 'admin' ? '#f43f5e22' : ''}}>👑</span><span className="rp-name">Admin</span><span className="rp-check">✓</span>
              </button>
            </div>

            <div className="lp-fields">
              <div className="lp-field">
                <label className="lp-label">Full Name <span className="lp-req">*</span></label>
                <input className="lp-input" type="text" value={fullName} onChange={e => setFullName(e.target.value)} placeholder="e.g. Rajesh Kumar" />
              </div>
              <div className="lp-field">
                <label className="lp-label">Email <span className="lp-req">*</span></label>
                <input className="lp-input" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="e.g. rajesh@example.com" />
              </div>
              <div className="lp-field">
                <label className="lp-label">Password <span className="lp-req">*</span></label>
                <div className="pw-wrap">
                  <input className="lp-input" type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Create a password (min 6 chars)" />
                </div>
              </div>
              <div className="lp-field">
                <label className="lp-label">Confirm Password <span className="lp-req">*</span></label>
                <div className="pw-wrap">
                  <input className="lp-input" type="password" value={passwordConfirm} onChange={e => setPasswordConfirm(e.target.value)} placeholder="Re-enter your password" />
                </div>
              </div>
            </div>

            <button type="submit" className="lp-btn" disabled={isSubmitting}>
              <span>{isSubmitting ? 'Creating Account...' : 'Create Account'}</span>
              <span className="lb-arrow">→</span>
            </button>
            {errorMsg && <div className="login-error">{errorMsg}</div>}

            <div className="auth-switch-hint">
              Already have an account? <button type="button" className="auth-switch-link" onClick={() => toggleMode('signin')}>Sign in</button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
