# IIITN HMS

IIITN HMS is a modular-monolith Hostel Management System for the Indian Institute of Information Technology, Nagpur. This repository contains the first working foundation: session-based authentication, role-aware navigation, physical room inventory, transactional allocation, leave, complaint, equipment, notices, audit, and dashboard workflows.

The application is intentionally built around actual hostel records. It does not use local storage or hardcoded operational data. The seed data is synthetic and exists only for local development.

## Stack

- **Web:** React 19, TypeScript, Vite, Tailwind CSS, React Router, TanStack Query dependency, React Hook Form, Zod, Lucide React
- **API:** Node.js, TypeScript, Express, Zod, Prisma
- **Database:** PostgreSQL 16
- **Security:** bcrypt password hashing, HTTP-only server-side sessions in PostgreSQL, CSRF double-submit protection, Helmet, CORS, login rate limiting, server-side authorization, audit events
- **Checks:** TypeScript, Vitest, Supertest, Playwright configuration

## Prerequisites

- Node.js 20+ and npm 10+
- Docker Desktop or a local PostgreSQL 14+ instance

## Quick start

```bash
cp .env.example .env
npm install
docker compose up -d
npm run db:generate
npm run db:migrate
npm run db:seed
npm run dev
```

Then open <http://localhost:5173>. The API health endpoint is <http://localhost:4000/health>.

If Docker is unavailable, point `DATABASE_URL` in `.env` at an existing PostgreSQL database and run the migration commands there. The application does not silently fall back to an in-memory database.

## Development accounts

The seed creates these synthetic accounts. They all use the password `ChangeMe123!`; change or remove them before any non-development use.

| Role | Email |
| --- | --- |
| Super administrator | `admin@iiitn.ac.in` |
| Warden | `warden@iiitn.ac.in` |
| Gate guard | `guard@iiitn.ac.in` |
| Student | `bt24cse096@iiitn.ac.in` |
| Student | `bt25csh036@iiitn.ac.in` |

Seed accounts and all records are synthetic. No eSamarth or Pravesh integration is claimed or included.

## Commands

Run from the repository root:

```bash
npm run dev          # API on :4000 and web on :5173
npm run build        # Build API and web
npm run typecheck    # Type-check both workspaces
npm run lint         # ESLint both workspaces
npm run test         # API unit and Supertest checks
npm run test:e2e     # Playwright (requires running API/database)
npm run db:migrate   # Apply/create Prisma migrations
npm run db:seed      # Insert synthetic development records
```

## Implemented vertical slices

- Login, logout, current-session restoration, account status checks, role-based API authorization, CSRF protection, and safe error responses.
- Warden/admin operational dashboard backed by room, allocation, leave, complaint, equipment, and audit queries.
- Student dashboard with current room, published notices, and request summary.
- Floor and room inventory with the IIITN ten-floor physical layout, searchable occupancy, capacity, room status, and room allocation.
- Room allocations are stored as history, active occupancy is derived from active allocation rows, and allocation uses a serializable transaction plus a row lock and unique active-student index.
- Student leave submissions, warden approval/rejection, guard departure/return verification, event history, and configurable `HOSTEL_IN_TIME = 22:00` seed policy.
- Separate hostel application submission/review records with duplicate prevention and deterministic submission ordering; application records are intentionally not room allocations.
- Generic student request workflow: student submission → guard approval/forward or rejection → administrator processing/completion or rejection, with persisted timeline history and student notifications.
- Guard-only equipment desk with enrollment autocomplete, required due dates, unique issue references, partial returns, return history, and server-side inventory checks.
- Persisted notification centre and idempotent minute-based overdue-equipment notification job.
- Configurable complaint categories, student submission, staff queue, assignment field, enforced lifecycle transitions, resolution history, and audit events.
- Equipment availability, transactional issue/return, condition tracking, duplicate-return rejection, outstanding issue history, and guard/staff workflow.
- Published notices and administrator notice management.
- Responsive, role-specific shell with loading, empty, error, success, form, table, and mobile navigation states.

## Known incomplete work

This is the first implementation, not a production deployment. The following are deliberately left for subsequent requirements and approval:

- Full administrator CRUD for students, floors, rooms, equipment, staff, roles, and policy settings.
- Dedicated super-admin account and permission-management screens.
- Rich reports/export pages and a browsable audit-log page.
- Hostel application import and configurable application ordering/outcome workflow.
- Production email/notifications, SSO, Pravesh integration, and institutional data import.
- More granular permission records beyond role checks.
- Browser end-to-end scenarios against a dedicated seeded test database.
- Full PostgreSQL-backed integration coverage for every request and equipment transaction; the current environment has not provided a working PostgreSQL service.

The current code keeps those boundaries extensible rather than inventing integrations or policy rules. Student academic year is stored separately from the physical room allocation; usual floor arrangements are descriptions, not allocation constraints.

## Security notes

- The frontend only improves navigation. Every protected API route authenticates the session and applies role checks; student-owned endpoints derive the student ID from the authenticated session.
- Session cookies are HTTP-only, `SameSite=Lax`, secure in production, and backed by PostgreSQL instead of Express's memory store.
- State-changing requests require the session CSRF token in `X-CSRF-Token`. Login is intentionally exempt so a fresh browser can establish a session.
- Passwords are never returned by API responses. Login errors are intentionally generic.
- Do not commit `.env`, production seed credentials, database dumps, or private data.

## Project layout

```text
apps/api/
  prisma/schema.prisma       # normalized relational schema
  prisma/migrations/         # reproducible SQL migration
  prisma/seed.ts             # synthetic development data
  src/modules/               # auth, dashboard, room, leave, complaint, equipment, notices
  src/app.ts                 # Express composition; does not listen
apps/web/
  src/components/            # shell, auth, reusable UI and feedback
  src/pages/                 # role-aware workflow pages
  src/services/              # one cookie-aware API client and auth client
docs/                        # architecture and API notes
```
