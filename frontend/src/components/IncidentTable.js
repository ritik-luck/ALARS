import React, { useState } from 'react';

const FILTERS = ['ALL', 'CRITICAL', 'HIGH', 'MEDIUM', 'LOW'];
const MITIGATION_ACTIONS = [
  { value: '', label: 'Select action' },
  { value: 'block_ip', label: 'Block suspicious IP' },
  { value: 'reset_password', label: 'Reset user password' },
  { value: 'enable_mfa', label: 'Enable MFA' },
  { value: 'rate_limit', label: 'Apply rate limiting' },
  { value: 'isolate_host', label: 'Isolate host' },
  { value: 'monitor', label: 'Monitor activity' },
];
const STATUS_OPTIONS = [
  { value: 'open', label: 'Open' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'resolved', label: 'Resolved' },
];

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

function toTitleCase(value) {
  return String(value || '').replace(/_/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase());
}

function MitigationForm({ incident, onApplyMitigation }) {
  const [action, setAction] = useState(incident.mitigation_action || '');
  const [status, setStatus] = useState(incident.status || 'in_progress');
  const [notes, setNotes] = useState(incident.mitigation_notes || '');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    setError('');

    if (!action) {
      setError('Choose a mitigation action.');
      return;
    }

    setLoading(true);
    try {
      await onApplyMitigation(incident.id, { action, status, notes });
    } catch (mitigationError) {
      setError(mitigationError.response?.data?.error || 'Could not apply mitigation.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <form className="mitigation-form" onSubmit={handleSubmit}>
      <select
        className="select-input select-input--compact"
        value={action}
        onChange={(event) => setAction(event.target.value)}
      >
        {MITIGATION_ACTIONS.map((item) => (
          <option key={item.value} value={item.value}>
            {item.label}
          </option>
        ))}
      </select>
      <select
        className="select-input select-input--compact"
        value={status}
        onChange={(event) => setStatus(event.target.value)}
      >
        {STATUS_OPTIONS.map((item) => (
          <option key={item.value} value={item.value}>
            {item.label}
          </option>
        ))}
      </select>
      <input
        className="text-input text-input--compact"
        type="text"
        value={notes}
        onChange={(event) => setNotes(event.target.value)}
        placeholder="Notes"
      />
      <button className="button-ghost button-ghost--compact" type="submit" disabled={loading}>
        {loading ? 'Applying...' : 'Apply'}
      </button>
      {error && <span className="mitigation-form__error">{error}</span>}
    </form>
  );
}

function IncidentTable({
  incidents,
  totalCount,
  countsBySeverity,
  severityFilter,
  onSeverityChange,
  searchValue,
  onSearchChange,
  canMitigate,
  onApplyMitigation,
}) {
  return (
    <section className="surface">
      <div className="surface__header">
        <h2 className="surface__title">Incident queue</h2>
        <div className="surface__toolbar">
          <span className="surface__meta">{incidents.length} of {totalCount}</span>
          <select
            className="select-input select-input--compact"
            value={severityFilter}
            onChange={(event) => onSeverityChange(event.target.value)}
          >
            {FILTERS.map((filter) => (
              <option key={filter} value={filter}>
                {filter}
                {filter === 'ALL' ? ` (${totalCount})` : ` (${countsBySeverity[filter] || 0})`}
              </option>
            ))}
          </select>
          <input
            className="text-input text-input--compact"
            type="search"
            value={searchValue}
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder="Search incidents"
          />
        </div>
      </div>

      {incidents.length === 0 ? (
        <div className="empty-state">
          <strong>No incidents found.</strong>
          <p>Change the filter or submit a new risky log.</p>
        </div>
      ) : (
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Message</th>
                <th>Source</th>
                <th>Risk</th>
                <th>Status</th>
                <th>Mitigation</th>
                <th>Detected at</th>
                {canMitigate && <th>Action</th>}
              </tr>
            </thead>
            <tbody>
              {incidents.map((incident) => (
                <tr key={incident.id}>
                  <td>{incident.id}</td>
                  <td className="data-table__message-cell">{incident.log_message}</td>
                  <td>{incident.source}</td>
                  <td>
                    <span className={`badge badge--${incident.risk_level.toLowerCase()}`}>
                      {incident.risk_level}
                    </span>
                  </td>
                  <td>
                    <span className="badge badge--status">
                      {toTitleCase(incident.status)}
                    </span>
                  </td>
                  <td>
                    {incident.mitigation_action ? (
                      <div className="mitigation-summary">
                        <strong>{toTitleCase(incident.mitigation_action)}</strong>
                        {incident.mitigation_notes && <span>{incident.mitigation_notes}</span>}
                        {incident.mitigated_at && <small>{formatTimestamp(incident.mitigated_at)}</small>}
                      </div>
                    ) : (
                      <span className="surface__meta">Not applied</span>
                    )}
                  </td>
                  <td>{formatTimestamp(incident.created_at)}</td>
                  {canMitigate && (
                    <td>
                      <MitigationForm
                        incident={incident}
                        onApplyMitigation={onApplyMitigation}
                      />
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

export default IncidentTable;
