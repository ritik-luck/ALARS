import React, { useState } from 'react';
import { X, ShieldAlert, Cpu, MessageSquare, Bell, ArrowUpRight, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { promoteLog, notifyLog } from '../api';
import { useAuth } from '../context/AuthContext';

const SidePanel = ({ isOpen, onClose, log, analysis, onActionSuccess }) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState(null); // { type: 'success' | 'error', message: string }

  if (!log) return null;

  const isCritical = analysis?.riskLevel === 'CRITICAL' || analysis?.riskLevel === 'HIGH';
  const isViewer = user?.role === 'viewer';

  const handlePromote = async () => {
    if (isViewer || loading) return;
    setLoading(true);
    setFeedback(null);
    try {
      await promoteLog(log.id, analysis?.riskLevel || 'MEDIUM');
      setFeedback({ type: 'success', message: 'Successfully promoted to Incident!' });
      if (onActionSuccess) onActionSuccess();
    } catch (err) {
      setFeedback({ 
        type: 'error', 
        message: err.response?.data?.error || 'Failed to promote log to incident.' 
      });
    } finally {
      setLoading(false);
    }
  };

  const handleNotify = async () => {
    if (isViewer || loading) return;
    setLoading(true);
    setFeedback(null);
    try {
      await notifyLog(log.id, analysis?.riskLevel || 'INFO');
      setFeedback({ type: 'success', message: 'Notification alert sent successfully!' });
      if (onActionSuccess) onActionSuccess();
    } catch (err) {
      setFeedback({ 
        type: 'error', 
        message: err.response?.data?.error || 'Failed to trigger notification.' 
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="side-panel-backdrop"
          />
          <motion.div 
            initial={{ x: '110%' }}
            animate={{ x: 0 }}
            exit={{ x: '110%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            className="side-panel side-panel--open"
          >
            <div className="side-panel__header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <span className="badge badge--info">Log Detail #{log.id}</span>
                {analysis && (
                  <span className={`badge badge--${analysis.riskLevel.toLowerCase()} ${isCritical ? 'pulse' : ''}`}>
                    {analysis.riskLevel}
                  </span>
                )}
              </div>
              <button onClick={onClose} className="button-ghost" style={{ padding: '0.5rem', borderRadius: '50%' }}>
                <X size={20} />
              </button>
            </div>

            <div className="side-panel__content">
              {feedback && (
                <motion.div 
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  style={{ 
                    padding: '1rem', 
                    borderRadius: 'var(--radius-sm)', 
                    marginBottom: '1.5rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.75rem',
                    background: feedback.type === 'success' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                    border: `1px solid ${feedback.type === 'success' ? 'var(--brand)' : 'var(--danger)'}`,
                    color: feedback.type === 'success' ? 'var(--brand)' : 'var(--danger)',
                    fontSize: '0.875rem'
                  }}
                >
                  {feedback.type === 'success' ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
                  {feedback.message}
                </motion.div>
              )}

              {/* Raw Log Viewer */}
              <section style={{ marginBottom: '2rem' }}>
                <h4 style={{ fontSize: '0.75rem', color: 'var(--muted)', textTransform: 'uppercase', marginBottom: '1rem', letterSpacing: '0.05em' }}>Raw Log Entry</h4>
                <div style={{ 
                  background: 'rgba(0,0,0,0.3)', 
                  padding: '1.25rem', 
                  borderRadius: 'var(--radius-sm)', 
                  fontFamily: 'monospace', 
                  fontSize: '0.875rem',
                  lineHeight: '1.6',
                  border: '1px solid rgba(255,255,255,0.05)',
                  wordBreak: 'break-all'
                }}>
                  {log.message}
                </div>
              </section>

              {/* Analysis Scores */}
              {analysis && (
                <section style={{ marginBottom: '2rem', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div className="surface" style={{ padding: '1rem' }}>
                    <div style={{ fontSize: '0.75rem', color: 'var(--muted)', marginBottom: '0.5rem' }}>Confidence</div>
                    <div style={{ fontSize: '1.25rem', fontWeight: 'bold', color: 'var(--brand)' }}>
                      {(analysis.confidence * 100).toFixed(1)}%
                    </div>
                  </div>
                  <div className="surface" style={{ padding: '1rem' }}>
                    <div style={{ fontSize: '0.75rem', color: 'var(--muted)', marginBottom: '0.5rem' }}>Risk Score</div>
                    <div style={{ fontSize: '1.25rem', fontWeight: 'bold', color: analysis.riskScore > 70 ? 'var(--danger)' : 'var(--warning)' }}>
                      {analysis.riskScore || 'N/A'}/100
                    </div>
                  </div>
                </section>
              )}

              {/* Mitigation Suggestions */}
              <section style={{ marginBottom: '2rem' }}>
                <h4 style={{ fontSize: '0.75rem', color: 'var(--muted)', textTransform: 'uppercase', marginBottom: '1rem', letterSpacing: '0.05em', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <ShieldAlert size={14} /> Recommended Mitigation
                </h4>
                <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  {(analysis?.mitigationSuggestions || ['Monitor traffic for further anomalies', 'Verify source node health']).map((sug, i) => (
                    <li key={i} style={{ 
                      display: 'flex', gap: '0.75rem', padding: '1rem', background: 'rgba(255,255,255,0.02)', 
                      border: '1px solid rgba(255,255,255,0.05)', borderRadius: 'var(--radius-md)', fontSize: '0.875rem' 
                    }}>
                      <div style={{ color: 'var(--brand)', marginTop: '0.2rem' }}>•</div>
                      {sug}
                    </li>
                  ))}
                </ul>
              </section>

              {/* Resolution Notes */}
              <section style={{ marginBottom: '2rem' }}>
                <h4 style={{ fontSize: '0.75rem', color: 'var(--muted)', textTransform: 'uppercase', marginBottom: '1rem', letterSpacing: '0.05em', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <MessageSquare size={14} /> Resolution Notes
                </h4>
                <textarea 
                  className="text-area" 
                  placeholder="Add technical notes or incident updates..."
                  style={{ minHeight: '100px', background: 'rgba(0,0,0,0.2)' }}
                />
              </section>
            </div>

            <div className="side-panel__footer">
              {isViewer ? (
                <div style={{ 
                  padding: '1.25rem', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)',
                  borderRadius: 'var(--radius-sm)', fontSize: '0.8125rem', color: 'var(--muted)', textAlign: 'center' 
                }}>
                  <ShieldAlert size={14} style={{ marginBottom: '0.4rem', opacity: 0.5 }} />
                  <br/>
                  Action restricted. Viewer role has read-only access.
                </div>
              ) : (
                <div style={{ display: 'flex', gap: '1rem' }}>
                  <button 
                    className="button-primary" 
                    onClick={handlePromote}
                    disabled={loading}
                    style={{ 
                      flex: 2, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.75rem',
                      height: '48px', fontSize: '0.9375rem', fontWeight: '600',
                      boxShadow: loading ? 'none' : '0 8px 16px -4px rgba(16, 185, 129, 0.4)'
                    }}
                  >
                    {loading ? <Loader2 size={18} className="animate-spin" /> : <ArrowUpRight size={18} />}
                    {loading ? 'Processing...' : 'Promote to Incident'}
                  </button>
                  <button 
                    className="button-ghost" 
                    onClick={handleNotify}
                    disabled={loading}
                    style={{ 
                      flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.6rem',
                      height: '48px', fontSize: '0.9375rem', fontWeight: '600'
                    }}
                  >
                    {loading ? <Loader2 size={18} className="animate-spin" /> : <Bell size={18} />}
                    {loading ? '' : 'Notify'}
                  </button>
                </div>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default SidePanel;
