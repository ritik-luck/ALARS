import React, { useState } from 'react';
import { submitLog } from '../api';

const API_TARGET = process.env.REACT_APP_API_BASE || 'http://127.0.0.1:5000/api';

const SAMPLE_SCENARIOS = [
  {
    id: '',
    label: 'Choose a sample',
    message: '',
    source: '',
  },
  {
    id: 'critical',
    label: 'Critical outage',
    message: 'CRITICAL: Memory usage exceeded 95% - system unstable',
    source: 'compute-cluster',
  },
  {
    id: 'high',
    label: 'Database error',
    message: 'ERROR: Database connection timed out after 30s',
    source: 'db-gateway',
  },
  {
    id: 'medium',
    label: 'Service failure',
    message: 'FAIL: Authentication service is unavailable',
    source: 'auth-service',
  },
  {
    id: 'info',
    label: 'Informational event',
    message: 'INFO: Scheduled backup completed successfully',
    source: 'scheduler',
  },
];

function LogUpload({ onLogSubmitted }) {
  const [selectedScenario, setSelectedScenario] = useState('');
  const [message, setMessage] = useState('');
  const [source, setSource] = useState('');
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  function handleScenarioChange(scenarioId) {
    const scenario = SAMPLE_SCENARIOS.find((item) => item.id === scenarioId);

    setSelectedScenario(scenarioId);
    setResult(null);
    setError('');

    if (!scenario || !scenario.id) {
      return;
    }

    setMessage(scenario.message);
    setSource(scenario.source);
  }

  function resetForm() {
    setSelectedScenario('');
    setMessage('');
    setSource('');
    setResult(null);
    setError('');
  }

  async function handleSubmit(event) {
    event.preventDefault();

    if (!message.trim()) {
      setError('Enter a log message before submitting.');
      return;
    }

    setLoading(true);
    setError('');
    setResult(null);

    try {
      const response = await submitLog(message.trim(), source.trim() || 'manual');
      setResult(response.data);

      if (onLogSubmitted) {
        await onLogSubmitted(response.data);
      }
    } catch (submissionError) {
      setError(
        submissionError.response?.data?.error ||
          `Could not reach the backend at ${API_TARGET}. Make sure the Node.js server is running.`
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="surface">
      <div className="surface__header">
        <h2 className="surface__title">Submit log</h2>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="form-grid">
          <label className="field" htmlFor="sample-select">
            <span className="field__label">Sample</span>
            <select
              id="sample-select"
              className="select-input"
              value={selectedScenario}
              onChange={(event) => handleScenarioChange(event.target.value)}
            >
              {SAMPLE_SCENARIOS.map((scenario) => (
                <option key={scenario.label} value={scenario.id}>
                  {scenario.label}
                </option>
              ))}
            </select>
          </label>

          <label className="field" htmlFor="source-input">
            <span className="field__label">Source</span>
            <input
              id="source-input"
              className="text-input"
              type="text"
              value={source}
              onChange={(event) => setSource(event.target.value)}
              placeholder="Example: auth-service"
            />
          </label>
        </div>

        <label className="field" htmlFor="message-input">
          <span className="field__label">Message</span>
          <textarea
            id="message-input"
            className="text-area"
            value={message}
            onChange={(event) => setMessage(event.target.value)}
            placeholder="Example: ERROR: Database connection failed"
            required
          />
          <span className="field__helper">
            Use `CRITICAL`, `ERROR`, or `FAIL` to trigger an incident.
          </span>
        </label>

        <div className="button-row">
          <button className="button-primary" type="submit" disabled={loading}>
            {loading ? 'Submitting...' : 'Submit'}
          </button>
          <button className="button-ghost" type="button" onClick={resetForm}>
            Clear
          </button>
        </div>

        {error && <div className="message message--error">{error}</div>}
      </form>

      {result && (
        <section className="result-panel">
          <div className="result-panel__row">
            <span className="result-pill">Saved log #{result.log.id}</span>
            {result.incident ? (
              <span className="result-pill result-pill--alert">
                Incident #{result.incident.id} - {result.incident.riskLevel}
              </span>
            ) : (
              <span className="result-pill">No incident</span>
            )}
          </div>

          {result.alert && (
            <div className="alert-box">{result.alert.alertMessage}</div>
          )}
        </section>
      )}
    </section>
  );
}

export default LogUpload;
