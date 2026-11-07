# BLA Checker integration API

Production base URL after deployment: `https://bla.balitech.org:52377/api/v1`.
Call this from your other system's backend. Keep the integration key on the server,
not in browser JavaScript. This is a separate key from the upstream Blacklist Alliance key.

## Enable on your BLA server

1. Deploy the updated backend and frontend build.
2. Apply `deployment/integration-api.sql` to the existing BLA PostgreSQL database.
   This additive migration only adds the nullable metadata column. New installations
   also get this column through the usual migration.
3. Generate a key with `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`.
4. Set `INTEGRATION_API_KEY` to that value in the backend environment and set
   `INTEGRATION_OWNER_EMAIL` to your existing active BLA account's exact email.
5. Restart the backend with updated environment variables. Integration routes
   under `/api/v1` use API-key authentication and do not require an IP allowlist
   entry. Dashboard and other API routes retain their existing IP protection.
   The reverse proxy must pass `/api/v1/` to the backend without a separate
   nginx IP/auth_request gate (the repository's `/api/` proxy already does this).

Every accepted request creates a normal session owned by that account, visible in
**My Sessions** (and administrators' **All Sessions**) with an `[API]` name.
Session details show the supplied external user ID and reference. The creation
audit contains these identifiers, submitted row count and caller IP; the existing
engine records results and completion audit. These external identifiers are claims
from your trusted backend, so derive them from its authenticated user, not browser input.

## Submit numbers

```bash
curl 'https://bla.balitech.org:52377/api/v1/checks' \
  -H "Authorization: Bearer $BLA_INTEGRATION_KEY" \
  -H 'Content-Type: application/json' \
  -d '{"phones":["2125551234","6465551234"],"sessionName":"CRM batch","externalUserId":"agent-42","reference":"campaign-100"}'
```

`phones` is required: 1–10,000 strings, each at most 50 characters. Other fields
are optional strings, at most 150 characters. Malformed phone numbers are retained
and classified by the normal engine; duplicate numbers are also audited.

Response: HTTP **202**, with `sessionId`, `session`, `statusUrl`, and `recordsUrl`.
The URLs are relative to the production origin. Acceptance does not mean verified.

## Upload a complete CSV file

Use `POST /checks/upload` with `multipart/form-data` and the same Bearer key.
Send the CSV as the **file** field (maximum 150 MiB). Include a header row.
Optional text fields: `phoneColumn` (exact header name; otherwise auto-detected),
`sessionName`, `externalUserId`, and `reference`. If auto-detection fails, specify
`phoneColumn`. All CSV columns are preserved in the session records and exports.

```bash
curl 'https://bla.balitech.org:52377/api/v1/checks/upload' \
  -H "Authorization: Bearer $BLA_INTEGRATION_KEY" \
  -F 'file=@leads.csv;type=text/csv' \
  -F 'phoneColumn=phone' \
  -F 'sessionName=CRM CSV check' \
  -F 'externalUserId=agent-42' \
  -F 'reference=campaign-100'
```

In Postman use **Body > form-data**, set `file` to type **File**, and choose
your CSV. Other fields use type **Text**. Do not manually set Content-Type:
Postman/curl must supply the multipart boundary. The reverse proxy must allow
the complete multipart request size (the repository config allows 150 MB;
files near that boundary need a slightly larger proxy limit).

Response is **202** with the same `sessionId`, `statusUrl`, and `recordsUrl` as
JSON submissions. One file creates one session and request audit, with no need
for the caller to split it into 10,000-number JSON batches. Large files use the
existing file-processing engine and server memory; the 10,000-number limit only
applies to JSON requests. Empty/header-only CSVs and unknown phone columns are
rejected before queuing. Processing failures are reported on the session.
Both submission endpoints share the 10 submissions/minute limit.

## Poll, read and download

Send the same Authorization header to all endpoints:

| Method | Path | Result |
| --- | --- | --- |
| GET | `/checks/{sessionId}` | `{ "session": { ... } }`, including status, stage, counts and errors |
| GET | `/checks/{sessionId}/records?page=1&limit=200` | Paginated `data` and `pagination`; optional `status=CLEAN` filter |
| GET | `/checks/{sessionId}/export/clean?format=csv` | Verified clean numbers |
| GET | `/checks/{sessionId}/export/full?format=csv` | Full audit report |

Poll every 2–5 seconds until `session.status` is `COMPLETED` or `FAILED`.
Use results for downstream calling only when status is `COMPLETED`, stage is `DONE`,
and `bla_verified` is `true`. On `FAILED`, show `error_message` and stop; never
treat failed or pending numbers as clean. Records contain `raw_phone`,
`normalized_phone`, `status`, `reason`, and the upstream response when available.
Statuses include `CLEAN`, `LOCAL_DNC`, `BLA_DNC`, `INVALID`, `EMPTY`, `DUPLICATE`.
Read every page for large requests. Exports enforce existing verification gates.

The key can access only API-created sessions owned by the configured account.
It cannot access admin routes, delete sessions, or read ordinary upload sessions.
This configuration supports one external integration; rotate the key by replacing
the environment value and restarting. Existing sessions remain available.

Errors: 400 invalid input, 401 wrong key, 403 inactive owner, 404 inaccessible
session, 429 rate limit, 503 missing configuration, 500 server error.
Limits per caller IP and backend process: 10 submissions/minute, 120 total
requests/minute. Honor Retry-After on 429.

Each submission creates a new session: `reference` is an audit label, not an
idempotency key. Do not blindly retry an uncertain POST, because a second check
can incur upstream charges. Processing uses the existing in-process worker;
server restarts can interrupt queued/running sessions. Check Sessions before
resubmitting interrupted jobs. No production deployment or live paid checks are
performed by the automated test suite.
