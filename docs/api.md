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

`GET /equipment` lists active inventory. Students use `/equipment/mine`; guards, staff, wardens, and super admins use `/equipment/issues`, `POST /equipment/issues`, and `POST /equipment/issues/:id/return`. Issue and return operations lock the inventory row and update quantities transactionally.

`GET /notices` lists published notices. Wardens and super admins can use `/notices/manage`, `POST /notices`, and `PATCH /notices/:id/publish`.
