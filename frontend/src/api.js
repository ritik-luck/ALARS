import axios from 'axios';

const API_BASE = 'http://localhost:5000/api';

// Submit a new log entry
export const submitLog = (message, source = 'manual') =>
  axios.post(`${API_BASE}/logs`, { message, source });

// Fetch all logs
export const fetchLogs = () =>
  axios.get(`${API_BASE}/logs`);

// Fetch all incidents
export const fetchIncidents = () =>
  axios.get(`${API_BASE}/incidents`);
