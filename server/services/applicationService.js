const { pool } = require('../db');

function generateId(seqVal) {
  const year = new Date().getFullYear();
  return `RK-${year}-${String(seqVal).padStart(5, '0')}`;
}

function calculateProgress(checks) {
  if (!checks || typeof checks !== 'object') return 0;
  const keys = Object.keys(checks);
  if (keys.length === 0) return 0;
  const complete = keys.filter(k => checks[k]?.status === 'complete').length;
  return Math.round((complete / keys.length) * 100);
}

function buildChecksFromForm(body) {
  const checks = {
    dbs: { status: 'not-started', date: null },
    dbs_update: { status: 'not-started', date: null },
    la_check: { status: 'not-started', date: null },
    ofsted: { status: 'not-started', date: null },
    gp_health: { status: 'not-started', date: null },
    ref_1: { status: 'not-started', date: null },
    ref_2: { status: 'not-started', date: null },
    first_aid: { status: 'not-started', date: null },
    safeguarding: { status: 'not-started', date: null },
    food_hygiene: { status: 'not-started', date: null },
    insurance: { status: 'not-started', date: null },
  };

  // DBS
  if (body.suitability?.hasDBS === 'Yes' && body.suitability?.dbsNumber) {
    checks.dbs = {
      status: 'pending',
      date: new Date().toISOString().split('T')[0],
      certificate: body.suitability.dbsNumber,
      details: 'Certificate number provided on application',
    };
  }

  // First aid
  if (body.qualifications?.firstAidCompleted === 'Yes') {
    checks.first_aid = {
      status: 'complete',
      date: body.qualifications.firstAidDate || null,
      provider: body.qualifications.firstAidOrg || null,
    };
  }

  // Safeguarding
  if (body.qualifications?.safeguardingCompleted === 'Yes') {
    checks.safeguarding = {
      status: 'complete',
      date: body.qualifications.safeguardingDate || null,
      provider: body.qualifications.safeguardingOrg || null,
    };
  }

  // Food hygiene
  if (body.qualifications?.foodHygieneCompleted === 'Yes') {
    checks.food_hygiene = {
      status: 'complete',
      date: body.qualifications.foodHygieneDate || null,
      provider: body.qualifications.foodHygieneOrg || null,
    };
  }

  // References
  if (body.references?.ref1?.name) {
    checks.ref_1 = {
      status: 'pending',
      date: new Date().toISOString().split('T')[0],
      referee: body.references.ref1.name,
      relationship: body.references.ref1.relationship || null,
      details: 'Reference request to be sent',
    };
  }
  if (body.references?.ref2?.name) {
    checks.ref_2 = {
      status: 'pending',
      date: new Date().toISOString().split('T')[0],
      referee: body.references.ref2.name,
      relationship: body.references.ref2.relationship || null,
      details: 'Reference request to be sent',
    };
  }

  return checks;
}

function buildConnectedPersons(body) {
  const persons = [];
  if (body.household?.adults && Array.isArray(body.household.adults)) {
    body.household.adults.forEach((adult, i) => {
      if (adult.firstName && adult.lastName) {
        persons.push({
          id: `CP-NEW-${String(i + 1).padStart(3, '0')}`,
          name: `${adult.firstName} ${adult.lastName}`,
          type: 'household',
          relationship: adult.relationship || 'Household member',
          dob: adult.dob || null,
          formStatus: 'not-started',
          formType: 'CMA-H2',
          checks: {
            dbs: { status: 'not-started', date: null },
            la_check: { status: 'not-started', date: null },
          },
        });
      }
    });
  }
  return persons;
}

function buildPremisesAddress(body) {
  const pt = body.premises?.type || 'Domestic';
  const sameAddr = body.premises?.sameAsHome;

  if (pt === 'Domestic' && sameAddr !== false) {
    // Use home address
    const ha = body.homeAddress || {};
    return [ha.line1, ha.line2, ha.town, ha.postcode].filter(Boolean).join(', ');
  }

  // Non-domestic or different address
  const ca = body.premises?.address || {};
  return [ca.line1, ca.line2, ca.town, ca.postcode].filter(Boolean).join(', ');
}

async function createApplication(body) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Generate ID
    const seqRes = await client.query("SELECT nextval('application_id_seq') AS val");
    const id = generateId(seqRes.rows[0].val);
    const now = new Date();

    const checks = buildChecksFromForm(body);
    const connectedPersons = buildConnectedPersons(body);
    const progress = calculateProgress(checks);
    const premisesAddress = buildPremisesAddress(body);

    const registers = body.service?.ageGroups || [];

    const premisesDetails = {
      sameAsHome: body.premises?.sameAsHome ?? null,
      outdoorSpace: body.premises?.outdoorSpace || null,
      pets: body.premises?.pets || null,
      petsDetails: body.premises?.petsDetails || null,
    };

    await client.query(
      `INSERT INTO applications (
        id, title, first_name, middle_names, last_name,
        email, phone, dob, gender, right_to_work, ni_number,
        home_address, premises_type, premises_address,
        premises_details, local_authority,
        registers, service, stage, risk, progress,
        checks, connected_persons,
        previous_names, address_history, qualifications,
        employment_history, references_data,
        household, suitability, declaration,
        start_date, last_updated, created_at
      ) VALUES (
        $1, $2, $3, $4, $5,
        $6, $7, $8, $9, $10, $11,
        $12, $13, $14,
        $15, $16,
        $17, $18, 'new', 'low', $19,
        $20, $21,
        $22, $23, $24,
        $25, $26,
        $27, $28, $29,
        $30, $31, $31
      )`,
      [
        id,
        body.personal?.title || null,
        body.personal?.firstName,
        body.personal?.middleNames || null,
        body.personal?.lastName,
        body.personal?.email,
        body.personal?.phone || null,
        body.personal?.dob || null,
        body.personal?.gender || null,
        body.personal?.rightToWork || null,
        body.personal?.niNumber || null,
        JSON.stringify(body.homeAddress || {}),
        (body.premises?.type || 'domestic').toLowerCase(),
        premisesAddress || null,
        JSON.stringify(premisesDetails),
        body.premises?.localAuthority || null,
        JSON.stringify(registers),
        JSON.stringify(body.service || null),
        progress,
        JSON.stringify(checks),
        JSON.stringify(connectedPersons),
        JSON.stringify(body.previousNames || null),
        JSON.stringify(body.addressHistory || null),
        JSON.stringify(body.qualifications || null),
        JSON.stringify(body.employment || null),
        JSON.stringify(body.references || null),
        JSON.stringify(body.household || null),
        JSON.stringify(body.suitability || null),
        JSON.stringify(body.declaration || null),
        now,
        now,
      ]
    );

    // Insert timeline events
    await client.query(
      `INSERT INTO timeline_events (application_id, event, type, created_at)
       VALUES ($1, 'Application started', 'action', $2)`,
      [id, now]
    );
    await client.query(
      `INSERT INTO timeline_events (application_id, event, type, created_at)
       VALUES ($1, 'Application form submitted', 'complete', $2)`,
      [id, new Date(now.getTime() + 1000)]
    );

    await client.query('COMMIT');
    return id;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

