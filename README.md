# ReadyKids Childminder Agency Portal

A full-stack registration and admin portal for a childminder agency. Childminders fill out a multi-step registration form; agency staff manage applications through a pipeline dashboard with compliance tracking.

## Tech Stack

- **Backend:** Node.js, Express
- **Database:** PostgreSQL with JSONB columns for nested form data
- **Frontend:** Vanilla HTML/CSS/JS (no build step)

## Prerequisites

- **Node.js** 18+
- **PostgreSQL** 14+

Make sure PostgreSQL is running locally before starting.

## Setup

```bash
# 1. Install dependencies
npm install

# 2. Create the PostgreSQL database
createdb readykids

# 3. Configure environment
cp .env.example .env
```

Edit `.env` with your PostgreSQL credentials:

```
DATABASE_URL=postgres://username:password@localhost:5432/readykids
PORT=3000
```

Replace `username` and `password` with your local PostgreSQL user credentials. If your PostgreSQL install uses the default `postgres` user:

```
DATABASE_URL=postgres://postgres:yourpassword@localhost:5432/readykids
```

## Running

```bash
# Start the server (auto-creates tables on first boot)
npm start

# Or with auto-restart on file changes
npm run dev
```

The server starts at **http://localhost:3000**.

## Seeding Demo Data

To populate the database with 11 sample applications across all pipeline stages:

```bash
npm run seed
```

The seed is idempotent (`ON CONFLICT DO NOTHING`) and can be run multiple times safely.

## Pages

| URL | Description |
|-----|-------------|
| http://localhost:3000/register | 9-section childminder registration form |
| http://localhost:3000/admin | Admin dashboard with pipeline view and compliance tracking |

## Project Structure

```
├── public/
│   ├── childminder-registration-complete.html   Registration form
│   └── cma-portal-v2.html                       Admin dashboard
├── server/
│   ├── index.js                Express entry point
│   ├── db.js                   Database pool and schema init
│   ├── routes/
│   │   └── applications.js     REST API endpoints
│   ├── services/
│   │   └── applicationService.js   Business logic and data transforms
│   └── db/
│       ├── schema.sql          Table definitions
│       └── seed.sql            Sample data (11 applications)
├── docs/
│   ├── setup.md                Detailed setup reference
│   ├── api.md                  API endpoint documentation
│   └── architecture.md         Architecture and data flow
├── .env.example
├── package.json
└── README.md
```

## API Overview

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/applications` | List all applications |
| GET | `/api/applications/:id` | Get single application |
| POST | `/api/applications` | Submit new registration |
| PATCH | `/api/applications/:id` | Update application fields |
| DELETE | `/api/applications/:id` | Remove application |
| POST | `/api/applications/:id/timeline` | Add audit log entry |

See [docs/api.md](docs/api.md) for the full API reference with request/response examples.

## Resetting the Database

```bash
dropdb readykids
createdb readykids
npm run seed
```
