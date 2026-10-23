# API reference (v1)

All application routes are under `/api/v1`. Successful responses use resource keys such as `{ user }`, `{ rooms }`, or `{ leaveRequests }`. Errors use:

```json
{
  "error": "Human-readable message",
  "code": "VALIDATION_ERROR",
  "details": {},
  "requestId": "uuid"
}
```

The browser sends credentials and `X-CSRF-Token` for state-changing routes. The session cookie is not a bearer token.

## Authentication

| Method | Route | Access | Purpose |
| --- | --- | --- | --- |
| GET | `/auth/csrf` | Public | Create/read the browser CSRF token |
| POST | `/auth/login` | Public, rate limited | Start an HTTP-only session |
| GET | `/auth/me` | Authenticated | Resolve current user and roles |
| POST | `/auth/logout` | Authenticated | Destroy the session |

## Hostel records

| Method | Route | Access |
| --- | --- | --- |
| GET | `/dashboard/overview` | Warden, super admin |
| GET | `/dashboard/student` | Student |
| GET | `/rooms/floors` | Authenticated |
| GET | `/rooms` | Operational staff |
| POST | `/rooms` | Warden, super admin |
| POST | `/rooms/:id/allocate` | Warden, super admin, staff |
| POST | `/rooms/allocations/:id/vacate` | Warden, super admin, staff |
| GET | `/students` | Operational staff |
| GET/PATCH | `/students/me` | Student, own profile only |

## Leave

Students use `POST /leave` with `departureAt`, `expectedReturnAt`, `destination`, `reason`, and optional `additionalInfo`; dates are validated server-side. Students read `/leave/mine`. Wardens/super admins read `/leave`, decide using `POST /leave/:id/decision`, and guards can record `DEPARTURE_VERIFIED`/`RETURN_VERIFIED` via `/leave/:id/verify`.

## Hostel applications and audit

Applications remain separate from allocations. Students use `POST /applications` and `/applications/mine`; wardens and super admins can review the deterministic submission queue at `/applications` and decide with `/applications/:id/decision`. No eSamarth scraping or API integration is included.

Warden and super-admin users can read paginated authorized events at `GET /audit`. Sensitive changes are written by the affected service, not by the browser.

## Complaints

`GET /complaints/categories` is available to authenticated users. Students use `POST /complaints` and `/complaints/mine`. Wardens, super admins, and staff use `GET /complaints` and `PATCH /complaints/:id`. The backend enforces the lifecycle `SUBMITTED → ASSIGNED → IN_PROGRESS → RESOLVED → CLOSED`.

## Equipment and notices

`GET /equipment` lists active inventory. Students use `/equipment/mine`. **Only `GUARD` users** can use `/equipment/issues`, `/equipment/issues/outstanding`, `/equipment/issues/student/:studentId`, `POST /equipment/issues`, and `POST /equipment/issues/:id/returns` (the singular `/return` route remains a compatibility alias). Issues require a due date, have a unique transaction reference, and support partial returns through `EquipmentReturn` history. Issue and return operations lock the inventory and issue rows and update quantities transactionally.

`GET /notices` lists published notices. Wardens and super admins can use `/notices/manage`, `POST /notices`, and `PATCH /notices/:id/publish`.

## Requests and notifications

Request types are returned by `GET /requests/types`. Students submit with `POST /requests`, list their own records with `GET /requests/my`, and may retrieve an authorized detail with `GET /requests/:id`.

The request workflow is enforced server-side:

```text
PENDING_GUARD_REVIEW
  ├── FORWARDED_TO_ADMIN → IN_PROGRESS → COMPLETED
  │                         └──────────→ REJECTED_BY_ADMIN
  └── REJECTED_BY_GUARD
```

Guards use `GET /requests/guard/pending`, `POST /requests/guard/:id/approve-forward`, and `POST /requests/guard/:id/reject`. Wardens and super admins use `GET /requests/admin/pending`, `POST /requests/admin/:id/start`, `POST /requests/admin/:id/complete`, and `POST /requests/admin/:id/reject`. Every transition writes `RequestHistory`, an audit record, and a student notification.

Guards can search active students for equipment with `GET /students/search?q=BT25CSH&limit=10`. The endpoint returns only ID, enrollment number, branch, and display name; empty/short searches return no full-database result.

`GET /notifications` returns only the authenticated user's notifications. Use `PATCH /notifications/:id/read` or `PATCH /notifications/read-all` to update read state. The API server runs an idempotent overdue-equipment check at startup and once per minute; overdue notifications use a unique `equipment-overdue:<issueId>` deduplication key.
