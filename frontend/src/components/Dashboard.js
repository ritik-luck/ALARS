import React, { useCallback, useEffect, useState } from 'react';
import LogUpload from './LogUpload';
import IncidentTable from './IncidentTable';
import {
  createLiveEventSource,
  fetchIncidents,
  fetchLiveStreamStatus,
  fetchLogs,
  fetchMlStatus,
  startLiveStream,
  stopLiveStream,
} from '../api';
import { motion } from 'framer-motion';
import { Activity, AlertTriangle, ArrowRight, Clock, Database, FileText, Globe2, Link2, Play, Radio, Square } from 'lucide-react';
import SidePanel from './SidePanel';

const SOURCE_PRESETS = {
  wikipedia: {
    label: 'Wikipedia changes',
    sourceType: 'wikipedia',
    sourceName: 'wikipedia-recent-changes',
    sourceUrl: 'https://en.wikipedia.org/w/api.php?action=query&list=recentchanges&rcprop=title%7Ctimestamp%7Cuser%7Ccomment%7Cflags%7Cids%7Csizes%7Cloginfo&rclimit=30&format=json',
  },
  wikidata: {
    label: 'Wikidata changes',
    sourceType: 'public-url',
    sourceName: 'wikidata-recent-changes',
    sourceUrl: 'https://www.wikidata.org/w/api.php?action=query&list=recentchanges&rcprop=title%7Ctimestamp%7Cuser%7Ccomment%7Cflags%7Cids%7Csizes%7Cloginfo&rclimit=30&format=json',
  },
  mediawiki: {
    label: 'MediaWiki changes',
    sourceType: 'public-url',
    sourceName: 'mediawiki-recent-changes',
    sourceUrl: 'https://www.mediawiki.org/w/api.php?action=query&list=recentchanges&rcprop=title%7Ctimestamp%7Cuser%7Ccomment%7Cflags%7Cids%7Csizes%7Cloginfo&rclimit=30&format=json',
  },
  reddit: {
    label: 'Reddit r/sysadmin',
    sourceType: 'reddit',
    sourceName: 'reddit-sysadmin-new',
    sourceUrl: 'https://www.reddit.com/r/sysadmin/new.json?limit=30&raw_json=1',
  },
  stackoverflow: {
    label: 'StackOverflow questions',
    sourceType: 'stackoverflow',
    sourceName: 'stackoverflow-questions',
    sourceUrl: 'https://api.stackexchange.com/2.3/questions?order=desc&sort=creation&site=stackoverflow&pagesize=30',
  },
  earthquake: {
    label: 'USGS earthquakes',
    sourceType: 'earthquake',
    sourceName: 'usgs-earthquakes',
    sourceUrl: 'https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/all_hour.geojson',
  },
  github: {
    label: 'GitHub events',
    sourceType: 'github',
    sourceName: 'github-public-events',
    sourceUrl: '',
  },
  custom: {
    label: 'Custom public URL',
    sourceType: 'public-url',
    sourceName: 'custom-public-url',
    sourceUrl: '',
  },
};

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

function parseStreamPayload(event) {
  try {
    return JSON.parse(event.data);
  } catch {
    return null;
  }
}

function prependUniqueById(items, item, maxItems = 500) {
  if (!item?.id) {
    return items;
  }

  return [
    item,
    ...items.filter((existing) => existing.id !== item.id),
  ].slice(0, maxItems);
}

function prependLiveEvent(events, event, maxItems = 100) {
  const eventKey = event.externalId || event.log?.id || event.streamedAt;

  if (!eventKey) {
    return events;
  }

  return [
    { ...event, eventKey },
    ...events.filter((existing) => existing.eventKey !== eventKey),
  ].slice(0, maxItems);
}

