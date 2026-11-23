# First milestone workflow — 19 November 2026

## Status

**Working in the isolated test environment. Not yet usable against the current project database.**
The current database was queried read-only and its schema was dumped without data. No migration,
milestone creation, publishing, or other writes were performed against it.

## Reproduced cause

Both `GET /api/milestones/batch/69` (SENG2462) and `/67` (AI2516) returned HTTP 500:

```text
PrismaClientKnownRequestError, P2022
The column `milestones.milestone_code` does not exist in the current database.
meta: { modelName: 'milestones', column: 'milestones.milestone_code' }
clientVersion: '6.19.3'
```

Batch 69 has two legacy milestones; batch 67 has none. An empty batch still fails because
Prisma selects columns that do not exist. The generated Prisma client and source schema
have the same models and fields (their text formatting differs). The generated client uses
the normal database engine. Regeneration alone therefore cannot repair this schema mismatch.

The database has only the legacy milestone columns; `deadline` is NOT NULL, and
`milestone_date_audit` is absent. Only migration `20260624061325_update_supervisors_table`
is recorded. The standalone pending `20261118_milestones_and_concurrent_marking.sql` adds
the missing columns but leaves deadline NOT NULL. It is also outside Prisma's
`<migration-name>/migration.sql` directory convention.

The isolated copy reproduced the create-path P2022 as well as the read failure. Applying
the older SQL's milestone portion inside a rolled-back transaction reproduced PostgreSQL
23502 for a null deadline. The new migration fixes both conditions.

## Code changes

- Existing empty batch: 200 `[]`; unknown batch: 404. Failures are never converted to empty success.
- Add Milestone depends on a successfully verified selected schedule and no pending action,
  not on milestone count, drafts, or templates.
- Empty schedule says `No milestones yet for [batch code]`; standard setup is optional.
- Save Draft creates DRAFT even if a caller supplies PUBLISHED. Publication is separate.
- Required/invalid deadlines are checked unless dates are explicitly TBC. Colombo local inputs
  are converted once on the backend. A failed save retains the form and shows an inline error.
- Milestone and initial student progress inserts are atomic; a progress failure rolls everything back.
- Shared API, login, notifications, and the PM assessor fetch use the configured API base
  (`VITE_API_BASE_URL`, default `/api`). Vite proxies to `API_PROXY_TARGET`, default
  `http://127.0.0.1:5000`. Test proxy target was `http://127.0.0.1:5001`.
- PM uses `/api/proposals/all` instead of a student request without an ID. Student-specific
  calls reject missing IDs before HTTP; the backend also rejects invalid IDs.
- Backend accepts `PORT` (default 5000), reports bind errors, and exports the app for isolated tests.

## Other console errors

Before changes, direct port-5000 batch/milestone requests reached Express, and the Vite-proxied
dashboard stats request returned 200. The earlier connection refusals were not present during
this reproduction. A refusal means the backend was not reachable; the proxy's earlier 502 is
consistent with that same upstream outage. No captured startup log proves the exact earlier
stop/crash, so the schema error is not presented as its cause. A missing column produces a
request-time 500, not a connection refusal.

Fresh browser loads in the isolated environment used port 5174 and its proxy to port 5001.
All API requests stayed on the test origin. No `/student/undefined` request was sent.
Dashboard-stat and notification requests were deliberately failed with 503 while first-draft
creation continued to work.

## Tests completed

The test PostgreSQL cluster was separate on 127.0.0.1:55439, database `fyp_milestone_test`.
It used the current database's schema-only snapshot plus synthetic batches, users, students,
legacy milestones, and an existing Submitted progress record. No real user records were copied.

`first-milestone.integration.cjs` passed the pre-migration failure reproduction, exact migration,
repeat application, old-column/progress preservation, PM/Admin empty and legacy reads,
unknown-batch validation, invalid deadline validation, role checks, atomic rollback,
Colombo date round-trip, null-deadline TBC drafts, and student draft visibility checks.

`first-milestone.browser.cjs` passed real browser email-login and form submissions for:

| Role | Initially empty batch | Saved deadline (Colombo) | Persisted UTC |
| --- | --- | --- | --- |
| PM | 67 / AI2516 | 2026-12-05 17:30 | 2026-12-05 12:00Z |
| Admin | 75 / SE24 | 2026-12-06 09:15 | 2026-12-06 03:45Z |

Both drafts persisted after page reload and re-selection; each save left the other batch
unchanged. Both roles could still view the legacy milestone in batch 69. A simulated save
failure preserved inputs and a retry created one draft. A temporary schedule failure disabled
Add Milestone; Retry recovered. No template or publish operation was needed or invoked.
Microsoft sign-in was not tested; staff tests used synthetic accounts through actual email login.

The frontend production build and `git diff --check` passed. The existing large-bundle warning remains.

## Exact migration awaiting approval

`server/prisma/migrations/20261119090000_milestone_drafts/migration.sql`

This transactional migration:

- Adds the milestone fields required by the read/create handlers and creates the date-audit table.
- Drops only the deadline NOT NULL restriction; existing deadline values are not modified.
- Leaves existing IDs, names, descriptions, types, order, created timestamps, batch assignments,
  and student progress intact. It does not infer milestone codes or replace legacy records.
- Initializes legacy rows with PUBLISHED, retaining their prior visibility, Report, Semester 1,
  zero marks, false TBC, and an initial updated timestamp. Optional new fields remain null.
- Adds uniqueness for non-null milestone codes within a batch; multiple null codes remain valid.
- Does not create standard milestones, publish new drafts, or create the broader evaluation/
  reconciliation/moderation features from the older standalone SQL.

On the isolated database, the baseline migration was marked applied to mirror the current
database's recorded history. Prisma `migrate deploy` then discovered two directory migrations,
applied only `20261119090000_milestone_drafts`, and `migrate status` reported up to date.

After approval, the deployment command from `server` is:

```powershell
node node_modules/prisma/build/index.js migrate deploy
```

That command has **not** been run against the current database. Do not run the older standalone
SQL as part of this first-milestone fix. The current milestone endpoints will remain blocked
by the missing columns until the approved migration is applied.

## Re-running isolated tests

Prepare a local empty PostgreSQL database ending in `_milestone_test` and a schema-only
snapshot made with `pg_dump --schema-only --no-owner --no-privileges --schema=public`.
The integration runner restores that schema and synthetic fixtures, so use a disposable DB.

From `server`:

```powershell
$env:MILESTONE_TEST_DATABASE_URL='postgresql://postgres@127.0.0.1:55439/fyp_milestone_test'
$env:MILESTONE_LEGACY_SCHEMA='<absolute path to schema-only snapshot>'
$env:PORT='5001'
node tests/first-milestone.integration.cjs --serve
```

Start a separate Vite process from `client` with `API_PROXY_TARGET=http://127.0.0.1:5001`
on port 5174 and Chrome headless with remote debugging on port 9223 using a temporary profile.
Then from the repository root:

```powershell
$env:MILESTONE_TEST_UI_URL='http://127.0.0.1:5174'
node server/tests/first-milestone.browser.cjs
```

The browser runner verifies the synthetic API-TEST batch before writing and blocks off-origin
traffic and template/publish operations. Run the integration fixture reset before repeating it.
