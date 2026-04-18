import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ShieldAlert, Database, Clock } from 'lucide-react';

import CustomDropdown from './CustomDropdown';

const FILTERS = ['ALL', 'CRITICAL', 'HIGH', 'MEDIUM', 'LOW'];

const SEVERITY_OPTIONS = FILTERS.map(f => ({
  value: f,
  label: f === 'ALL' ? 'All Severities' : f.charAt(0) + f.slice(1).toLowerCase()
}));

function formatTimestamp(value) {
  if (!value) return 'Not available';
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? 'Not available' : parsed.toLocaleString();
}

function toTitleCase(value) {
  return String(value || '').replace(/_/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase());
}

// Framer Motion Variants for Staggered Load
const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.05 }
  }
};

const cardVariants = {
  hidden: { opacity: 0, scale: 0.9, y: 30 },
  show: { 
    opacity: 1, 
    scale: 1, 
    y: 0,
    transition: { type: "spring", stiffness: 300, damping: 24 }
  }
};

function IncidentTable({
  incidents,
  totalCount,
  countsBySeverity,
  severityFilter,
  onSeverityChange,
  searchValue,
  onSearchChange,
}) {
  const dropdownOptions = SEVERITY_OPTIONS.map(opt => ({
    ...opt,
    label: opt.value === 'ALL' ? `All Severities (${totalCount})` : `${opt.label} (${countsBySeverity[opt.value] || 0})`
  }));

  return (
    <section>
      <div className="surface__header" style={{ marginBottom: '2rem' }}>
        <h2 className="surface__title text-gradient">Incident Queue</h2>
        <div className="surface__toolbar" style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
          <span className="surface__meta">{incidents.length} of {totalCount}</span>
          
          <div style={{ width: '220px' }}>
            <CustomDropdown 
              options={dropdownOptions}
              value={severityFilter}
              onChange={onSeverityChange}
              placeholder="Filter by severity"
            />
          </div>

          <input
            className="text-input text-input--compact"
            type="search"
            value={searchValue}
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder="Search incidents..."
            style={{ width: '240px' }}
          />
        </div>
      </div>

      {incidents.length === 0 ? (
        <div className="empty-state-modern">
          <ShieldAlert size={64} />
          <h3 style={{ fontSize: '1.25rem', color: 'var(--text)', marginBottom: '0.5rem' }}>No Incidents Found</h3>
          <p>Everything is secure. Adjust your filters to see historical data.</p>
        </div>
      ) : (
        <motion.div 
          className="form-grid" 
          style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1.5rem' }}
          variants={containerVariants}
          initial="hidden"
          animate="show"
        >
          {incidents.map((incident) => (
            <motion.div key={incident.id} variants={cardVariants}>
              <Link to={`/incidents/${incident.id}`} style={{ textDecoration: 'none', color: 'inherit', display: 'block' }}>
                <div className="surface hover-lift" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', height: '100%', cursor: 'pointer' }}>
                  
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                    <span className={`badge badge--${incident.risk_level.toLowerCase()} ${incident.risk_level === 'CRITICAL' ? 'pulse' : ''}`}>
                      {incident.risk_level}
                    </span>
                    <span style={{ 
                      fontSize: '0.75rem', fontWeight: 'bold', padding: '0.25rem 0.5rem', borderRadius: '4px',
                      background: incident.status === 'resolved' ? 'var(--brand-soft)' : incident.status === 'in_progress' ? 'var(--warning-soft)' : 'var(--danger-soft)',
                      color: incident.status === 'resolved' ? 'var(--brand)' : incident.status === 'in_progress' ? 'var(--warning)' : 'var(--danger)'
                    }}>
                      {toTitleCase(incident.status)}
                    </span>
                  </div>

                  <h3 style={{ fontSize: '1.1rem', fontWeight: 'bold', margin: '0 0 1rem 0', color: 'var(--text)' }}>
                    Incident #{incident.id}
                  </h3>

                  <div style={{ background: 'var(--surface-strong)', padding: '0.75rem', borderRadius: 'var(--radius-sm)', fontSize: '0.875rem', color: 'var(--muted)', marginBottom: '1.25rem', fontFamily: 'monospace', overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                    {incident.log_message}
                  </div>

                  <div style={{ marginTop: 'auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.75rem', color: 'var(--muted)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                      <Database size={14} /> {incident.source}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                      <Clock size={14} /> {formatTimestamp(incident.created_at)}
                    </div>
                  </div>

                </div>
              </Link>
            </motion.div>
          ))}
        </motion.div>
      )}
    </section>
  );
}

export default IncidentTable;
