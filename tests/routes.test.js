/**
 * Integration tests for API routes.
 * The service layer and database are fully mocked.
 */

jest.mock('../server/db', () => ({
  pool: { query: jest.fn(), connect: jest.fn() },
  initSchema: jest.fn().mockResolvedValue(),
}));

jest.mock('../server/services/applicationService');

const request = require('supertest');
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const svc = require('../server/services/applicationService');
const applicationsRouter = require('../server/routes/applications');

let app;

beforeAll(() => {
  app = express();
  app.use(helmet());
  app.use(cors());
  app.use(express.json({ limit: '1mb' }));
  app.get('/health', (req, res) => res.json({ status: 'ok' }));
  app.use('/api/applications', applicationsRouter);
  // Global error handler matching production setup.
  app.use((err, req, res, next) => {
    res.status(500).json({ error: 'Internal server error' });
  });
});

afterEach(() => {
  jest.clearAllMocks();
});

// ── Health endpoint ──

describe('GET /health', () => {
  it('returns 200 with status ok', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: 'ok' });
  });
});

// ── Security headers ──

describe('Security headers', () => {
  it('includes X-Content-Type-Options', async () => {
    const res = await request(app).get('/health');
    expect(res.headers['x-content-type-options']).toBe('nosniff');
  });

  it('includes X-Frame-Options', async () => {
    const res = await request(app).get('/health');
    expect(res.headers['x-frame-options']).toBeDefined();
  });
});

// ── GET /api/applications ──

describe('GET /api/applications', () => {
  it('returns 200 with array', async () => {
    svc.getAllApplications.mockResolvedValue([{ id: 'RK-2026-00001' }]);
    const res = await request(app).get('/api/applications');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body).toHaveLength(1);
  });

  it('returns 500 when service throws', async () => {
    svc.getAllApplications.mockRejectedValue(new Error('DB down'));
    const res = await request(app).get('/api/applications');
    expect(res.status).toBe(500);
    expect(res.body.error).toBeDefined();
  });
});

// ── GET /api/applications/:id ──

describe('GET /api/applications/:id', () => {
  it('returns 200 with application', async () => {
    const mockApp = { id: 'RK-2026-00001', name: 'Test' };
    svc.getApplication.mockResolvedValue(mockApp);
    const res = await request(app).get('/api/applications/RK-2026-00001');
    expect(res.status).toBe(200);
    expect(res.body.id).toBe('RK-2026-00001');
  });

  it('returns 404 when not found', async () => {
    svc.getApplication.mockResolvedValue(null);
    const res = await request(app).get('/api/applications/DOES-NOT-EXIST');
    expect(res.status).toBe(404);
    expect(res.body.error).toMatch(/not found/i);
  });
});

// ── POST /api/applications ──

describe('POST /api/applications', () => {
  const validBody = {
    personal: {
      firstName: 'Jane',
      lastName: 'Doe',
      email: 'jane@example.com',
    },
  };

  it('returns 201 on valid input', async () => {
    svc.createApplication.mockResolvedValue('RK-2026-00001');
    const res = await request(app)
      .post('/api/applications')
      .send(validBody);
    expect(res.status).toBe(201);
    expect(res.body.id).toBe('RK-2026-00001');
    expect(res.body.message).toBeDefined();
  });

  it('returns 400 when firstName is missing', async () => {
    const res = await request(app)
      .post('/api/applications')
      .send({ personal: { lastName: 'Doe', email: 'j@e.com' } });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/required/i);
  });

  it('returns 400 when lastName is missing', async () => {
    const res = await request(app)
      .post('/api/applications')
      .send({ personal: { firstName: 'Jane', email: 'j@e.com' } });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/required/i);
  });

  it('returns 400 when email is missing', async () => {
    const res = await request(app)
      .post('/api/applications')
      .send({ personal: { firstName: 'Jane', lastName: 'Doe' } });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/required/i);
  });

  it('returns 400 when personal object is missing entirely', async () => {
    const res = await request(app)
      .post('/api/applications')
      .send({});
    expect(res.status).toBe(400);
  });

  it('returns 400 when firstName exceeds 200 chars', async () => {
    const res = await request(app)
      .post('/api/applications')
      .send({
        personal: {
          firstName: 'A'.repeat(201),
          lastName: 'Doe',
          email: 'j@e.com',
        },
      });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/first name/i);
  });

  it('returns 400 when lastName exceeds 200 chars', async () => {
    const res = await request(app)
      .post('/api/applications')
      .send({
        personal: {
          firstName: 'Jane',
          lastName: 'D'.repeat(201),
          email: 'j@e.com',
        },
      });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/last name/i);
  });

  it('returns 400 when email exceeds 254 chars', async () => {
    const longEmail = 'a'.repeat(246) + '@test.com';
    const res = await request(app)
      .post('/api/applications')
      .send({
        personal: {
          firstName: 'Jane',
          lastName: 'Doe',
          email: longEmail,
        },
      });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/email/i);
  });

  it('returns 400 for invalid email format', async () => {
    const res = await request(app)
      .post('/api/applications')
      .send({
        personal: {
          firstName: 'Jane',
          lastName: 'Doe',
          email: 'not-an-email',
        },
      });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/email/i);
  });

  it('trims whitespace from fields', async () => {
    svc.createApplication.mockResolvedValue('RK-2026-00002');
    const res = await request(app)
      .post('/api/applications')
      .send({
        personal: {
          firstName: '  Jane  ',
          lastName: '  Doe  ',
          email: '  jane@example.com  ',
        },
      });
    expect(res.status).toBe(201);
    // Verify trimmed values were passed to service.
    const passedBody = svc.createApplication.mock.calls[0][0];
    expect(passedBody.personal.firstName).toBe('Jane');
    expect(passedBody.personal.lastName).toBe('Doe');
    expect(passedBody.personal.email).toBe('jane@example.com');
  });
});

