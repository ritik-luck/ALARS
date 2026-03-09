import React, { useState } from 'react';
import { submitLog } from '../api';

// Maps risk level to a display color
const RISK_COLORS = {
  CRITICAL: '#d32f2f',
  HIGH:     '#e65100',
  MEDIUM:   '#f57f17',
  LOW:      '#388e3c',
};

// Sample log messages for the demo hint box
const SAMPLES = [
  'ERROR: Database connection timed out after 30s',
  'CRITICAL: Memory usage exceeded 95% — system unstable',
  'FAIL: Authentication service is unavailable',
  'WARNING: Disk usage at 80% on /dev/sda1',
  'INFO: User admin logged in successfully',
];

function LogUpload({ onLogSubmitted }) {
  const [message, setMessage]   = useState('');
  const [source,  setSource]    = useState('');
  const [result,  setResult]    = useState(null);
  const [loading, setLoading]   = useState(false);
  const [error,   setError]     = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!message.trim()) return;

    setLoading(true);
    setError('');
    setResult(null);

    try {
      const res = await submitLog(message.trim(), source.trim() || 'manual');
      setResult(res.data);
      setMessage('');
      if (onLogSubmitted) onLogSubmitted();
    } catch {
      setError('Could not reach the backend. Make sure the Node.js server is running on port 5000.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={card}>
      <h2 style={heading}>Submit Log Entry</h2>

      <form onSubmit={handleSubmit}>
        {/* Message */}
        <div style={fieldWrap}>
          <label style={label}>Log Message *</label>
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder='e.g. "ERROR: Database connection failed"'
            rows={3}
            style={textarea}
            required
          />
        </div>

        {/* Source */}
        <div style={fieldWrap}>
          <label style={label}>Source (optional)</label>
          <input
            type="text"
            value={source}
            onChange={(e) => setSource(e.target.value)}
            placeholder="e.g. web-server, auth-service, scheduler"
            style={input}
          />
        </div>

        <button type="submit" disabled={loading} style={loading ? btnDisabled : btn}>
          {loading ? 'Processing…' : 'Submit Log'}
        </button>
      </form>

      {/* Error */}
      {error && (
        <div style={{ marginTop: '12px', color: '#d32f2f', fontSize: '13px' }}>
          ⚠️ {error}
        </div>
      )}

      {/* Success result */}
      {result && (
        <div style={{ marginTop: '16px', padding: '14px', backgroundColor: '#e8f5e9', borderRadius: '6px', fontSize: '14px' }}>
          <div>✅ <strong>Log stored</strong> (ID: {result.log.id}) — source: <em>{result.log.source}</em></div>

          {result.incident ? (
            <div style={{ marginTop: '10px' }}>
              🚨 <strong>Incident created</strong> — Risk Level:{' '}
              <span style={{ color: RISK_COLORS[result.incident.riskLevel] || '#555', fontWeight: 'bold' }}>
                {result.incident.riskLevel}
              </span>
              {' '}(Incident ID: {result.incident.id})
            </div>
          ) : (
            <div style={{ marginTop: '10px', color: '#555' }}>
              ✔️ No incident triggered — log is informational.
            </div>
          )}

          {result.alert && (
            <div style={{ marginTop: '10px', padding: '10px', backgroundColor: '#ffebee', borderRadius: '4px', borderLeft: '4px solid #d32f2f' }}>
              🔔 <strong style={{ color: '#d32f2f' }}>ALERT GENERATED</strong><br />
              <span style={{ fontSize: '13px' }}>{result.alert.alertMessage}</span>
            </div>
          )}
        </div>
      )}

      {/* Sample log hints */}
      <div style={{ marginTop: '20px', backgroundColor: '#f5f5f5', padding: '12px 14px', borderRadius: '6px', fontSize: '13px' }}>
        <strong>Try these sample messages:</strong>
        <ul style={{ margin: '8px 0 0 0', paddingLeft: '18px', lineHeight: '1.8' }}>
          {SAMPLES.map((s) => (
            <li key={s}>
              <button
                type="button"
                onClick={() => setMessage(s)}
                style={{ background: 'none', border: 'none', color: '#1565c0', cursor: 'pointer', fontSize: '13px', padding: 0, textAlign: 'left' }}
              >
                {s}
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

// ── Styles ──────────────────────────────────────────────────────────────────
const card      = { backgroundColor: 'white', padding: '22px', borderRadius: '8px', boxShadow: '0 2px 6px rgba(0,0,0,0.1)' };
const heading   = { marginTop: 0, color: '#1a237e', fontSize: '18px' };
const fieldWrap = { marginBottom: '14px' };
const label     = { display: 'block', fontWeight: '600', marginBottom: '5px', color: '#333', fontSize: '13px' };
const input     = { width: '100%', padding: '8px 10px', borderRadius: '4px', border: '1px solid #ccc', fontSize: '14px' };
const textarea  = { ...input, resize: 'vertical', fontFamily: 'inherit' };
const btn       = { backgroundColor: '#1a237e', color: 'white', border: 'none', padding: '10px 26px', borderRadius: '4px', cursor: 'pointer', fontSize: '14px', fontWeight: '600' };
const btnDisabled = { ...btn, opacity: 0.6, cursor: 'default' };

export default LogUpload;
