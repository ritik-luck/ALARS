import React, { useState, useEffect } from 'react';
import Dashboard from './components/Dashboard';
import Login from './components/Login';
import { getToken, clearToken } from './auth';

function App() {
  const [authenticated, setAuthenticated] = useState(false);

  useEffect(() => {
    setAuthenticated(!!getToken());
  }, []);

  const handleLogin = () => setAuthenticated(true);
  const handleLogout = () => {
    clearToken();
    setAuthenticated(false);
  };

  return (
    <div className="app-shell">
      <header className="app-header">
        <div>
          <span className="app-header__eyebrow">ALARS</span>
          <h1 className="app-header__title">Log Monitoring Console</h1>
        </div>

        <p className="app-header__copy">
          Submit logs, review incidents, and inspect stored history.
        </p>
      </header>

      <main className="app-main">
        {authenticated ? (
          <>
            <div style={{ textAlign: 'right', marginBottom: 8 }}>
              <button className="button-ghost" onClick={handleLogout}>Sign out</button>
            </div>
            <Dashboard />
          </>
        ) : (
          <Login onLogin={handleLogin} />
        )}
      </main>
    </div>
  );
}

export default App;
