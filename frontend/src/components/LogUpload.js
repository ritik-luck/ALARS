import React, { useState } from 'react';
import { submitLog, submitLogBatch } from '../api';
import { motion } from 'framer-motion';
import { 
  Activity, 
  ShieldAlert, 
  Cpu, 
  Layers, 
  UploadCloud, 
  FileType, 
  CheckCircle2, 
  X 
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import CustomDropdown from './CustomDropdown';

const SAMPLE_SCENARIOS = [
  {
    id: '',
    label: 'Choose a sample',
    message: '',
    source: '',
  },
  {
    id: 'normal-receiving',
    label: 'HDFS normal: receiving block',
    message:
      'Receiving block blk_-1608999687919862906 src: /10.250.19.102:54106 dest: /10.250.19.102:50010',
    source: 'hdfs-datanode',
  },
  {
    id: 'normal-received',
    label: 'HDFS normal: received block',
    message:
      'Received block blk_-1608999687919862906 of size 91178 from /10.250.19.102',
    source: 'hdfs-packet-responder',
  },
  {
    id: 'anomaly-terminating',
    label: 'HDFS anomaly-like: responder terminating',
    message:
      'PacketResponder 1 for block blk_-1608999687919862906 terminating',
    source: 'hdfs-packet-responder',
  },
  {
    id: 'anomaly-warning',
    label: 'HDFS anomaly-like: block scanner warning',
    message:
      'Verification failed for blk_-3544583377289625738 due to checksum mismatch',
    source: 'hdfs-block-scanner',
  },
];

function formatPercent(value) {
  if (value === null || value === undefined || Number.isNaN(Number(value))) {
    return 'N/A';
  }
  return `${(Number(value) * 100).toFixed(1)}%`;
}

function formatScore(value) {
  if (value === null || value === undefined || Number.isNaN(Number(value))) {
    return 'N/A';
  }
  return Number(value).toFixed(1);
}

function AnalysisPanel({ analysis }) {
  if (!analysis) return null;

  const isCritical = analysis.riskLevel === 'CRITICAL' || analysis.riskLevel === 'HIGH';

  return (
    <motion.div 
      initial={{ opacity: 0, y: 30, scale: 0.98 }} 
      animate={{ opacity: 1, y: 0, scale: 1 }} 
      transition={{ type: "spring", stiffness: 100 }} 
      className="analysis-panel" 
      style={{ marginTop: '2rem' }}
    >
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.5rem', marginBottom: '1.5rem' }}>
        
        {/* ML Confidence Visualizer */}
        <div className="surface hover-lift" style={{ padding: '1.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
            <span style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Cpu size={16}/> ML Confidence
            </span>
            <strong style={{ color: 'var(--brand)' }}>{formatPercent(analysis.confidence)}</strong>
          </div>
          <div className="confidence-track">
            <motion.div 
              initial={{ width: 0 }} 
              animate={{ width: `${analysis.confidence * 100}%` }} 
              transition={{ duration: 1.2, delay: 0.2, type: "spring" }} 
              className="confidence-fill"
            ></motion.div>
          </div>
        </div>

        {/* Anomaly Probability Visualizer */}
        <div className="surface hover-lift" style={{ padding: '1.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
            <span style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Activity size={16}/> Anomaly Probability
            </span>
            <strong style={{ color: isCritical ? 'var(--danger)' : 'var(--warning)' }}>{formatPercent(analysis.anomalyProbability)}</strong>
          </div>
          <div className="confidence-track">
            <motion.div 
              initial={{ width: 0 }} 
              animate={{ width: `${analysis.anomalyProbability * 100}%` }} 
              transition={{ duration: 1.2, delay: 0.3, type: "spring" }} 
              className="confidence-fill" 
              style={{ background: 'linear-gradient(90deg, #fcd34d, #f59e0b, #ef4444)' }}
            ></motion.div>
          </div>
        </div>

        {/* Risk & Prediction */}
        <div className="surface hover-lift" style={{ padding: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>Risk Assessment</div>
            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
              <span className={`badge badge--${(analysis.riskLevel || 'INFO').toLowerCase()} ${isCritical ? 'pulse' : ''}`}>
                {analysis.riskLevel || 'INFO'}
              </span>
              <span className="result-pill" style={{ padding: '0.25rem 0.75rem', fontSize: '0.75rem' }}>
                {analysis.binaryPrediction || 'Normal'}
              </span>
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>Risk Score</div>
            <strong style={{ fontSize: '1.5rem', color: 'var(--text-primary)' }}>{formatScore(analysis.riskScore)}</strong>
            <span style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>/100</span>
          </div>
        </div>

      </div>

      {analysis.mlError && (
        <div className="message message--error" style={{ marginBottom: '1.5rem' }}>
          <ShieldAlert size={16} /> ML Service Offline: Fallback mapping applied ({analysis.mlError})
        </div>
      )}

      {analysis.topFeatures?.length > 0 && (
        <div className="surface" style={{ padding: '1.5rem' }}>
          <span style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
            <Layers size={16}/> Top Contributing Features
          </span>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
            {analysis.topFeatures.map((feature, idx) => (
              <motion.span 
                initial={{ opacity: 0, scale: 0.8 }} 
                animate={{ opacity: 1, scale: 1 }} 
                transition={{ delay: 0.1 * idx }}
                key={`${feature.feature}-${feature.contribution}`} 
                style={{ 
                  background: 'rgba(255,255,255,0.03)', 
                  border: '1px solid var(--surface-border)', 
                  padding: '0.5rem 1rem', 
                  borderRadius: '999px', 
                  fontSize: '0.875rem', 
                  display: 'flex', 
                  gap: '0.5rem' 
                }}
              >
                <span style={{ color: 'var(--text-primary)' }}>{feature.feature}</span>
                <span style={{ color: 'var(--brand)' }}>{feature.contribution.toFixed(3)}</span>
              </motion.span>
            ))}
          </div>
        </div>
      )}
    </motion.div>
  );
}

function BatchResultPanel({ batchResult }) {
  if (!batchResult) return null;

  const previewRows = batchResult.results.slice(0, 8);

  return (
    <section className="result-panel" style={{ marginTop: '2rem' }}>
      <div className="surface__header surface__header--compact">
        <h3 className="surface__title surface__title--compact">File upload summary</h3>
        <span className="surface__meta">
          {batchResult.summary.totalProcessed} lines processed
        </span>
      </div>

      <div className="analysis-grid">
        <div className="analysis-card">
          <span className="analysis-card__label">Incidents</span>
          <strong>{batchResult.summary.incidentsCreated}</strong>
        </div>
        <div className="analysis-card">
          <span className="analysis-card__label">Alerts</span>
          <strong>{batchResult.summary.alertsCreated}</strong>
        </div>
        <div className="analysis-card">
          <span className="analysis-card__label">ML processed</span>
          <strong>{batchResult.summary.methods.ml}</strong>
        </div>
        <div className="analysis-card">
          <span className="analysis-card__label">Fallback processed</span>
          <strong>{batchResult.summary.methods['keyword-fallback']}</strong>
        </div>
      </div>

      <div className="feature-list" style={{ marginTop: '1rem' }}>
        {Object.entries(batchResult.summary.riskLevels).map(([level, count]) => (
          <span key={level} className="result-pill" style={{ marginRight: '0.5rem' }}>
            {level}: {count}
          </span>
        ))}
      </div>

      <div className="table-wrap upload-table-wrap" style={{ marginTop: '1.5rem' }}>
        <table className="data-table">
          <thead>
            <tr>
              <th>Log ID</th>
              <th>Risk</th>
              <th>Prediction</th>
              <th>Probability</th>
              <th>Message</th>
            </tr>
          </thead>
          <tbody>
            {previewRows.map((row) => (
              <tr key={row.log.id}>
                <td>{row.log.id}</td>
                <td><span className={`badge badge--${row.analysis.riskLevel.toLowerCase()}`}>{row.analysis.riskLevel}</span></td>
                <td>{row.analysis.binaryPrediction}</td>
                <td>{formatPercent(row.analysis.anomalyProbability)}</td>
                <td className="data-table__message-cell">{row.log.message}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function LogUpload({ onLogSubmitted }) {
  const { user } = useAuth();
  const [selectedScenario, setSelectedScenario] = useState('');
  const [message, setMessage] = useState('');
  const [source, setSource] = useState('');
  const [selectedFile, setSelectedFile] = useState(null);
  const [result, setResult] = useState(null);
  const [batchResult, setBatchResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [uploadingFile, setUploadingFile] = useState(false);
  const [error, setError] = useState('');

  const isViewer = user?.role === 'viewer';

  function handleScenarioChange(scenarioId) {
    const scenario = SAMPLE_SCENARIOS.find((item) => item.id === scenarioId);

    setSelectedScenario(scenarioId);
    setResult(null);
    setBatchResult(null);
    setError('');

    if (!scenario || !scenario.id) {
      setMessage('');
      setSource('');
      return;
    }

    setMessage(scenario.message);
    setSource(scenario.source);
  }

  function handleFileChange(event) {
    const file = event.target.files?.[0] || null;
    if (!file) return;

    // Validation: Type (.log, .txt) and Size (<5MB)
    const validTypes = ['.log', '.txt'];
    const extension = file.name.substring(file.name.lastIndexOf('.')).toLowerCase();
    
    if (!validTypes.includes(extension)) {
      setError('Invalid file type. Please upload a .log or .txt file.');
      setSelectedFile(null);
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setError('File size too large. Maximum limit is 5MB.');
      setSelectedFile(null);
      return;
    }

    setSelectedFile(file);
    setBatchResult(null);
    setResult(null);
    setError('');
  }

  function handleRemoveFile() {
    setSelectedFile(null);
    setBatchResult(null);
    setError('');
    const input = document.getElementById('file-input');
    if (input) input.value = '';
  }

  function resetForm() {
    setSelectedScenario('');
    setMessage('');
    setSource('');
    setSelectedFile(null);
    setResult(null);
    setBatchResult(null);
    setError('');
  }

  async function handleSubmit(event) {
    event.preventDefault();

    if (isViewer) return;

    if (!message.trim()) {
      setError('Enter a log message before submitting.');
      return;
    }

    setLoading(true);
    setError('');
    setResult(null);
    setBatchResult(null);

    try {
      const response = await submitLog(message.trim(), source.trim() || 'manual');
      setResult(response.data);

      if (onLogSubmitted) {
        await onLogSubmitted(response.data);
      }
    } catch (submissionError) {
      setError(
        submissionError.response?.data?.error ||
        'Could not reach the backend. Make sure the Node.js server is running on port 5000.'
      );
    } finally {
      setLoading(false);
    }
  }

  async function handleFileUpload() {
    if (isViewer || !selectedFile) return;

    setUploadingFile(true);
    setError('');
    setResult(null);
    setBatchResult(null);

    try {
      const content = await selectedFile.text();
      const entries = content
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter(Boolean)
        .map((line) => ({
          message: line,
          source: source.trim() || selectedFile.name,
        }));

      if (entries.length === 0) {
        setError('The selected file does not contain any non-empty log lines.');
        return;
      }

      const response = await submitLogBatch(entries, source.trim() || selectedFile.name);
      setBatchResult(response.data);

      if (onLogSubmitted) {
        await onLogSubmitted(response.data);
      }
    } catch (submissionError) {
      setError(
        submissionError.response?.data?.error ||
        'Could not upload the file. Make sure the backend and ML service are running.'
      );
    } finally {
      setUploadingFile(false);
    }
  }

  const dropdownOptions = SAMPLE_SCENARIOS.map(s => ({ value: s.id, label: s.label }));

  return (
    <section className="surface" style={{ padding: '2rem' }}>
      <div className="surface__header">
        <h2 className="surface__title">System Log Analysis</h2>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="form-grid">
          <label className="field" htmlFor="sample-select">
            <span className="field__label">Sample Scenario</span>
            <CustomDropdown
              options={dropdownOptions}
              value={selectedScenario}
              onChange={handleScenarioChange}
              placeholder="Choose a sample..."
            />
          </label>

          <label className="field" htmlFor="source-input">
            <span className="field__label">Log Source</span>
            <input
              id="source-input"
              className="text-input"
              type="text"
              value={source}
              onChange={(event) => setSource(event.target.value)}
              placeholder="e.g. hdfs-datanode"
            />
          </label>
        </div>

        <label className="field" htmlFor="message-input" style={{ marginTop: '1rem' }}>
          <span className="field__label">Log Message</span>
          <textarea
            id="message-input"
            className="text-area"
            value={message}
            onChange={(event) => setMessage(event.target.value)}
            placeholder="Paste your log message here..."
            required
            style={{ height: '100px' }}
          />
        </label>

        <div style={{ display: 'flex', gap: '1rem', marginTop: '1.5rem', marginBottom: '2rem' }}>
          <button 
            className="button-primary" 
            type="submit" 
            disabled={loading || isViewer}
            style={{ position: 'relative', minWidth: '140px' }}
          >
            {loading ? (
              <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <div className="pulse-dot"></div> Analyzing...
              </span>
            ) : 'Analyze Log'}
          </button>
          <button className="button-ghost" type="button" onClick={resetForm} disabled={isViewer || loading}>
            Clear
          </button>
        </div>
      </form>

      {/* Premium Batch Analysis UI Overhaul */}
      <div className="surface" style={{ 
        padding: '2rem', 
        background: 'rgba(255,255,255,0.01)', 
        border: '1px solid rgba(255,255,255,0.05)',
        borderRadius: 'var(--radius-lg)',
        marginTop: '2rem',
        position: 'relative',
        overflow: 'hidden'
      }}>
        {/* Decorative Background Glow */}
        <div style={{ 
          position: 'absolute', top: '-50%', left: '-20%', width: '140%', height: '140%', 
          background: 'radial-gradient(circle, rgba(16, 185, 129, 0.03) 0%, transparent 70%)',
          pointerEvents: 'none'
        }}></div>

        <div style={{ position: 'relative', zIndex: 1 }}>
          <h3 style={{ 
            fontSize: '1.125rem', 
            fontWeight: '600', 
            marginBottom: '1.5rem', 
            display: 'flex', 
            alignItems: 'center', 
            gap: '0.75rem',
            color: 'var(--text-primary)'
          }}>
            <UploadCloud size={22} style={{ color: 'var(--brand)' }} /> 
            Mass Log Analysis 
            <span style={{ fontSize: '0.75rem', fontWeight: '400', color: 'var(--muted)', marginLeft: '0.5rem' }}>
              (Batch Mode)
            </span>
          </h3>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            {!selectedFile ? (
              <motion.div 
                whileHover={{ scale: 1.005, borderColor: 'rgba(16, 185, 129, 0.3)' }}
                whileTap={{ scale: 0.995 }}
                style={{ position: 'relative', cursor: isViewer ? 'not-allowed' : 'pointer' }}
              >
                <input
                  id="file-input"
                  type="file"
                  accept=".log,.txt"
                  onChange={handleFileChange}
                  disabled={isViewer || uploadingFile}
                  style={{ position: 'absolute', inset: 0, opacity: 0, cursor: 'inherit', zIndex: 2 }}
                />
                <div className="hover-glow" style={{ 
                  padding: '3rem 2rem', 
                  borderRadius: 'var(--radius-md)', 
                  background: 'rgba(255,255,255,0.02)', 
                  border: '2px dashed rgba(255,255,255,0.1)', 
                  textAlign: 'center', 
                  display: 'flex', 
                  flexDirection: 'column', 
                  alignItems: 'center', 
                  gap: '1rem',
                  transition: 'all 0.3s ease'
                }}>
                  <div style={{ 
                    width: '64px', height: '64px', borderRadius: '16px', background: 'rgba(16, 185, 129, 0.05)', 
                    display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '0.5rem'
                  }}>
                    <FileType size={32} style={{ color: 'var(--brand)', opacity: 0.8 }} />
                  </div>
                  <div>
                    <div style={{ fontSize: '1rem', fontWeight: '600', color: 'white', marginBottom: '0.35rem' }}>
                      Drop log file here or click to browse
                    </div>
                    <div style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>
                      Supports <code style={{ color: 'var(--brand)' }}>.log</code>, <code style={{ color: 'var(--brand)' }}>.txt</code> files up to 5MB
                    </div>
                  </div>
                </div>
              </motion.div>
            ) : (
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                style={{ 
                  padding: '1.25rem', borderRadius: 'var(--radius-md)', background: 'rgba(16, 185, 129, 0.03)', 
                  border: '1px solid rgba(16, 185, 129, 0.15)', display: 'flex', alignItems: 'center', gap: '1.25rem' 
                }}
              >
                <div style={{ 
                  width: '48px', height: '48px', borderRadius: '12px', background: 'rgba(16, 185, 129, 0.1)', 
                  display: 'flex', alignItems: 'center', justifyContent: 'center' 
                }}>
                  <CheckCircle2 size={24} style={{ color: 'var(--brand)' }} />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '1rem', fontWeight: '600', color: 'white' }}>{selectedFile.name}</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--brand)', opacity: 0.8, display: 'flex', alignItems: 'center', gap: '0.4rem', marginTop: '0.2rem' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>Size:</span> {(selectedFile.size / 1024).toFixed(1)} KB 
                    <span style={{ color: 'var(--text-secondary)', marginLeft: '0.5rem' }}>• Ready for processing</span>
                  </div>
                </div>
                <button 
                  className="button-ghost" 
                  onClick={handleRemoveFile}
                  disabled={uploadingFile}
                  title="Remove file"
                  style={{ 
                    padding: '0.6rem', paddingLeft: '1rem', paddingRight: '1rem', 
                    borderRadius: 'var(--radius-sm)', color: 'var(--danger)', 
                    background: 'rgba(239, 68, 68, 0.05)', display: 'flex', alignItems: 'center', gap: '0.5rem'
                  }}
                >
                  <X size={16} /> <span style={{ fontSize: '0.75rem' }}>Remove</span>
                </button>
              </motion.div>
            )}

            <button
              className="button-primary"
              type="button"
              onClick={handleFileUpload}
              disabled={uploadingFile || isViewer || !selectedFile}
              style={{ 
                width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.75rem', 
                height: '52px', fontSize: '1rem', fontWeight: '600',
                background: !selectedFile ? 'rgba(255,255,255,0.05)' : 'linear-gradient(135deg, var(--brand), var(--accent))',
                boxShadow: !selectedFile ? 'none' : '0 10px 20px -5px rgba(16, 185, 129, 0.3)',
                opacity: !selectedFile ? 0.5 : 1
              }}
            >
              {uploadingFile ? (
                <>
                  <div className="pulse-dot"></div> Executing Deep Analysis...
                </>
              ) : (
                <>
                  <Layers size={20} /> Start Batch Processing
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {isViewer && (
        <div className="message message--info" style={{ marginTop: '1.5rem' }}>
          Logged in as <strong>Viewer</strong>. Submission is restricted to Analysts and Admins.
        </div>
      )}

      {error && (
        <motion.div 
          initial={{ opacity: 0, y: 10 }} 
          animate={{ opacity: 1, y: 0 }} 
          className="message message--error" 
          style={{ marginTop: '1.5rem' }}
        >
          <ShieldAlert size={16} /> {error}
        </motion.div>
      )}

      {result && (
        <section style={{ marginTop: '2rem' }}>
          <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem' }}>
            <span className="result-pill">ID #{result.log.id}</span>
            {result.incident && (
              <span className="result-pill" style={{ borderColor: 'var(--danger)', color: 'var(--danger)' }}>
                Incident #{result.incident.id}
              </span>
            )}
          </div>
          
          <AnalysisPanel analysis={result.analysis} />
        </section>
      )}

      {batchResult && <BatchResultPanel batchResult={batchResult} />}
    </section>
  );
}

export default LogUpload;
