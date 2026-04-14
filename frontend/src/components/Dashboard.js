import React, { useCallback, useEffect, useState } from 'react';
import LogUpload from './LogUpload';
import IncidentTable from './IncidentTable';
import {
  applyIncidentMitigation,
  assignIncident,
  fetchDetectionRules,
  fetchAnalysts,
  fetchIncidents,
  fetchLogs,
  fetchSystemReport,
  register,
  updateIncidentStatus,
  updateDetectionRule,
} from '../api';

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

const RISK_PRIORITY = ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW', 'INFO'];

function countKeywordMatches(message, keyword) {
  const normalizedMessage = String(message || '').toUpperCase();
  const normalizedKeyword = String(keyword || '').toUpperCase();

  if (!normalizedKeyword) {
    return 0;
  }

  return normalizedMessage.split(normalizedKeyword).length - 1;
}

function classifyLogRisk(message, rules = []) {
  const matchedRuleLevels = rules
    .filter((rule) => Number(rule.enabled) === 1)
    .filter((rule) => countKeywordMatches(message, rule.keyword) >= Number(rule.threshold_count || 1))
    .map((rule) => rule.risk_level);

  for (const riskLevel of RISK_PRIORITY) {
    if (matchedRuleLevels.includes(riskLevel)) {
      return riskLevel;
    }
  }

  const normalizedMessage = String(message || '').toUpperCase();

  if (normalizedMessage.includes('CRITICAL')) {
    return 'CRITICAL';
  }

  if (normalizedMessage.includes('ERROR')) {
    return 'HIGH';
  }

  if (normalizedMessage.includes('FAIL')) {
    return 'MEDIUM';
  }

  return 'INFO';
}

