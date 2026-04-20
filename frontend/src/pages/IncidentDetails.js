import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { ShieldAlert, User, CheckCircle, Clock } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { API_BASE } from '../api';

const MitigationOptions = {
  CRITICAL: [
    "Reboot the DataNode services.",
    "Allocate additional JVM Heap Space.",
    "Isolate node from the cluster and trigger full block report."
  ],
  HIGH: [
    "Verify network connectivity between NameNode and DataNode.",
    "Check disk I/O latency metrics.",
    "Restart affected Block Pipeline."
  ],
  MEDIUM: [
    "Increase timeout threshold for DataNode communication.",
    "Clear invalid block sets using fsck.",
    "Review minor resource bottlenecks."
  ],
  LOW: [
    "No mitigation required. File as false positive."
  ]
};

const IncidentDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const [incident, setIncident] = useState(null);
  const [users, setUsers] = useState([]);
  const [assigneeId, setAssigneeId] = useState('');
  const [resolutionNotes, setResolutionNotes] = useState('');
  const [selectedMitigation, setSelectedMitigation] = useState('');

  useEffect(() => {
    fetchIncident();
    if (user.role === 'admin' || user.role === 'analyst') {
      fetchUsers();
    }
  }, [id]);

  const fetchIncident = async () => {
    const res = await axios.get(`${API_BASE}/incidents/${id}`);
    setIncident(res.data);
    setAssigneeId(res.data.assignee_id || '');
    setResolutionNotes(res.data.resolution_notes || '');
    setSelectedMitigation(res.data.mitigation_actions || '');
  };

  const fetchUsers = async () => {
    const res = await axios.get(`${API_BASE}/users`);
    setUsers(res.data.filter(u => u.role !== 'viewer'));
  };

  const handleAssign = async () => {
    await axios.put(`${API_BASE}/incidents/${id}/assign`, { assignee_id: assigneeId });
    fetchIncident();
  };

  const handleStatus = async (status) => {
    await axios.put(`${API_BASE}/incidents/${id}/status`, { status });
    fetchIncident();
  };

  const handleResolve = async () => {
    if (!resolutionNotes || !selectedMitigation) {
      alert('Resolution notes and mitigation actions are required.');
      return;
    }
    await axios.put(`${API_BASE}/incidents/${id}/resolve`, {
      resolution_notes: resolutionNotes,
      mitigation_actions: selectedMitigation
    });
    fetchIncident();
  };

  if (!incident) return <div style={{ padding: '2rem' }}>Loading...</div>;

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto' }}>
      <button onClick={() => navigate('/')} className="button-ghost" style={{ marginBottom: '1rem', padding: '0.5rem 1rem' }}>
        &larr; Back to Dashboard
      </button>

      <div className="surface" style={{ padding: '2rem' }}>
        
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '2rem', borderBottom: '1px solid var(--border)', paddingBottom: '1.5rem' }}>
          <div>
            <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
              <ShieldAlert color={incident.risk_level === 'CRITICAL' ? 'var(--danger)' : 'var(--warning)'} />
              Incident #{incident.id}
            </h2>
            <div style={{ color: 'var(--muted)', fontSize: '0.875rem' }}>Created on {new Date(incident.created_at).toLocaleString()}</div>
          </div>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <span className={`badge badge--${incident.risk_level.toLowerCase()}`}>
              {incident.risk_level}
            </span>
            <span style={{ 
              padding: '0.25rem 0.75rem', borderRadius: '999px', fontSize: '0.875rem', fontWeight: 'bold',
              background: incident.status === 'resolved' ? 'var(--brand-soft)' : incident.status === 'in_progress' ? 'var(--warning-soft)' : 'var(--danger-soft)',
              color: incident.status === 'resolved' ? 'var(--brand)' : incident.status === 'in_progress' ? 'var(--warning)' : 'var(--danger)'
            }}>
              {incident.status.replace('_', ' ').toUpperCase()}
            </span>
          </div>
        </div>

        {/* Log Information */}
        <div style={{ marginBottom: '2rem' }}>
          <h3 style={{ fontSize: '1rem', color: 'var(--text)', marginBottom: '0.5rem' }}>Associated Log Entry</h3>
          <div style={{ background: 'var(--surface-strong)', color: 'var(--text)', padding: '1rem', borderRadius: 'var(--radius-sm)', fontFamily: 'monospace', wordBreak: 'break-all', border: '1px solid var(--border)' }}>
            {incident.log_message}
          </div>
        </div>

        {/* Management Actions */}
        {(user.role === 'admin' || user.role === 'analyst') && incident.status !== 'resolved' && (
          <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) minmax(0,1fr)', gap: '1.5rem', background: 'var(--surface-strong)', padding: '1.5rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)' }}>
            
            {/* Assignment */}
            <div>
              <h3 style={{ fontSize: '1rem', color: 'var(--text)', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <User size={18} /> Assignment & Status
              </h3>
              <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
                <select value={assigneeId} onChange={e => setAssigneeId(e.target.value)} className="select-input">
                  <option value="">-- Unassigned --</option>
                  {users.map(u => <option key={u.id} value={u.id}>{u.username} ({u.role})</option>)}
                </select>
                <button onClick={handleAssign} className="button-primary">Assign</button>
              </div>

              {assigneeId && (
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button onClick={() => handleStatus('in_progress')} disabled={incident.status === 'in_progress'} className={incident.status === 'in_progress' ? "button-ghost" : "button-primary"} style={{ flex: 1, display: 'flex', justifyContent: 'center', gap: '0.5rem', opacity: incident.status === 'in_progress' ? 0.5 : 1 }}>
                    <Clock size={16} /> Mark In Progress
                  </button>
                </div>
              )}
            </div>

            {/* Resolution */}
            <div>
              <h3 style={{ fontSize: '1rem', color: 'var(--text)', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <CheckCircle size={18} /> Resolution & Mitigation
              </h3>
              
              <select value={selectedMitigation} onChange={e => setSelectedMitigation(e.target.value)} className="select-input" style={{ marginBottom: '0.75rem' }}>
                <option value="">-- Select Mitigation Action --</option>
                {MitigationOptions[incident.risk_level]?.map(opt => <option key={opt} value={opt}>{opt}</option>)}
              </select>

              <textarea 
                placeholder="Resolution notes..."
                value={resolutionNotes}
                onChange={e => setResolutionNotes(e.target.value)}
                className="text-area"
                style={{ marginBottom: '0.75rem', minHeight: '80px' }}
              />

              <button onClick={handleResolve} className="button-primary" style={{ width: '100%' }}>
                Resolve Incident
              </button>
            </div>
            
          </div>
        )}

        {/* Resolved State Display */}
        {incident.status === 'resolved' && (
          <div style={{ background: 'var(--brand-soft)', border: '1px solid var(--brand)', padding: '1.5rem', borderRadius: 'var(--radius-sm)' }}>
            <h3 style={{ color: 'var(--brand)', display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
              <CheckCircle size={20} /> Incident Resolved
            </h3>
            <div style={{ marginBottom: '0.5rem' }}><strong>Mitigation Action:</strong> {incident.mitigation_actions}</div>
            <div style={{ marginBottom: '0.5rem' }}><strong>Resolution Notes:</strong> {incident.resolution_notes}</div>
            <div style={{ color: 'var(--muted)', fontSize: '0.875rem', marginTop: '1rem' }}>Resolved by: {incident.assignee_name || 'Unknown'} at {new Date(incident.updated_at).toLocaleString()}</div>
          </div>
        )}

      </div>
    </div>
  );
};

export default IncidentDetails;
