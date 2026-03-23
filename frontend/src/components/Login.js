import React, { useState } from 'react';
import { login as apiLogin } from '../api';
import { setToken } from '../auth';

function Login({ onLogin }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await apiLogin(username, password);
      const { token } = res.data;
      setToken(token);
      onLogin();
    } catch (err) {
      setError(err.response?.data?.error || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-viewport">
      <div className="login-card">
        <div className="login-brand">
          <div className="logo-mark">AL</div>
          <div>
            <div className="brand-title">ALARS</div>
            <div className="brand-sub">Log Analysis & Incident Response</div>
          </div>
        </div>

        <form className="login-form-advanced" onSubmit={handleSubmit}>
          <h2 className="login-heading">Sign in to your account</h2>

          {error && <div className="message message--error">{error}</div>}

          <div className="field">
            <label className="field__label">Username</label>
            <input
              className="text-input"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Enter your username"
              required
            />
          </div>

          <div className="field">
            <label className="field__label">Password</label>
            <input
              className="text-input"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
            />
          </div>

          <div className="button-row" style={{ justifyContent: 'space-between' }}>
            <button type="submit" className="button-primary" disabled={loading}>
              {loading ? 'Signing in...' : 'Sign in'}
            </button>
            <button
              type="button"
              className="button-ghost"
              onClick={() => { setUsername(''); setPassword(''); setError(''); }}
            >
              Reset
            </button>
          </div>

          <div className="login-hint">
            Need an account? Ask your admin to create one.
          </div>
        </form>
      </div>

      <div className="login-visual">
        <svg viewBox="0 0 800 600" preserveAspectRatio="xMidYMid slice" aria-hidden>
          <defs>
            <linearGradient id="g1" x1="0" x2="1">
              <stop offset="0%" stopColor="#34d17b" stopOpacity="0.9" />
              <stop offset="100%" stopColor="#8fc2ff" stopOpacity="0.9" />
            </linearGradient>
          </defs>
          <rect width="800" height="600" fill="url(#g1)" opacity="0.12" />
          <g fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="2">
            <circle cx="120" cy="100" r="80" />
            <circle cx="360" cy="220" r="140" />
            <circle cx="640" cy="80" r="60" />
          </g>
        </svg>
      </div>
    </div>
  );
}

export default Login;
