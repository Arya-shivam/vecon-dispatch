# VECON Dispatch

Standalone Next.js PWA for daily truck dispatch. It has its own database and does not connect to VTMS.

## Run locally

Use Node.js 22 or newer.

```powershell
npm install
Copy-Item .env.example .env.local
npm run dev
```

Open http://localhost:3000. The example environment enables a labeled local demo with sample jobs. Changes persist in `.data/dispatch.json`. This adapter is for one local server process only. Production always requires PostgreSQL and authentication.

For an immediate demo without environment setup, run `npm run demo` and open http://localhost:3107. Port 3000 is already used by another service on this workstation.

## Connect Neon and deploy

1. Create a separate Neon PostgreSQL database.
2. Prefer `neon init` / `neon deploy` so `DATABASE_URL` and `NEON_AUTH_*` land in `.env.local`. Add `NEON_AUTH_COOKIE_SECRET` (≥32 chars) and `ADMIN_EMAILS` (comma-separated admin emails). Set `DEMO_MODE=false`. Do not commit credentials.
3. Run `npm run db:push` with `DATABASE_URL` set in your shell. Drizzle CLI does not load `.env.local` automatically.
4. Optionally run `npm run db:seed` against an empty database for sample records. Skip this for a clean client workspace.
5. Import this folder into Vercel as a Next.js project. Add the three secrets as environment variables, with `DEMO_MODE=false`.
6. Add `dispatch.vecon.asia` in Vercel Domains and apply the DNS record Vercel supplies.

Use HTTPS for installation. The service worker caches only the offline fallback, never authenticated pages or job data. The app requires a connection for all operational work. iOS installation instructions are in Settings.

## Behavior

- A date can have multiple independently numbered jobs. Dates use Thailand time.
- The four-step wizard selects master data, trucks, planned trips, and a review.
- Each assignment copies the truck WT. Master weight changes do not change historical job tonnage.
- Trip taps cycle not started → in progress → completed → not started. Conflicting writes ask the operator to refresh.
- Planned-trip reductions preserve started and completed trips. Trip numbers can have gaps after reduction.
- Progress uses completed tonnage / target, capped at 100%. A job is done when all planned trips are complete or the tonnage target is reached.
- Records used by jobs can be made inactive, but cannot be deleted. Names display the current master name.
- Reports show all daily totals. Sessions last seven days.
- Daily jobs and reports are public (no login). Neon Auth is required only to manage jobs/masters. Emails in `ADMIN_EMAILS` are admins; signed-in non-admins are view-only. Per-customer owners are deferred.

## Checks

```powershell
npm test
npm run typecheck
npm run build
npm run test:e2e
```

The PostgreSQL tables are `masters`, `jobs`, `job_trucks`, and `trips`. Job creation is transactional. An advisory lock serializes this small workspace's mutations and unique indexes protect daily sequence numbers and trip numbers. Data reads use a consistent snapshot.

The browser test uses a separate `.data/dispatch-e2e.json` file. It creates a truck and a job, completes a trip, reloads to check saved totals, reduces the plan, checks reports and the manifest, and verifies no horizontal overflow at four widths. It currently uses the installed Windows Chrome path in `playwright.config.ts`; change that path or use Playwright's installed Chromium on other machines.

For a larger fleet, replace the workspace-wide mutation lock with operation-specific queries and add pagination. This v1 has no roles, audit trail, offline edit queue, GPS, attachments, or CSV import. Production deployment and live Neon verification require account access and credentials.
