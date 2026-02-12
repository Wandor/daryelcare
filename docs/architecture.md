# ReadyKids CMA - Architecture

## Overview

A Node.js + Express backend connecting a childminder registration form to an
admin dashboard, with PostgreSQL for persistence.

```
Browser                         Server                         Database
------                         ------                         --------

/register                     Express                        PostgreSQL
  (registration form)  --->  POST /api/applications  --->   applications
  collectFormData()          applicationService              timeline_events
  fetch() POST               .createApplication()

/admin                        Express
  (dashboard)          --->  GET /api/applications   --->   SELECT * FROM
  loadApplications()         applicationService              applications
  fetch() GET                 .getAllApplications()           + timeline_events
```

## Project Structure

```
daryelcare/
  public/                                 Static files served by Express
    childminder-registration-complete.html  9-section registration form
    cma-portal-v2.html                      Admin pipeline dashboard
  server/
    index.js                              Express entry point, static serving
    db.js                                 pg Pool, schema init, seed runner
    routes/
      applications.js                     REST endpoints (CRUD + timeline)
    services/
      applicationService.js               Business logic and data transforms
    db/
      schema.sql                          Table definitions
      seed.sql                            11 sample applications
  docs/
    setup.md                              Setup and run instructions
    api.md                                API endpoint reference
    architecture.md                       This file
  package.json
  .env.example
```

## Data Flow

### Form Submission

1. User fills out the 9-section form and clicks Submit.
2. `collectFormData()` walks the DOM and builds a structured JSON payload
   with sections: personal, homeAddress, premises, service, qualifications,
   employment, references, household, suitability, declaration.
3. `fetch('/api/applications', { method: 'POST' })` sends the payload.
4. Server receives the request in `routes/applications.js`.
5. `applicationService.createApplication()`:
   - Generates an ID from a PostgreSQL sequence (`RK-YYYY-NNNNN`).
   - Builds initial `checks` from form data (training dates become `complete`,
     DBS/references become `pending`, everything else `not-started`).
   - Builds `connected_persons` from household adults.
   - Calculates `progress` as percentage of complete checks.
   - Inserts into `applications` table.
   - Inserts two `timeline_events`: "Application started" and
     "Application form submitted".
6. Response returns `{ id: "RK-2025-00200" }`.
7. Form replaces itself with a confirmation showing the reference number.

### Dashboard Loading

1. Dashboard page loads and calls `loadApplications()`.
2. `fetch('/api/applications')` retrieves all applications.
3. Server queries `applications` table, then for each row queries
   `timeline_events` and transforms to dashboard shape via `toDashboardShape()`.
4. Computed fields: `daysInStage` (days since `last_updated`), formatted dates.
5. Dashboard renders pipeline columns and compliance table from the data.
6. If the API is unreachable, the dashboard falls back to hardcoded sample data.

## Database Schema

Two tables plus one sequence:

### `applications`

Stores one row per registration application. Scalar columns for searchable
fields (name, email, stage), JSONB columns for nested data (checks,
connected_persons, address_history).

The `name` column is a generated column: `first_name || ' ' || last_name`.

The `stage` column has a CHECK constraint limiting values to the defined
pipeline stages.

### `timeline_events`

Append-only audit log. Each event links to an application via
`application_id` (foreign key with CASCADE delete). Events have a `type`
field constrained to: `action`, `complete`, `alert`, `note`.

### `application_id_seq`

PostgreSQL sequence starting at 200 (past the seed data IDs in the 00098-00146
range). Used by `createApplication()` to generate unique IDs.

## Changes Made to the HTML Files

Both HTML pages were originally static (hardcoded data, no server communication).
The following changes connect them to the backend.

### Registration Form (`childminder-registration-complete.html`)

**Added `collectFormData()` function.** Walks the DOM to build a structured JSON
payload covering all 9 form sections, including conditional fields:

- Repeating blocks (previous names, address history, employment, household
  members) are collected by querying each `.repeating-block` container.
- Conditional fields (health condition details, social services details, DBS
  number, pets details, number of assistants) are included regardless of
  visibility. Hidden fields submit as empty strings, which the server stores
  as null.
- Consent checkboxes read the `.checked` property directly rather than using
  value attributes since they are boolean inputs.

**Replaced `alert()` submit handler with async API call.** The form submit
handler now:

1. Calls `collectFormData()` to build the payload.
2. POSTs to `/api/applications` with `Content-Type: application/json`.
3. On success, replaces the form with a confirmation panel showing the
   server-generated reference number (e.g. `RK-2025-00200`).
4. On failure, displays the error message in the existing error summary banner.
5. Disables the submit button during the request to prevent double submission.

**Fixed consent checkbox double-toggle.** The consent items are `<label>`
elements wrapping hidden `<input type="checkbox">` elements (hidden via
`opacity: 0`). The click handler was manually toggling `cb.checked`, but the
browser's native label behavior was also toggling it, resulting in no net
change. Added `e.preventDefault()` so the checkbox only toggles once per click.

### Admin Dashboard (`cma-portal-v2.html`)

**Added `loadApplications()` function.** On page load, the dashboard calls
`fetch('/api/applications')` to load live data from the database.

**Retained hardcoded fallback.** The original 11 applications remain in
`_hardcodedApplications`. If the API fetch fails (server not running, network
error), the dashboard falls back to this static data so it still renders
without a backend.

## Key Design Decisions

**JSONB for nested data.** Checks, connected persons, qualifications,
employment history, and other deeply nested structures are stored as JSONB
rather than normalized tables. This preserves the exact shape the dashboard
expects and avoids complex joins for read-heavy workloads.

**Generated `name` column.** Avoids storing a computed value while keeping
it queryable and indexable.

**Sequence-based IDs.** The `RK-YYYY-NNNNN` format matches the existing
dashboard conventions and provides human-readable references.

**Hardcoded fallback in dashboard.** The original 11 applications are kept
in the HTML as `_hardcodedApplications`. If the API fetch fails (e.g., server
not running), the dashboard still renders with sample data.

**Schema auto-init.** `CREATE TABLE IF NOT EXISTS` runs on every server start,
so there is no separate migration step for initial setup.
