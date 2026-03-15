import React, { useCallback, useEffect, useState } from 'react';
import LogUpload from './LogUpload';
import IncidentTable from './IncidentTable';
import { fetchIncidents, fetchLogs } from '../api';

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

function LogsView({ logs, totalCount, query, onQueryChange }) {
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
          <p>Submit a log or clear the search input.</p>
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

function Dashboard() {
  const [logs, setLogs] = useState([]);
  const [incidents, setIncidents] = useState([]);
  const [activeView, setActiveView] = useState('submit');
  const [connectionState, setConnectionState] = useState('loading');
  const [refreshing, setRefreshing] = useState(false);
  const [incidentFilter, setIncidentFilter] = useState('ALL');
  const [incidentQuery, setIncidentQuery] = useState('');
  const [logQuery, setLogQuery] = useState('');

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
          <ViewTab
            active={activeView === 'submit'}
            label="Submit log"
            onClick={() => setActiveView('submit')}
          />
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

      {activeView === 'submit' && (
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
        />
      )}
    </div>
  );
}

export default Dashboard;
