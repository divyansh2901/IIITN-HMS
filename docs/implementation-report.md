# Initial implementation report

## Working in this delivery

- React/Vite frontend builds and communicates with Express through the shared API client.
- Express API has health, session auth, role authorization, CSRF, rate limiting, validation, structured errors, and PostgreSQL session storage configuration.
- Prisma schema and initial SQL migration cover users/roles, students/staff, floors/rooms/allocations, applications, leave/event history, complaints/history, equipment/issues, notices, policies, and audit logs.
- Seed script creates synthetic roles, accounts, ten-floor physical descriptions, rooms, one allocated and one unallocated student, complaint categories, equipment, policy, and a notice.
- Room allocation, leave, complaints, equipment issue/return, and notices are connected from page → API → Prisma database.

## Checks actually run

From the repository root:

```text
npm install                         passed
npx prisma validate                 passed (apps/api, with DATABASE_URL supplied)
npx prisma generate                 passed (apps/api, with DATABASE_URL supplied)
npm run typecheck --workspace @iiitn-hms/api  passed
npm run typecheck --workspace @iiitn-hms/web  passed
npm run build --workspace @iiitn-hms/api      passed
npm run build --workspace @iiitn-hms/web      passed
npm run test --workspace @iiitn-hms/api      passed: 4 tests
npm run test:e2e                             passed: 1 Playwright smoke test (API unavailable; login fallback was not exercised)
```

The API tests cover the health endpoint, unauthenticated protection, and enrollment parsing. The browser smoke test verifies unauthenticated redirect using the web server only; it does not claim a PostgreSQL-backed workflow test because no PostgreSQL service was available in this environment.

## Environment limitation

`docker compose up -d` was attempted but could not connect because the local Docker daemon was not running. A migration attempt with the documented local URL reached PostgreSQL but failed with Prisma `P1000` because the local `hms` credentials were not valid. Therefore Prisma migration application and seed execution were not claimed as passed. Start Docker or provide valid PostgreSQL credentials, copy `.env.example` to `.env`, then run `npm run db:migrate && npm run db:seed` before evaluating persistent workflows.

## Next verification step

Run the documented migration and seed commands against a disposable PostgreSQL database, start both servers, and add Playwright scenarios for admin allocation, student room visibility, leave approval, and an equipment return. Those tests should use a dedicated test database rather than developer data.