function formatDatetime(dt) {
  if (!dt) return null;
  const d = new Date(dt);
  const pad = n => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function formatDate(dt) {
  if (!dt) return null;
  const d = new Date(dt);
  const pad = n => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function toDashboardShape(row, timeline) {
  const now = new Date();
  const lastUp = row.last_updated ? new Date(row.last_updated) : now;
  const daysInStage = Math.max(0, Math.floor((now - lastUp) / (1000 * 60 * 60 * 24)));

  return {
    id: row.id,
    name: row.name,
    email: row.email,
    phone: row.phone || '',
    dob: formatDate(row.dob),
    niNumber: row.ni_number || undefined,
    stage: row.stage,
    startDate: formatDate(row.start_date),
    registrationDate: formatDate(row.registration_date),
    registrationNumber: row.registration_number || undefined,
    lastUpdated: formatDate(row.last_updated),
    daysInStage,
    risk: row.risk,
    progress: row.progress,
    premisesType: row.premises_type,
    premisesAddress: row.premises_address || '',
    premisesDetails: row.premises_details || undefined,
    localAuthority: row.local_authority || '',
    registers: row.registers || [],
    service: row.service || undefined,
    checks: row.checks || {},
    connectedPersons: row.connected_persons || [],
    ofstedCheck: row.ofsted_check || undefined,
    household: row.household || undefined,
    timeline: timeline.map(t => ({
      date: formatDatetime(t.created_at),
      event: t.event,
      type: t.type,
    })).reverse(),
  };
}

async function getAllApplications() {
  const { rows } = await pool.query(
    'SELECT * FROM applications ORDER BY created_at DESC'
  );

  const result = [];
  for (const row of rows) {
    const tl = await pool.query(
      'SELECT event, type, created_at FROM timeline_events WHERE application_id = $1 ORDER BY created_at ASC',
      [row.id]
    );
    result.push(toDashboardShape(row, tl.rows));
  }
  return result;
}

async function getApplication(id) {
  const { rows } = await pool.query(
    'SELECT * FROM applications WHERE id = $1',
    [id]
  );
  if (rows.length === 0) return null;

  const tl = await pool.query(
    'SELECT event, type, created_at FROM timeline_events WHERE application_id = $1 ORDER BY created_at ASC',
    [rows[0].id]
  );
  return toDashboardShape(rows[0], tl.rows);
}

async function updateApplication(id, updates) {
  const allowedFields = {
    stage: 'stage',
    risk: 'risk',
    progress: 'progress',
    checks: 'checks',
    connected_persons: 'connected_persons',
    connectedPersons: 'connected_persons',
    ofsted_check: 'ofsted_check',
    ofstedCheck: 'ofsted_check',
    registration_date: 'registration_date',
    registrationDate: 'registration_date',
    registration_number: 'registration_number',
    registrationNumber: 'registration_number',
  };

  const sets = [];
  const vals = [];
  let paramIdx = 1;

  for (const [key, val] of Object.entries(updates)) {
    const col = allowedFields[key];
    if (!col) continue;
    const isJson = ['checks', 'connected_persons', 'ofsted_check'].includes(col);
    sets.push(`${col} = $${paramIdx}`);
    vals.push(isJson ? JSON.stringify(val) : val);
    paramIdx++;
  }

  if (sets.length === 0) return null;

  sets.push(`last_updated = NOW()`);
  vals.push(id);

  const { rows } = await pool.query(
    `UPDATE applications SET ${sets.join(', ')} WHERE id = $${paramIdx} RETURNING *`,
    vals
  );
  return rows[0] || null;
}

async function deleteApplication(id) {
  const { rowCount } = await pool.query(
    'DELETE FROM applications WHERE id = $1',
    [id]
  );
  return rowCount > 0;
}

async function addTimelineEvent(applicationId, event, type = 'action') {
  const { rows } = await pool.query(
    `INSERT INTO timeline_events (application_id, event, type) VALUES ($1, $2, $3) RETURNING *`,
    [applicationId, event, type]
  );
  return rows[0];
}

module.exports = {
  createApplication,
  getAllApplications,
  getApplication,
  updateApplication,
  deleteApplication,
  addTimelineEvent,
};
