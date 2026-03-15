import React from 'react';
import Dashboard from './components/Dashboard';

function App() {
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
        <Dashboard />
      </main>
    </div>
  );
}

export default App;