function buildLiveSourceConfig(sourcePreset, sourceUrl) {
  const preset = SOURCE_PRESETS[sourcePreset] || SOURCE_PRESETS.wikipedia;

  return {
    sourceType: preset.sourceType,
    sourceName: preset.sourceName,
    sourceUrl: sourcePreset === 'custom' ? sourceUrl.trim() : preset.sourceUrl,
  };
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

function LiveStreamView({
  events,
  status,
  connectionState,
  actionLoading,
  error,
  sourcePreset,
  sourceUrl,
  onSourcePresetChange,
  onSourceUrlChange,
  onToggle,
}) {
  const isRunning = Boolean(status?.running);
  const lastError = error || status?.lastError?.message;
  const selectedPreset = SOURCE_PRESETS[sourcePreset] || SOURCE_PRESETS.wikipedia;
  const isCustomSource = sourcePreset === 'custom';
  const effectiveSourceUrl = isCustomSource ? sourceUrl : selectedPreset.sourceUrl;
  const connectionLabel =
    connectionState === 'connected'
      ? 'SSE connected'
      : connectionState === 'reconnecting'
        ? 'SSE reconnecting'
        : 'SSE connecting';

  return (
    <section>
      <div className="surface__header" style={{ marginBottom: '2rem', alignItems: 'flex-start', gap: '1rem' }}>
        <div>
          <h2 className="surface__title text-gradient">Live External Stream</h2>
          <div style={{ marginTop: '0.65rem', display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
            <span className={`status-chip status-chip--${isRunning ? 'online' : 'offline'}`}>
              <span className="pulse-dot" style={{ color: isRunning ? 'var(--brand)' : 'var(--muted)' }} />
              {isRunning ? 'Running' : 'Stopped'}
            </span>
            <span className={`status-chip status-chip--${connectionState}`}>
              <span className="pulse-dot" style={{ color: connectionState === 'connected' ? 'var(--info)' : 'var(--warning)' }} />
              {connectionLabel}
            </span>
            <span className="status-chip">
              <Radio size={14} />
              {status?.source || 'external-source'}
            </span>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
          <div style={{ minWidth: '220px' }}>
            <select
              className="select-input"
              value={sourcePreset}
              onChange={(event) => onSourcePresetChange(event.target.value)}
              disabled={isRunning || actionLoading}
              aria-label="Live source preset"
            >
              {Object.entries(SOURCE_PRESETS).map(([key, preset]) => (
                <option key={key} value={key}>{preset.label}</option>
              ))}
            </select>
          </div>
          <button
            className={isRunning ? 'button-ghost' : 'button-primary'}
            type="button"
            onClick={onToggle}
            disabled={actionLoading || (!isRunning && isCustomSource && !sourceUrl.trim())}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '0.65rem', minWidth: '148px', justifyContent: 'center' }}
          >
            {isRunning ? <Square size={16} /> : <Play size={16} />}
            {actionLoading ? 'Working...' : isRunning ? 'Stop live' : 'Extract live'}
          </button>
        </div>
      </div>

      <div className="surface" style={{ padding: '1rem', marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', marginBottom: '0.75rem', color: 'var(--muted)', fontSize: '0.82rem', fontWeight: 600 }}>
          {isCustomSource ? <Link2 size={16} /> : <Globe2 size={16} />}
          {isCustomSource ? 'Public JSON, text, RSS, or XML URL' : 'Selected public source URL'}
        </div>
        {isCustomSource ? (
          <input
            className="text-input"
            type="url"
            value={sourceUrl}
            onChange={(event) => onSourceUrlChange(event.target.value)}
            placeholder="https://example.com/public-logs.json"
            disabled={isRunning || actionLoading}
          />
        ) : (
          <div style={{ fontFamily: 'monospace', color: 'var(--muted)', fontSize: '0.82rem', wordBreak: 'break-all' }}>
            {effectiveSourceUrl || 'Built-in GitHub public events endpoint'}
          </div>
        )}
        {status?.sourceUrl && (
          <div style={{ marginTop: '0.75rem', color: 'var(--muted)', fontSize: '0.78rem', wordBreak: 'break-all' }}>
            Active: {status.sourceUrl}
          </div>
        )}
      </div>

      <div
        className="form-grid"
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
          gap: '1rem',
          marginBottom: '1.5rem',
        }}
      >
        {[
          ['Fetched this run', status?.totalFetched || 0],
          ['Processed', status?.totalProcessed || 0],
          ['Queued', status?.queueDepth || 0],
          ['Dropped', status?.totalDropped || 0],
          ['Errors', status?.totalErrors || 0],
        ].map(([label, value]) => (
          <div key={label} className="surface" style={{ padding: '1rem' }}>
            <div style={{ color: 'var(--muted)', fontSize: '0.75rem', marginBottom: '0.4rem' }}>{label}</div>
            <div style={{ fontSize: '1.35rem', fontWeight: 700 }}>{value}</div>
          </div>
        ))}
      </div>

      {lastError && (
        <div className="message--error" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
          <AlertTriangle size={18} />
          {lastError}
        </div>
      )}

      {events.length === 0 ? (
        <div className="empty-state-modern">
          <Activity size={64} />
          <h3 style={{ fontSize: '1.25rem', color: 'var(--text)', marginBottom: '0.5rem' }}>No Live Events Yet</h3>
          <p>Streamed logs will appear here as they are classified.</p>
        </div>
      ) : (
        <motion.div
          className="form-grid"
          style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '1.25rem' }}
          variants={containerVariants}
          initial="hidden"
          animate="show"
        >
          {events.map((event) => {
            const riskLevel = event.analysis?.riskLevel || 'INFO';
            const isCritical = riskLevel === 'CRITICAL' || riskLevel === 'HIGH';

            return (
              <motion.div key={event.eventKey} variants={cardVariants} className="surface hover-lift" style={{ padding: '1.25rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem', marginBottom: '1rem' }}>
                  <span className={`badge badge--${riskLevel.toLowerCase()} ${isCritical ? 'pulse' : ''}`}>
                    {riskLevel}
                  </span>
                  <span style={{ color: 'var(--muted)', fontSize: '0.75rem', whiteSpace: 'nowrap' }}>
                    {formatTimestamp(event.streamedAt)}
                  </span>
                </div>

                <div style={{ background: 'rgba(0,0,0,0.22)', padding: '0.85rem', borderRadius: 'var(--radius-sm)', fontSize: '0.86rem', color: 'var(--muted)', marginBottom: '1rem', fontFamily: 'monospace', lineHeight: 1.5, overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: 4, WebkitBoxOrient: 'vertical' }}>
                  {event.log?.message}
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem', color: 'var(--muted)', fontSize: '0.75rem' }}>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', minWidth: 0 }}>
                    <Database size={14} />
                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {event.log?.source}
                    </span>
                  </span>
                  <span>{event.analysis?.method || 'classifier'}</span>
                </div>
              </motion.div>
            );
          })}
        </motion.div>
      )}
    </section>
  );
}

