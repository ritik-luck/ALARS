require('dotenv').config();
const express = require('express');
const cors = require('cors');

const logRoutes = require('./routes/logRoutes');
const incidentRoutes = require('./routes/incidentRoutes');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use('/api/logs', logRoutes);
app.use('/api/incidents', incidentRoutes);

// Health check
app.get('/', (req, res) => {
  res.json({ message: 'ALARS API is running', version: '1.0.0' });
});

app.listen(PORT, () => {
  console.log(`ALARS Backend running on http://localhost:${PORT}`);
});
