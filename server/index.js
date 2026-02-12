require('dotenv').config();

const express = require('express');
const path = require('path');
const { initSchema } = require('./db');
const applicationsRouter = require('./routes/applications');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json({ limit: '1mb' }));
app.use(express.static(path.join(__dirname, '..', 'public')));

// API routes
app.use('/api/applications', applicationsRouter);

// Friendly route aliases
app.get('/register', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'public', 'childminder-registration-complete.html'));
});
app.get('/admin', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'public', 'cma-portal-v2.html'));
});

async function start() {
  try {
    await initSchema();
    app.listen(PORT, () => {
      console.log(`Server running on http://localhost:${PORT}`);
      console.log(`  Register: http://localhost:${PORT}/register`);
      console.log(`  Admin:    http://localhost:${PORT}/admin`);
    });
  } catch (err) {
    console.error('Failed to start:', err.message);
    process.exit(1);
  }
}

start();
