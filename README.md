# Capacity Scheduler

Capacity Scheduler is a small internal scheduling and capacity-planning template for teams that are outgrowing spreadsheets, whiteboards, and disconnected scheduling tools.

It is designed for workflows like:

- Construction scheduling with crews, equipment, subcontractors, and jobs.
- Technician scheduling with month-level planning and conflict checks.
- Teams that need a practical starting point before building deeper Smartsheet, ServiceTitan, or field workflow integrations.

This is not a public appointment-booking app.

## What It Does

- Create people, crews, equipment, and subcontractors.
- Create jobs or shifts with dates, statuses, work types, and equipment requirements.
- Assign multiple resources to one job.
- Show dashboard, month, week, resource, conflict, and docs views.
- Mark conflicts directly inside month and week calendars.
- Edit and delete jobs, resources, and assignments.
- Detect schedule conflicts with tested business rules.
- Import and export resources, jobs, and assignments as CSV.
- Seed realistic Telcyte-style and Barker-style demo data.
- Provide placeholders for future Smartsheet and ServiceTitan integrations.

## Data Approach

The app uses PostgreSQL as the source of truth and CSV as the portable interchange format.

CSV is intentionally supported for import, export, backups, spreadsheet review, and quick customer handoff. It is not used as the live database because scheduling has relationships that are easy to corrupt in a flat file: one job can have many resources, deleting a resource must remove related assignments, and conflict checks depend on consistent dates and links.

For a lightweight MVP, this gives a simple user experience while keeping the project ready for Railway, integrations, and multiple dispatchers later.

## API Reference

The in-app `Docs` tab summarizes the API. Current endpoints:

- `GET /api/bootstrap` - full schedule snapshot with conflicts.
- `GET /api/resources` and `POST /api/resources` - list or create resources.
- `PATCH /api/resources/:id` and `DELETE /api/resources/:id` - edit or delete one resource.
- `GET /api/jobs` and `POST /api/jobs` - list or create jobs.
- `PATCH /api/jobs/:id` and `DELETE /api/jobs/:id` - edit, reschedule, or delete one job.
- `GET /api/assignments` and `POST /api/assignments` - list or create assignments.
- `DELETE /api/assignments/:id` - remove one assignment.
- `GET /api/csv/export?entity=resources` - export `resources`, `jobs`, or `assignments`.
- `POST /api/csv/import` - import `resources`, `jobs`, or `assignments`.

## Tech Stack

- Next.js and TypeScript
- React and Tailwind CSS
- Prisma and PostgreSQL
- Vitest for scheduling-rule tests
- Playwright for browser-flow tests

## Security Note

This repo includes a local `.npmrc` with `ignore-scripts=true`. That means npm packages are installed without automatically running package lifecycle scripts. This is intentional because recent npm supply-chain attacks have used install scripts to steal credentials and tokens.

When a script is needed, run it explicitly. For example:

```bash
npm run prisma:generate
```

Run audits during upgrades:

```bash
npm audit --audit-level=high
```

At the time this template was created, high-severity audit issues were removed. npm may still report a moderate warning from Next.js' bundled internal PostCSS version until a stable patched Next.js release is available.

## Local Setup

Install dependencies:

```bash
npm install --ignore-scripts
npm run prisma:generate
```

Create local environment values:

```bash
cp .env.example .env
```

Start Postgres with Docker:

```bash
docker compose up -d
```

Run migrations and seed data:

```bash
npm run db:migrate
npm run db:seed
```

Start the app:

```bash
npm run dev
```

Open:

```text
http://localhost:3000
```

## Demo Mode

If Docker or Postgres is not available, you can run the app with seeded in-memory data:

```bash
npm run build
DEMO_MODE=true npm run start
```

Demo mode is for local validation only. Production should use PostgreSQL.

## Testing

Run business-rule tests:

```bash
npm run test
```

Run browser tests:

```bash
npm run test:e2e
```

Run type checks:

```bash
npm run lint
```

Build production output:

```bash
npm run build
```

## Railway Deployment

1. Push this repo to GitHub.
2. Create a Railway project from the GitHub repo.
3. Add a Railway PostgreSQL database.
4. Set `DATABASE_URL` from the Railway database.
5. Set `DEMO_MODE=false`.
6. Railway will run:
   - Build: `npm run prisma:generate && npm run build`
   - Start: `npm run db:deploy && npm run start`
7. Optional: seed the database from a Railway shell:

```bash
npm run db:seed
```

## Future Integrations

Integration placeholders live in:

- `src/lib/integrations/smartsheet.ts`
- `src/lib/integrations/servicetitan.ts`

Add real integration work there after the core scheduling model is validated with users.

## Current Limitations

- No authentication or permissions yet.
- No customer self-scheduling.
- No live Smartsheet or ServiceTitan sync yet.
- No AI scheduling recommendations yet.
- Resource views are intentionally simple for the MVP.
