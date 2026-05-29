# Prompt Goal: Capacity Scheduler MVP

Build a local MVP web app in this folder for the repo `javiervillag/capacity-scheduler-template`.

Use the context in `scheduling_requirements_needs.md` and `mvp_building_block_analysis.md`.

Goal: create a simple internal scheduling and capacity-planning template for teams currently using spreadsheets, whiteboards, or disconnected tools. This is not a Calendly clone. It is for assigning people, crews, equipment, and subcontractors to jobs/shifts, detecting conflicts, and giving managers a clear schedule.

Use a deployable stack:
- Next.js + TypeScript
- React + Tailwind
- Prisma + PostgreSQL
- Docker Compose for local Postgres
- Vitest or Jest for business-rule tests
- Playwright for browser tests

The app must run locally, be testable locally, and be easy to deploy to Railway.

Core features:
1. Resources: create/edit people, crews, equipment, and subcontractors. Fields: name, type, active/inactive, tags/skills, notes.
2. Jobs/shifts: create/edit scheduled work. Fields: title, optional project/customer ref, start, end, status, work type, notes, requires equipment flag.
3. Assignments: assign multiple resources to one job/shift.
4. Views: dashboard, month view, week view, resource view, conflict view.
5. Conflict detection: pure tested business logic, not only UI logic.
6. CSV import/export for resources, jobs, and assignments, with row-level validation errors.
7. Seed data for Telcyte-style construction scheduling and Barker-style monthly technician scheduling, including 40 technicians and a few intentional conflicts.
8. Integration-ready placeholders for Smartsheet and ServiceTitan, but do not build full integrations yet.

Statuses:
- Draft
- Scheduled
- In Progress
- Completed
- On Hold
- Cancelled

Conflict rules to implement and test:
- Resource double-booked during overlapping time windows
- Non-overlapping jobs for the same resource are allowed
- A job starting exactly when another ends is allowed
- A job ending exactly when another starts is allowed
- End before start is invalid
- Same start/end is invalid
- Cancelled jobs are ignored in conflict checks
- Inactive resource assigned to active job is a conflict
- Equipment-required job without equipment is a conflict
- Job with no assigned resources is a conflict
- Multi-resource job should flag only the conflicting resource
- Overnight and month-boundary jobs work correctly
- Bad CSV imports show clear errors
- Exported CSV can be imported back without losing required data

Browser tests must verify:
- App loads locally
- Seed data appears
- User can create a resource
- User can create a job
- User can assign a resource
- Conflict appears after an overlapping assignment
- Conflict disappears after fixing the schedule
- Month, week, resource, and conflict views render
- CSV export works
- Bad CSV import shows validation errors

Template requirements:
- `README.md`
- `.env.example`
- `docker-compose.yml`
- Prisma schema, migration, and seed script
- Clear local setup instructions
- Railway deployment instructions
- Test instructions
- Simple project structure
- Notes showing where Smartsheet and ServiceTitan integrations should be added later

Avoid:
- Public booking pages
- Customer self-scheduling
- Payments
- Video meeting links
- Large permissions system
- AI scheduling recommendations
- Deep Smartsheet/ServiceTitan integration
- Enterprise dispatch complexity

Before reporting completion:
1. Install dependencies.
2. Start local Postgres.
3. Run migrations.
4. Seed the database.
5. Run business-rule tests.
6. Run browser tests.
7. Start the app.
8. Open it in a browser and click through the main flows.
9. Fix failures and retest.

Final response must include:
- What was built
- Local URL
- Commands used to test
- Known limitations
- Next steps to push to GitHub and deploy to Railway

Do not claim it is done unless it has been run and tested.
