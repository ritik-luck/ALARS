require('dotenv').config();
const express = require('express');
const cors = require('cors');

const logRoutes = require('./routes/logRoutes');
const incidentRoutes = require('./routes/incidentRoutes');
const liveStreamRoutes = require('./routes/liveStreamRoutes');
const liveStreamService = require('./services/liveStreamService');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/users', require('./routes/userRoutes'));
app.use('/api/rules', require('./routes/ruleRoutes'));
app.use('/api/reports', require('./routes/reportRoutes'));
app.use('/api/logs', logRoutes);
app.use('/api/incidents', incidentRoutes);
app.use('/api/live', liveStreamRoutes);

// Health check
app.get('/', (req, res) => {
  res.json({ message: 'ALARS API is running', version: '1.0.0' });
});

app.listen(PORT, () => {
  console.log(`ALARS Backend running on http://localhost:${PORT}`);
  if (process.env.LIVE_STREAM_AUTOSTART === 'true') {
    liveStreamService.start();
    console.log('Live external log stream auto-started.');
  }
});
