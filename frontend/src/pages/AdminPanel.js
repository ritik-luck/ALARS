import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useLocation } from 'react-router-dom';

const AdminPanel = () => {
  const [users, setUsers] = useState([]);
  const [rules, setRules] = useState([]);
  const [newRule, setNewRule] = useState({ rule_name: '', description: '', severity_level: 'MEDIUM' });
  const location = useLocation();
  const isRulesView = location.pathname.includes('/rules');

  useEffect(() => {
    if (isRulesView) {
      fetchRules();
    } else {
      fetchUsers();
    }
  }, [isRulesView]);

  const fetchUsers = async () => {
    const res = await axios.get('http://localhost:5000/api/users');
    setUsers(res.data);
  };

  const fetchRules = async () => {
    const res = await axios.get('http://localhost:5000/api/rules');
    setRules(res.data);
  };

  const changeUserRole = async (id, role) => {
    await axios.put(`http://localhost:5000/api/users/${id}/role`, { role });
    fetchUsers();
  };

  const addRule = async (e) => {
    e.preventDefault();
    await axios.post('http://localhost:5000/api/rules', newRule);
    setNewRule({ rule_name: '', description: '', severity_level: 'MEDIUM' });
    fetchRules();
  };

  const toggleRule = async (id, currentStatus) => {
    await axios.put(`http://localhost:5000/api/rules/${id}/toggle`, { is_active: !currentStatus });
    fetchRules();
  };

  const deleteRule = async (id) => {
    if (window.confirm('Delete this rule?')) {
      await axios.delete(`http://localhost:5000/api/rules/${id}`);
      fetchRules();
    }
  };

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '2rem' }}>
      
      {isRulesView ? (
        /* Rules Management */
        <div className="surface">
          <h3 className="surface__title" style={{ marginBottom: '1.5rem' }}>Detection Rules & Thresholds</h3>
          
          <form onSubmit={addRule} style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.5rem', alignItems: 'flex-end' }}>
            <div style={{ flex: '1 1 200px' }}>
              <label className="field__label" style={{ display: 'block', marginBottom: '0.25rem' }}>Rule Name</label>
              <input type="text" required value={newRule.rule_name} onChange={e => setNewRule({...newRule, rule_name: e.target.value})} className="text-input" placeholder="e.g. Block Memory Leak" />
            </div>
            <div style={{ flex: '2 1 300px' }}>
              <label className="field__label" style={{ display: 'block', marginBottom: '0.25rem' }}>Description / Regex Trigger</label>
              <input type="text" required value={newRule.description} onChange={e => setNewRule({...newRule, description: e.target.value})} className="text-input" placeholder="e.g. OutOfMemory.*" />
            </div>
            <div>
              <label className="field__label" style={{ display: 'block', marginBottom: '0.25rem' }}>Severity</label>
              <select value={newRule.severity_level} onChange={e => setNewRule({...newRule, severity_level: e.target.value})} className="select-input">
                <option value="CRITICAL">CRITICAL</option>
                <option value="HIGH">HIGH</option>
                <option value="MEDIUM">MEDIUM</option>
                <option value="LOW">LOW</option>
              </select>
            </div>
            <button type="submit" className="button-primary">Add Rule</button>
          </form>

          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Rule Name</th>
                  <th>Description</th>
                  <th>Severity</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {rules.map(rule => (
                  <tr key={rule.id}>
                    <td style={{ fontWeight: 'bold' }}>{rule.rule_name}</td>
                    <td>{rule.description}</td>
                    <td>
                      <span className={`badge badge--${rule.severity_level.toLowerCase()}`}>
                        {rule.severity_level}
                      </span>
                    </td>
                    <td>
                      <span style={{ color: rule.is_active ? '#34d17b' : '#ff8a8a', fontWeight: 'bold' }}>
                        {rule.is_active ? 'Active' : 'Disabled'}
                      </span>
                    </td>
                    <td style={{ display: 'flex', gap: '0.5rem' }}>
                      <button onClick={() => toggleRule(rule.id, rule.is_active)} className="button-ghost" style={{ padding: '6px 12px', fontSize: '0.8rem' }}>
                        {rule.is_active ? 'Disable' : 'Enable'}
                      </button>
                      <button onClick={() => deleteRule(rule.id)} className="button-ghost" style={{ border: '1px solid #ff8a8a', color: '#ff8a8a', padding: '6px 12px', fontSize: '0.8rem' }}>
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* User Management */
        <div className="surface">
          <h3 className="surface__title" style={{ marginBottom: '1.5rem' }}>User Roles & Access</h3>
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Username</th>
                  <th>Role</th>
                  <th>Change Role</th>
                </tr>
              </thead>
              <tbody>
                {users.map(u => (
                  <tr key={u.id}>
                    <td>{u.id}</td>
                    <td style={{ fontWeight: 'bold' }}>{u.username}</td>
                    <td>
                      <span className="badge badge--info" style={{ textTransform: 'uppercase' }}>
                        {u.role}
                      </span>
                    </td>
                    <td>
                      {u.username !== 'admin' && (
                        <select 
                          value={u.role} 
                          onChange={(e) => changeUserRole(u.id, e.target.value)}
                          className="select-input select-input--compact"
                        >
                          <option value="admin">Admin</option>
                          <option value="analyst">Analyst</option>
                          <option value="viewer">Viewer</option>
                        </select>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

    </div>
  );
};

export default AdminPanel;
