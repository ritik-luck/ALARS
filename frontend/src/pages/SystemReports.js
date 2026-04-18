import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line } from 'recharts';
import { Activity, AlertTriangle, FileWarning, ShieldAlert } from 'lucide-react';

const SystemReports = () => {
  const [stats, setStats] = useState(null);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const res = await axios.get('http://localhost:5000/api/reports/stats');
        setStats(res.data);
      } catch (err) {
        console.error(err);
      }
    };
    fetchStats();
  }, []);

  if (!stats) return <div style={{ padding: '2rem' }}>Loading system reports...</div>;

  const riskData = [
    { name: 'CRITICAL', value: stats.incidentsByRisk.CRITICAL || 0, fill: '#ef4444' },
    { name: 'HIGH', value: stats.incidentsByRisk.HIGH || 0, fill: '#f97316' },
    { name: 'MEDIUM', value: stats.incidentsByRisk.MEDIUM || 0, fill: '#eab308' },
    { name: 'LOW', value: stats.incidentsByRisk.LOW || 0, fill: '#3b82f6' }
  ];

  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
        <div className="surface" style={{ padding: '1.5rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ padding: '1rem', background: 'var(--info-soft)', borderRadius: 'var(--radius-sm)', color: 'var(--info)' }}><Activity size={24} /></div>
          <div>
            <div style={{ color: 'var(--muted)', fontSize: '0.875rem', fontWeight: 'bold' }}>TOTAL LOGS</div>
            <div style={{ fontSize: '1.75rem', fontWeight: 'bold', color: 'var(--text)' }}>{stats.totalLogs}</div>
          </div>
        </div>
        <div className="surface" style={{ padding: '1.5rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ padding: '1rem', background: 'var(--danger-soft)', borderRadius: 'var(--radius-sm)', color: 'var(--danger)' }}><AlertTriangle size={24} /></div>
          <div>
            <div style={{ color: 'var(--muted)', fontSize: '0.875rem', fontWeight: 'bold' }}>TOTAL INCIDENTS</div>
            <div style={{ fontSize: '1.75rem', fontWeight: 'bold', color: 'var(--text)' }}>{stats.totalIncidents}</div>
          </div>
        </div>
        <div className="surface" style={{ padding: '1.5rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ padding: '1rem', background: 'var(--warning-soft)', borderRadius: 'var(--radius-sm)', color: 'var(--warning)' }}><ShieldAlert size={24} /></div>
          <div>
            <div style={{ color: 'var(--muted)', fontSize: '0.875rem', fontWeight: 'bold' }}>TOTAL ALERTS</div>
            <div style={{ fontSize: '1.75rem', fontWeight: 'bold', color: 'var(--text)' }}>{stats.totalAlerts}</div>
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)', gap: '1.5rem' }}>
        <div className="surface" style={{ padding: '1.5rem' }}>
          <h3 style={{ marginBottom: '1.5rem', color: 'var(--text)', fontWeight: 600 }}>Incidents by Risk Level</h3>
          <div style={{ height: '300px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={riskData}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="name" stroke="var(--muted)" />
                <YAxis stroke="var(--muted)" />
                <Tooltip />
                <Bar dataKey="value" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="surface" style={{ padding: '1.5rem' }}>
          <h3 style={{ marginBottom: '1.5rem', color: 'var(--text)', fontWeight: 600 }}>Recent Incident Trend (7 Days)</h3>
          <div style={{ height: '300px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={stats.recentIncidents}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="date" stroke="var(--muted)" />
                <YAxis stroke="var(--muted)" />
                <Tooltip />
                <Line type="monotone" dataKey="count" stroke="var(--brand)" strokeWidth={3} dot={{ fill: 'var(--brand)', r: 4 }} activeDot={{ r: 6 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SystemReports;
