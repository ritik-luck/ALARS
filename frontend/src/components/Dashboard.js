import React, { useCallback, useEffect, useState } from 'react';
import LogUpload from './LogUpload';
import IncidentTable from './IncidentTable';
import { fetchIncidents, fetchLogs, register } from '../api';

function formatTimestamp(value) {
  if (!value) {
    return 'Not available';
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return 'Not available';
  }

  return parsed.toLocaleString();
}

function matchesQuery(values, query) {
  const normalizedQuery = query.trim().toLowerCase();
  if (!normalizedQuery) {
    return true;
  }

  return values.some((value) =>
    String(value || '').toLowerCase().includes(normalizedQuery)
  );
}

function ViewTab({ active, label, onClick }) {
  return (
    <button
      className={`view-tab ${active ? 'view-tab--active' : ''}`}
      type="button"
      onClick={onClick}
    >
      {label}
    </button>
  );
}

function LogsView({ logs, totalCount, query, onQueryChange, canSubmitLogs }) {
  return (
    <section className="surface">
      <div className="surface__header">
        <h2 className="surface__title">Log history</h2>
        <div className="surface__toolbar">
          <span className="surface__meta">{logs.length} of {totalCount}</span>
          <input
            className="text-input text-input--compact"
            type="search"
            value={query}
            onChange={(event) => onQueryChange(event.target.value)}
            placeholder="Search logs"
          />
        </div>
      </div>

      {logs.length === 0 ? (
        <div className="empty-state">
          <strong>No logs found.</strong>
          <p>{canSubmitLogs ? 'Submit a log or clear the search input.' : 'Ask an admin or analyst to submit logs, or clear the search input.'}</p>
        </div>
      ) : (
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Source</th>
                <th>Message</th>
                <th>Saved at</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log) => (
                <tr key={log.id}>
                  <td>{log.id}</td>
                  <td>{log.source}</td>
                  <td className="data-table__message-cell">{log.message}</td>
                  <td>{formatTimestamp(log.timestamp)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

function AdminUsersPanel() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('viewer');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    setMessage('');
    setError('');
    setLoading(true);

    try {
      const response = await register(username.trim(), password, role);
      setMessage(`Created ${response.data.username} as ${response.data.role}.`);
      setUsername('');
      setPassword('');
      setRole('viewer');
    } catch (creationError) {
      setError(creationError.response?.data?.error || 'Could not create user.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="surface">
      <div className="surface__header">
        <h2 className="surface__title">User management</h2>
        <span className="surface__meta">Admin only</span>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="form-grid">
          <label className="field" htmlFor="new-username">
            <span className="field__label">Username</span>
            <input
              id="new-username"
              className="text-input"
              type="text"
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              placeholder="Example: viewer01"
              required
            />
          </label>

          <label className="field" htmlFor="new-role">
            <span className="field__label">Role</span>
            <select
              id="new-role"
              className="select-input"
              value={role}
              onChange={(event) => setRole(event.target.value)}
            >
              <option value="admin">Admin</option>
              <option value="analyst">Analyst</option>
              <option value="viewer">Viewer</option>
            </select>
          </label>
        </div>

        <label className="field" htmlFor="new-password">
          <span className="field__label">Temporary password</span>
          <input
            id="new-password"
            className="text-input"
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="Set an initial password"
            required
          />
        </label>

        <div className="button-row">
          <button className="button-primary" type="submit" disabled={loading}>
            {loading ? 'Creating...' : 'Create user'}
          </button>
        </div>

        {message && <div className="message message--success">{message}</div>}
        {error && <div className="message message--error">{error}</div>}
      </form>
    </section>
  );
}

function Dashboard({ currentUser }) {
  const [logs, setLogs] = useState([]);
  const [incidents, setIncidents] = useState([]);
  const [activeView, setActiveView] = useState('submit');
  const [connectionState, setConnectionState] = useState('loading');
  const [refreshing, setRefreshing] = useState(false);
  const [incidentFilter, setIncidentFilter] = useState('ALL');
  const [incidentQuery, setIncidentQuery] = useState('');
  const [logQuery, setLogQuery] = useState('');
  const canSubmitLogs = ['admin', 'analyst'].includes(currentUser?.role);
  const canManageUsers = currentUser?.role === 'admin';

  const loadData = useCallback(async () => {
    setRefreshing(true);

    try {
      const [logsResponse, incidentsResponse] = await Promise.all([
        fetchLogs(),
        fetchIncidents(),
      ]);

      setLogs(Array.isArray(logsResponse.data) ? logsResponse.data : []);
      setIncidents(Array.isArray(incidentsResponse.data) ? incidentsResponse.data : []);
      setConnectionState('online');
    } catch {
      setConnectionState('offline');
    } finally {
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    if (!canSubmitLogs && activeView === 'submit') {
      setActiveView('incidents');
    }
  }, [activeView, canSubmitLogs]);

  const countsBySeverity = incidents.reduce(
    (totals, incident) => {
      const riskLevel = incident.risk_level;

      if (totals[riskLevel] !== undefined) {
        totals[riskLevel] += 1;
      }

      return totals;
    },
    { CRITICAL: 0, HIGH: 0, MEDIUM: 0, LOW: 0 }
  );

  const filteredIncidents = incidents.filter((incident) => {
    const matchesSeverity =
      incidentFilter === 'ALL' || incident.risk_level === incidentFilter;

    return (
      matchesSeverity &&
      matchesQuery(
        [incident.id, incident.log_message, incident.source, incident.status],
        incidentQuery
      )
    );
  });

  const filteredLogs = logs.filter((log) =>
    matchesQuery([log.id, log.message, log.source], logQuery)
  );

  return (
    <div className="dashboard">
      <div className="dashboard-bar">
        <div className="view-tabs">
          {canSubmitLogs && (
            <ViewTab
              active={activeView === 'submit'}
              label="Submit log"
              onClick={() => setActiveView('submit')}
            />
          )}
          <ViewTab
            active={activeView === 'incidents'}
            label={`Incidents (${incidents.length})`}
            onClick={() => setActiveView('incidents')}
          />
          <ViewTab
            active={activeView === 'logs'}
            label={`Logs (${logs.length})`}
            onClick={() => setActiveView('logs')}
          />
          {canManageUsers && (
            <ViewTab
              active={activeView === 'users'}
              label="Users"
              onClick={() => setActiveView('users')}
            />
          )}
        </div>

        <div className="dashboard-bar__actions">
          <span className={`status-chip status-chip--${connectionState}`}>
            {connectionState === 'online'
              ? 'Live'
              : connectionState === 'offline'
                ? 'Offline'
                : 'Loading'}
          </span>
          <button
            className="button-ghost"
            type="button"
            onClick={loadData}
            disabled={refreshing}
          >
            {refreshing ? 'Refreshing...' : 'Refresh'}
          </button>
        </div>
      </div>

      {activeView === 'submit' && canSubmitLogs && (
        <LogUpload onLogSubmitted={loadData} />
      )}

      {activeView === 'incidents' && (
        <IncidentTable
          incidents={filteredIncidents}
          totalCount={incidents.length}
          countsBySeverity={countsBySeverity}
          severityFilter={incidentFilter}
          onSeverityChange={setIncidentFilter}
          searchValue={incidentQuery}
          onSearchChange={setIncidentQuery}
        />
      )}

      {activeView === 'logs' && (
        <LogsView
          logs={filteredLogs}
          totalCount={logs.length}
          query={logQuery}
          onQueryChange={setLogQuery}
          canSubmitLogs={canSubmitLogs}
        />
      )}

      {activeView === 'users' && canManageUsers && (
        <AdminUsersPanel />
      )}
    </div>
  );
}

export default Dashboard;
