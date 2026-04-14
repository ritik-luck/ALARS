import React, { useState, useEffect } from 'react';
import Dashboard from './components/Dashboard';
import Login from './components/Login';
import { getToken, getUser, clearToken } from './auth';

function App() {
  const [authenticated, setAuthenticated] = useState(() => !!getToken());
  const [currentUser, setCurrentUser] = useState(() => getUser());

  useEffect(() => {
    setAuthenticated(!!getToken());
    setCurrentUser(getUser());
  }, []);

  const handleLogin = (user) => {
    setAuthenticated(true);
    setCurrentUser(user || getUser());
  };

  const handleLogout = () => {
    clearToken();
    setAuthenticated(false);
    setCurrentUser(null);
  };

  return (
    <div className="app-shell">
      <header className="app-header">
        <div className="app-header__brand">
          <div className="logo-mark logo-mark--small">TL</div>
          <div>
            <span className="app-header__eyebrow">ThreatLens</span>
            <h1 className="app-header__title">Security Intelligence Console</h1>
          </div>
        </div>

        <p className="app-header__copy">
          A focused lens for live logs, incident response, and risk signals.
        </p>
      </header>

      <main className="app-main">
        {authenticated ? (
          <>
            <div className="session-bar">
              {currentUser && (
                <span className="session-bar__user">
                  Signed in as {currentUser.username} ({currentUser.role})
                </span>
              )}
              <button className="button-ghost" onClick={handleLogout}>Sign out</button>
            </div>
            <Dashboard currentUser={currentUser} />
          </>
        ) : (
          <Login onLogin={handleLogin} />
        )}
      </main>
    </div>
  );
}

export default App;