function isWithinDateFilter(timestamp, filter) {
  if (filter === 'ALL') {
    return true;
  }

  const parsed = new Date(timestamp);
  if (Number.isNaN(parsed.getTime())) {
    return false;
  }

  const now = new Date();
  const ageInMs = now.getTime() - parsed.getTime();

  if (filter === '24H') {
    return ageInMs <= 24 * 60 * 60 * 1000;
  }

  if (filter === '7D') {
    return ageInMs <= 7 * 24 * 60 * 60 * 1000;
  }

  if (filter === '30D') {
    return ageInMs <= 30 * 24 * 60 * 60 * 1000;
  }

  return true;
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

function LogsView({
  logs,
  totalCount,
  query,
  onQueryChange,
  sourceFilter,
  sourceOptions,
  onSourceFilterChange,
  riskFilter,
  onRiskFilterChange,
  dateFilter,
  onDateFilterChange,
  onClearFilters,
  canSubmitLogs,
  detectionRules,
}) {
  const hasActiveFilters =
    query.trim() || sourceFilter !== 'ALL' || riskFilter !== 'ALL' || dateFilter !== 'ALL';

  return (
    <section className="surface">
      <div className="surface__header">
        <div>
          <h2 className="surface__title">Log history</h2>
          <p className="surface__meta">Search, filter, and triage stored log events.</p>
        </div>
        <div className="log-filter-count">
          <strong>{logs.length}</strong>
          <span>of {totalCount} logs</span>
        </div>
      </div>

      <div className="log-filter-panel">
        <label className="log-filter-panel__search" htmlFor="log-search">
          <span className="field__label">Search logs</span>
          <input
            id="log-search"
            className="text-input"
            type="search"
            value={query}
            onChange={(event) => onQueryChange(event.target.value)}
            placeholder="Search by ID, source, message, or timestamp"
          />
        </label>

        <label className="field" htmlFor="log-source-filter">
          <span className="field__label">Source</span>
          <select
            id="log-source-filter"
            className="select-input"
            value={sourceFilter}
            onChange={(event) => onSourceFilterChange(event.target.value)}
          >
            <option value="ALL">All sources</option>
            {sourceOptions.map((source) => (
              <option key={source} value={source}>
                {source}
              </option>
            ))}
          </select>
        </label>

        <label className="field" htmlFor="log-risk-filter">
          <span className="field__label">Signal</span>
          <select
            id="log-risk-filter"
            className="select-input"
            value={riskFilter}
            onChange={(event) => onRiskFilterChange(event.target.value)}
          >
            <option value="ALL">All signals</option>
            <option value="CRITICAL">Critical</option>
            <option value="HIGH">High / Error</option>
            <option value="MEDIUM">Medium / Fail</option>
            <option value="INFO">Info / Normal</option>
          </select>
        </label>

        <label className="field" htmlFor="log-date-filter">
          <span className="field__label">Time window</span>
          <select
            id="log-date-filter"
            className="select-input"
            value={dateFilter}
            onChange={(event) => onDateFilterChange(event.target.value)}
          >
            <option value="ALL">All time</option>
            <option value="24H">Last 24 hours</option>
            <option value="7D">Last 7 days</option>
            <option value="30D">Last 30 days</option>
          </select>
        </label>
      </div>

      <div className="filter-summary">
        <div className="filter-chips">
          <span className={`filter-chip ${hasActiveFilters ? 'filter-chip--active' : ''}`}>
            {hasActiveFilters ? 'Filters active' : 'No filters'}
          </span>
          {query.trim() && <span className="filter-chip">Search: {query.trim()}</span>}
          {sourceFilter !== 'ALL' && <span className="filter-chip">Source: {sourceFilter}</span>}
          {riskFilter !== 'ALL' && <span className="filter-chip">Signal: {riskFilter}</span>}
          {dateFilter !== 'ALL' && <span className="filter-chip">Window: {dateFilter}</span>}
        </div>
        <button className="button-ghost button-ghost--compact" type="button" onClick={onClearFilters} disabled={!hasActiveFilters}>
          Clear filters
        </button>
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
                <th>Signal</th>
                <th>Source</th>
                <th>Message</th>
                <th>Saved at</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log) => (
                <tr key={log.id}>
                  <td>{log.id}</td>
                  <td>
                    <span className={`badge badge--${classifyLogRisk(log.message, detectionRules).toLowerCase()}`}>
                      {classifyLogRisk(log.message, detectionRules)}
                    </span>
                  </td>
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

function RulesPanel({ rules, onUpdateRule }) {
  const [drafts, setDrafts] = useState({});
  const [savingRuleId, setSavingRuleId] = useState(null);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  function getDraft(rule) {
    return {
      keyword: rule.keyword,
      riskLevel: rule.risk_level,
      createsIncident: Number(rule.creates_incident) === 1,
      alertEnabled: Number(rule.alert_enabled) === 1,
      thresholdCount: Number(rule.threshold_count || 1),
      enabled: Number(rule.enabled) === 1,
      ...(drafts[rule.id] || {}),
    };
  }

  function updateDraft(rule, changes) {
    setDrafts((currentDrafts) => ({
      ...currentDrafts,
      [rule.id]: {
        ...getDraft(rule),
        ...changes,
      },
    }));
  }

  async function handleSubmit(event, rule) {
    event.preventDefault();
    setMessage('');
    setError('');
    setSavingRuleId(rule.id);

    try {
      await onUpdateRule(rule.id, getDraft(rule));
      setDrafts((currentDrafts) => {
        const nextDrafts = { ...currentDrafts };
        delete nextDrafts[rule.id];
        return nextDrafts;
      });
      setMessage(`Updated ${getDraft(rule).keyword}.`);
    } catch (ruleError) {
      setError(ruleError.response?.data?.error || 'Could not update detection rule.');
    } finally {
      setSavingRuleId(null);
    }
  }

  return (
    <section className="surface">
      <div className="surface__header">
        <div>
          <h2 className="surface__title">Rules & thresholds</h2>
          <p className="surface__meta">Admin controls for incident keywords, severity, alerting, and match thresholds.</p>
        </div>
        <span className="surface__meta">{rules.length} rules</span>
      </div>

      {message && <div className="message message--success">{message}</div>}
      {error && <div className="message message--error">{error}</div>}

      {rules.length === 0 ? (
        <div className="empty-state">
          <strong>No rules found.</strong>
          <p>Run the detection_rules migration or refresh after the backend is online.</p>
        </div>
      ) : (
        <div className="rules-grid">
          {rules.map((rule) => {
            const draft = getDraft(rule);

            return (
              <form className="rule-card" key={rule.id || rule.keyword} onSubmit={(event) => handleSubmit(event, rule)}>
                <div className="rule-card__header">
                  <strong>{rule.keyword}</strong>
                  <label className="switch-field">
                    <input
                      type="checkbox"
                      checked={draft.enabled}
                      disabled={!rule.id}
                      onChange={(event) => updateDraft(rule, { enabled: event.target.checked })}
                    />
                    Enabled
                  </label>
                </div>

                <label className="field" htmlFor={`rule-keyword-${rule.id}`}>
                  <span className="field__label">Keyword</span>
                  <input
                    id={`rule-keyword-${rule.id}`}
                    className="text-input"
                    value={draft.keyword}
                    disabled={!rule.id}
                    onChange={(event) => updateDraft(rule, { keyword: event.target.value })}
                  />
                </label>

                <div className="form-grid">
                  <label className="field" htmlFor={`rule-risk-${rule.id}`}>
                    <span className="field__label">Severity</span>
                    <select
                      id={`rule-risk-${rule.id}`}
                      className="select-input"
                      value={draft.riskLevel}
                      disabled={!rule.id}
                      onChange={(event) => updateDraft(rule, { riskLevel: event.target.value })}
                    >
                      <option value="CRITICAL">Critical</option>
                      <option value="HIGH">High</option>
                      <option value="MEDIUM">Medium</option>
                      <option value="LOW">Low</option>
                      <option value="INFO">Info</option>
                    </select>
                  </label>

                  <label className="field" htmlFor={`rule-threshold-${rule.id}`}>
                    <span className="field__label">Match threshold</span>
                    <input
                      id={`rule-threshold-${rule.id}`}
                      className="text-input"
                      type="number"
                      min="1"
                      value={draft.thresholdCount}
                      disabled={!rule.id}
                      onChange={(event) => updateDraft(rule, { thresholdCount: Number(event.target.value) })}
                    />
                  </label>
                </div>

                <div className="rule-card__toggles">
                  <label className="switch-field">
                    <input
                      type="checkbox"
                      checked={draft.createsIncident}
                      disabled={!rule.id}
                      onChange={(event) => updateDraft(rule, { createsIncident: event.target.checked })}
                    />
                    Creates incident
                  </label>

                  <label className="switch-field">
                    <input
                      type="checkbox"
                      checked={draft.alertEnabled}
                      disabled={!rule.id}
                      onChange={(event) => updateDraft(rule, { alertEnabled: event.target.checked })}
                    />
                    Triggers alert
                  </label>
                </div>

                {!rule.id && (
                  <p className="rule-card__hint">Default fallback rule. Run the database migration to edit it.</p>
                )}

                <button className="button-primary" type="submit" disabled={!rule.id || savingRuleId === rule.id}>
                  {savingRuleId === rule.id ? 'Saving...' : 'Save rule'}
                </button>
              </form>
            );
          })}
        </div>
      )}
    </section>
  );
}

function formatMetricLabel(value) {
  return String(value || 'Unknown').replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, (char) => char.toUpperCase());
}

function ReportMetric({ label, value }) {
  return (
    <div className="report-card">
      <span className="report-card__label">{label}</span>
      <strong className="report-card__value">{value}</strong>
    </div>
  );
}

function ReportList({ title, items, emptyText }) {
  return (
    <div className="report-panel">
      <h3 className="report-panel__title">{title}</h3>
      {items.length === 0 ? (
        <p className="report-panel__empty">{emptyText}</p>
      ) : (
        <div className="report-list">
          {items.map((item) => (
            <div className="report-list__row" key={item.label}>
              <span>{formatMetricLabel(item.label)}</span>
              <strong>{item.count}</strong>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function SystemReportView({ report, loading }) {
  if (loading && !report) {
    return (
      <section className="surface">
        <div className="empty-state">
          <strong>Generating report...</strong>
          <p>Collecting log and incident metrics.</p>
        </div>
      </section>
    );
  }

  if (!report) {
    return (
      <section className="surface">
        <div className="empty-state">
          <strong>No report available.</strong>
          <p>Refresh the dashboard after the backend is online.</p>
        </div>
      </section>
    );
  }

  const totals = report.totals || {};
  const recentIncidents = Array.isArray(report.recentIncidents) ? report.recentIncidents : [];

  return (
    <section className="surface">
      <div className="surface__header">
        <div>
          <h2 className="surface__title">System report</h2>
          <p className="surface__meta">Generated {formatTimestamp(report.generatedAt)}</p>
        </div>
        <span className="surface__meta">Read access for Admin, Analyst, and Viewer</span>
      </div>

      <div className="report-grid">
        <ReportMetric label="Total logs" value={totals.logs || 0} />
        <ReportMetric label="Total incidents" value={totals.incidents || 0} />
        <ReportMetric label="Critical incidents" value={totals.criticalIncidents || 0} />
        <ReportMetric label="Open incidents" value={totals.openIncidents || 0} />
      </div>

      <div className="report-panels">
        <ReportList
          title="Incidents by risk"
          items={Array.isArray(report.incidentsByRisk) ? report.incidentsByRisk : []}
          emptyText="No incidents have been detected yet."
        />
        <ReportList
          title="Incidents by status"
          items={Array.isArray(report.incidentsByStatus) ? report.incidentsByStatus : []}
          emptyText="No incident status data yet."
        />
        <ReportList
          title="Top log sources"
          items={Array.isArray(report.logsBySource) ? report.logsBySource : []}
          emptyText="No log source data yet."
        />
      </div>

      <div className="report-panel report-panel--wide">
        <h3 className="report-panel__title">Recent incident summary</h3>
        {recentIncidents.length === 0 ? (
          <p className="report-panel__empty">No recent incidents found.</p>
        ) : (
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Risk</th>
                  <th>Status</th>
                  <th>Source</th>
                  <th>Detected at</th>
                </tr>
              </thead>
              <tbody>
                {recentIncidents.map((incident) => (
                  <tr key={incident.id}>
                    <td>{incident.id}</td>
                    <td>
                      <span className={`badge badge--${String(incident.risk_level || 'info').toLowerCase()}`}>
                        {incident.risk_level}
                      </span>
                    </td>
                    <td>
                      <span className="badge badge--status">
                        {formatMetricLabel(incident.status)}
                      </span>
                    </td>
                    <td>{incident.source}</td>
                    <td>{formatTimestamp(incident.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </section>
  );
}

function Dashboard({ currentUser }) {
  const [logs, setLogs] = useState([]);
  const [incidents, setIncidents] = useState([]);
  const [analysts, setAnalysts] = useState([]);
  const [systemReport, setSystemReport] = useState(null);
  const [detectionRules, setDetectionRules] = useState([]);
  const [activeView, setActiveView] = useState('submit');
  const [connectionState, setConnectionState] = useState('loading');
  const [refreshing, setRefreshing] = useState(false);
  const [incidentFilter, setIncidentFilter] = useState('ALL');
  const [incidentQuery, setIncidentQuery] = useState('');
  const [logQuery, setLogQuery] = useState('');
  const [logSourceFilter, setLogSourceFilter] = useState('ALL');
  const [logRiskFilter, setLogRiskFilter] = useState('ALL');
  const [logDateFilter, setLogDateFilter] = useState('ALL');
  const canSubmitLogs = ['admin', 'analyst'].includes(currentUser?.role);
  const canManageUsers = currentUser?.role === 'admin';
  const canMitigate = ['admin', 'analyst'].includes(currentUser?.role);
  const canAssign = currentUser?.role === 'admin';
  const canUpdateStatus = ['admin', 'analyst'].includes(currentUser?.role);

  const loadData = useCallback(async () => {
    setRefreshing(true);

    try {
      const analystsRequest = canAssign ? fetchAnalysts() : Promise.resolve({ data: [] });
      const [logsResponse, incidentsResponse, reportResponse, rulesResponse, analystsResponse] = await Promise.all([
        fetchLogs(),
        fetchIncidents(),
        fetchSystemReport(),
        fetchDetectionRules(),
        analystsRequest,
      ]);

      setLogs(Array.isArray(logsResponse.data) ? logsResponse.data : []);
      setIncidents(Array.isArray(incidentsResponse.data) ? incidentsResponse.data : []);
      setSystemReport(reportResponse.data || null);
      setDetectionRules(Array.isArray(rulesResponse.data) ? rulesResponse.data : []);
      setAnalysts(Array.isArray(analystsResponse.data) ? analystsResponse.data : []);
      setConnectionState('online');
    } catch {
      setConnectionState('offline');
    } finally {
      setRefreshing(false);
    }
  }, [canAssign]);

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

  const logSourceOptions = Array.from(
    new Set(logs.map((log) => log.source).filter(Boolean))
  ).sort((first, second) => first.localeCompare(second));

  const filteredLogs = logs.filter((log) => {
    const riskLevel = classifyLogRisk(log.message, detectionRules);
    const matchesSource = logSourceFilter === 'ALL' || log.source === logSourceFilter;
    const matchesRisk = logRiskFilter === 'ALL' || riskLevel === logRiskFilter;
    const matchesDate = isWithinDateFilter(log.timestamp, logDateFilter);

    return (
      matchesSource &&
      matchesRisk &&
      matchesDate &&
      matchesQuery([log.id, log.message, log.source, log.timestamp, riskLevel], logQuery)
    );
  });

  function clearLogFilters() {
    setLogQuery('');
    setLogSourceFilter('ALL');
    setLogRiskFilter('ALL');
    setLogDateFilter('ALL');
  }

  async function handleApplyMitigation(incidentId, payload) {
    await applyIncidentMitigation(incidentId, payload);
    await loadData();
  }

  async function handleAssignIncident(incidentId, analystId) {
    await assignIncident(incidentId, analystId);
    await loadData();
  }

  async function handleUpdateStatus(incidentId, status) {
    await updateIncidentStatus(incidentId, status);
    await loadData();
  }

  async function handleUpdateRule(ruleId, payload) {
    await updateDetectionRule(ruleId, payload);
    await loadData();
  }

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
          <ViewTab
            active={activeView === 'reports'}
            label="Reports"
            onClick={() => setActiveView('reports')}
          />
          {canManageUsers && (
            <ViewTab
              active={activeView === 'users'}
              label="Users"
              onClick={() => setActiveView('users')}
            />
          )}
          {canManageUsers && (
            <ViewTab
              active={activeView === 'rules'}
              label="Rules"
              onClick={() => setActiveView('rules')}
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
          canMitigate={canMitigate}
          onApplyMitigation={handleApplyMitigation}
          canAssign={canAssign}
          analysts={analysts}
          onAssignIncident={handleAssignIncident}
          canUpdateStatus={canUpdateStatus}
          onUpdateStatus={handleUpdateStatus}
        />
      )}

      {activeView === 'logs' && (
        <LogsView
          logs={filteredLogs}
          totalCount={logs.length}
          query={logQuery}
          onQueryChange={setLogQuery}
          sourceFilter={logSourceFilter}
          sourceOptions={logSourceOptions}
          onSourceFilterChange={setLogSourceFilter}
          riskFilter={logRiskFilter}
          onRiskFilterChange={setLogRiskFilter}
          dateFilter={logDateFilter}
          onDateFilterChange={setLogDateFilter}
          onClearFilters={clearLogFilters}
          canSubmitLogs={canSubmitLogs}
          detectionRules={detectionRules}
        />
      )}

      {activeView === 'reports' && (
        <SystemReportView report={systemReport} loading={refreshing} />
      )}

      {activeView === 'users' && canManageUsers && (
        <AdminUsersPanel />
      )}

      {activeView === 'rules' && canManageUsers && (
        <RulesPanel rules={detectionRules} onUpdateRule={handleUpdateRule} />
      )}
    </div>
  );
}

export default Dashboard;
