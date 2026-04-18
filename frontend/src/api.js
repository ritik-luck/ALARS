import axios from 'axios';

const API_BASE = 'http://localhost:5000/api';
const LIVE_EVENTS_URL = `${API_BASE}/live/events`;

export const submitLog = (message, source = 'manual') =>
  axios.post(`${API_BASE}/logs`, { message, source });

export const submitLogBatch = (entries, source = 'upload') =>
  axios.post(`${API_BASE}/logs/batch`, { entries, source });

export const fetchLogs = () =>
  axios.get(`${API_BASE}/logs`);

export const fetchIncidents = () =>
  axios.get(`${API_BASE}/incidents`);

export const fetchMlStatus = () =>
  axios.get(`${API_BASE}/logs/ml-status`);

export const fetchLiveStreamStatus = () =>
  axios.get(`${API_BASE}/live/status`);

export const startLiveStream = (config = {}) =>
  axios.post(`${API_BASE}/live/start`, config);

export const stopLiveStream = () =>
  axios.post(`${API_BASE}/live/stop`);

export const createLiveEventSource = () =>
  new EventSource(LIVE_EVENTS_URL);

export const promoteLog = (logId, riskLevel) =>
  axios.post(`${API_BASE}/incidents/promote`, { log_id: logId, risk_level: riskLevel });

export const notifyLog = (logId, riskLevel, message) =>
  axios.post(`${API_BASE}/logs/${logId}/notify`, { risk_level: riskLevel, message });
