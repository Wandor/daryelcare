const express = require('express');
const router = express.Router();
const svc = require('../services/applicationService');

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
    if (!body.personal?.firstName || !body.personal?.lastName || !body.personal?.email) {
      return res.status(400).json({ error: 'First name, last name, and email are required' });
    }
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
    const entry = await svc.addTimelineEvent(req.params.id, event, type);
    res.status(201).json(entry);
  } catch (err) {
    console.error('POST /api/applications/:id/timeline error:', err);
    res.status(500).json({ error: 'Failed to add timeline event' });
  }
});

module.exports = router;
