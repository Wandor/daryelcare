const express = require('express');
const router = express.Router();
const svc = require('../services/applicationService');

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const ALLOWED_STAGES = ['new', 'form-submitted', 'checks', 'review', 'approved', 'blocked', 'registered'];
const ALLOWED_TIMELINE_TYPES = ['action', 'complete', 'alert', 'note'];

// GET /api/applications
router.get('/', async (req, res) => {
  try {
    const apps = await svc.getAllApplications();
    res.json(apps);
  } catch (err) {
    console.error('GET /api/applications error:', err);
    res.status(500).json({ error: 'Failed to load applications' });
  }
});

// GET /api/applications/:id
router.get('/:id', async (req, res) => {
  try {
    const app = await svc.getApplication(req.params.id);
    if (!app) return res.status(404).json({ error: 'Application not found' });
    res.json(app);
  } catch (err) {
    console.error('GET /api/applications/:id error:', err);
    res.status(500).json({ error: 'Failed to load application' });
  }
});

// POST /api/applications
router.post('/', async (req, res) => {
  try {
    const body = req.body;

    const firstName = typeof body.personal?.firstName === 'string' ? body.personal.firstName.trim() : '';
    const lastName = typeof body.personal?.lastName === 'string' ? body.personal.lastName.trim() : '';
    const email = typeof body.personal?.email === 'string' ? body.personal.email.trim() : '';

    if (!firstName || !lastName || !email) {
      return res.status(400).json({ error: 'First name, last name, and email are required' });
    }

    if (firstName.length > 200) {
      return res.status(400).json({ error: 'First name must not exceed 200 characters' });
    }
    if (lastName.length > 200) {
      return res.status(400).json({ error: 'Last name must not exceed 200 characters' });
    }
    if (email.length > 254) {
      return res.status(400).json({ error: 'Email must not exceed 254 characters' });
    }
    if (!EMAIL_RE.test(email)) {
      return res.status(400).json({ error: 'Invalid email format' });
    }

    // Write trimmed values back so downstream code uses sanitized data
    body.personal.firstName = firstName;
    body.personal.lastName = lastName;
    body.personal.email = email;

    const id = await svc.createApplication(body);
    res.status(201).json({ id, message: 'Application submitted successfully' });
  } catch (err) {
    console.error('POST /api/applications error:', err);
    res.status(500).json({ error: 'Failed to create application' });
  }
});

// PATCH /api/applications/:id
router.patch('/:id', async (req, res) => {
  try {
    if (req.body.stage !== undefined && !ALLOWED_STAGES.includes(req.body.stage)) {
      return res.status(400).json({ error: 'Invalid stage value' });
    }

    const updated = await svc.updateApplication(req.params.id, req.body);
    if (!updated) return res.status(404).json({ error: 'Application not found or no valid fields' });
    res.json({ message: 'Application updated' });
  } catch (err) {
    console.error('PATCH /api/applications/:id error:', err);
    res.status(500).json({ error: 'Failed to update application' });
  }
});

// DELETE /api/applications/:id
router.delete('/:id', async (req, res) => {
  try {
    const deleted = await svc.deleteApplication(req.params.id);
    if (!deleted) return res.status(404).json({ error: 'Application not found' });
    res.json({ message: 'Application deleted' });
  } catch (err) {
    console.error('DELETE /api/applications/:id error:', err);
    res.status(500).json({ error: 'Failed to delete application' });
  }
});

// POST /api/applications/:id/timeline
router.post('/:id/timeline', async (req, res) => {
  try {
    const { event, type } = req.body;
    if (!event) return res.status(400).json({ error: 'Event text is required' });

    if (typeof event === 'string' && event.length > 2000) {
      return res.status(400).json({ error: 'Event text must not exceed 2000 characters' });
    }
    if (type !== undefined && !ALLOWED_TIMELINE_TYPES.includes(type)) {
      return res.status(400).json({ error: 'Invalid timeline event type' });
    }

    const entry = await svc.addTimelineEvent(req.params.id, event, type);
    res.status(201).json(entry);
  } catch (err) {
    console.error('POST /api/applications/:id/timeline error:', err);
    res.status(500).json({ error: 'Failed to add timeline event' });
  }
});

module.exports = router;
