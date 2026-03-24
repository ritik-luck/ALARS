require('dotenv').config();
const express = require('express');
const cors = require('cors');

const logRoutes = require('./routes/logRoutes');
const incidentRoutes = require('./routes/incidentRoutes');
const authRoutes = require('./routes/authRoutes');

const app = express();
const HOST = process.env.HOST || '127.0.0.1';
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use('/api/logs', logRoutes);
app.use('/api/incidents', incidentRoutes);
app.use('/api/auth', authRoutes);

// Health check
//checking
app.get('/', (req, res) => {
  res.json({ message: 'ALARS API is running', version: '1.0.0' });
});

const server = app.listen(PORT, HOST, () => {
  console.log(`ALARS Backend running on http://${HOST}:${PORT}`);
});

server.on('error', (error) => {
  console.error(`Failed to start backend on http://${HOST}:${PORT}`);
  console.error(error.message);
  process.exit(1);
});
