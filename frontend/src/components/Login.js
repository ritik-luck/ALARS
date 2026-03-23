import React, { useState } from 'react';
import { login as apiLogin } from '../api';
import { setToken } from '../auth';

function Login({ onLogin }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      const res = await apiLogin(username, password);
      const { token } = res.data;
      setToken(token);
      onLogin();
    } catch (err) {
      setError(err.response?.data?.error || 'Login failed');
    }
  };

  return (
    <div className="login-screen">
      <form className="login-form" onSubmit={handleSubmit}>
        <h2>Sign in</h2>
        {error && <div className="form-error">{error}</div>}

        <label>
          Username
          <input value={username} onChange={(e) => setUsername(e.target.value)} />
        </label>

        <label>
          Password
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
        </label>

        <div className="login-actions">
          <button type="submit" className="button-primary">Sign in</button>
        </div>
      </form>
    </div>
  );
}

export default Login;
