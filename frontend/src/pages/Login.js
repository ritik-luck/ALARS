import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Lock } from 'lucide-react';

const Login = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await login(username, password);
      navigate('/');
    } catch (err) {
      setError('Invalid username or password');
    }
  };

  return (
    <div style={{ display: 'flex', height: '100vh', alignItems: 'center', justifyContent: 'center' }}>
      <div className="surface" style={{ padding: '2.5rem', width: '100%', maxWidth: '400px' }}>
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1.5rem' }}>
          <div style={{ background: 'var(--brand-soft)', padding: '1rem', borderRadius: '50%' }}>
            <Lock size={32} color="var(--brand)" />
          </div>
        </div>
        <h2 style={{ textAlign: 'center', marginBottom: '2rem', fontSize: '1.5rem', fontWeight: 'bold' }}>Sign in to ALARS</h2>
        {error && <div className="message message--error" style={{ marginBottom: '1.5rem', textAlign: 'center' }}>{error}</div>}
        <form onSubmit={handleSubmit}>
          <div className="field">
            <label className="field__label">Username</label>
            <input 
              type="text" 
              value={username} 
              onChange={(e) => setUsername(e.target.value)}
              className="text-input"
              required
            />
          </div>
          <div className="field" style={{ marginBottom: '2rem' }}>
            <label className="field__label">Password</label>
            <input 
              type="password" 
              value={password} 
              onChange={(e) => setPassword(e.target.value)}
              className="text-input"
              required
            />
          </div>
          <button type="submit" className="button-primary" style={{ width: '100%' }}>
            Sign In
          </button>
        </form>
        <div style={{ marginTop: '2rem', textAlign: 'center', color: 'var(--muted)', fontSize: '0.875rem' }}>
          Test Accounts: admin/admin123, analyst/analyst123
        </div>
      </div>
    </div>
  );
};

export default Login;
