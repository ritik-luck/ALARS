import React from 'react';

const FILTERS = ['ALL', 'CRITICAL', 'HIGH', 'MEDIUM', 'LOW'];

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
  return String(value || '').replace(/\b\w/g, (char) => char.toUpperCase());
}

function IncidentTable({
  incidents,
  totalCount,
  countsBySeverity,
  severityFilter,
  onSeverityChange,
  searchValue,
  onSearchChange,
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
                <th>Detected at</th>
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
                  <td>{formatTimestamp(incident.created_at)}</td>
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
