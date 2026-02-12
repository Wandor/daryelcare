# ReadyKids CMA Backend - Setup Guide

## Prerequisites

- **Node.js** 18+ (for `--watch` support in dev mode)
- **PostgreSQL** 14+

## Quick Start

```bash
# 1. Create the database
createdb readykids

# 2. Copy environment config
cp .env.example .env

# 3. Install dependencies
npm install

# 4. Start the server (auto-creates tables on first run)
npm start

# 5. Seed the database with 11 sample applications
npm run seed
```

The server starts at `http://localhost:3000` by default.

## Pages

| URL                            | Description                      |
| ------------------------------ | -------------------------------- |
| `http://localhost:3000/register` | Childminder registration form  |
| `http://localhost:3000/admin`    | Admin dashboard (pipeline view) |

## npm Scripts

| Script        | Command                     | Purpose                               |
| ------------- | --------------------------- | ------------------------------------- |
| `npm start`   | `node server/index.js`      | Start production server               |
| `npm run dev` | `node --watch server/index.js` | Start with auto-restart on file changes |
| `npm run seed` | Runs `seed()` from `db.js` | Insert 11 sample applications + timeline events |

## Environment Variables

Defined in `.env` (copy from `.env.example`):

| Variable       | Default                               | Description               |
| -------------- | ------------------------------------- | ------------------------- |
| `DATABASE_URL` | `postgres://localhost:5432/readykids`  | PostgreSQL connection URI |
| `PORT`         | `3000`                                | HTTP server port          |

## Database Setup

### Automatic Schema Initialization

Tables are created automatically when the server starts. The `initSchema()` function
runs `server/db/schema.sql` on every boot using `CREATE TABLE IF NOT EXISTS`, so it
is safe to restart without data loss.

### Manual Schema Setup

To apply the schema without starting the server:

```bash
psql readykids < server/db/schema.sql
```

### Seeding Demo Data

The seed script inserts the 11 hardcoded applications from the original dashboard
plus their timeline events. It uses `ON CONFLICT DO NOTHING` so it can run
multiple times safely.

```bash
npm run seed
# or
psql readykids < server/db/seed.sql
```

### Resetting the Database

Drop and recreate to start fresh:

```bash
dropdb readykids
createdb readykids
npm run seed
```