function LogsView({ logs, totalCount, query, onQueryChange, onSelectLog, selectedLogId }) {
  return (
    <section>
      <div className="surface__header" style={{ marginBottom: '2rem' }}>
        <h2 className="surface__title text-gradient">Log History</h2>
        <div className="surface__toolbar">
          <span className="surface__meta">{logs.length} of {totalCount}</span>
          <input
            className="text-input text-input--compact"
            type="search"
            value={query}
            onChange={(event) => onQueryChange(event.target.value)}
            placeholder="Search logs..."
          />
        </div>
      </div>

      {logs.length === 0 ? (
        <div className="empty-state-modern">
          <FileText size={64} />
          <h3 style={{ fontSize: '1.25rem', color: 'var(--text)', marginBottom: '0.5rem' }}>No Logs Found</h3>
          <p>Submit a log or clear the search input.</p>
        </div>
      ) : (
        <motion.div 
          className="form-grid" 
          style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1.25rem' }}
          variants={containerVariants}
          initial="hidden"
          animate="show"
        >
          {logs.map((log) => (
            <motion.div 
              key={log.id} 
              variants={cardVariants} 
              className={`surface hover-lift ${selectedLogId === log.id ? 'surface--selected' : ''}`} 
              onClick={() => onSelectLog(log)}
              style={{ 
                padding: '1.25rem', display: 'flex', flexDirection: 'column', height: '100%', 
                cursor: 'pointer',
                borderColor: selectedLogId === log.id ? 'var(--brand)' : 'var(--surface-border)',
                background: selectedLogId === log.id ? 'rgba(16, 185, 129, 0.05)' : 'rgba(255, 255, 255, 0.03)'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                <span className="badge badge--info">Log #{log.id}</span>
                <ArrowRight size={16} style={{ opacity: 0.3 }} />
              </div>

              <div style={{ background: 'rgba(0,0,0,0.2)', padding: '0.75rem', borderRadius: 'var(--radius-sm)', fontSize: '0.875rem', color: 'var(--muted)', marginBottom: '1.25rem', fontFamily: 'monospace', overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical' }}>
                {log.message}
              </div>

              <div style={{ marginTop: 'auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.75rem', color: 'var(--muted)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                  <Database size={14} /> {log.source}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                  <Clock size={14} /> {formatTimestamp(log.timestamp)}
                </div>
              </div>
            </motion.div>
          ))}
        </motion.div>
      )}
    </section>
  );
}

function Dashboard() {
  const [logs, setLogs] = useState([]);
  const [incidents, setIncidents] = useState([]);
  const [liveEvents, setLiveEvents] = useState([]);
  const [liveStatus, setLiveStatus] = useState(null);
  const [liveConnectionState, setLiveConnectionState] = useState('connecting');
  const [liveActionLoading, setLiveActionLoading] = useState(false);
  const [liveError, setLiveError] = useState('');
  const [sourcePreset, setSourcePreset] = useState('wikipedia');
  const [sourceUrl, setSourceUrl] = useState('');
  const [activeView, setActiveView] = useState('submit');
  const [connectionState, setConnectionState] = useState('loading');
  const [mlState, setMlState] = useState('loading');
  const [mlLabel, setMlLabel] = useState('ML loading');
  const [refreshing, setRefreshing] = useState(false);
  const [incidentFilter, setIncidentFilter] = useState('ALL');
  const [incidentQuery, setIncidentQuery] = useState('');
  const [logQuery, setLogQuery] = useState('');
  const [selectedLog, setSelectedLog] = useState(null);
  const [isPanelOpen, setIsPanelOpen] = useState(false);

  const handleSelectLog = (log) => {
    setSelectedLog(log);
    setIsPanelOpen(true);
  };

  const loadData = useCallback(async () => {
    setRefreshing(true);

    let hasSuccessfulConnection = false;

    try {
      const logsResponse = await fetchLogs();
      setLogs(Array.isArray(logsResponse.data) ? logsResponse.data : []);
      hasSuccessfulConnection = true;
    } catch {
      setLogs([]);
    }

    try {
      const incidentsResponse = await fetchIncidents();
      setIncidents(Array.isArray(incidentsResponse.data) ? incidentsResponse.data : []);
      hasSuccessfulConnection = true;
    } catch (error) {
      if (error?.response?.status === 401) {
        setIncidents([]);
      }
    }

    setConnectionState(hasSuccessfulConnection ? 'online' : 'offline');

    try {
      const mlResponse = await fetchMlStatus();
      const mlData = mlResponse.data || {};

      if (mlData.available && mlData.modelLoaded) {
        setMlState('online');
        setMlLabel(`ML ready${mlData.modelName ? `: ${mlData.modelName}` : ''}`);
      } else if (mlData.available) {
        setMlState('loading');
        setMlLabel('ML service not loaded');
      } else {
        setMlState('offline');
        setMlLabel('ML offline, fallback mode');
      }
    } catch {
      setMlState('offline');
      setMlLabel('ML offline, fallback mode');
    }

    try {
      const liveResponse = await fetchLiveStreamStatus();
      setLiveStatus(liveResponse.data || null);
      setLiveError('');
    } catch (error) {
      setLiveError(error?.message || 'Live stream status unavailable');
    } finally {
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    const eventSource = createLiveEventSource();
    setLiveConnectionState('connecting');

    eventSource.onopen = () => {
      setLiveConnectionState('connected');
      setLiveError('');
    };

    eventSource.addEventListener('live:status', (event) => {
      const payload = parseStreamPayload(event);
      if (payload) {
        setLiveStatus(payload);
      }
    });

    eventSource.addEventListener('live:log', (event) => {
      const payload = parseStreamPayload(event);
      if (!payload?.log) {
        return;
      }

      const liveLog = {
        ...payload.log,
        analysis: payload.analysis || payload.log.analysis,
        streamedAt: payload.streamedAt,
        external: payload.external,
      };

      setLogs((currentLogs) => prependUniqueById(currentLogs, liveLog));
      setLiveEvents((currentEvents) =>
        prependLiveEvent(currentEvents, {
          ...payload,
          log: liveLog,
        })
      );

      if (payload.incident) {
        setIncidents((currentIncidents) =>
          prependUniqueById(currentIncidents, payload.incident)
        );
      }
    });

    eventSource.addEventListener('live:error', (event) => {
      const payload = parseStreamPayload(event);
      setLiveError(payload?.message || 'Live stream error');
    });

    eventSource.onerror = () => {
      setLiveConnectionState('reconnecting');
    };

    return () => {
      eventSource.close();
    };
  }, []);

  const handleToggleLiveStream = async () => {
    setLiveActionLoading(true);
    setLiveError('');

    try {
      const response = liveStatus?.running
        ? await stopLiveStream()
        : await startLiveStream(buildLiveSourceConfig(sourcePreset, sourceUrl));

      if (!liveStatus?.running) {
        setLiveEvents([]);
      }
      setLiveStatus(response.data?.status || null);
    } catch (error) {
      setLiveError(error?.response?.data?.error || error.message || 'Live stream action failed');
    } finally {
      setLiveActionLoading(false);
    }
  };

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
            active={activeView === 'live'}
            label={`Live (${liveEvents.length})`}
            onClick={() => setActiveView('live')}
          />
          <ViewTab
            active={activeView === 'logs'}
            label={`Logs (${logs.length})`}
            onClick={() => setActiveView('logs')}
          />
        </div>

        <div className="dashboard-bar__actions">
          <span className={`status-chip status-chip--${connectionState}`} style={{ display: 'flex', gap: '0.5rem' }}>
            <div className="pulse-dot" style={{ color: connectionState === 'online' ? 'var(--brand)' : 'var(--danger)' }}></div>
            {connectionState === 'online'
              ? 'Backend Live'
              : connectionState === 'offline'
                ? 'Offline'
                : 'Loading'}
          </span>
          <span className={`status-chip status-chip--${mlState}`} style={{ display: 'flex', gap: '0.5rem' }}>
            <div className="pulse-dot" style={{ color: mlState === 'online' ? 'var(--info)' : 'var(--danger)' }}></div>
            {mlLabel}
          </span>
          <span className={`status-chip status-chip--${liveStatus?.running ? 'online' : 'offline'}`} style={{ display: 'flex', gap: '0.5rem' }}>
            <div className="pulse-dot" style={{ color: liveStatus?.running ? 'var(--brand)' : 'var(--muted)' }}></div>
            {liveStatus?.running ? 'Stream Live' : 'Stream Stopped'}
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

      {activeView === 'live' && (
        <LiveStreamView
          events={liveEvents}
          status={liveStatus}
          connectionState={liveConnectionState}
          actionLoading={liveActionLoading}
          error={liveError}
          sourcePreset={sourcePreset}
          sourceUrl={sourceUrl}
          onSourcePresetChange={setSourcePreset}
          onSourceUrlChange={setSourceUrl}
          onToggle={handleToggleLiveStream}
        />
      )}

      {activeView === 'logs' && (
        <LogsView
          logs={filteredLogs}
          totalCount={logs.length}
          query={logQuery}
          onQueryChange={setLogQuery}
          onSelectLog={handleSelectLog}
          selectedLogId={selectedLog?.id}
        />
      )}

      <SidePanel 
        isOpen={isPanelOpen} 
        onClose={() => setIsPanelOpen(false)} 
        log={selectedLog}
        analysis={selectedLog?.analysis}
        onActionSuccess={loadData}
      />
    </div>
  );
}

export default Dashboard;