// ── PATCH /api/applications/:id ──

describe('PATCH /api/applications/:id', () => {
  it('returns 200 on valid stage update', async () => {
    svc.updateApplication.mockResolvedValue({ id: 'RK-2026-00001' });
    const res = await request(app)
      .patch('/api/applications/RK-2026-00001')
      .send({ stage: 'checks' });
    expect(res.status).toBe(200);
    expect(res.body.message).toMatch(/updated/i);
  });

  it('returns 400 for invalid stage value', async () => {
    const res = await request(app)
      .patch('/api/applications/RK-2026-00001')
      .send({ stage: 'invalid-stage' });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/stage/i);
  });

  it('accepts all valid stage values', async () => {
    const stages = [
      'new', 'form-submitted', 'checks', 'review',
      'approved', 'blocked', 'registered',
    ];
    for (const stage of stages) {
      svc.updateApplication.mockResolvedValue({ id: 'RK-2026-00001' });
      const res = await request(app)
        .patch('/api/applications/RK-2026-00001')
        .send({ stage });
      expect(res.status).toBe(200);
    }
  });

  it('returns 404 when application not found', async () => {
    svc.updateApplication.mockResolvedValue(null);
    const res = await request(app)
      .patch('/api/applications/DOES-NOT-EXIST')
      .send({ stage: 'checks' });
    expect(res.status).toBe(404);
  });
});

// ── DELETE /api/applications/:id ──

describe('DELETE /api/applications/:id', () => {
  it('returns 200 on successful delete', async () => {
    svc.deleteApplication.mockResolvedValue(true);
    const res = await request(app).delete('/api/applications/RK-2026-00001');
    expect(res.status).toBe(200);
    expect(res.body.message).toMatch(/deleted/i);
  });

  it('returns 404 when application not found', async () => {
    svc.deleteApplication.mockResolvedValue(false);
    const res = await request(app).delete('/api/applications/DOES-NOT-EXIST');
    expect(res.status).toBe(404);
  });
});

// ── POST /api/applications/:id/timeline ──

describe('POST /api/applications/:id/timeline', () => {
  it('returns 201 on valid timeline event', async () => {
    const entry = { id: 1, event: 'DBS check started', type: 'action' };
    svc.addTimelineEvent.mockResolvedValue(entry);
    const res = await request(app)
      .post('/api/applications/RK-2026-00001/timeline')
      .send({ event: 'DBS check started', type: 'action' });
    expect(res.status).toBe(201);
    expect(res.body.event).toBe('DBS check started');
  });

  it('defaults type to action when omitted', async () => {
    svc.addTimelineEvent.mockResolvedValue({ id: 1, event: 'Note', type: 'action' });
    const res = await request(app)
      .post('/api/applications/RK-2026-00001/timeline')
      .send({ event: 'Note added' });
    expect(res.status).toBe(201);
  });

  it('returns 400 when event is missing', async () => {
    const res = await request(app)
      .post('/api/applications/RK-2026-00001/timeline')
      .send({});
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/event/i);
  });

  it('returns 400 when event exceeds 2000 chars', async () => {
    const res = await request(app)
      .post('/api/applications/RK-2026-00001/timeline')
      .send({ event: 'x'.repeat(2001) });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/2000/);
  });

  it('returns 400 for invalid timeline type', async () => {
    const res = await request(app)
      .post('/api/applications/RK-2026-00001/timeline')
      .send({ event: 'test', type: 'invalid' });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/type/i);
  });

  it('accepts all valid timeline types', async () => {
    const types = ['action', 'complete', 'alert', 'note'];
    for (const type of types) {
      svc.addTimelineEvent.mockResolvedValue({ id: 1, event: 'e', type });
      const res = await request(app)
        .post('/api/applications/RK-2026-00001/timeline')
        .send({ event: 'test event', type });
      expect(res.status).toBe(201);
    }
  });
});
