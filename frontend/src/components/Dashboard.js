import React, { useState, useEffect, useCallback } from 'react';
import LogUpload from './LogUpload';
import IncidentTable from './IncidentTable';
import { fetchLogs, fetchIncidents } from '../api';

// ── Stat summary card ────────────────────────────────────────────────────────
function StatCard({ label, value, color }) {
  return (
    <div style={{
      backgroundColor: 'white', padding: '16px 20px',
      borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.08)',
      flex: '1 1 120px', borderLeft: `4px solid ${color}`,
    }}>
      <div style={{ fontSize: '30px', fontWeight: 'bold', color }}>{value}</div>
      <div style={{ color: '#666', fontSize: '12px', marginTop: '4px' }}>{label}</div>
    </div>
  );
}

// ── All-logs panel ───────────────────────────────────────────────────────────
function LogsPanel({ logs }) {
  if (!logs.length) {
    return (
      <div style={card}>
        <h2 style={heading}>All Logs</h2>
        <p style={{ color: '#777' }}>No logs submitted yet.</p>
      </div>
    );
  }
  return (
    <div style={card}>
      <h2 style={heading}>All Logs ({logs.length})</h2>
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
          <thead>
            <tr style={{ backgroundColor: '#1a237e', color: 'white' }}>
              {['ID', 'Message', 'Source', 'Timestamp'].map(h => (
                <th key={h} style={{ padding: '10px 14px', textAlign: 'left' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {logs.map((log, idx) => (
              <tr key={log.id} style={{ backgroundColor: idx % 2 === 0 ? 'white' : '#fafafa' }}>
                <td style={td}>{log.id}</td>
                <td style={{ ...td, maxWidth: '320px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                    title={log.message}>
                  {log.message}
                </td>
                <td style={td}>{log.source}</td>
                <td style={{ ...td, whiteSpace: 'nowrap', fontSize: '12px', color: '#555' }}>
                  {new Date(log.timestamp).toLocaleString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── Main Dashboard ───────────────────────────────────────────────────────────
function Dashboard() {
  const [logs,      setLogs]      = useState([]);
  const [incidents, setIncidents] = useState([]);
  const [activeTab, setActiveTab] = useState('submit');

  const loadData = useCallback(async () => {
    try {
      const [logsRes, incRes] = await Promise.all([fetchLogs(), fetchIncidents()]);
      setLogs(logsRes.data);
      setIncidents(incRes.data);
    } catch {
      // Backend not yet reachable — silently ignore in demo
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const counts = {
    critical: incidents.filter(i => i.risk_level === 'CRITICAL').length,
    high:     incidents.filter(i => i.risk_level === 'HIGH').length,
    medium:   incidents.filter(i => i.risk_level === 'MEDIUM').length,
  };

  // ── Tab button ─────────────────────────────────────────────────────────────
  const TabBtn = ({ id, label }) => (
    <button
      onClick={() => setActiveTab(id)}
      style={{
        padding: '12px 20px', border: 'none', cursor: 'pointer',
        fontSize: '14px', background: 'transparent',
        borderBottom: activeTab === id ? '3px solid #1a237e' : '3px solid transparent',
        color:      activeTab === id ? '#1a237e' : '#666',
        fontWeight: activeTab === id ? '700' : '400',
      }}
    >
      {label}
    </button>
  );

  return (
    <div>
      {/* ── Stats row ── */}
      <div style={{ display: 'flex', gap: '14px', marginBottom: '24px', flexWrap: 'wrap' }}>
        <StatCard label="Total Logs"  value={logs.length}      color="#1565c0" />
        <StatCard label="Incidents"   value={incidents.length} color="#6a1b9a" />
        <StatCard label="Critical"    value={counts.critical}  color="#c62828" />
        <StatCard label="High"        value={counts.high}      color="#e65100" />
        <StatCard label="Medium"      value={counts.medium}    color="#f57f17" />
      </div>

      {/* ── Tab navigation bar ── */}
      <div style={{
        backgroundColor: 'white', borderRadius: '8px',
        boxShadow: '0 2px 4px rgba(0,0,0,0.08)', marginBottom: '20px',
        padding: '0 12px', display: 'flex', borderBottom: '1px solid #eee',
      }}>
        <TabBtn id="submit"    label="📥 Submit Log" />
        <TabBtn id="incidents" label={`🚨 Incidents (${incidents.length})`} />
        <TabBtn id="logs"      label={`📋 All Logs (${logs.length})`} />
      </div>

      {/* ── Tab panels ── */}
      {activeTab === 'submit'    && <LogUpload     onLogSubmitted={loadData} />}
      {activeTab === 'incidents' && <IncidentTable incidents={incidents} />}
      {activeTab === 'logs'      && <LogsPanel     logs={logs} />}
    </div>
  );
}

// ── Shared inline styles ─────────────────────────────────────────────────────
const card    = { backgroundColor: 'white', padding: '22px', borderRadius: '8px', boxShadow: '0 2px 6px rgba(0,0,0,0.1)' };
const heading = { marginTop: 0, color: '#1a237e', fontSize: '18px' };
const td      = { padding: '10px 14px', borderBottom: '1px solid #eee' };

export default Dashboard;
