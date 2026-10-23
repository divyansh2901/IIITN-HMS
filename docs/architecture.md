# Architecture and assumptions

## Runtime boundary

IIITN HMS is a modular monolith. The React/Vite application is one browser client and the Express application is one API process. Prisma is the only application database access layer. PostgreSQL is the source of truth for operational records.

`src/app.ts` composes middleware and routes without opening a listening socket; `src/server.ts` is the only process entrypoint that calls `listen()`. This keeps Supertest and future workers straightforward.

## Request flow

1. Helmet, CORS, JSON parsing, request IDs, and development HTTP logging run first.
2. `express-session` loads a PostgreSQL-backed session from `user_sessions`.
3. Mutating requests pass the CSRF middleware.
4. Feature routes authenticate the session and resolve current roles from the database.
5. Zod validates request bodies/parameters before business logic.
6. Services use Prisma queries and transactions, write an audit event for important changes, and return structured errors.
7. The final error handler removes implementation details from client responses while retaining a request ID for support.

## Role model

Roles are records (`Role` + `UserRole`) rather than a single user enum so future institutional permissions can be added without changing the `User` table. The current codes are `STUDENT`, `WARDEN`, `GUARD`, `STAFF`, and `SUPER_ADMIN`.

Role checks do not replace ownership checks. Student-specific routes derive `studentId` from the session-resolved user, so changing a URL identifier cannot expose another student's private records.

## Room and allocation model

Floors are physical records. A room stores type, capacity, and operational status. Active allocations represent actual occupants; occupancy is calculated from active rows rather than a user-editable counter. Allocations are never hard-deleted.

The allocation service locks the room row, checks the active allocation count, and creates the allocation inside a serializable transaction. The migration also prevents one student from having multiple active allocations. A concurrent conflict is mapped to HTTP 409.

Academic-year floor arrangements are descriptions on floors only. They are not authorization or allocation rules. Enrollment parsing extracts batch and branch from the current configurable-shaped `BT` format without assigning a student to a floor.

## Leave and Pravesh boundary

Leave requests are separate from gate verification events and separate from Pravesh. The code records approval, departure, and return events but makes no claim about live campus location. `HOSTEL_IN_TIME` is a policy setting seeded to `22:00`; the final hierarchy, emergency rules, late-return policy, and document requirements remain open requirements.

## Data-retention decisions

Important records use statuses, timestamps, and restrictive foreign keys instead of deletion. Deactivating a user does not delete allocations, complaints, leave events, equipment issues, or audit history. Nullable actor references in audit records use `ON DELETE SET NULL` only where the historical event can remain meaningful without the account.
