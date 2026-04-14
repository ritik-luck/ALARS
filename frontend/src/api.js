import axios from 'axios';
import { getToken } from './auth';

const API_BASE = process.env.REACT_APP_API_BASE || 'http://127.0.0.1:5000/api';

function authHeaders() {
  const token = getToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

// Submit a new log entry
export const submitLog = (message, source = 'manual') =>
  axios.post(`${API_BASE}/logs`, { message, source }, { headers: authHeaders() });

// Fetch all logs
export const fetchLogs = () =>
  axios.get(`${API_BASE}/logs`, { headers: authHeaders() });

// Fetch all incidents
export const fetchIncidents = () =>
  axios.get(`${API_BASE}/incidents`, { headers: authHeaders() });

// Fetch analysts for admin incident assignment
export const fetchAnalysts = () =>
  axios.get(`${API_BASE}/incidents/analysts`, { headers: authHeaders() });

// Assign incident to analyst
export const assignIncident = (incidentId, analystId) =>
  axios.patch(`${API_BASE}/incidents/${incidentId}/assign`, { analystId }, { headers: authHeaders() });

// Update incident workflow status
export const updateIncidentStatus = (incidentId, status) =>
  axios.patch(`${API_BASE}/incidents/${incidentId}/status`, { status }, { headers: authHeaders() });

// Apply analyst mitigation action
export const applyIncidentMitigation = (incidentId, payload) =>
  axios.patch(`${API_BASE}/incidents/${incidentId}/mitigation`, payload, { headers: authHeaders() });

// Fetch generated system report
export const fetchSystemReport = () =>
  axios.get(`${API_BASE}/reports/system`, { headers: authHeaders() });

// Detection rule endpoints
export const fetchDetectionRules = () =>
  axios.get(`${API_BASE}/rules`, { headers: authHeaders() });

export const updateDetectionRule = (ruleId, payload) =>
  axios.patch(`${API_BASE}/rules/${ruleId}`, payload, { headers: authHeaders() });

// Auth endpoints
export const login = (username, password) =>
  axios.post(`${API_BASE}/auth/login`, { username, password });

export const register = (username, password, role = 'viewer') =>
  axios.post(`${API_BASE}/auth/register`, { username, password, role }, { headers: authHeaders() });

export const fetchCurrentUser = () =>
  axios.get(`${API_BASE}/auth/me`, { headers: authHeaders() });
