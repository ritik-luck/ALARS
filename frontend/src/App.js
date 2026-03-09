import React from 'react';
import Dashboard from './components/Dashboard';

function App() {
  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f4f6f9' }}>
      {/* Header */}
      <header style={{
        backgroundColor: '#1a237e',
        color: 'white',
        padding: '14px 28px',
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
      }}>
        <div style={{ fontSize: '22px' }}>🛡️</div>
        <div>
          <div style={{ fontSize: '18px', fontWeight: 'bold', lineHeight: 1.2 }}>
            ALARS
          </div>
          <div style={{ fontSize: '12px', opacity: 0.8 }}>
            Automated Log Analysis &amp; Incident Response System
          </div>
        </div>
      </header>

      {/* Main */}
      <main style={{ padding: '24px', maxWidth: '1100px', margin: '0 auto' }}>
        <Dashboard />
      </main>
    </div>
  );
}

export default App;
