import React from 'react';

const RISK_STYLE = {
  CRITICAL: { bg: '#ffebee', text: '#c62828' },
  HIGH:     { bg: '#fff3e0', text: '#e65100' },
  MEDIUM:   { bg: '#fffde7', text: '#f57f17' },
  LOW:      { bg: '#e8f5e9', text: '#2e7d32' },
  INFO:     { bg: '#e3f2fd', text: '#1565c0' },
};

function Badge({ label, bg, text }) {
  return (
    <span style={{
      backgroundColor: bg, color: text,
      padding: '3px 10px', borderRadius: '12px',
      fontWeight: 'bold', fontSize: '12px', whiteSpace: 'nowrap',
    }}>
      {label}
    </span>
  );
}

function IncidentTable({ incidents }) {
  return (
    <div style={card}>
      <h2 style={heading}>
        Detected Incidents
        {incidents.length > 0 && (
          <span style={{ marginLeft: '10px', fontSize: '14px', fontWeight: 'normal', color: '#555' }}>
            ({incidents.length} total)
          </span>
        )}
      </h2>

      {incidents.length === 0 ? (
        <p style={{ color: '#777', marginTop: '8px' }}>
          No incidents yet. Submit a log containing <strong>ERROR</strong>, <strong>FAIL</strong>, or <strong>CRITICAL</strong> to trigger one.
        </p>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table style={table}>
            <thead>
              <tr style={{ backgroundColor: '#1a237e', color: 'white' }}>
                {['ID', 'Log Message', 'Source', 'Risk Level', 'Status', 'Detected At'].map(h => (
                  <th key={h} style={th}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {incidents.map((inc, idx) => {
                const style = RISK_STYLE[inc.risk_level] || RISK_STYLE.INFO;
                return (
                  <tr key={inc.id} style={{ backgroundColor: idx % 2 === 0 ? 'white' : '#fafafa' }}>
                    <td style={td}>{inc.id}</td>
                    <td style={{ ...td, maxWidth: '260px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                        title={inc.log_message}>
                      {inc.log_message}
                    </td>
                    <td style={td}>{inc.source}</td>
                    <td style={td}>
                      <Badge label={inc.risk_level} bg={style.bg} text={style.text} />
                    </td>
                    <td style={td}>
                      <Badge label={inc.status} bg="#e0f2f1" text="#00695c" />
                    </td>
                    <td style={{ ...td, whiteSpace: 'nowrap', fontSize: '12px', color: '#555' }}>
                      {new Date(inc.created_at).toLocaleString()}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ── Styles ──────────────────────────────────────────────────────────────────
const card    = { backgroundColor: 'white', padding: '22px', borderRadius: '8px', boxShadow: '0 2px 6px rgba(0,0,0,0.1)' };
const heading = { marginTop: 0, color: '#1a237e', fontSize: '18px' };
const table   = { width: '100%', borderCollapse: 'collapse', fontSize: '14px' };
const th      = { padding: '10px 14px', textAlign: 'left', fontWeight: '600', whiteSpace: 'nowrap' };
const td      = { padding: '10px 14px', borderBottom: '1px solid #eee' };

export default IncidentTable;
